import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canViewEvent, canEditEvent, canDeleteEvent } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/server/lib/activity";
import { parseBudget } from "@/lib/parsers/budget";
import { canonicalizeEventType } from "@/lib/parsers/eventType";
import { z } from "zod";
import type { EventType } from "@prisma/client";

const EVENT_TYPE_BY_CANONICAL: Record<NonNullable<ReturnType<typeof canonicalizeEventType>>, EventType> = {
  wedding: "WEDDING",
  conference: "CONFERENCE",
  corporate: "CORPORATE_GALA",
  birthday: "BIRTHDAY",
  fundraiser: "FUNDRAISER",
  festival: "FESTIVAL",
  sports: "SPORTS",
  other: "OTHER",
};

function eventTypeFromCanonical(canonical: ReturnType<typeof canonicalizeEventType>): EventType {
  return canonical ? EVENT_TYPE_BY_CANONICAL[canonical] : "OTHER";
}

const updateEventSchema = z.object({
  name: z.string().trim().min(1, "Event name is required"),
  eventTypeRaw: z.string().trim().min(1, "Event type is required"),
  budgetRaw: z.string().trim().min(1, "Budget is required"),
  date: z.string().trim().min(1, "Event date is required"),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().length(2, "State must be 2 characters").transform((value) => value.toUpperCase()),
  headcount: z.string().trim().refine((value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0;
  }, "Guest count must be greater than 0"),
  objective: z.string().trim().optional().default(""),
  style: z.string().trim().optional().default(""),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELED"]).optional().default("PLANNING"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> }
) {
  const resolvedParams = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Phase 0 + Phase 2: CLIENT users can only access events via canViewEvent check
    // (which now checks for stakeholder + share)
    // We don't block them here - let canViewEvent handle the permission check

    const event = await prisma.event.findFirst({
      where: { slug: resolvedParams.eventSlug },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        org: {
          include: {
            owner: { select: { name: true, email: true } },
            members: {
              where: { userId: user.id },
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
        // Phase 1: Include stakeholders for event-scoped client access
        stakeholders: {
          select: { userId: true, role: true },
        },
        // Phase 2: Include shares for sharing/forwarding
        shares: {
          select: { viewerUserId: true, scope: true },
        },
        budgetLines: { select: { plannedCents: true, actualCents: true, category: true } },
        milestones: { orderBy: { dueAt: "asc" } },
        checklists: { orderBy: { title: "asc" } },
        guestLists: {
          include: {
            guests: { include: { invitations: { select: { respondedAt: true, sentAt: true } } } },
          },
        },
        bookingRequests: {
          include: { listing: { select: { title: true } } },
          orderBy: { createdAt: "desc" },
        },
        proposals: {
          // Removed payouts include - relation may not exist
          orderBy: { createdAt: "desc" },
        },
        activities: { orderBy: { at: "desc" }, take: 20 },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Centralized permission check: see apps/web/src/lib/rbac.ts
    if (!canViewEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> }
) {
  const resolvedParams = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = updateEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid event details", details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const event = await prisma.event.findFirst({
      where: { slug: resolvedParams.eventSlug },
      include: {
        org: { include: { members: true } },
        createdBy: { select: { id: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!canEditEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const input = validationResult.data;
    const startDate = new Date(input.date);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 4);

    const parsedBudget = parseBudget(input.budgetRaw);
    const eventTypeCanonical = canonicalizeEventType(input.eventTypeRaw);
    const estimatedBudget = parsedBudget.max || parsedBudget.min || 0;

    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: {
        name: input.name,
        type: eventTypeFromCanonical(eventTypeCanonical),
        eventTypeRaw: input.eventTypeRaw,
        eventTypeCanonical: eventTypeCanonical || null,
        startAt: startDate,
        endAt: endDate,
        venueCity: input.city,
        venueState: input.state,
        guestTarget: Number.parseInt(input.headcount, 10),
        budgetRaw: input.budgetRaw,
        budgetMin: parsedBudget.min || null,
        budgetMax: parsedBudget.max || null,
        budgetCurrency: parsedBudget.currency || null,
        budgetCents: estimatedBudget,
        objective: input.objective || null,
        description: input.style || null,
        status: input.status,
      },
    });

    await recordActivity({
      orgId: event.orgId,
      eventId: event.id,
      actorId: user.id,
      action: "EVENT_UPDATED",
      target: event.id,
    });

    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> }
) {
  const resolvedParams = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Phase 0: Security hardening - Block CLIENT users from deleting events
    if (user.role === "CLIENT") {
      return NextResponse.json({ error: "Forbidden: CLIENT users cannot delete events" }, { status: 403 });
    }

    // Try to find by slug first, then by ID (in case eventSlug is actually an ID)
    let event = await prisma.event.findFirst({
      where: { slug: resolvedParams.eventSlug },
      include: {
        org: { include: { members: true } },
        createdBy: { select: { id: true } },
      },
    });

    // If not found by slug, try by ID
    if (!event) {
      event = await prisma.event.findFirst({
        where: { id: resolvedParams.eventSlug },
        include: {
          org: { include: { members: true } },
          createdBy: { select: { id: true } },
        },
      });
    }

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Centralized permission check: see apps/web/src/lib/rbac.ts
    if (!canDeleteEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Record activity before deletion
    await recordActivity({
      orgId: event.orgId,
      eventId: event.id,
      actorId: user.id,
      action: "EVENT_DELETED",
      target: event.id,
    });

    // Delete the event (cascade deletes will handle related records)
    await prisma.event.delete({
      where: { id: event.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


