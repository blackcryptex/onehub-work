import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { isDemoMode } from "@/lib/demo-mode";

/**
 * POST /api/demo/milestones/[id]/release
 * Demo mode only: Simulate releasing a milestone (IN_ESCROW → PAID)
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

    // Only allow release if status is IN_ESCROW
    if (milestone.status !== "IN_ESCROW") {
      return NextResponse.json(
        { error: `Cannot release milestone with status: ${milestone.status}` },
        { status: 400 }
      );
    }

    // Update milestone status to PAID (released)
    const updatedMilestone = await prisma.paymentMilestone.update({
      where: { id: milestoneId },
      data: { status: "PAID" },
    });

    console.log("[DEMO_MODE] Milestone released:", {
      milestoneId: updatedMilestone.id,
      status: updatedMilestone.status,
      amountCents: updatedMilestone.amountCents,
    });

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    console.error("[API] Error releasing milestone:", error);
    const message =
      error instanceof Error ? error.message : "Failed to release milestone";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

