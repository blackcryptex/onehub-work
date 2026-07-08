import { Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canViewEvent, isEventSharedWithUser } from "@/lib/rbac";
import { redirect, notFound } from "next/navigation";
import { Calendar, MapPin, Users, DollarSign, MessageSquare } from "lucide-react";
import { DepositPanel } from "@/components/client/DepositPanel";

/**
 * Phase 2: Client-safe event summary view
 *
 * Route: /client/events/[eventSlug]
 *
 * Only CLIENT users can access this route.
 * Shows a minimal, client-safe summary of the event.
 * Content is only visible if explicitly shared by the Pro Planner.
 */
export default async function ClientEventSummaryPage({
  params
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const resolvedParams = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  // Only CLIENT users can access this route
  if (user.role !== "CLIENT") {
    redirect("/app");
  }

  // Fetch event with stakeholders, shares, and deposits
  const event = await prisma.event.findFirst({
    where: { slug: resolvedParams.eventSlug },
    include: {
      createdBy: { select: { name: true, email: true } },
      org: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          owner: { select: { name: true, email: true } },
        },
      },
      stakeholders: {
        where: { userId: user.id },
        select: { userId: true, role: true },
      },
      shares: {
        where: { viewerUserId: user.id, scope: "SUMMARY" },
        select: { viewerUserId: true, scope: true },
      },
      deposits: {
        where: { clientUserId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amountCents: true,
          currency: true,
          status: true,
          createdAt: true,
          notes: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Check if user can view this event (stakeholder + shared)
  if (!canViewEvent(user, event)) {
    // Check if they're a stakeholder but content isn't shared
    const isStakeholder = event.stakeholders && event.stakeholders.length > 0;
    const isShared = isEventSharedWithUser(user, event, "SUMMARY");

    if (isStakeholder && !isShared) {
      // Show "Nothing shared yet" message
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">{event.name}</h1>
            <Card className="p-8">
              <p className="text-slate-600 text-lg">
                Nothing shared yet.
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Your planner hasn't shared any information about this event yet.
              </p>
            </Card>
          </div>
        </div>
      );
    }

    // Not a stakeholder or not authorized
    redirect("/app");
  }

  // Client-safe summary view - only show basic, non-sensitive information
  const eventDate = new Date(event.startAt);
  const eventDateFormatted = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const eventTimeFormatted = eventDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const location = [event.venueCity, event.venueState]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
        {event.org && (
          <p className="text-slate-600">
            Event by {event.org.name}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Event Date & Time */}
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Date & Time</h3>
              <p className="text-slate-700">{eventDateFormatted}</p>
              <p className="text-slate-600 text-sm">{eventTimeFormatted}</p>
            </div>
          </div>
        </Card>

        {/* Location */}
        {location && (
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Location</h3>
                <p className="text-slate-700">{location}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Guest Count */}
        {event.guestTarget && (
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-slate-500 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Expected Guests</h3>
                <p className="text-slate-700">{event.guestTarget} guests</p>
              </div>
            </div>
          </Card>
        )}

        {/* Event Type */}
        {event.eventTypeCanonical && (
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Event Type</h3>
                <p className="text-slate-700 capitalize">{event.eventTypeCanonical}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <Card className="p-6">
          <h3 className="font-semibold mb-3">About This Event</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{event.description}</p>
        </Card>
      )}

      {/* Objective */}
      {event.objective && (
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Objective</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{event.objective}</p>
        </Card>
      )}

      {/* Deposit Panel */}
      <DepositPanel
        eventSlug={resolvedParams.eventSlug}
        deposits={event.deposits.map((d) => ({
          id: d.id,
          amountCents: d.amountCents,
          currency: d.currency,
          status: d.status as "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED",
          createdAt: d.createdAt.toISOString(),
          notes: d.notes,
        }))}
      />

      {/* Messages Section - Placeholder */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold">Messages</h3>
        </div>
        <p className="text-sm text-slate-600">
          Messaging functionality will be integrated here. You can communicate with your planner about this event.
        </p>
      </Card>

      {/* Note about limited access */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This is a summary view. Your planner may share additional details as the event approaches.
        </p>
      </Card>
    </div>
  );
}
