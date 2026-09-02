import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getGoogleOAuthCredentials, isGoogleAuthConfigured } from "@/lib/google.auth";

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
const FOUNDER_ADMIN_EMAIL = "marlon.smith35@gmail.com";
const googleOAuthCredentials = getGoogleOAuthCredentials();

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function isFounderAdminEmail(email?: string | null) {
  return normalizeEmail(email) === FOUNDER_ADMIN_EMAIL;
}

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
            return null;
          }
          const email = String(credentials.email);
          const password = String(credentials.password);
          
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            return null;
          }
          if (!user.password) {
            return null;
          }
          // Dynamically import bcryptjs to avoid ES module issues
          const bcryptjsModule = await import("bcryptjs");
          const bcrypt = bcryptjsModule.default || bcryptjsModule;
          const ok = await bcrypt.compare(password, user.password);
          if (!ok) {
            return null;
          }
          return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
        } catch {
          return null;
        }
      },
    }),
    // Only add Google provider if credentials are configured.
    ...(isGoogleAuthConfigured()
      ? [
          Google({
            clientId: googleOAuthCredentials.clientId!,
            clientSecret: googleOAuthCredentials.clientSecret!,
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
      let googleCalendarUser: {
        id: string;
        email?: string | null;
      } | null = null;

      // When a user first logs in, initialize realUserId
      if (user) {
        let effectiveLoginUser = user;
        const loginEmail = typeof user.email === "string" ? user.email : undefined;

        // Founder bootstrap: Marlon's Google OAuth account is always the canonical
        // OneHub app ADMIN account. This does not grant Vercel/Supabase/GitHub
        // infrastructure ownership; it only sets OneHub app-level admin authority.
        if (account?.provider === "google" && isFounderAdminEmail(loginEmail)) {
          effectiveLoginUser = await prisma.user.upsert({
            where: { email: FOUNDER_ADMIN_EMAIL },
            create: {
              email: FOUNDER_ADMIN_EMAIL,
              name: user.name ?? null,
              image: user.image ?? null,
              role: "ADMIN",
            },
            update: {
              name: user.name ?? null,
              image: user.image ?? null,
              role: "ADMIN",
            },
            select: { id: true, email: true, name: true, image: true, role: true },
          });
        }

        // If this is a new login (not impersonation), set realUserId
        if (!token.realUserId) {
          token.realUserId = effectiveLoginUser.id;
        }
        // Set effective user ID and role
        // If impersonating, actingUserId is already set, so id should be the acting user
        // Otherwise, id is the real user
        token.id = token.actingUserId || effectiveLoginUser.id;
        token.role = effectiveLoginUser.role ?? token.role;
        googleCalendarUser = {
          id: effectiveLoginUser.id,
          email: effectiveLoginUser.email ?? user.email,
        };
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
            } catch {
              // Keep session update fail-closed without writing user identifiers to logs.
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
            } catch {
              // Keep session update fail-closed without writing user identifiers to logs.
            }
          }
        }
      }
      
      // Store Google tokens server-side only for calendar access. Do not copy
      // OAuth access/refresh tokens into the NextAuth JWT/session payload.
      if (account && account.provider === 'google') {
        if (googleCalendarUser?.id && account.access_token) {
          const expiresAt = account.expires_at ? new Date(account.expires_at * 1000) : null;
          const email = googleCalendarUser.email || "";

          try {
            await prisma.calendarAccount.upsert({
              where: { userId_provider: { userId: googleCalendarUser.id, provider: "google" } },
              create: {
                userId: googleCalendarUser.id,
                provider: "google",
                email,
                accessToken: account.access_token,
                refreshToken: account.refresh_token || null,
                expiresAt,
              },
              update: {
                email,
                accessToken: account.access_token,
                refreshToken: account.refresh_token || undefined,
                expiresAt,
              },
            });
          } catch {
            // Calendar token persistence must fail safe without breaking core auth
            // or writing OAuth token material to logs.
          }
        }
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
      
      return session;
    },
    async redirect({ url, baseUrl }) {
      const configuredBaseUrl = process.env.NEXTAUTH_URL || baseUrl;

      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const urlObj = new URL(url);
        const requestBase = new URL(baseUrl);
        const configuredBase = new URL(configuredBaseUrl);

        if (urlObj.origin === requestBase.origin || urlObj.origin === configuredBase.origin) {
          return url;
        }
      } catch {
        // ignore and fall through
      }

      return `${baseUrl}/app`;
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
