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
import { resolveBookingClassification } from "@/lib/booking-classification";
import { resolveFeeProfile } from "@/lib/fee-profile";
import { acceptanceInputSchema, CURRENT_ACCEPTANCE_VERSIONS, recordAcceptance } from "@/lib/acceptance";
import { hasBlockingRefundRequest } from "@/lib/refund-request";
import { getBlockingDisputeCase } from "@/lib/dispute-case";
import { getBlockingHoldbackForMilestone } from "@/lib/holdback";
import { getLegalSurface } from "@/lib/legal-surface";
import { recordAdminOverride } from "@/lib/admin-override";

const releaseMilestoneSchema = z.object({
  milestoneId: z.string(),
  reason: z.string().min(1, "Admin override reason is required"),
  acceptance: acceptanceInputSchema,
});

class ReleaseMilestoneError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ReleaseMilestoneError";
  }
}

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
    const { milestoneId, reason, acceptance } = releaseMilestoneSchema.parse(body);
    if (acceptance.legalVersion !== CURRENT_ACCEPTANCE_VERSIONS.adminOverride) {
      return NextResponse.json({ error: "Admin override acceptance version mismatch" }, { status: 400 });
    }
    
    logger.debug({ userId: user.id, milestoneId, route: "/api/payments/release-milestone" }, "Milestone release started");

    // Fetch milestone with proposal, contract, event, and organization
    const milestone = await (prisma as any).paymentMilestone.findUnique({
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
            listing: {
              include: {
                org: {
                  include: {
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

    // Verify user has permission through canonical guarded-MVP PLATFORM_ADMIN authority only
    const contract = milestone.proposal.contract;
    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const event = milestone.proposal.event;
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Centralized permission check: see apps/web/src/lib/rbac.ts
    // Only canonical PLATFORM_ADMIN authority can release payments in guarded MVP
    if (!canReleaseMilestonePayment(user, event)) {
      return NextResponse.json({ error: "You do not have permission to release this payment" }, { status: 403 });
    }

    const blockingRefundRequest = await hasBlockingRefundRequest(milestone.proposalId, milestone.id);
    if (blockingRefundRequest) {
      return NextResponse.json({
        error: "Release blocked while an open refund request is under admin review",
        refundRequestId: blockingRefundRequest.id,
      }, { status: 409 });
    }

    const blockingDisputeCase = await getBlockingDisputeCase(milestone.proposalId, milestone.id);
    if (blockingDisputeCase) {
      return NextResponse.json({
        error: "Release blocked while an open dispute case is frozen for admin review",
        disputeId: blockingDisputeCase.id,
        disputeStatus: blockingDisputeCase.status,
        freezeState: blockingDisputeCase.freezeState,
      }, { status: 409 });
    }

    const blockingHoldback = await getBlockingHoldbackForMilestone(milestone.id);
    if (blockingHoldback) {
      return NextResponse.json({
        error: "Release blocked while a payment holdback is active",
        holdbackId: blockingHoldback.id,
        holdbackState: blockingHoldback.state,
        holdbackReason: blockingHoldback.reason,
      }, { status: 409 });
    }

    // Verify escrow account exists; balance is reserved with an atomic conditional update inside the transaction.
    const escrowAccount = milestone.proposal.escrowAccount;
    if (!escrowAccount) {
      return NextResponse.json({ error: "Insufficient escrow balance" }, { status: 400 });
    }

    const bookingClassification = resolveBookingClassification({
      proposal: {
        bookingClassification: milestone.proposal.bookingClassification,
        listingId: milestone.proposal.listingId,
      },
      event: {
        org: {
          type: (milestone.proposal.event as any)?.org?.type,
        },
      },
    });

    const bookingClassificationForPersistence = bookingClassification.toUpperCase() as "MARKETPLACE" | "PLANNER_MEDIATED" | "DIRECT";

    const adminOverrideId = `milestone-release:${milestone.id}`;

    const acceptanceProof = await recordAcceptance({
      actorId: user.id,
      actorRole: user.role,
      orgId: event.orgId,
      grossAmountCents: milestone.amountCents,
      legalSurface: getLegalSurface("adminOverride", bookingClassification),
      legalVersion: acceptance.legalVersion,
      sourceSurface: "admin.release-milestone",
      requestContextId: request.headers.get("x-request-id") || undefined,
      proposalId: milestone.proposalId,
      contractId: contract.id,
      adminOverrideId,
      bookingClassificationInput: {
        proposal: {
          bookingClassification: milestone.proposal.bookingClassification,
          listingId: milestone.proposal.listingId,
        },
        event,
      },
      metadata: {
        requiredVersion: CURRENT_ACCEPTANCE_VERSIONS.adminOverride,
        milestoneId: milestone.id,
        action: "release-milestone",
      },
    });

    const canonicalSellerOrgId = milestone.proposal.listing?.org?.id ?? milestone.proposal.contract?.sellerId ?? null;

    if (!canonicalSellerOrgId) {
      return NextResponse.json({ error: "Seller organization not found" }, { status: 400 });
    }

    const sellerOrg = milestone.proposal.listing?.org?.id === canonicalSellerOrgId
      ? milestone.proposal.listing.org
      : await prisma.organization.findUnique({
          where: { id: canonicalSellerOrgId },
          include: { owner: true },
        });

    if (!sellerOrg) {
      return NextResponse.json({ error: "Seller organization not found" }, { status: 400 });
    }

    const canonicalRecipient = {
      orgId: sellerOrg.id,
      listingId: milestone.proposal.listingId || undefined,
      stripeAccountId: sellerOrg.stripeConnectAccountId || null,
    };

    if (!canonicalRecipient.orgId || canonicalRecipient.orgId !== canonicalSellerOrgId) {
      return NextResponse.json({ error: "Payee swap after funding is disallowed in guarded MVP" }, { status: 409 });
    }

    if (milestone.amountCents <= 0) {
      return NextResponse.json({ error: "Amount override at release is disallowed in guarded MVP" }, { status: 409 });
    }

    // First transaction: make the local debit/reservation durable before any external transfer.
    const reservation = await prisma.$transaction(async (tx) => {
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

      if ((currentMilestone.status as string) !== "IN_ESCROW") {
        throw new ReleaseMilestoneError("Milestone is not in escrow", 409);
      }

      const existingPayout = await tx.payout.findFirst({
        where: { milestoneId: milestone.id },
      });

      if (existingPayout) {
        if (existingPayout.status === "PENDING") {
          const currentEscrowAccount = await tx.escrowAccount.findUnique({
            where: { proposalId: milestone.proposalId },
          });

          if (!currentEscrowAccount) {
            throw new ReleaseMilestoneError("Insufficient escrow balance", 400);
          }

          return {
            payout: existingPayout,
            alreadyProcessed: false,
            currentMilestone,
            reservationReused: true,
            escrowBalanceBefore: currentEscrowAccount.balanceCents + currentMilestone.amountCents,
            escrowBalanceAfter: currentEscrowAccount.balanceCents,
          };
        }
        throw new ReleaseMilestoneError("Payout already exists for milestone", 409);
      }

      const currentEscrowAccount = await tx.escrowAccount.findUnique({
        where: { proposalId: milestone.proposalId },
      });

      if (!currentEscrowAccount) {
        throw new ReleaseMilestoneError("Insufficient escrow balance", 400);
      }

      const escrowDebit = await tx.escrowAccount.updateMany({
        where: {
          id: currentEscrowAccount.id,
          balanceCents: { gte: currentMilestone.amountCents },
        },
        data: {
          balanceCents: { decrement: currentMilestone.amountCents },
          status: currentEscrowAccount.balanceCents === currentMilestone.amountCents ? "RELEASED" : "PARTIALLY_RELEASED",
        },
      });

      if (escrowDebit.count !== 1) {
        throw new ReleaseMilestoneError("Insufficient escrow balance", 400);
      }

      // Create payout record only after the escrow debit reservation succeeds.
      const payout = await tx.payout.create({
        data: {
          proposalId: milestone.proposalId,
          milestoneId: milestone.id,
          listingId: canonicalRecipient.listingId,
          orgId: canonicalRecipient.orgId,
          amountCents: currentMilestone.amountCents,
          status: "PENDING",
        },
      });

      return {
        payout,
        alreadyProcessed: false,
        currentMilestone,
        escrowBalanceBefore: currentEscrowAccount.balanceCents,
        escrowBalanceAfter: currentEscrowAccount.balanceCents - currentMilestone.amountCents,
      };
    });

    // If already processed, return early
    if (reservation.alreadyProcessed) {
      return NextResponse.json({
        success: true,
        payoutId: reservation.payout.id,
        message: "Payment already released",
      });
    }

    const currentMilestone = reservation.currentMilestone;
    if (!currentMilestone) {
      throw new ReleaseMilestoneError("Milestone reservation is missing current milestone", 500);
    }

    const releasedAmountCents = currentMilestone.amountCents;
    const releaseFeeProfile = resolveFeeProfile({
      bookingClassification,
      grossAmountCents: releasedAmountCents,
    });

    // If Stripe Connect account exists, create transfer only after durable local reservation.
    let stripeTransferId: string | undefined;
    if (canonicalRecipient.stripeAccountId && stripe) {
      try {
        const sourceTransaction = await (prisma as any).transaction.findFirst({
          where: {
            paymentIntent: {
              milestoneId: milestone.id,
              status: "SUCCEEDED",
            },
            stripeChargeId: { not: null },
          },
          orderBy: { processedAt: "desc" },
          select: { stripeChargeId: true },
        });

        const transfer = await stripe.transfers.create({
          amount: releasedAmountCents,
          currency: milestone.proposal.currency.toLowerCase(),
          destination: canonicalRecipient.stripeAccountId,
          source_transaction: sourceTransaction?.stripeChargeId || undefined,
          metadata: {
            payoutId: reservation.payout.id,
            milestoneId: milestone.id,
            proposalId: milestone.proposalId,
            sourceTransaction: sourceTransaction?.stripeChargeId || "",
          },
        }, {
          idempotencyKey: `release-milestone:${milestone.id}:payout:${reservation.payout.id}:v1`,
        });

        stripeTransferId = transfer.id;
      } catch (stripeError) {
        console.error("Stripe transfer error:", stripeError);
        throw new ReleaseMilestoneError("Stripe transfer failed; payment was not released", 502);
      }
    }

    // Finalize local state only after the external transfer (if required) succeeds.
    const result = await prisma.$transaction(async (tx) => {
      const payout = stripeTransferId
        ? await tx.payout.update({
            where: { id: reservation.payout.id },
            data: {
              stripeTransfer: stripeTransferId,
              status: "SENT",
            },
          })
        : reservation.payout;

      // Update milestone status
      await tx.paymentMilestone.update({
        where: { id: milestoneId },
        data: { status: "PAID" },
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

      await tx.moneyTx.create({
        data: {
          type: "RELEASE_ESCROW",
          proposalId: milestone.proposalId,
          milestoneId: milestone.id,
          amountCents: releasedAmountCents,
          currency: milestone.proposal.currency,
          stripeId: stripeTransferId,
          meta: {
            payoutId: payout.id,
            releasedBy: user?.id,
            releasedByRole: user?.role,
            escrowBalanceBefore: reservation.escrowBalanceBefore,
            escrowBalanceAfter: reservation.escrowBalanceAfter,
            feeProfile: releaseFeeProfile,
          },
        },
      });

      return { payout, contractStatusBefore, allPaid, stripeTransferId };
    });

    const {
      payout,
      contractStatusBefore,
      allPaid,
      stripeTransferId: finalizedStripeTransferId,
    } = result;

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
        amountCents: releasedAmountCents,
        currency: milestone.proposal.currency,
        payoutId: payout.id,
        payoutStatus: payout.status,
        stripeTransferId: finalizedStripeTransferId || payout.stripeTransfer,
        releasedByRole: user.role,
        escrowStatusBefore: escrowAccount.status,
        escrowStatusAfter: reservation.escrowBalanceAfter === 0 ? "RELEASED" : "PARTIALLY_RELEASED",
        contractStatusBefore,
        contractStatusAfter: allPaid && (contractStatusBefore as string) === "IN_PAYMENT" ? "COMPLETED" : contractStatusBefore,
        bookingClassification,
        feeProfile: releaseFeeProfile,
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
        amountCents: releasedAmountCents,
        currency: milestone.proposal.currency,
        payoutId: payout.id,
        stripeTransferId: finalizedStripeTransferId || payout.stripeTransfer,
        proposalId: milestone.proposalId,
        contractId: contract.id,
        eventId: event.id,
        bookingClassification,
        feeProfile: releaseFeeProfile,
        reason,
      },
    });

    await recordAdminOverride({
      actorId: user.id,
      actorRole: user.role,
      orgId: event.orgId,
      targetType: "PAYOUT",
      targetId: payout.id,
      bookingClassification: bookingClassificationForPersistence,
      feeProfileSnapshot: releaseFeeProfile,
      acceptanceCaptureId: acceptanceProof.id,
      exceptionType: "PAYOUT_RELEASE",
      decision: "RELEASED",
      reason,
      proposalId: milestone.proposalId,
      contractId: contract.id,
      milestoneId: milestone.id,
      payoutId: payout.id,
      metadata: {
        milestoneId: milestone.id,
        stripeTransferId: finalizedStripeTransferId || payout.stripeTransfer || null,
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
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 });
    }
    if (error instanceof ReleaseMilestoneError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to release payment" }, { status: 500 });
  }
}
