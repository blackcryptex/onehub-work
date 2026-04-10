import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { stripe } from "@/server/lib/stripe";
import { recordActivity, ACTIVITY_ACTIONS } from "@/server/lib/activity";
import { getRequestLogger } from "@/lib/logger";
import { trackError } from "@/lib/errorTracker";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { resolveFeeProfile } from "@/lib/fee-profile";
import { requireAcceptanceProof } from "@/lib/acceptance";
import { evaluateHoldbackForPaymentIntent } from "@/lib/holdback";

const confirmPaymentSchema = z.object({
  paymentIntentId: z.string(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || undefined;
  const logger = getRequestLogger(requestId);
  
  let session: { user?: { id?: string } } | null = null;
  let body: { paymentIntentId?: string } | null = null;
  
  try {
    session = await auth();
    if (!session?.user?.id) {
      logger.warn({ route: "/api/payments/confirm" }, "Unauthorized payment confirmation attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    body = await request.json();
    const { paymentIntentId } = confirmPaymentSchema.parse(body);
    
    logger.debug({ userId, paymentIntentId, route: "/api/payments/confirm" }, "Payment confirmation started");

    // Fetch payment intent with contract and milestone
    // Note: PaymentIntent model will be available after Prisma migration
    const paymentIntent = await (prisma as any).paymentIntent.findUnique({
      where: { id: paymentIntentId },
      include: {
        contract: {
          include: {
            proposal: {
              include: {
                milestones: true,
                escrowAccount: true,
                event: {
                  select: {
                    orgId: true,
                  },
                },
              },
            },
          },
        },
        milestone: true,
      },
    });

    if (!paymentIntent) {
      return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
    }

    // Verify user is the payer
    if (paymentIntent.payerId !== userId) {
      return NextResponse.json({ error: "Only the payer can confirm payment" }, { status: 403 });
    }

    await requireAcceptanceProof({
      paymentIntentId,
      legalSurface: `payment.${resolveBookingClassification({
        proposal: {
          bookingClassification: paymentIntent.contract.proposal.bookingClassification,
          listingId: paymentIntent.contract.proposal.listingId,
        },
        event: paymentIntent.contract.proposal.event,
      })}`,
    });

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
    }

    // Verify Stripe payment intent
    const stripeIntent = await stripe.paymentIntents.retrieve(paymentIntent.stripeIntentId || "");
    if (!stripeIntent) {
      return NextResponse.json({ error: "Stripe payment intent not found" }, { status: 404 });
    }

    if (stripeIntent.status !== "succeeded") {
      // Update status to processing if not already processing
      if (paymentIntent.status !== "PROCESSING") {
        await (prisma as any).paymentIntent.update({
          where: { id: paymentIntentId },
          data: { status: "PROCESSING" },
        });
      }
      return NextResponse.json({ 
        status: "processing",
        message: "Payment is being processed",
      });
    }

    // Idempotency guard: if already succeeded, return success without processing
    if (paymentIntent.status === "SUCCEEDED") {
      return NextResponse.json({
        success: true,
        message: "Payment already confirmed.",
      });
    }

    // Wrap all updates in a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Re-fetch payment intent within transaction to check status atomically
      const currentPaymentIntent = await (tx as any).paymentIntent.findUnique({
        where: { id: paymentIntentId },
        include: {
          contract: {
            include: {
              proposal: {
                include: {
                  milestones: true,
                  escrowAccount: true,
                  event: {
                    select: {
                      orgId: true,
                    },
                  },
                },
              },
            },
          },
          milestone: true,
        },
      });

      if (!currentPaymentIntent) {
        throw new Error("Payment intent not found");
      }

      // Idempotency guard: check status again within transaction
      if (currentPaymentIntent.status === "SUCCEEDED") {
        return; // Already processed, exit early
      }

      const bookingClassification = resolveBookingClassification({
        proposal: {
          bookingClassification: currentPaymentIntent.contract.proposal.bookingClassification,
          listingId: currentPaymentIntent.contract.proposal.listingId,
        },
        event: currentPaymentIntent.contract.proposal.event,
      });

      // Update payment intent status atomically
      await (tx as any).paymentIntent.update({
        where: { id: paymentIntentId },
        data: {
          status: "SUCCEEDED",
          paymentMethod: stripeIntent.payment_method_types?.[0] || "card",
        },
      });

      // Payment succeeded - update milestone and escrow
      // Note: IN_ESCROW status will be available after Prisma migration
      if (currentPaymentIntent.milestoneId) {
        await tx.paymentMilestone.update({
          where: { id: currentPaymentIntent.milestoneId },
          data: { status: "IN_ESCROW" as any },
        });
      }

      // Update escrow account balance
      const escrowAccount = currentPaymentIntent.contract.proposal.escrowAccount;
      if (escrowAccount) {
        await tx.escrowAccount.update({
          where: { id: escrowAccount.id },
          data: {
            balanceCents: { increment: currentPaymentIntent.amountCents },
            status: escrowAccount.balanceCents === 0 ? "FUNDED" : "PARTIALLY_RELEASED",
          },
        });
      }

      // Create transaction record (unique constraint on paymentIntentId prevents duplicates)
      const feeProfile = resolveFeeProfile({
        bookingClassification,
        grossAmountCents: currentPaymentIntent.amountCents,
      });
      const platformFeeCents = feeProfile.platformFeeAmountCents;
      const netAmountCents = feeProfile.netAmountCents;

      await (tx as any).transaction.create({
        data: {
          paymentIntentId: currentPaymentIntent.id,
          payerId: currentPaymentIntent.payerId,
          payeeId: currentPaymentIntent.payeeId,
          netAmountCents,
          platformFeeCents,
          totalAmountCents: currentPaymentIntent.amountCents,
          currency: currentPaymentIntent.currency,
          stripeChargeId: stripeIntent.latest_charge as string | undefined,
          processedAt: new Date(),
        },
      });

      await evaluateHoldbackForPaymentIntent({
        paymentIntentId: currentPaymentIntent.id,
        tx,
      });

      // Update contract status if needed
      // Note: IN_PAYMENT status will be available after Prisma migration
      if (currentPaymentIntent.contract.status === "FULLY_SIGNED") {
        await tx.contract.update({
          where: { id: currentPaymentIntent.contractId },
          data: { status: "IN_PAYMENT" as any },
        });
      }

      // Audit: Log that payment was confirmed and funds moved to escrow
      await recordActivity({
        orgId: currentPaymentIntent.contract.proposal.event.orgId,
        eventId: currentPaymentIntent.contract.eventId,
        actorId: userId,
        action: ACTIVITY_ACTIONS.PAYMENT_CONFIRMED,
        target: currentPaymentIntent.id,
        meta: {
          paymentIntentId: currentPaymentIntent.id,
          milestoneId: currentPaymentIntent.milestoneId,
          amountCents: currentPaymentIntent.amountCents,
          currency: currentPaymentIntent.currency,
          platformFeeCents,
          netAmountCents,
          stripeChargeId: stripeIntent.latest_charge as string | undefined,
          milestoneStatusBefore: currentPaymentIntent.milestone?.status,
          milestoneStatusAfter: "IN_ESCROW",
          escrowStatusBefore: escrowAccount?.status,
          escrowStatusAfter: escrowAccount?.balanceCents === 0 ? "FUNDED" : "PARTIALLY_RELEASED",
          contractStatusBefore: currentPaymentIntent.contract.status,
          contractStatusAfter: currentPaymentIntent.contract.status === "FULLY_SIGNED"
            ? "IN_PAYMENT"
            : currentPaymentIntent.contract.status,
          bookingClassification,
          feeProfile,
        },
      });
    });

    // Structured logging for successful payment confirmation
    logger.info({
      userId,
      paymentIntentId,
      orgId: paymentIntent.contract.proposal.event.orgId,
      eventId: paymentIntent.contract.eventId,
      milestoneId: paymentIntent.milestoneId,
      amountCents: paymentIntent.amountCents,
      currency: paymentIntent.currency,
      route: "/api/payments/confirm",
    }, "payment.confirmed");

    return NextResponse.json({
      success: true,
      message: "Payment confirmed. Held funds have been updated.",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to confirm payment";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Structured error logging
    logger.error({
      userId: session?.user?.id,
      paymentIntentId: body?.paymentIntentId,
      route: "/api/payments/confirm",
      error: errorMessage,
      stack: errorStack,
    }, "payment.confirm_failed");

    // Track error for monitoring
    trackError(error, {
      route: "/api/payments/confirm",
      userId: session?.user?.id,
      paymentIntentId: body?.paymentIntentId,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 });
  }
}
