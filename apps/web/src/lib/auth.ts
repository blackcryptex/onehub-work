import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
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
      // When trigger === 'update', the session parameter contains the update data
      // This is triggered by calling update() from next-auth/react on the client
      if (trigger === "update" && session) {
        // Never trust client-provided role updates. Roles must come from the database
        // during sign-in or explicit server-controlled impersonation transitions only.

        // Update impersonation fields if provided
        if (session.actingUserId !== undefined) {
          token.actingUserId = session.actingUserId as string | undefined;
          // When starting impersonation, load the target user's role
          if (session.actingUserId) {
            try {
              const targetUser = await prisma.user.findUnique({
                where: { id: session.actingUserId as string },
                select: { role: true },
              });
              if (targetUser) {
                token.role = targetUser.role;
                token.id = session.actingUserId as string;
              }
            } catch (error) {
              console.error("[Auth] Error loading impersonated user role:", error);
            }
          } else {
            // Stopping impersonation - restore real user's role
            if (token.realUserId && typeof token.realUserId === "string") {
              try {
                const realUser = await prisma.user.findUnique({
                  where: { id: token.realUserId },
                  select: { role: true },
                });
                if (realUser) {
                  token.role = realUser.role;
                  token.id = token.realUserId;
                }
              } catch (error) {
                console.error("[Auth] Error loading real user role:", error);
              }
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
