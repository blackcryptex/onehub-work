import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isDemoMode, logDemoMode } from "@/lib/demo-mode";
import { recordActivity, ACTIVITY_ACTIONS } from "@/server/lib/activity";

const markPaidDemoSchema = z.object({
  milestoneId: z.string(),
});

/**
 * Demo-safe endpoint to mark milestone as paid (no Stripe required)
 * Only works in DEMO_MODE
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in demo mode
    if (!isDemoMode()) {
      return NextResponse.json(
        { error: "This endpoint is only available in demo mode" },
        { status: 403 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { milestoneId } = markPaidDemoSchema.parse(body);

    logDemoMode("Marking milestone as paid (demo mode):", milestoneId);

    // Fetch milestone with proposal and event
    const milestone = await prisma.paymentMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        proposal: {
          include: {
            event: {
              include: {
                org: true,
              },
            },
          },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // Update milestone status to PAID (demo mode)
    const updated = await prisma.paymentMilestone.update({
      where: { id: milestoneId },
      data: { status: "PAID" },
    });

    // Record activity
    await recordActivity({
      orgId: milestone.proposal.event.orgId,
      eventId: milestone.proposal.eventId,
      actorId: user.id,
      action: ACTIVITY_ACTIONS.MILESTONE_FUNDS_RELEASED,
      target: milestone.id,
      meta: {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amountCents: milestone.amountCents,
        currency: milestone.proposal.currency,
        demoMode: true,
      },
    });

    return NextResponse.json({
      success: true,
      milestone: updated,
      message: "Milestone marked as paid (Demo Mode)",
    });
  } catch (error) {
    console.error("[api/payments/mark-milestone-paid-demo] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to mark milestone as paid" }, { status: 500 });
  }
}

