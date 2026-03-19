import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canReleaseMilestonePayment } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { stripe } from "@/server/lib/stripe";
import { recordActivity, ACTIVITY_ACTIONS } from "@/server/lib/activity";
import { recordAudit } from "@/server/lib/audit";
import { getRequestLogger } from "@/lib/logger";
import { trackError } from "@/lib/errorTracker";
import { isDemoMode, logDemoMode } from "@/lib/demo-mode";

const releaseMilestoneSchema = z.object({
  milestoneId: z.string(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || undefined;
  const logger = getRequestLogger(requestId);
  
  let user: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  let body: { milestoneId?: string } | null = null;
  
  try {
    user = await getCurrentUser();
    if (!user) {
      logger.warn({ route: "/api/payments/release-milestone" }, "Unauthorized milestone release attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    body = await request.json();
    const { milestoneId } = releaseMilestoneSchema.parse(body);
    
    logger.debug({ userId: user.id, milestoneId, route: "/api/payments/release-milestone" }, "Milestone release started");

    // Fetch milestone with proposal, contract, event, and organization
    const milestone = await prisma.paymentMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        proposal: {
          include: {
            contract: true,
            escrowAccount: true,
            event: {
              include: {
                org: {
                  include: {
                    members: true,
                    owner: true,
                  },
                },
              },
            },
            org: {
              include: {
                owner: true,
              },
            },
          },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // Idempotency guard: if milestone is already PAID, return success
    if (milestone.status === "PAID") {
      // Check if payout exists (using findFirst until migration completes)
      const existingPayout = await prisma.payout.findFirst({
        where: { milestoneId: milestone.id },
      });
      if (existingPayout) {
        return NextResponse.json({
          success: true,
          payoutId: existingPayout.id,
          message: "Payment already released",
        });
      }
    }

    // Verify milestone is in escrow
    // Note: IN_ESCROW status will be available after Prisma migration
    if ((milestone.status as string) !== "IN_ESCROW") {
      return NextResponse.json({ error: "Milestone is not in escrow" }, { status: 400 });
    }

    // Verify user has permission (only admins, org owners, and PRO_PLANNER can release)
    const contract = milestone.proposal.contract;
    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const event = milestone.proposal.event;
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Centralized permission check: see apps/web/src/lib/rbac.ts
    // Only admins, org owners, and PRO_PLANNER can release payments (not buyers or sellers)
    if (!canReleaseMilestonePayment(user, event)) {
      return NextResponse.json({ error: "You do not have permission to release this payment" }, { status: 403 });
    }

    // Verify escrow has sufficient balance
    const escrowAccount = milestone.proposal.escrowAccount;
    if (!escrowAccount || escrowAccount.balanceCents < milestone.amountCents) {
      return NextResponse.json({ error: "Insufficient escrow balance" }, { status: 400 });
    }

    // Get seller's Stripe Connect account (if available)
    // TODO: Implement Stripe Connect account lookup
    const sellerOrg = milestone.proposal.org;
    const sellerStripeAccountId = null; // Placeholder: should fetch from Organization.stripeConnectAccountId

    // Demo mode: skip Stripe, just update status
    if (isDemoMode()) {
      logDemoMode("Demo mode: updating milestone status without Stripe");
      const result = await prisma.$transaction(async (tx) => {
        // Update milestone status to PAID
        await tx.paymentMilestone.update({
          where: { id: milestoneId },
          data: { status: "PAID" },
        });

        // Create payout record (demo mode - no Stripe)
        const payout = await tx.payout.create({
          data: {
            proposalId: milestone.proposalId,
            milestoneId: milestone.id,
            listingId: milestone.proposal.listingId || undefined,
            orgId: sellerOrg.id,
            amountCents: milestone.amountCents,
            status: "SENT", // Demo mode: mark as sent immediately
          },
        });

        // Update escrow if exists
        if (escrowAccount) {
          await tx.escrowAccount.update({
            where: { id: escrowAccount.id },
            data: {
              balanceCents: { decrement: milestone.amountCents },
              status: escrowAccount.balanceCents === milestone.amountCents ? "RELEASED" : "PARTIALLY_RELEASED",
            },
          });
        }

        return { payout };
      });

      await recordActivity({
        orgId: event.orgId,
        eventId: event.id,
        actorId: user?.id,
        action: ACTIVITY_ACTIONS.MILESTONE_FUNDS_RELEASED,
        target: milestone.id,
        meta: {
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          amountCents: milestone.amountCents,
          currency: milestone.proposal.currency,
          payoutId: result.payout.id,
          demoMode: true,
        },
      });

      return NextResponse.json({
        success: true,
        payoutId: result.payout.id,
        message: "Payment released successfully (Demo Mode)",
      });
    }

    // Wrap in transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Re-check milestone status within transaction
      const currentMilestone = await tx.paymentMilestone.findUnique({
        where: { id: milestoneId },
      });

      if (!currentMilestone) {
        throw new Error("Milestone not found");
      }

      // Idempotency guard: check status again within transaction
      if (currentMilestone.status === "PAID") {
        const existingPayout = await tx.payout.findFirst({
          where: { milestoneId: milestone.id },
        });
        if (existingPayout) {
          return { payout: existingPayout, alreadyProcessed: true };
        }
      }

      // Create payout record (unique constraint on milestoneId prevents duplicates)
      const payout = await tx.payout.create({
        data: {
          proposalId: milestone.proposalId,
          milestoneId: milestone.id,
          listingId: milestone.proposal.listingId || undefined,
          orgId: sellerOrg.id,
          amountCents: milestone.amountCents,
          status: "PENDING",
        },
      });

      // If Stripe Connect account exists, create transfer
      let stripeTransferId: string | undefined;
      if (sellerStripeAccountId && stripe) {
        try {
          const transfer = await stripe.transfers.create({
            amount: milestone.amountCents,
            currency: milestone.proposal.currency.toLowerCase(),
            destination: sellerStripeAccountId,
            metadata: {
              payoutId: payout.id,
              milestoneId: milestone.id,
              proposalId: milestone.proposalId,
            },
          });

          stripeTransferId = transfer.id;
          await tx.payout.update({
            where: { id: payout.id },
            data: {
              stripeTransfer: transfer.id,
              status: "SENT",
            },
          });
        } catch (stripeError) {
          console.error("Stripe transfer error:", stripeError);
          // Continue with payout creation even if Stripe transfer fails
        }
      }

      // Update milestone status
      await tx.paymentMilestone.update({
        where: { id: milestoneId },
        data: { status: "PAID" },
      });

      // Update escrow account balance
      await tx.escrowAccount.update({
        where: { id: escrowAccount.id },
        data: {
          balanceCents: { decrement: milestone.amountCents },
          status: escrowAccount.balanceCents === milestone.amountCents ? "RELEASED" : "PARTIALLY_RELEASED",
        },
      });

      // Update contract status if all milestones are paid
      // Note: IN_PAYMENT and COMPLETED statuses will be available after Prisma migration
      const allMilestones = await tx.paymentMilestone.findMany({
        where: { proposalId: milestone.proposalId },
      });
      const allPaid = allMilestones.every((m) => m.status === "PAID");
      const contractStatusBefore = contract.status;
      if (allPaid && (contract.status as string) === "IN_PAYMENT") {
        await tx.contract.update({
          where: { id: contract.id },
          data: { status: "COMPLETED" as any },
        });
      }

      // Create MoneyTx entry for the release (unique constraint on stripeId prevents duplicates if transfer exists)
      if (stripeTransferId) {
        await tx.moneyTx.create({
          data: {
            type: "RELEASE_ESCROW",
            proposalId: milestone.proposalId,
            milestoneId: milestone.id,
            amountCents: milestone.amountCents,
            currency: milestone.proposal.currency,
            stripeId: stripeTransferId,
            meta: {
              payoutId: payout.id,
              releasedBy: user?.id,
              releasedByRole: user?.role,
              escrowBalanceBefore: escrowAccount.balanceCents,
              escrowBalanceAfter: escrowAccount.balanceCents - milestone.amountCents,
            },
          },
        });
      } else {
        // Create MoneyTx without stripeId if no transfer
        await tx.moneyTx.create({
          data: {
            type: "RELEASE_ESCROW",
            proposalId: milestone.proposalId,
            milestoneId: milestone.id,
            amountCents: milestone.amountCents,
            currency: milestone.proposal.currency,
            meta: {
              payoutId: payout.id,
              releasedBy: user?.id,
              releasedByRole: user?.role,
              escrowBalanceBefore: escrowAccount.balanceCents,
              escrowBalanceAfter: escrowAccount.balanceCents - milestone.amountCents,
            },
          },
        });
      }

      return { payout, contractStatusBefore, allPaid, stripeTransferId };
    });

    // If already processed, return early
    if (result.alreadyProcessed) {
      return NextResponse.json({
        success: true,
        payoutId: result.payout.id,
        message: "Payment already released",
      });
    }

    const { payout, contractStatusBefore, allPaid, stripeTransferId } = result;

    // Audit: Log that funds were released from escrow for this milestone (Activity for event timeline)
    await recordActivity({
      orgId: event.orgId,
      eventId: event.id,
      actorId: user?.id,
      action: ACTIVITY_ACTIONS.MILESTONE_FUNDS_RELEASED,
      target: milestone.id,
      meta: {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amountCents: milestone.amountCents,
        currency: milestone.proposal.currency,
        payoutId: payout.id,
        payoutStatus: payout.status,
        stripeTransferId: stripeTransferId || payout.stripeTransfer,
        releasedByRole: user.role,
        escrowStatusBefore: escrowAccount.status,
        escrowStatusAfter: escrowAccount.balanceCents === milestone.amountCents ? "RELEASED" : "PARTIALLY_RELEASED",
        contractStatusBefore,
        contractStatusAfter: allPaid && (contractStatusBefore as string) === "IN_PAYMENT" ? "COMPLETED" : contractStatusBefore,
      },
    });

    // Audit: Also log to AuditLog for org-wide admin audit trail
    await recordAudit({
      actorId: user?.id,
      orgId: event.orgId,
      action: "payment.milestone.release",
      target: milestone.id,
      metadata: {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amountCents: milestone.amountCents,
        currency: milestone.proposal.currency,
        payoutId: payout.id,
        stripeTransferId: stripeTransferId || payout.stripeTransfer,
        proposalId: milestone.proposalId,
        contractId: contract.id,
        eventId: event.id,
      },
    });

    // Structured logging for successful milestone release
    logger.info({
      userId: user?.id,
      milestoneId,
      payoutId: payout.id,
      orgId: event.orgId,
      eventId: event.id,
      proposalId: milestone.proposalId,
      amountCents: milestone.amountCents,
      currency: milestone.proposal.currency,
      route: "/api/payments/release-milestone",
    }, "payment.milestone_released");

    return NextResponse.json({
      success: true,
      payoutId: payout.id,
      message: "Payment released successfully",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to release payment";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Structured error logging
    logger.error({
      userId: user?.id,
      milestoneId: body?.milestoneId,
      route: "/api/payments/release-milestone",
      error: errorMessage,
      stack: errorStack,
    }, "payment.milestone_release_failed");

    // Track error for monitoring
    trackError(error, {
      route: "/api/payments/release-milestone",
      userId: user?.id,
      milestoneId: body?.milestoneId,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to release payment" }, { status: 500 });
  }
}

