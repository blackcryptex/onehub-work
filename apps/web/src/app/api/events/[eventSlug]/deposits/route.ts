import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canViewEvent } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

/**
 * Standalone event deposits are disabled.
 * 
 * POST /api/events/[eventSlug]/deposits
 * 
 * Client payments must use signed contracts and approved payment schedules.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await params;
    return NextResponse.json(
      {
        error:
          "Standalone deposits are disabled. Use signed contract payment schedules for client payments.",
      },
      { status: 410 }
    );
  } catch (error) {
    console.error("Error creating deposit:", error);
    return NextResponse.json({ error: "Failed to create deposit" }, { status: 500 });
  }
}

/**
 * Phase 7A: Get deposits for an event
 * 
 * GET /api/events/[eventSlug]/deposits
 * 
 * Clients can see their own deposits.
 * Pro Planners can see all deposits for their events.
 */
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

    // Fetch event
    const event = await prisma.event.findFirst({
      where: { slug: resolvedParams.eventSlug },
      include: {
        org: true,
        stakeholders: {
          where: { userId: user.id },
        },
        shares: {
          where: { viewerUserId: user.id, scope: "SUMMARY" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user can view this event
    if (!canViewEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build where clause based on role
    const where: Prisma.DepositWhereInput = { eventId: event.id };
    
    if (user.role === "CLIENT") {
      // Clients can only see their own deposits
      where.clientUserId = user.id;
    } else if (user.role === "PRO_PLANNER" || user.role === "DIY_PLANNER") {
      // Planners can see all deposits for their events
      // No additional filter needed
    } else {
      // Other roles cannot view deposits
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deposits = await prisma.deposit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        clientUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      deposits: deposits.map((d) => ({
        id: d.id,
        amountCents: d.amountCents,
        currency: d.currency,
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        notes: d.notes,
        clientName: d.clientUser.name,
        clientEmail: d.clientUser.email,
      })),
    });
  } catch (error) {
    console.error("Error fetching deposits:", error);
    return NextResponse.json({ error: "Failed to fetch deposits" }, { status: 500 });
  }
}
