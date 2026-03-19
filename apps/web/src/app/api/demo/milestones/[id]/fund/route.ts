import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { isDemoMode } from "@/lib/demo-mode";

/**
 * POST /api/demo/milestones/[id]/fund
 * Demo mode only: Simulate funding a milestone (PENDING → IN_ESCROW)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check demo mode
    if (!isDemoMode()) {
      return NextResponse.json(
        { error: "Demo mode only" },
        { status: 403 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const milestoneId = resolvedParams.id;

    // Load milestone with proposal and event
    const milestone = await prisma.paymentMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  include: {
                    members: {
                      where: { userId: user.id },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (!canManageEvent(user, milestone.proposal.event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow funding if status is PENDING
    if (milestone.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot fund milestone with status: ${milestone.status}` },
        { status: 400 }
      );
    }

    // Update milestone status to IN_ESCROW (funded)
    const updatedMilestone = await prisma.paymentMilestone.update({
      where: { id: milestoneId },
      data: { status: "IN_ESCROW" },
    });

    console.log("[DEMO_MODE] Milestone funded:", {
      milestoneId: updatedMilestone.id,
      status: updatedMilestone.status,
      amountCents: updatedMilestone.amountCents,
    });

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    console.error("[API] Error funding milestone:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fund milestone";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

