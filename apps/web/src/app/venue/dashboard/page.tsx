import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { VenueDashboard } from "@/components/venue/Dashboard";
import { canAccessDashboard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ContractStatus } from "@prisma/client";

export default async function VenueDashboardPage() {
  const user = await getCurrentUser();
  
  if (!user || !canAccessDashboard(user, "VENUE")) {
    redirect("/app");
  }

  const userId = user.id;
  const admin = isAdmin(user);

  // Check if user has a Venue organization
  // Admin sees all venue orgs, normal user sees only their own
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

  const listings = await prisma.listing.findMany({
    where: admin ? { type: "VENUE" } : { orgId: org.id, type: "VENUE" },
    select: { id: true, maxGuests: true },
  });

  const listingIds = listings.map((listing) => listing.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const allBookingRequests =
    listingIds.length > 0 || admin
      ? await prisma.bookingRequest.findMany({
          where: admin
            ? {
                listing: { type: "VENUE" },
              }
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

  const todaysLeads = allBookingRequests.filter(
    (request) => request.status === "PENDING" && request.createdAt >= today && request.createdAt < tomorrow
  ).length;

  const upcomingEvents = allBookingRequests.filter(
    (request) =>
      request.startAt >= new Date() &&
      request.status !== "DECLINED" &&
      request.status !== "WITHDRAWN" &&
      request.status !== "EXPIRED"
  ).length;

  const unreadMessages = await prisma.notification.count({
    where: {
      userId,
      orgId: org.id,
      read: false,
    },
  });

  const recentRequests = allBookingRequests.slice(0, 5);

  const contracts = await prisma.contract.findMany({
    where: admin
      ? {
          proposal: {
            listing: { type: "VENUE" },
          },
          status: {
            in: [ContractStatus.ACCEPTED, ContractStatus.IN_PAYMENT, ContractStatus.ACTIVE, ContractStatus.COMPLETED],
          },
        }
      : {
          sellerId: org.id,
          status: {
            in: [ContractStatus.ACCEPTED, ContractStatus.IN_PAYMENT, ContractStatus.ACTIVE, ContractStatus.COMPLETED],
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

  const bookingContracts = contracts.map((contract) => ({
    id: contract.id,
    title: contract.title,
    status: contract.status,
    proposal: {
      id: contract.proposal.id,
      currency: contract.proposal.currency,
      milestones: contract.proposal.milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        amountCents: milestone.amountCents,
        status: milestone.status,
        dueDate: milestone.dueDate,
      })),
    },
    event: {
      name: contract.event.name || "Untitled Event",
      startAt: contract.event.startAt,
    },
  }));

  return (
    <VenueDashboard
      orgName={org.name}
      orgSlug={org.slug}
      stats={{
        todaysLeads,
        upcomingEvents,
        unreadMessages,
      }}
      recentRequests={recentRequests}
      profileReadiness={{
        hasSpaces: listings.some((listing) => listing.maxGuests !== null) || Boolean(org.spacesJson),
        hasContact: Boolean(org.contactEmail || org.contactPhone),
        hasAvailability: Boolean(org.availabilityJson),
        hasPaymentSetup: Boolean(org.paymentsJson || org.stripeConnectAccountId),
      }}
      bookingContracts={bookingContracts}
    />
  );
}

