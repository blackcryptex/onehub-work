import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { ProPlannerDashboard } from "@/components/pro-planner/Dashboard";
import { prisma } from "@/lib/prisma";
import { PROVIDER_PROPOSAL_SUBMITTED_ACTION } from "@/lib/provider-backed-proposal";
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

  type ProPlannerDashboardProps = Parameters<typeof ProPlannerDashboard>[0];
  let events: ProPlannerDashboardProps["events"] = [];
  let listings: NonNullable<ProPlannerDashboardProps["listings"]> = [];
  let notifications: NonNullable<ProPlannerDashboardProps["notifications"]> = [];
  let members: NonNullable<ProPlannerDashboardProps["members"]> = [];
  let invites: NonNullable<ProPlannerDashboardProps["invites"]> = [];
  let vendorRelationships: NonNullable<ProPlannerDashboardProps["vendorRelationships"]> = [];

  try {
    [events, listings, notifications, members, invites, vendorRelationships] = await Promise.all([
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
            description: true,
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
            listing: { select: { id: true, title: true, type: true, category: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        proposals: {
          select: {
            id: true,
            title: true,
            status: true,
            totalCents: true,
            listing: { select: { id: true, title: true, type: true } },
            contract: { select: { id: true, status: true } },
            milestones: { select: { id: true, title: true, status: true, amountCents: true, dueDate: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
        contracts: {
          select: {
            id: true,
            title: true,
            status: true,
            buyerId: true,
            sellerId: true,
            signatures: { select: { id: true, signedAt: true, signerEmail: true, signerName: true } },
            paymentIntents: {
              select: { id: true, status: true, fundedAt: true, amountCents: true, currency: true, milestone: { select: { id: true, title: true, status: true, dueDate: true } } },
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
        description: true,
        minGuests: true,
        maxGuests: true,
        priceTier: true,
        city: true,
        state: true,
        offers: { select: { id: true, name: true, priceCents: true, unit: true }, orderBy: { name: "asc" } },
        availSlots: { select: { id: true, startAt: true, endAt: true, status: true, note: true }, orderBy: { startAt: "asc" }, take: 12 },
        bookingRequests: { select: { id: true, status: true, startAt: true, endAt: true, guests: true, quoteCents: true, event: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: "desc" }, take: 12 },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { orgId: org.id, userId: user.id },
      select: { id: true, title: true, body: true, read: true, link: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.membership.findMany({
      where: { orgId: org.id },
      select: {
        id: true,
        role: true,
        staffRole: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invite.findMany({
      where: { orgId: org.id, accepted: false, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendorRelationship.findMany({
      where: { orgId: org.id },
      select: {
        id: true,
        status: true,
        notes: true,
        reliability: true,
        lastContactAt: true,
        nextFollowUpAt: true,
        updatedAt: true,
        listing: { select: { id: true, title: true, type: true, category: true, city: true, state: true } },
      },
      orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
    }),
    ]);

    const proposalIds = events.flatMap((event) => (event.proposals ?? []).map((proposal) => proposal.id));
    const providerSubmittedActivities = proposalIds.length > 0
      ? await prisma.activity.findMany({
          where: {
            action: PROVIDER_PROPOSAL_SUBMITTED_ACTION,
            target: { in: proposalIds },
            orgId: org.id,
          },
          select: { target: true },
        })
      : [];
    const providerSubmittedProposalIds = new Set(
      providerSubmittedActivities
        .map((activity) => activity.target)
        .filter(Boolean),
    );
    events = events.map((event) => ({
      ...event,
      proposals: (event.proposals ?? []).map((proposal) => ({
        ...proposal,
        providerSubmittedEvidence: providerSubmittedProposalIds.has(proposal.id),
      })),
    }));
  } catch (error) {
    console.error(
      "[ProPlannerPage] detailed dashboard query failed; rendering safe fallback",
      error instanceof Error ? error.message : "unknown error",
    );

    try {
      events = await prisma.event.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          org: { select: { name: true, slug: true, ownerId: true } },
          createdBy: { select: { id: true, name: true } },
          tasks: {
            select: { id: true, title: true, description: true, status: true, priority: true, dueAt: true, assignee: { select: { id: true, name: true, email: true } } },
            orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
          },
          milestones: {
            select: { id: true, title: true, dueAt: true, done: true, order: true },
            orderBy: [{ dueAt: "asc" }, { order: "asc" }],
          },
          stakeholders: {
            select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    } catch (fallbackError) {
      console.error(
        "[ProPlannerPage] fallback event query failed; rendering empty planner shell",
        fallbackError instanceof Error ? fallbackError.message : "unknown error",
      );
      events = [];
    }
  }

  return (
    <ProPlannerDashboard
      orgId={org.id}
      orgName={org.name}
      events={events}
      userId={user.id}
      userRole={user.role}
      orgOwnerId={org.ownerId}
      listings={listings}
      notifications={notifications}
      members={members}
      invites={invites}
      vendorRelationships={vendorRelationships}
    />
  );
}
