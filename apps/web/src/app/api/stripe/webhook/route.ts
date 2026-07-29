import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeOrThrow } from "@/server/lib/stripe";
import { db } from "@/server/db";
import {
  applyPaymentFailureStateTransition,
  applyPaymentSuccessStateTransition,
  classifyStripeWebhookEventType,
  classifyWebhookProcessingState,
  ensureTestModeStripeSecret,
} from "@/lib/payments/money-state";

type WebhookClaim =
  | { action: "claim" | "retry"; reason: string }
  | { action: "duplicate" | "in-progress"; reason: string };

function webhookProcessingMeta(status: "processing" | "completed" | "failed", extra: Record<string, unknown> = {}) {
  const at = new Date().toISOString();
  return {
    processingStatus: status,
    ...(status === "processing" ? { processingStartedAt: at } : {}),
    ...(status === "completed" ? { completedAt: at } : {}),
    ...(status === "failed" ? { failedAt: at } : {}),
    ...extra,
  };
}

async function claimWebhookProcessingAttempt(eventId: string, type: string, stripeIntentId?: string): Promise<WebhookClaim> {
  try {
    await db.webhookEvent.create({
      data: {
        eventId,
        type,
        stripeIntentId,
        meta: webhookProcessingMeta("processing"),
      },
    });
    return { action: "claim", reason: "event has not been seen" };
  } catch {
    const existing = await db.webhookEvent.findUnique({ where: { eventId } });
    const classification = classifyWebhookProcessingState({ existing });
    if (classification.action !== "retry") return classification;

    await db.webhookEvent.update({
      where: { eventId },
      data: {
        type,
        stripeIntentId,
        meta: webhookProcessingMeta("processing", {
          retryReason: classification.reason,
        }),
      },
    });
    return classification;
  }
}

async function markWebhookCompleted(eventId: string, event: Stripe.Event, extra: Record<string, unknown> = {}) {
  await db.webhookEvent.update({
    where: { eventId },
    data: {
      processedAt: new Date(),
      meta: webhookProcessingMeta("completed", { event, ...extra }),
    },
  });
}

async function markWebhookFailed(eventId: string, error: unknown) {
  await db.webhookEvent.update({
    where: { eventId },
    data: {
      meta: webhookProcessingMeta("failed", {
        error: error instanceof Error ? error.message : "unknown webhook handling error",
      }),
    },
  });
}

export async function POST(request: Request) {
  let stripe: Stripe;
  try {
    stripe = getStripeOrThrow();
    ensureTestModeStripeSecret(process.env.STRIPE_SECRET_KEY);
  } catch {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const signature = (await headers()).get("stripe-signature");
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

  const claim = await claimWebhookProcessingAttempt(event.id, event.type, stripeIntentId);
  if (claim.action === "duplicate" || claim.action === "in-progress") {
    return NextResponse.json({ received: true, duplicate: claim.action === "duplicate", inProgress: claim.action === "in-progress" });
  }

  try {
    const eventTypePolicy = classifyStripeWebhookEventType(event.type);
    if (eventTypePolicy.kind === "manual-admin-only") {
      await markWebhookCompleted(event.id, event, {
        handled: false,
        manualAdminOnly: true,
        reason: eventTypePolicy.reason,
      });
      return NextResponse.json({ received: true, manualAdminOnly: true });
    }

    switch (event.type) {
      case "payment_intent.succeeded":
        await applyPaymentSuccessStateTransition({
          db,
          stripePaymentIntent: event.data.object as Stripe.PaymentIntent,
          source: "stripe.webhook",
        });
        break;
      case "payment_intent.payment_failed":
        await applyPaymentFailureStateTransition({
          db,
          stripePaymentIntent: event.data.object as Stripe.PaymentIntent,
          eventType: "payment_intent.payment_failed",
        });
        break;
      case "payment_intent.canceled":
        await applyPaymentFailureStateTransition({
          db,
          stripePaymentIntent: event.data.object as Stripe.PaymentIntent,
          eventType: "payment_intent.canceled",
        });
        break;
      default:
        break;
    }

    await markWebhookCompleted(event.id, event, { handled: eventTypePolicy.handled });

    return NextResponse.json({ received: true });
  } catch (error) {
    await markWebhookFailed(event.id, error);
    console.error("Stripe webhook handling failed:", error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
