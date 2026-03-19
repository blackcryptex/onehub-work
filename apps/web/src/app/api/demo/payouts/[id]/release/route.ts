import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { isDemoMode } from "@/lib/demo-mode";

/**
 * POST /api/demo/payouts/[id]/release
 * Demo mode only: Simulate releasing a payout (PENDING → SENT)
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
    const payoutId = resolvedParams.id;

    // Load payout with proposal and event
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
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

    if (!payout) {
      return NextResponse.json(
        { error: "Payout not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (!canManageEvent(user, payout.proposal.event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow release if status is PENDING
    if (payout.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot release payout with status: ${payout.status}` },
        { status: 400 }
      );
    }

    // Update payout status to SENT (released)
    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: { status: "SENT" },
    });

    console.log("[DEMO_MODE] Payout released:", {
      payoutId: updatedPayout.id,
      status: updatedPayout.status,
      amountCents: updatedPayout.amountCents,
    });

    return NextResponse.json(updatedPayout);
  } catch (error) {
    console.error("[API] Error releasing payout:", error);
    const message =
      error instanceof Error ? error.message : "Failed to release payout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

