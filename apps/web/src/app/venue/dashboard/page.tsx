import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { VenueDashboard } from "@/components/venue/Dashboard";
import { prisma } from "@/lib/prisma";
import { canAccessDashboard } from "@/lib/rbac";
import type { ContractStatus } from "@prisma/client";

const ACTIVE_CONTRACT_STATUSES: ContractStatus[] = ["ACCEPTED", "IN_PAYMENT", "ACTIVE", "COMPLETED"];

export default async function VenueDashboardPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessDashboard(user, "VENUE")) {
    redirect("/app");
  }

  const userId = user.id;
  const admin = isAdmin(user);

  const org = await prisma.organization.findFirst({
    where: admin ? { type: "VENUE" } : { ownerId: userId, type: "VENUE" },
    orderBy: { createdAt: "desc" },
  });

  if (!org) {
    redirect("/providers/onboarding?providerType=venue");
  }

  const listings = await prisma.listing.findMany({
    where: admin ? { type: "VENUE" } : { orgId: org.id, type: "VENUE" },
    select: { id: true, orgId: true },
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
                maxGuests: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const todaysLeads = allBookingRequests.filter(
    (request) =>
      request.status === "PENDING" && request.createdAt >= today && request.createdAt < tomorrow,
  ).length;

  const upcomingBookings = allBookingRequests.filter(
    (request) =>
      request.startAt >= new Date() && request.status !== "DECLINED" && request.status !== "WITHDRAWN",
  ).length;

  const unreadMessages = await prisma.notification.count({
    where: {
      userId,
      orgId: org.id,
      read: false,
    },
  });

  const recentRequests = allBookingRequests.slice(0, 5).map((request) => ({
    id: request.id,
    createdAt: request.createdAt,
    contactName: request.contactName,
    contactEmail: request.contactEmail,
    startAt: request.startAt,
    endAt: request.endAt,
    status: request.status,
    event: request.event,
    listing: request.listing
      ? {
          title: request.listing.title,
          capacity: request.listing.maxGuests,
        }
      : null,
  }));

  const contracts = await prisma.contract.findMany({
    where: admin
      ? {
          status: {
            in: ACTIVE_CONTRACT_STATUSES,
          },
          proposal: {
            listing: { type: "VENUE" },
          },
        }
      : {
          proposal: {
            orgId: org.id,
          },
          status: {
            in: ACTIVE_CONTRACT_STATUSES,
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

  const paymentContracts = contracts.map((contract) => ({
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
        upcomingBookings,
        unreadMessages,
      }}
      recentRequests={recentRequests}
      paymentContracts={paymentContracts}
    />
  );
}
