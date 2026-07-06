import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/**
 * AppUser type representing the current authenticated user
 */
export type AppUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
};

/**
 * Extended user info including impersonation metadata
 */
export type AppUserWithImpersonation = AppUser & {
  isImpersonating: boolean;
  realUserId?: string; // Admin's ID when impersonating
};

/**
 * Check if a user is an admin
 */
export function isAdmin(user?: { role?: string | null }): boolean {
  return user?.role === "ADMIN";
}

/**
 * Get the current authenticated user, with impersonation and DEV_GOD_MODE support
 * 
 * Impersonation behavior:
 * - When an admin is impersonating another user, this returns the impersonated user's data
 * - The effective user ID is the actingUserId from the session
 * - All RBAC checks will use the impersonated user's role/permissions
 * 
 * DEV_GOD_MODE:
 * - In development mode with DEV_GOD_MODE=true, returns a fake admin user
 * - This bypasses authentication entirely (different from impersonation)
 * - Only active in development mode
 * 
 * In production, DEV_GOD_MODE has no effect and only real authenticated users are returned.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  // DEV_GOD_MODE: Only active in development
  // Note: This is different from impersonation - it bypasses auth entirely
  if (
    process.env.DEV_GOD_MODE === "true" &&
    process.env.NODE_ENV === "development"
  ) {
    return {
      id: "dev-admin",
      email: "admin@onehub.local",
      name: "Dev Admin",
      role: "ADMIN",
    };
  }

  // Normal auth flow with impersonation support
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  // Check if impersonating: if actingUserId is set, load that user from DB
  const actingUserId = session.user.actingUserId;
  const realUserId = session.user.realUserId;
  const isImpersonating = !!actingUserId && actingUserId !== realUserId;

  // Determine effective user ID: acting user if impersonating, otherwise session user
  const effectiveUserId = actingUserId || session.user.id;

  if (!effectiveUserId) {
    return null;
  }

  // If impersonating, load the impersonated user from database
  // This ensures we return the actual user data (email, name, role) of the impersonated user
  if (isImpersonating && actingUserId) {
    try {
      const impersonatedUser = await prisma.user.findUnique({
        where: { id: actingUserId },
        select: { id: true, email: true, name: true, role: true },
      });

      if (!impersonatedUser) {
        console.warn("[Auth] Impersonated user not found:", actingUserId);
        return null;
      }

      return {
        id: impersonatedUser.id,
        email: impersonatedUser.email,
        name: impersonatedUser.name,
        role: impersonatedUser.role,
      };
    } catch (error) {
      console.error("[Auth] Error loading impersonated user:", error);
      return null;
    }
  }

  // Not impersonating. Use canonical DB data only; fail closed if unavailable.
  const userId = session.user.id;

  if (!userId) {
    return null;
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      };
    }
  } catch (error) {
    console.error("[Auth] Error loading current user:", error);
  }

  return null;
}

/**
 * Get current user with impersonation metadata
 * Useful for UI that needs to show impersonation status
 */
export async function getCurrentUserWithImpersonation(): Promise<AppUserWithImpersonation | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const session = await auth();
  const actingUserId = session?.user?.actingUserId;
  const realUserId = session?.user?.realUserId;
  const isImpersonating = !!actingUserId && actingUserId !== realUserId;

  return {
    ...user,
    isImpersonating,
    realUserId: realUserId || undefined,
  };
}

