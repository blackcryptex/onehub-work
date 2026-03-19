import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { encodeDepositMetadata } from "@/lib/payment-plan-helpers";

/**
 * POST /api/payments/auto-build
 * Auto-build payment plan from accepted proposals
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Pro Planner can auto-build
    if (user.role !== "PRO_PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    // Fetch event with accepted proposals
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        org: {
          include: { members: { where: { userId: user.id } } },
        },
        proposals: {
          where: { status: "ACCEPTED" },
          include: {
            listing: true,
          },
        },
      },
    });

    if (!event || !canManageEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get first proposal for linking deposits (or create a dummy one)
    const firstProposal = event.proposals[0];
    if (!firstProposal) {
      return NextResponse.json(
        { error: "No accepted proposals found for this event" },
        { status: 400 }
      );
    }

    const created: { deposits: number; payouts: number } = {
      deposits: 0,
      payouts: 0,
    };

    // Create payout lines for each accepted proposal (simple: one payout per proposal)
    for (const proposal of event.proposals) {
      if (!proposal.listingId) continue;

      // Check if payout already exists for this proposal
      const existing = await prisma.payout.findFirst({
        where: {
          proposalId: proposal.id,
          status: { not: "CANCELED" },
        },
      });

      if (!existing) {
        await prisma.payout.create({
          data: {
            proposalId: proposal.id,
            listingId: proposal.listingId,
            orgId: event.orgId,
            amountCents: proposal.totalCents,
            status: "PENDING",
          },
        });
        created.payouts++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      message: `Created ${created.payouts} payout line(s) from accepted proposals`,
    });
  } catch (error) {
    console.error("[API] Error auto-building payment plan:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to auto-build payment plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

