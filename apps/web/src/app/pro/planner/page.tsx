import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { ProPlannerDashboard } from "@/components/pro-planner/Dashboard";
import { prisma } from "@/lib/prisma";
import { canAccessDashboard, isPlanner } from "@/lib/rbac";

export default async function ProPlannerPage() {
  const user = await getCurrentUser();
  
  if (!user || !canAccessDashboard(user, "PRO_PLANNER")) {
    redirect("/app");
  }

  const admin = isAdmin(user);
  const planner = isPlanner(user);

  // Check if user has a Pro Planner organization
  // Admin sees all planner orgs, normal user sees only their own
  const org = await prisma.organization.findFirst({
    where: admin
      ? { type: { in: ["PLANNER", "CLIENT_AGENCY"] } }
      : { ownerId: user.id, type: { in: ["PLANNER", "CLIENT_AGENCY"] } },
    orderBy: { createdAt: "desc" },
  });

  // If no org exists, redirect to setup
  if (!org) {
    redirect("/professional-planner/setup");
  }

  // Fetch events for this Pro Planner
  // Planner isolation: planners only see events they created
  const where: { orgId: string; createdById?: string } = { orgId: org.id };
  if (planner && !admin) {
    where.createdById = user.id;
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      org: { select: { name: true, slug: true, ownerId: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return <ProPlannerDashboard orgName={org.name} events={events} userId={user.id} userRole={user.role} orgOwnerId={org.ownerId} />;
}

