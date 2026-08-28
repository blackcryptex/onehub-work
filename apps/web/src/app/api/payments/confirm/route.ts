import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { stripe } from "@/server/lib/stripe";
import { getRequestLogger } from "@/lib/logger";
import { trackError } from "@/lib/errorTracker";
import { applyConfirmedPaymentIntent, ConfirmPaymentError } from "@/lib/payments/confirm-payment";

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

    // Idempotency guard: if already succeeded, return success without processing
    if (paymentIntent.status === "SUCCEEDED") {
      return NextResponse.json({
        success: true,
        message: "Payment already confirmed.",
      });
    }

    if (!["REQUIRES_PAYMENT", "PROCESSING"].includes(paymentIntent.status)) {
      return NextResponse.json({ error: "Payment intent is not confirmable" }, { status: 409 });
    }

    if (!paymentIntent.stripeIntentId) {
      return NextResponse.json({ error: "Payment intent is missing Stripe reference" }, { status: 409 });
    }

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
    }

    // Verify Stripe payment intent
    const stripeIntent = await stripe.paymentIntents.retrieve(paymentIntent.stripeIntentId);
    if (!stripeIntent) {
      return NextResponse.json({ error: "Stripe payment intent not found" }, { status: 404 });
    }

    const applied = await applyConfirmedPaymentIntent({
      paymentIntentId,
      stripeIntent,
      actorId: userId,
    });

    if (applied.processing) {
      return NextResponse.json({ 
        status: "processing",
        message: "Payment is being processed",
      });
    }

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
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 });
    }
    if (error instanceof ConfirmPaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 });
  }
}
