import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { encodeDepositMetadata } from "@/lib/payment-plan-helpers";

const PAYABLE_CONTRACT_STATUSES = new Set(["FULLY_SIGNED", "IN_PAYMENT"]);

function isPositiveInt(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * POST /api/payments/lines
 * Create a payment schedule line or payout line.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "PRO_PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { mode, label, amountCents, payeeListingId, eventId, proposalId, orgId } = body;

    if (
      (mode !== "deposit" && mode !== "payout") ||
      !isNonEmptyString(label) ||
      !isPositiveInt(amountCents) ||
      !isNonEmptyString(eventId) ||
      !isNonEmptyString(proposalId) ||
      !isNonEmptyString(orgId)
    ) {
      return NextResponse.json({ error: "Invalid payment line payload" }, { status: 400 });
    }

    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        eventId,
        orgId,
      },
      include: {
        contract: { select: { id: true, status: true } },
        event: {
          include: {
            org: {
              include: { members: { where: { userId: user.id } } },
            },
          },
        },
      },
    });

    if (!proposal || !canManageEvent(user, proposal.event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (proposal.event.orgId !== orgId) {
      return NextResponse.json({ error: "Payment line org mismatch" }, { status: 400 });
    }

    if (mode === "deposit") {
      if (!proposal.contract || !PAYABLE_CONTRACT_STATUSES.has(proposal.contract.status)) {
        return NextResponse.json(
          { error: "Client payment schedule lines require a signed payable contract" },
          { status: 400 }
        );
      }

      const milestone = await prisma.paymentMilestone.create({
        data: {
          proposalId,
          title: label.trim(),
          description: encodeDepositMetadata(),
          dueType: "DATE_ABSOLUTE",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amountCents,
          status: "PENDING",
        },
      });

      return NextResponse.json(milestone);
    }

    if (!isNonEmptyString(payeeListingId)) {
      return NextResponse.json(
        { error: "payeeListingId is required for payout lines" },
        { status: 400 }
      );
    }

    const payout = await prisma.payout.create({
      data: {
        proposalId,
        listingId: payeeListingId,
        orgId,
        amountCents,
        status: "PENDING",
      },
    });

    return NextResponse.json(payout);
  } catch (error) {
    console.error("[API] Error creating payment line:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create payment line";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
