import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { encodeDepositMetadata, isDepositLine } from "@/lib/payment-plan-helpers";

const PAYABLE_CONTRACT_STATUSES = new Set(["FULLY_SIGNED", "IN_PAYMENT"]);
const MUTABLE_SCHEDULE_STATUSES = new Set(["PENDING", "OVERDUE"]);

/**
 * POST /api/payments/deposits/auto
 * Auto-create client deposit schedule that matches total payout allocation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Pro Planner can create deposit schedules
    if (user.role !== "PRO_PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { eventId, mode = "THREE" } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    // Fetch event with proposals
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        org: {
          include: { members: { where: { userId: user.id } } },
        },
        proposals: {
          include: {
            contract: { select: { id: true, status: true } },
            milestones: true,
          },
        },
      },
    });

    if (!event || !canManageEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get first proposal for linking deposits (same pattern as milestones page)
    const firstProposal = event.proposals[0];
    if (!firstProposal) {
      return NextResponse.json(
        { error: "No proposals found for this event" },
        { status: 400 }
      );
    }

    if (!firstProposal.contract || !PAYABLE_CONTRACT_STATUSES.has(firstProposal.contract.status)) {
      return NextResponse.json(
        { error: "Client payment schedules require a signed payable contract" },
        { status: 400 }
      );
    }

    // Load event payouts (exclude canceled/failed statuses)
    const proposalIds = event.proposals.map((p) => p.id);
    const payouts = await prisma.payout.findMany({
      where: {
        proposalId: { in: proposalIds },
        status: { not: "CANCELED" },
      },
    });

    // Calculate total payout amount
    const totalPayoutCents = payouts.reduce((sum, p) => sum + p.amountCents, 0);

    if (totalPayoutCents === 0) {
      return NextResponse.json(
        { error: "No payout plan yet. Build payouts first." },
        { status: 400 }
      );
    }

    // Compute deposit schedule based on mode
    let depositAmounts: { label: string; amountCents: number }[] = [];

    if (mode === "THREE") {
      // 30/40/30 split
      const deposit = Math.floor(totalPayoutCents * 0.3);
      const mid = Math.floor(totalPayoutCents * 0.4);
      const final = totalPayoutCents - deposit - mid; // Ensure exact total
      depositAmounts = [
        { label: "Client Deposit", amountCents: deposit },
        { label: "Mid Payment", amountCents: mid },
        { label: "Final Payment", amountCents: final },
      ];
    } else if (mode === "TWO") {
      // 50/50 split
      const deposit = Math.floor(totalPayoutCents * 0.5);
      const final = totalPayoutCents - deposit;
      depositAmounts = [
        { label: "Client Deposit", amountCents: deposit },
        { label: "Final Payment", amountCents: final },
      ];
    } else if (mode === "ONE") {
      // 100% single deposit
      depositAmounts = [{ label: "Client Deposit", amountCents: totalPayoutCents }];
    } else {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'THREE', 'TWO', or 'ONE'" },
        { status: 400 }
      );
    }

    // Preflight every target line before any write so rebuilds cannot partially mutate.
    const depositPlan = [];

    for (const { label, amountCents } of depositAmounts) {
      const allMilestones = await prisma.paymentMilestone.findMany({
        where: {
          proposalId: firstProposal.id,
          title: label,
        },
      });

      const existingDeposits = allMilestones.filter((m) =>
        isDepositLine({
          id: m.id,
          title: m.title,
          amountCents: m.amountCents,
          status: m.status,
          description: m.description,
          dueDate: m.dueDate,
          proposalId: m.proposalId,
        })
      );

      const lockedDeposit = existingDeposits.find(
        (m) => !MUTABLE_SCHEDULE_STATUSES.has(m.status)
      );
      if (lockedDeposit) {
        return NextResponse.json(
          { error: "Paid, held, escrowed, or refunded payment schedule lines cannot be rebuilt" },
          { status: 409 }
        );
      }

      depositPlan.push({ label, amountCents, existingDeposit: existingDeposits[0] });
    }

    // Upsert deposits (idempotent by title + proposalId) only after preflight passes.
    const createdDeposits = [];
    const updatedDeposits = [];

    for (const { label, amountCents, existingDeposit } of depositPlan) {
      if (existingDeposit) {
        const updated = await prisma.paymentMilestone.update({
          where: { id: existingDeposit.id },
          data: {
            amountCents,
          },
        });
        updatedDeposits.push(updated);
      } else {
        const created = await prisma.paymentMilestone.create({
          data: {
            proposalId: firstProposal.id,
            title: label,
            description: encodeDepositMetadata(),
            dueType: "DATE_ABSOLUTE",
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            amountCents,
            status: "PENDING",
          },
        });
        createdDeposits.push(created);
      }
    }

    const totalDepositsCents = depositAmounts.reduce(
      (sum, d) => sum + d.amountCents,
      0
    );

    return NextResponse.json({
      success: true,
      created: createdDeposits.length,
      updated: updatedDeposits.length,
      deposits: [...createdDeposits, ...updatedDeposits],
      totalPayoutCents,
      totalDepositsCents,
      message: `Deposit schedule created: ${depositAmounts.length} deposit(s) totaling ${totalDepositsCents} cents`,
    });
  } catch (error) {
    console.error("[API] Error auto-creating deposit schedule:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to auto-create deposit schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

