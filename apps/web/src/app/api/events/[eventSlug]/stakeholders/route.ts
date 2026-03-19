import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { z } from "zod";

const addStakeholderSchema = z.object({
  userId: z.string(),
  role: z.enum(["CLIENT", "STAKEHOLDER"]).default("CLIENT"),
});

/**
 * POST /api/events/[eventSlug]/stakeholders
 * 
 * Add a stakeholder (client) to an event.
 * Only planners who can manage the event can add stakeholders.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only planners can add stakeholders
    if (user.role !== "PRO_PLANNER" && user.role !== "DIY_PLANNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only planners can add stakeholders" }, { status: 403 });
    }

    // Get event
    const event = await prisma.event.findUnique({
      where: { slug: params.eventSlug },
      include: {
        org: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check permissions
    if (!canManageEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden: You cannot manage this event" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = addStakeholderSchema.parse(body);

    // Verify the user exists and is a CLIENT (if role is CLIENT)
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (role === "CLIENT" && targetUser.role !== "CLIENT") {
      return NextResponse.json({ error: "User must be a CLIENT to be assigned as a client stakeholder" }, { status: 400 });
    }

    // Create EventStakeholder record
    try {
      const stakeholder = await prisma.eventStakeholder.create({
        data: {
          eventId: event.id,
          userId,
          role,
          addedByUserId: user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        stakeholder: {
          id: stakeholder.id,
          userId: stakeholder.userId,
          role: stakeholder.role,
          user: stakeholder.user,
        },
      });
    } catch (error: any) {
      // Handle unique constraint violation (stakeholder already exists)
      if (error?.code === "P2002") {
        return NextResponse.json({ error: "User is already a stakeholder for this event" }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error adding stakeholder:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add stakeholder" }, { status: 500 });
  }
}

/**
 * DELETE /api/events/[eventSlug]/stakeholders?userId=xxx
 * 
 * Remove a stakeholder from an event.
 * Only planners who can manage the event can remove stakeholders.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only planners can remove stakeholders
    if (user.role !== "PRO_PLANNER" && user.role !== "DIY_PLANNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only planners can remove stakeholders" }, { status: 403 });
    }

    // Get event
    const event = await prisma.event.findUnique({
      where: { slug: params.eventSlug },
      include: {
        org: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check permissions
    if (!canManageEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden: You cannot manage this event" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
    }

    // Delete EventStakeholder record
    const deleted = await prisma.eventStakeholder.deleteMany({
      where: {
        eventId: event.id,
        userId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Stakeholder not found" }, { status: 404 });
    }

    // Optionally remove EventShare records for this user (cleanup)
    await prisma.eventShare.deleteMany({
      where: {
        eventId: event.id,
        viewerUserId: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing stakeholder:", error);
    return NextResponse.json({ error: "Failed to remove stakeholder" }, { status: 500 });
  }
}

