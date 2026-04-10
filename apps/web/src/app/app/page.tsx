import { GettingStartedCard } from "@/components/layout/GettingStartedCard";
import { SystemStatus } from "@/components/layout/SystemStatus";
import { QuickLinks } from "@/components/layout/QuickLinks";
import { RoleBadge } from "@/components/layout/RoleBadge";
import { Card, Button } from "@/components/ui";
import { auth } from "@/lib/auth";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dashboard, vaultDetail, vaultIndex } from "@/lib/routes";

export default async function AppPage() {
  const session = await auth();
  const sessionUser = session?.user;
  const dbUser = sessionUser ? await getCurrentUser() : null;

  if (!sessionUser && !dbUser) {
    redirect("/signin?callbackUrl=/app");
  }

  const user = dbUser || {
    id: sessionUser!.id,
    email: sessionUser!.email,
    name: sessionUser!.name,
    role: sessionUser!.role,
  };
  const userId = user.id;
  const role = user.role;
  const admin = isAdmin(user);

  // Route admins to the canonical admin surface before any broader role checks.
  if (admin) {
    redirect(dashboard(role) as any);
  }

  // Check role-specific initial states
  let existingOrg = null;

  // Preserve VENDOR/VENUE onboarding gating before generic dashboard redirects.
  if (canAccessDashboard(user, "VENDOR") || canAccessDashboard(user, "VENUE")) {
    const targetRole = role === "VENUE" ? "VENUE" : "VENDOR";
    existingOrg = await prisma.organization.findFirst({
      where: { ownerId: userId, type: targetRole },
      orderBy: { createdAt: "desc" },
    });
    if (existingOrg) {
      redirect(dashboard(targetRole) as any);
    }
    const onboardingUrl = targetRole === "VENUE"
      ? "/providers/onboarding?providerType=venue"
      : "/providers/onboarding?providerType=vendor";
    redirect(onboardingUrl);
  }

  if (
    canAccessDashboard(user, "DIY_PLANNER") ||
    canAccessDashboard(user, "EVENT_DREAMER") ||
    canAccessDashboard(user, "PRO_PLANNER")
  ) {
    redirect(dashboard(role) as any);
  }

  // Get user's organizations
  const orgs = await prisma.organization.findMany({
    where: admin ? {} : { members: { some: { userId } } },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true, events: true } } },
  });

  const orgIds = orgs.map((o) => o.id);
  const recentEvents = await prisma.event.findMany({
    where: admin ? {} : { orgId: { in: orgIds } },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { org: { select: { name: true, slug: true } } },
  });

  const recentActivity = await prisma.activity.findMany({
    where: admin ? {} : { orgId: { in: orgIds } },
    take: 10,
    orderBy: { at: "desc" },
    include: { actor: { select: { name: true, email: true } } },
  });

  let stats = null;
  if (role === "PRO_PLANNER" || admin) {
    const totalEvents = await prisma.event.count({ where: admin ? {} : { orgId: { in: orgIds } } });
    const activeEvents = await prisma.event.count({ where: admin ? { status: "ACTIVE" } : { orgId: { in: orgIds }, status: "ACTIVE" } });
    stats = { totalEvents, activeEvents };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <RoleBadge role={role} />
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="text-sm text-slate-600">Total Events</div>
            <div className="text-2xl font-semibold">{stats.totalEvents}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600">Active Events</div>
            <div className="text-2xl font-semibold">{stats.activeEvents}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600">Organizations</div>
            <div className="text-2xl font-semibold">{orgs.length}</div>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Organizations</h2>
            <Button asChild variant="ghost">
              <Link href="/app">View all</Link>
            </Button>
          </div>
          {orgs.length === 0 ? (
            <p className="text-sm text-slate-600">No organizations yet. Create one to get started!</p>
          ) : (
            <ul className="space-y-2">
              {orgs.map((org) => (
                <li key={org.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-xs text-slate-500">
                      {org._count.members} member{org._count.members !== 1 ? "s" : ""} · {org._count.events} event{org._count.events !== 1 ? "s" : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Events</h2>
            <Button asChild variant="ghost">
              <Link href={vaultIndex(role) as any}>View all</Link>
            </Button>
          </div>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-slate-600">No events yet. Create your first event to get started!</p>
          ) : (
            <ul className="space-y-2">
              {recentEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                  <div>
                    <div className="font-medium">{event.name}</div>
                    <div className="text-xs text-slate-500">
                      {event.org.name} · {new Date(event.startAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button asChild variant="ghost">
                    <Link href={vaultDetail(role, event.slug) as any}>View</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GettingStartedCard />
        <QuickLinks />
      </div>

      {recentActivity.length > 0 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <ul className="space-y-2">
            {recentActivity.slice(0, 5).map((activity) => (
              <li key={activity.id} className="text-sm text-slate-600">
                <span className="font-medium">{activity.actor?.name || "System"}</span> {activity.action.toLowerCase()}{" "}
                <span className="text-xs text-slate-400">{new Date(activity.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <SystemStatus />
    </div>
  );
}
