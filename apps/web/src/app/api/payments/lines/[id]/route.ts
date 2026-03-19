import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { encodeDepositMetadata } from "@/lib/payment-plan-helpers";
import { computePayoutAmountFromProposal } from "@/lib/payout-lock-helpers";
import { setLocked, getLockMap } from "@/lib/payments/payoutLock";

/**
 * PATCH /api/payments/lines/[id]
 * Update a payment line (deposit or payout)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Pro Planner can edit payment lines
    if (user.role !== "PRO_PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    const lineId = resolvedParams.id;
    const body = await request.json();
    const { label, amountCents, payeeListingId, mode, lockedToProposal } = body;

    // Try to find as PaymentMilestone (deposit) first
    const milestone = await prisma.paymentMilestone.findUnique({
      where: { id: lineId },
      include: {
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  include: { members: { where: { userId: user.id } } },
                },
              },
            },
          },
        },
      },
    });

    if (milestone) {
      // This is a deposit line
      if (!canManageEvent(user, milestone.proposal.event)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const updated = await prisma.paymentMilestone.update({
        where: { id: lineId },
        data: {
          title: label || milestone.title,
          amountCents: amountCents ?? milestone.amountCents,
        },
      });

      return NextResponse.json(updated);
    }

    // Try to find as Payout
    const payout = await prisma.payout.findUnique({
      where: { id: lineId },
      include: {
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  include: { members: { where: { userId: user.id } } },
                },
              },
            },
          },
        },
      },
    });

    if (payout) {
      // This is a payout line
      if (!canManageEvent(user, payout.proposal.event)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Handle lock/unlock: if locking, sync amount to proposal total
      let finalAmountCents = amountCents ?? payout.amountCents;
      if (lockedToProposal !== undefined) {
        if (lockedToProposal) {
          // Locking: sync amount to proposal total and set lock state
          finalAmountCents = payout.proposal.totalCents;
          await setLocked(
            prisma,
            payout.id,
            payout.proposalId,
            payout.milestoneId,
            true
          );
        } else {
          // Unlocking: keep current amount and remove lock state
          await setLocked(
            prisma,
            payout.id,
            payout.proposalId,
            payout.milestoneId,
            false
          );
        }
      }

      const updated = await prisma.payout.update({
        where: { id: lineId },
        data: {
          amountCents: finalAmountCents,
          listingId: payeeListingId ?? payout.listingId,
        },
      });

      // Return updated payout with lock state
      const lockMap = await getLockMap(prisma, [payout.id]);
      return NextResponse.json({
        ...updated,
        isLocked: !!lockMap[payout.id],
      });
    }

    return NextResponse.json(
      { error: "Payment line not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("[API] Error updating payment line:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update payment line";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/payments/lines/[id]
 * Soft delete a payment line (set status to CANCELED for payouts, or delete milestone)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Pro Planner can delete payment lines
    if (user.role !== "PRO_PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    const lineId = resolvedParams.id;

    // Try to find as PaymentMilestone (deposit) first
    const milestone = await prisma.paymentMilestone.findUnique({
      where: { id: lineId },
      include: {
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  include: { members: { where: { userId: user.id } } },
                },
              },
            },
          },
        },
      },
    });

    if (milestone) {
      if (!canManageEvent(user, milestone.proposal.event)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Delete milestone (deposits can be deleted)
      await prisma.paymentMilestone.delete({
        where: { id: lineId },
      });

      return NextResponse.json({ success: true });
    }

    // Try to find as Payout
    const payout = await prisma.payout.findUnique({
      where: { id: lineId },
      include: {
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  include: { members: { where: { userId: user.id } } },
                },
              },
            },
          },
        },
      },
    });

    if (payout) {
      if (!canManageEvent(user, payout.proposal.event)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Soft delete: set status to CANCELED
      await prisma.payout.update({
        where: { id: lineId },
        data: { status: "CANCELED" },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Payment line not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("[API] Error deleting payment line:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete payment line";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

