import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeOrThrow } from "@/server/lib/stripe";
import { prisma } from "@/lib/prisma";

type WebhookReservation =
  | { status: "reserved"; id: string }
  | { status: "processed" }
  | { status: "in_progress" };

async function reserveWebhookEvent(event: Stripe.Event, stripeIntentId?: string): Promise<WebhookReservation> {
  try {
    const reservation = await prisma.webhookEvent.create({
      data: {
        eventId: event.id,
        type: event.type,
        stripeIntentId,
        processedAt: null,
        meta: event as any,
      },
      select: { id: true },
    });
    return { status: "reserved", id: reservation.id };
  } catch {
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId: event.id },
      select: { processedAt: true },
    });

    if (existing?.processedAt) return { status: "processed" };
    return { status: "in_progress" };
  }
}

async function markWebhookProcessed(reservationId: string) {
  await prisma.webhookEvent.update({
    where: { id: reservationId },
    data: { processedAt: new Date() },
  });
}

async function releaseWebhookReservation(reservationId: string) {
  await prisma.webhookEvent.delete({
    where: { id: reservationId },
  });
}

async function findInternalPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const stripeIntentId = paymentIntent.id;
  const metadataPaymentIntentId = paymentIntent.metadata?.paymentIntentId;

  const internalPaymentIntent = await prisma.paymentIntent.findUnique({
    where: { stripeIntentId },
    include: {
      contract: true,
      milestone: true,
    },
  });

  if (internalPaymentIntent) return internalPaymentIntent;
  if (!metadataPaymentIntentId) return null;

  return prisma.paymentIntent.update({
    where: { id: metadataPaymentIntentId },
    data: { stripeIntentId },
    include: {
      contract: true,
      milestone: true,
    },
  });
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const internalPaymentIntent = await findInternalPaymentIntent(paymentIntent);

  if (!internalPaymentIntent) return;
  if (internalPaymentIntent.status === "SUCCEEDED") return;

  await prisma.$transaction(async (tx: any) => {
    const fundingApplied = await tx.paymentIntent.updateMany({
      where: {
        id: internalPaymentIntent.id,
        status: {
          not: "SUCCEEDED",
        },
      },
      data: {
        status: "SUCCEEDED",
        paymentMethod: paymentIntent.payment_method ? String(paymentIntent.payment_method) : undefined,
      },
    });
    if (fundingApplied.count === 0) return;

    await tx.escrowAccount.updateMany({
      where: { proposalId: internalPaymentIntent.contract.proposalId },
      data: {
        status: "FUNDED",
        balanceCents: {
          increment: internalPaymentIntent.amountCents,
        },
      },
    });

    if (internalPaymentIntent.milestoneId) {
      await tx.paymentMilestone.update({
        where: { id: internalPaymentIntent.milestoneId },
        data: { status: "IN_ESCROW" },
      });
    }

    await tx.contract.update({
      where: { id: internalPaymentIntent.contractId },
      data: {
        status: internalPaymentIntent.contract.status === "FULLY_SIGNED"
          ? "IN_PAYMENT"
          : internalPaymentIntent.contract.status,
      },
    });
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const internalPaymentIntent = await findInternalPaymentIntent(paymentIntent);

  if (!internalPaymentIntent) return;
  if (internalPaymentIntent.status === "FAILED" || internalPaymentIntent.status === "SUCCEEDED") return;

  await prisma.paymentIntent.update({
    where: { id: internalPaymentIntent.id },
    data: { status: "FAILED" },
  });
}

export async function POST(request: Request) {
  let stripe: Stripe;
  try {
    stripe = getStripeOrThrow();
  } catch {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const signature = headers().get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook secret is not configured" }, { status: 500 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const stripeIntentId = (() => {
    const object = event.data?.object as { id?: string; object?: string } | undefined;
    return object?.object === "payment_intent" ? object.id : undefined;
  })();

  const reservation = await reserveWebhookEvent(event, stripeIntentId);
  if (reservation.status === "processed") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (reservation.status === "in_progress") {
    return NextResponse.json({ error: "Webhook handling is already in progress" }, { status: 409 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        break;
    }

    await markWebhookProcessed(reservation.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    await releaseWebhookReservation(reservation.id).catch((releaseError) => {
      console.error("Stripe webhook reservation release failed:", releaseError);
    });
    console.error("Stripe webhook handling failed:", error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
