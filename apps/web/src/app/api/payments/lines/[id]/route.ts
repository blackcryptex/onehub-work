import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { isDepositLine } from "@/lib/payment-plan-helpers";
import { setLocked, getLockMap } from "@/lib/payments/payoutLock";

const MUTABLE_MILESTONE_STATUSES = new Set(["PENDING", "OVERDUE"]);
const MUTABLE_PAYOUT_STATUSES = new Set(["PENDING"]);

function isPositiveInt(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function milestoneIsDepositLine(milestone: {
  id: string;
  title: string;
  amountCents: number;
  status: string;
  description: string | null;
  dueDate: Date | null;
  proposalId: string;
}) {
  return isDepositLine({
    id: milestone.id,
    title: milestone.title,
    amountCents: milestone.amountCents,
    status: milestone.status,
    description: milestone.description,
    dueDate: milestone.dueDate,
    proposalId: milestone.proposalId,
  });
}

/**
 * PATCH /api/payments/lines/[id]
 * Update a mutable payment schedule line or pending payout line.
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

    if (user.role !== "PRO_PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    const lineId = resolvedParams.id;
    const body = await request.json();
    const { label, amountCents, payeeListingId, lockedToProposal } = body;

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

      if (!milestoneIsDepositLine(milestone)) {
        return NextResponse.json(
          { error: "Only client payment schedule lines can be edited here" },
          { status: 400 }
        );
      }

      if (!MUTABLE_MILESTONE_STATUSES.has(milestone.status)) {
        return NextResponse.json(
          { error: "Paid, held, escrowed, or refunded payment lines cannot be edited" },
          { status: 409 }
        );
      }

      const data: { title?: string; amountCents?: number } = {};
      if (label !== undefined) {
        if (!isNonEmptyString(label)) {
          return NextResponse.json({ error: "label must be a non-empty string" }, { status: 400 });
        }
        data.title = label.trim();
      }
      if (amountCents !== undefined) {
        if (!isPositiveInt(amountCents)) {
          return NextResponse.json({ error: "amountCents must be a positive integer" }, { status: 400 });
        }
        data.amountCents = amountCents;
      }

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
      }

      const updated = await prisma.paymentMilestone.update({
        where: { id: lineId },
        data,
      });

      return NextResponse.json(updated);
    }

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

      if (!MUTABLE_PAYOUT_STATUSES.has(payout.status)) {
        return NextResponse.json(
          { error: "Sent, failed, or canceled payout lines cannot be edited" },
          { status: 409 }
        );
      }

      let finalAmountCents = payout.amountCents;
      if (amountCents !== undefined) {
        if (!isPositiveInt(amountCents)) {
          return NextResponse.json({ error: "amountCents must be a positive integer" }, { status: 400 });
        }
        finalAmountCents = amountCents;
      }

      if (lockedToProposal !== undefined && lockedToProposal) {
        finalAmountCents = payout.proposal.totalCents;
      }

      const data: { amountCents: number; listingId?: string | null } = {
        amountCents: finalAmountCents,
      };
      if (payeeListingId !== undefined) {
        if (!isNonEmptyString(payeeListingId)) {
          return NextResponse.json({ error: "payeeListingId must be a non-empty string" }, { status: 400 });
        }
        data.listingId = payeeListingId;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const payoutUpdate = await tx.payout.update({
          where: { id: lineId },
          data,
        });

        if (lockedToProposal !== undefined) {
          await setLocked(
            tx,
            payout.id,
            payout.proposalId,
            payout.milestoneId,
            !!lockedToProposal
          );
        }

        return payoutUpdate;
      });

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
 * Delete only mutable client schedule lines or cancel pending payout lines.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "PRO_PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    const lineId = resolvedParams.id;

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

      if (!milestoneIsDepositLine(milestone)) {
        return NextResponse.json(
          { error: "Only client payment schedule lines can be deleted here" },
          { status: 400 }
        );
      }

      if (!MUTABLE_MILESTONE_STATUSES.has(milestone.status)) {
        return NextResponse.json(
          { error: "Paid, held, escrowed, or refunded payment lines cannot be deleted" },
          { status: 409 }
        );
      }

      await prisma.paymentMilestone.delete({
        where: { id: lineId },
      });

      return NextResponse.json({ success: true });
    }

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

      if (!MUTABLE_PAYOUT_STATUSES.has(payout.status)) {
        return NextResponse.json(
          { error: "Only pending payout lines can be canceled" },
          { status: 409 }
        );
      }

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
