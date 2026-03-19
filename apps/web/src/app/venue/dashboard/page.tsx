import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { VenueDashboard } from "@/components/venue/Dashboard";
import { canAccessDashboard } from "@/lib/rbac";

export default async function VenueDashboardPage() {
  const user = await getCurrentUser();
  
  if (!user || !canAccessDashboard(user, "VENUE")) {
    redirect("/app");
  }

  const admin = isAdmin(user);

  // Check if user has a Venue organization
  // Admin sees all venue orgs, normal user sees only their own
  const { prisma } = await import("@/lib/prisma");
  const org = await prisma.organization.findFirst({
    where: admin
      ? { type: "VENUE" }
      : { ownerId: user.id, type: "VENUE" },
    orderBy: { createdAt: "desc" },
  });

  // If no org exists, redirect to onboarding
  if (!org) {
    redirect("/providers/onboarding?providerType=venue");
  }

  return <VenueDashboard orgName={org.name} />;
}

