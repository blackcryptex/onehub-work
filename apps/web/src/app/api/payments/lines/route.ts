import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { encodeDepositMetadata } from "@/lib/payment-plan-helpers";

/**
 * POST /api/payments/lines
 * Create a new deposit or payout line
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Pro Planner can create payment lines
    if (user.role !== "PRO_PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { mode, label, amountCents, payeeListingId, eventId, proposalId, orgId } = body;

    if (!label || !amountCents || !eventId || !proposalId || !orgId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify event access
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        org: {
          include: { members: { where: { userId: user.id } } },
        },
      },
    });

    if (!event || !canManageEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (mode === "deposit") {
      // Create PaymentMilestone with deposit metadata
      const milestone = await prisma.paymentMilestone.create({
        data: {
          proposalId,
          title: label,
          description: encodeDepositMetadata(),
          dueType: "DATE_ABSOLUTE",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          amountCents,
          status: "PENDING",
        },
      });

      return NextResponse.json(milestone);
    } else if (mode === "payout") {
      if (!payeeListingId) {
        return NextResponse.json(
          { error: "payeeListingId is required for payout lines" },
          { status: 400 }
        );
      }

      // Create Payout
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
    } else {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'deposit' or 'payout'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[API] Error creating payment line:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create payment line";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

