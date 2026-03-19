import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { computePayoutAmountFromProposal } from "@/lib/payout-lock-helpers";
import { setLocked } from "@/lib/payments/payoutLock";

/**
 * POST /api/payments/plan/from-accepted-proposals
 * Build payout plan from accepted proposals (creates locked payout lines)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Pro Planner can build payment plans
    if (user.role !== "PRO_PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { eventId, mode = "SINGLE" } = body;

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
            listing: {
              select: {
                id: true,
                title: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!event || !canManageEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (event.proposals.length === 0) {
      return NextResponse.json(
        { error: "No accepted proposals found for this event" },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;

    // For each accepted proposal, create or update payout line
    for (const proposal of event.proposals) {
      // Find existing payout for this proposal (using proposalId to match)
      // For SINGLE mode, we expect one payout per proposal
      const existingPayout = await prisma.payout.findFirst({
        where: {
          proposalId: proposal.id,
          status: { not: "CANCELED" },
        },
      });

      const computedAmount = computePayoutAmountFromProposal(
        proposal.totalCents,
        mode as "SINGLE" | "THREE_PHASE"
      );

      let payoutId: string;
      if (existingPayout) {
        // Update existing payout: sync amount to proposal total (locked behavior)
        const updatedPayout = await prisma.payout.update({
          where: { id: existingPayout.id },
          data: {
            amountCents: computedAmount,
            listingId: proposal.listingId || existingPayout.listingId,
            // Keep status unchanged unless it's CANCELED (then reactivate)
            status: existingPayout.status === "CANCELED" ? "PENDING" : existingPayout.status,
          },
        });
        payoutId = updatedPayout.id;
        updated++;
      } else {
        // Create new payout line locked to proposal
        const newPayout = await prisma.payout.create({
          data: {
            proposalId: proposal.id,
            listingId: proposal.listingId || null,
            orgId: event.orgId,
            amountCents: computedAmount,
            status: "PENDING",
          },
        });
        payoutId = newPayout.id;
        created++;
      }

      // Set lock state for this payout
      await setLocked(
        prisma,
        payoutId,
        proposal.id,
        null, // milestoneId - can be null for now
        true // locked
      );
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      message: `Created ${created} payout line(s) and updated ${updated} existing payout line(s) from accepted proposals`,
    });
  } catch (error) {
    console.error("[API] Error building payout plan from proposals:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build payout plan from accepted proposals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

