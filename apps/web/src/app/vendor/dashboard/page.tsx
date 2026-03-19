import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { VendorDashboard } from "@/components/vendor/Dashboard";
import { prisma } from "@/lib/prisma";
import { canAccessDashboard } from "@/lib/rbac";

export default async function VendorDashboardPage() {
  const user = await getCurrentUser();
  
  if (!user || !canAccessDashboard(user, "VENDOR")) {
    redirect("/app");
  }

  const userId = user.id;
  const admin = isAdmin(user);

  // Check if user has a Vendor organization
  // Admin sees all vendor orgs, normal user sees only their own
  const org = await prisma.organization.findFirst({
    where: admin
      ? { type: "VENDOR" }
      : { ownerId: userId, type: "VENDOR" },
    orderBy: { createdAt: "desc" },
  });

  // If no org exists, redirect to onboarding
  if (!org) {
    redirect("/providers/onboarding?providerType=vendor");
  }

  // Fetch vendor dashboard data
  // Admin sees all listings, normal user sees only listings from their org
  const listings = await prisma.listing.findMany({
    where: admin ? {} : { orgId: org.id },
    select: { id: true, orgId: true },
  });

  const listingIds = listings.map((l) => l.id);

  // Get booking requests for vendor's listings (only if vendor has listings)
  // Admin sees all booking requests, normal user sees only requests for their listings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const allBookingRequests =
    listingIds.length > 0 || admin
      ? await prisma.bookingRequest.findMany({
          where: admin
            ? {}
            : {
                listingId: { in: listingIds },
              },
          include: {
            event: {
              select: {
                id: true,
                name: true,
                startAt: true,
              },
            },
            listing: {
              select: {
                title: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  // Count today's leads (PENDING status, created today)
  const todaysLeads = allBookingRequests.filter(
    (req) =>
      req.status === "PENDING" &&
      req.createdAt >= today &&
      req.createdAt < tomorrow
  ).length;

  // Count upcoming events (booking requests with startAt in future, status not DECLINED/WITHDRAWN)
  const upcomingEvents = allBookingRequests.filter(
    (req) =>
      req.startAt >= new Date() &&
      req.status !== "DECLINED" &&
      req.status !== "WITHDRAWN"
  ).length;

  // Get unread notifications for this org
  const unreadMessages = await prisma.notification.count({
    where: {
      userId,
      orgId: org.id,
      read: false,
    },
  });

  // Get recent booking requests (last 5)
  const recentRequests = allBookingRequests.slice(0, 5);

  // Fetch contracts where this vendor is the seller
  // Admin sees all contracts, normal user sees only contracts for their org
  // Note: ContractStatus enum values need Prisma migration - using type assertion for now
  const contracts = await prisma.contract.findMany({
    where: admin
      ? ({
          status: {
            in: ["ACCEPTED", "IN_PAYMENT", "ACTIVE", "COMPLETED"] as any,
          },
        } as any)
      : {
          proposal: {
            orgId: org.id,
          },
          status: {
            in: ["ACCEPTED", "IN_PAYMENT", "ACTIVE", "COMPLETED"] as any,
          },
        },
    include: {
      proposal: {
        include: {
          milestones: {
            orderBy: { dueDate: "asc" },
          },
        },
      },
      event: {
        select: {
          name: true,
          startAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  // Map contracts for VendorPaymentPanel
  const paymentContracts = contracts.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    proposal: {
      id: c.proposal.id,
      currency: c.proposal.currency,
      milestones: c.proposal.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        amountCents: m.amountCents,
        status: m.status,
        dueDate: m.dueDate,
      })),
    },
    event: {
      name: c.event.name || "Untitled Event",
      startAt: c.event.startAt,
    },
  }));

  return (
    <VendorDashboard
      orgName={org.name}
      orgSlug={org.slug}
      stats={{
        todaysLeads,
        upcomingEvents,
        unreadMessages,
      }}
      recentRequests={recentRequests}
      paymentContracts={paymentContracts}
    />
  );
}

