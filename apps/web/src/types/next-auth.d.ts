import { type Role } from "@onehub/types/src/roles";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: Role;
  }

  interface Session {
    user: {
      id: string; // Effective user ID (acting user if impersonating, otherwise real user)
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      realUserId?: string; // Original admin's ID when impersonating
      actingUserId?: string; // ID of user being impersonated (if any)
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string; // Effective user ID (acting user if impersonating, otherwise real user)
    role?: Role;
    realUserId?: string; // Original logged-in user's ID (admin when impersonating)
    actingUserId?: string; // ID of user being impersonated (if any)
    accessToken?: string; // Google OAuth token
    refreshToken?: string; // Google OAuth refresh token
    expiresAt?: number; // Google OAuth token expiration
  }
}

