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

  // Check if user has a Pro Planner organization.
  // Admin sees all planner orgs, normal user sees only their own.
  const org = await prisma.organization.findFirst({
    where: admin
      ? { type: { in: ["PLANNER", "CLIENT_AGENCY"] } }
      : { ownerId: user.id, type: { in: ["PLANNER", "CLIENT_AGENCY"] } },
    orderBy: { createdAt: "desc" },
  });

  if (!org) {
    redirect("/professional-planner/setup");
  }

  const where: { orgId: string; createdById?: string } = { orgId: org.id };
  if (planner && !admin) {
    where.createdById = user.id;
  }

  const [events, listings, notifications] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        org: { select: { name: true, slug: true, ownerId: true } },
        createdBy: { select: { id: true, name: true } },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueAt: true,
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
        },
        milestones: {
          select: { id: true, title: true, dueAt: true, done: true, order: true },
          orderBy: [{ dueAt: "asc" }, { order: "asc" }],
        },
        stakeholders: {
          select: {
            id: true,
            role: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        media: {
          select: { id: true, url: true, caption: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 12,
        },
        threads: {
          select: {
            id: true,
            subject: true,
            createdAt: true,
            participants: { select: { email: true, roleHint: true } },
            messages: { select: { id: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        },
        bookingRequests: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            contactName: true,
            listing: { select: { title: true, type: true, category: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        proposals: {
          select: {
            id: true,
            title: true,
            status: true,
            totalCents: true,
            listing: { select: { title: true, type: true } },
            contract: { select: { id: true, status: true } },
            milestones: { select: { id: true, status: true, amountCents: true, dueDate: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
        contracts: {
          select: {
            id: true,
            title: true,
            status: true,
            paymentIntents: {
              select: { id: true, status: true, fundedAt: true, amountCents: true },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.listing.findMany({
      where: { orgId: org.id },
      select: {
        id: true,
        title: true,
        type: true,
        category: true,
        city: true,
        state: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { orgId: org.id, userId: user.id },
      select: { id: true, title: true, body: true, read: true, link: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <ProPlannerDashboard
      orgName={org.name}
      events={events}
      userId={user.id}
      userRole={user.role}
      orgOwnerId={org.ownerId}
      listings={listings}
      notifications={notifications}
    />
  );
}
