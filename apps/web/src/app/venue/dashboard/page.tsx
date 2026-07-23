import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { VenueDashboard } from "@/components/venue/Dashboard";
import { canAccessDashboard } from "@/lib/rbac";
import { db } from "@/server/db";

export default async function VenueDashboardPage() {
  const user = await getCurrentUser();
  
  if (!user || !canAccessDashboard(user, "VENUE")) {
    redirect("/app");
  }

  const admin = isAdmin(user);

  // Check if user has a Venue organization
  // Admin sees all venue orgs, normal user sees only their own
  
  const org = await db.organization.findFirst({
    where: admin
      ? { type: "VENUE" }
      : { ownerId: user.id, type: "VENUE" },
    orderBy: { createdAt: "desc" },
  });

  // If no org exists, redirect to onboarding
  if (!org) {
    redirect("/providers/onboarding?providerType=venue");
  }

  const listings = await db.listing.findMany({
    where: admin ? {} : { orgId: org.id },
    select: { id: true },
  });
  const listingIds = listings.map((listing) => listing.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const allBookingRequests =
    listingIds.length > 0 || admin
      ? await db.bookingRequest.findMany({
          where: admin ? {} : { listingId: { in: listingIds } },
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
    (request) =>
      request.status === "PENDING" &&
      request.createdAt >= today &&
      request.createdAt < tomorrow
  ).length;

  const upcomingBookings = allBookingRequests.filter(
    (request) =>
      request.startAt >= new Date() &&
      request.status !== "DECLINED" &&
      request.status !== "WITHDRAWN"
  ).length;

  const unreadMessages = await db.notification.count({
    where: {
      userId: user.id,
      orgId: org.id,
      read: false,
    },
  });

  return (
    <VenueDashboard
      orgName={org.name}
      stats={{ todaysLeads, upcomingBookings, unreadMessages }}
      recentRequests={allBookingRequests.slice(0, 5)}
    />
  );
}

