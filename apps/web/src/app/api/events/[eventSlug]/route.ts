import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canViewEvent, canDeleteEvent } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/server/lib/activity";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Phase 0 + Phase 2: CLIENT users can only access events via canViewEvent check
    // (which now checks for stakeholder + share)
    // We don't block them here - let canViewEvent handle the permission check

    const event = await prisma.event.findFirst({
      where: { slug: params.eventSlug },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventSlug: string } }
) {
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
      where: { slug: params.eventSlug },
      include: {
        org: { include: { members: true } },
        createdBy: { select: { id: true } },
      },
    });

    // If not found by slug, try by ID
    if (!event) {
      event = await prisma.event.findFirst({
        where: { id: params.eventSlug },
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


