/**
 * Utility functions for Vendor/Venue routing logic
 * 
 * Determines where to redirect vendors/venues based on auth status and profile existence
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ProviderType = "vendor" | "venue";

/**
 * Get the appropriate redirect URL for a vendor/venue user
 * 
 * @param providerType - "vendor" or "venue"
 * @param userId - User ID (if authenticated)
 * @returns The URL to redirect to
 */
export async function getVendorVenueRedirectUrl(
  providerType: ProviderType
): Promise<string> {
  const session = await auth();
  
  // If not signed in, redirect to sign-in with callback
  if (!session?.user?.id) {
    return `/signin?callbackUrl=${encodeURIComponent(`/providers/start`)}`;
  }

  const userId = session.user.id as string;
  const orgType = providerType === "vendor" ? "VENDOR" : "VENUE";

  // Check if user has a vendor/venue organization
  const org = await prisma.organization.findFirst({
    where: {
      ownerId: userId,
      type: orgType,
    },
    orderBy: { createdAt: "desc" },
  });

  // If org exists, go to dashboard; otherwise go to onboarding
  if (org) {
    return providerType === "vendor" ? "/vendor/dashboard" : "/venue/dashboard";
  } else {
    return `/providers/onboarding?providerType=${providerType}`;
  }
}

/**
 * Client-side helper to get vendor/venue redirect URL
 * Uses session check and redirects appropriately
 */
export function getVendorVenueClientRedirectUrl(providerType: ProviderType): string {
  // For client components, we'll redirect to a server action or use a route handler
  // For now, redirect to provider start which will handle auth check
  return `/providers/start?providerType=${providerType}`;
}

