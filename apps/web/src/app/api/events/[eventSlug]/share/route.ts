import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { sendEventSharedEmail } from "@/lib/email.service";
import { z } from "zod";

const shareEventSchema = z.object({
  viewerUserId: z.string(),
  scope: z.enum(["SUMMARY"]).default("SUMMARY"),
});

/**
 * Phase 2: Share event content with a client
 * 
 * POST /api/events/[eventSlug]/share
 * 
 * Only Pro Planners (or event managers) can share content.
 * Requires the viewer to be an EventStakeholder.
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

    // Only planners can share content
    if (user.role !== "PRO_PLANNER" && user.role !== "DIY_PLANNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only planners can share event content" }, { status: 403 });
    }

    const body = await request.json();
    const { viewerUserId, scope } = shareEventSchema.parse(body);

    // Fetch event with org and stakeholders
    const event = await prisma.event.findFirst({
      where: { slug: params.eventSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        orgId: true,
        createdById: true,
        org: { include: { members: true } },
        stakeholders: {
          where: { userId: viewerUserId },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user can manage this event
    if (!canManageEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden: You cannot manage this event" }, { status: 403 });
    }

    // Verify viewer is a stakeholder
    const isStakeholder = event.stakeholders && event.stakeholders.length > 0;
    if (!isStakeholder) {
      return NextResponse.json(
        { error: "Viewer must be a stakeholder before content can be shared" },
        { status: 400 }
      );
    }

    // Check if share already exists
    const existingShare = await prisma.eventShare.findFirst({
      where: {
        eventId: event.id,
        viewerUserId,
        scope,
      },
    });

    if (existingShare) {
      return NextResponse.json({ 
        message: "Content already shared",
        share: existingShare 
      });
    }

    // Create share
    const share = await prisma.eventShare.create({
      data: {
        eventId: event.id,
        viewerUserId,
        scope,
        createdByUserId: user.id,
      },
    });

    // Phase 7A: Email notification hook
    // Send email to client when content is shared
    try {
      const viewerUser = await prisma.user.findUnique({
        where: { id: viewerUserId },
        select: { email: true, name: true },
      });

      if (viewerUser && scope === "SUMMARY") {
        // Trigger email notification (async - don't block response)
        // If email service exists, use it; otherwise log for manual sending
        const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/client/events/${event.slug}`;
        
        // Send email notification
        await sendEventSharedEmail({
          to: viewerUser.email,
          clientName: viewerUser.name,
          eventName: event.name,
          eventUrl,
          plannerName: user.name || "Your planner",
        });
      }
    } catch (emailError) {
      // Don't fail share creation if email fails
      console.error("[Email Notification] Failed to send email:", emailError);
    }

    return NextResponse.json({ 
      message: "Content shared successfully",
      share 
    });
  } catch (error) {
    console.error("Error sharing event:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to share event" }, { status: 500 });
  }
}

/**
 * Phase 2: Unshare event content with a client
 * 
 * DELETE /api/events/[eventSlug]/share
 * 
 * Only Pro Planners (or event managers) can unshare content.
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

    // Only planners can unshare content
    if (user.role !== "PRO_PLANNER" && user.role !== "DIY_PLANNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only planners can unshare event content" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const viewerUserId = searchParams.get("viewerUserId");
    const scope = searchParams.get("scope") || "SUMMARY";

    if (!viewerUserId) {
      return NextResponse.json({ error: "viewerUserId is required" }, { status: 400 });
    }

    // Fetch event
    const event = await prisma.event.findFirst({
      where: { slug: params.eventSlug },
      include: {
        org: { include: { members: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user can manage this event
    if (!canManageEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden: You cannot manage this event" }, { status: 403 });
    }

    // Find and delete share
    const share = await prisma.eventShare.findFirst({
      where: {
        eventId: event.id,
        viewerUserId,
        scope: scope as "SUMMARY",
      },
    });

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    await prisma.eventShare.delete({
      where: { id: share.id },
    });

    return NextResponse.json({ message: "Content unshared successfully" });
  } catch (error) {
    console.error("Error unsharing event:", error);
    return NextResponse.json({ error: "Failed to unshare event" }, { status: 500 });
  }
}
