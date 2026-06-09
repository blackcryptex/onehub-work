import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

type ImpersonationTransitionAction = "start" | "stop";

type ImpersonationTransitionPayload = {
  action: ImpersonationTransitionAction;
  realUserId: string;
  actingUserId?: string;
  exp: number;
};

type ImpersonationSessionUpdate = {
  impersonationTransitionToken: string;
};

const IMPERSONATION_TRANSITION_TTL_SECONDS = 60;

function getAuthSecret() {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "development" ? "dev-secret-key-change-in-production" : undefined);

  if (!secret) {
    throw new Error("Auth secret is required for impersonation session transitions");
  }

  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signImpersonationTransition(payload: ImpersonationTransitionPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", getAuthSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifyImpersonationTransitionToken(token: unknown): ImpersonationTransitionPayload | null {
  if (typeof token !== "string") return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = createHmac("sha256", getAuthSecret()).update(encodedPayload).digest("base64url");
  const signatureBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<ImpersonationTransitionPayload>;
    if (payload.action !== "start" && payload.action !== "stop") return null;
    if (!payload.realUserId || typeof payload.realUserId !== "string") return null;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.action === "start" && (!payload.actingUserId || typeof payload.actingUserId !== "string")) {
      return null;
    }
    if (payload.actingUserId !== undefined && typeof payload.actingUserId !== "string") return null;

    return payload as ImpersonationTransitionPayload;
  } catch {
    return null;
  }
}

export function createImpersonationSessionUpdate(input: {
  realUserId: string;
  actingUserId: string;
}): ImpersonationSessionUpdate {
  return {
    impersonationTransitionToken: signImpersonationTransition({
      action: "start",
      realUserId: input.realUserId,
      actingUserId: input.actingUserId,
      exp: Math.floor(Date.now() / 1000) + IMPERSONATION_TRANSITION_TTL_SECONDS,
    }),
  };
}

export function createStopImpersonationSessionUpdate(input: {
  realUserId: string;
  actingUserId: string;
}): ImpersonationSessionUpdate {
  return {
    impersonationTransitionToken: signImpersonationTransition({
      action: "stop",
      realUserId: input.realUserId,
      actingUserId: input.actingUserId,
      exp: Math.floor(Date.now() / 1000) + IMPERSONATION_TRANSITION_TTL_SECONDS,
    }),
  };
}
export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: process.env.NEXTAUTH_SESSION_MAX_AGE
      ? parseInt(process.env.NEXTAUTH_SESSION_MAX_AGE, 10)
      : 60 * 60 * 12, // Default 12 hours
    updateAge: process.env.NEXTAUTH_SESSION_UPDATE_AGE
      ? parseInt(process.env.NEXTAUTH_SESSION_UPDATE_AGE, 10)
      : 60 * 60, // Default 1 hour
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || (process.env.NODE_ENV === "development" ? "dev-secret-key-change-in-production" : undefined),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[Auth] Missing email or password");
            return null;
          }
          const email = String(credentials.email);
          const password = String(credentials.password);
          
          console.log("[Auth] Attempting to authorize:", email);
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            console.log("[Auth] User not found:", email);
            return null;
          }
          if (!user.password) {
            console.log("[Auth] User has no password:", email);
            return null;
          }
          // Dynamically import bcryptjs to avoid ES module issues
          const bcryptjsModule = await import("bcryptjs");
          const bcrypt = bcryptjsModule.default || bcryptjsModule;
          const ok = await bcrypt.compare(password, user.password);
          if (!ok) {
            console.log("[Auth] Password mismatch for:", email);
            return null;
          }
          console.log("[Auth] Successfully authorized:", email);
          return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
        } catch (err) {
          console.error("[Auth] Authorize error:", err);
          return null;
        }
      },
    }),
    // Only add Google provider if credentials are configured
    ...(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
            checks: ["pkce", "state"],
            authorization: {
              params: {
                scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // When a user first logs in, initialize realUserId
      if (user) {
        // If this is a new login (not impersonation), set realUserId to the user's ID
        if (!token.realUserId) {
          token.realUserId = user.id;
        }
        // Set effective user ID and role
        // If impersonating, actingUserId is already set, so id should be the acting user
        // Otherwise, id is the real user
        token.id = token.actingUserId || user.id;
        token.role = user.role ?? token.role;
        console.log("[Auth] JWT callback - user id:", user.id, "role:", user.role, "realUserId:", token.realUserId, "actingUserId:", token.actingUserId);
      }
      
      // Handle session update trigger (used for impersonation)
      // Client-provided session.update payloads are untrusted. Impersonation
      // transitions must carry a short-lived server-signed transition token
      // generated by the admin impersonation API route after authorization.
      if (trigger === "update" && session) {
        const transition = verifyImpersonationTransitionToken(
          (session as { impersonationTransitionToken?: unknown }).impersonationTransitionToken,
        );
        const realUserId = typeof token.realUserId === "string" ? token.realUserId : undefined;

        if (transition && realUserId && transition.realUserId === realUserId) {
          if (transition.action === "start" && transition.actingUserId) {
            try {
              const targetUser = await prisma.user.findUnique({
                where: { id: transition.actingUserId },
                select: { role: true },
              });
              if (targetUser) {
                token.actingUserId = transition.actingUserId;
                token.role = targetUser.role;
                token.id = transition.actingUserId;
              }
            } catch (error) {
              console.error("[Auth] Error loading impersonated user role:", error);
            }
          }

          if (transition.action === "stop") {
            try {
              const realUser = await prisma.user.findUnique({
                where: { id: realUserId },
                select: { role: true },
              });
              if (realUser) {
                delete token.actingUserId;
                token.role = realUser.role;
                token.id = realUserId;
              }
            } catch (error) {
              console.error("[Auth] Error loading real user role:", error);
            }
          }
        }
        console.log("[Auth] JWT update - realUserId:", token.realUserId, "actingUserId:", token.actingUserId, "role:", token.role);
      }
      
      // Store Google tokens for calendar access
      if (account && account.provider === 'google') {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      
      return token;
    },
    async session({ session, token }) {
      // Determine effective user ID: acting user if impersonating, otherwise real user
      const effectiveUserId = token.actingUserId || token.realUserId || token.id;
      
      // Set effective user ID from token
      if (effectiveUserId && typeof effectiveUserId === 'string') {
        session.user.id = effectiveUserId;
      }
      
      // Set user role from token (role of the effective user)
      if (token.role && typeof token.role === 'string') {
        // Map to valid Role enum values
        const validRoles = ['DIY_PLANNER', 'PRO_PLANNER', 'VENDOR', 'VENUE', 'CLIENT', 'EVENT_DREAMER', 'ADMIN'] as const;
        type ValidRole = typeof validRoles[number];
        if (validRoles.includes(token.role as ValidRole)) {
          session.user.role = token.role as ValidRole;
        }
      }
      
      // Expose impersonation fields in session
      if (token.realUserId && typeof token.realUserId === 'string') {
        session.user.realUserId = token.realUserId;
      }
      if (token.actingUserId && typeof token.actingUserId === 'string') {
        session.user.actingUserId = token.actingUserId;
      }
      
      console.log("[Auth] Session callback - effective user id:", session.user.id, "role:", token.role, "realUserId:", token.realUserId, "actingUserId:", token.actingUserId);
      return session;
    },
    async redirect({ url, baseUrl }) {
      const liveBaseUrl = process.env.NEXTAUTH_URL || baseUrl;

      if (url.startsWith("/")) {
        return `${liveBaseUrl}${url}`;
      }

      try {
        const urlObj = new URL(url);
        const base = new URL(liveBaseUrl);

        if (urlObj.origin === base.origin) {
          return url;
        }
      } catch {
        // ignore and fall through
      }

      return `${liveBaseUrl}/app`;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  // Enable Google only when env is provided
  // Runtime guards are handled by provider configuration above
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
