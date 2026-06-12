import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { z } from "zod";
import { stripe } from "@/server/lib/stripe";
import { getRequestLogger } from "@/lib/logger";
import { trackError } from "@/lib/errorTracker";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { requireAcceptanceProof } from "@/lib/acceptance";
import { applyPaymentSuccessStateTransition, ensureTestModeStripeSecret } from "@/lib/payments/money-state";

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
    const paymentIntent = await (db as UnsafeAny).paymentIntent.findUnique({
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
    ensureTestModeStripeSecret(process.env.STRIPE_SECRET_KEY);

    // Verify Stripe payment intent
    const stripeIntent = await stripe.paymentIntents.retrieve(paymentIntent.stripeIntentId || "");
    if (!stripeIntent) {
      return NextResponse.json({ error: "Stripe payment intent not found" }, { status: 404 });
    }

    if (stripeIntent.status !== "succeeded") {
      // Update status to processing if not already processing
      if (paymentIntent.status !== "PROCESSING") {
        await (db as UnsafeAny).paymentIntent.update({
          where: { id: paymentIntentId },
          data: { status: "PROCESSING" },
        });
      }
      return NextResponse.json({ 
        status: "processing",
        message: "Payment is being processed",
      });
    }

    await applyPaymentSuccessStateTransition({
      db,
      paymentIntentId,
      stripePaymentIntent: stripeIntent,
      source: "local.confirm",
      actorId: userId,
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
