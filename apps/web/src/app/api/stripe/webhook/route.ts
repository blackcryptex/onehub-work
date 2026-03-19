import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/server/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import { recordActivity, ACTIVITY_ACTIONS } from "@/server/lib/activity";
import { logger } from "@/lib/logger";
import { trackError } from "@/lib/errorTracker";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }
  // Idempotency guard: check if we've already processed this webhook event
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId: event.id },
  });

  if (existingEvent) {
    // Already processed, return success without doing anything
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const paymentType = intent.metadata?.type;
      
      // Phase 7A: Handle deposit payments
      if (paymentType === "deposit") {
        const eventId = intent.metadata?.eventId;
        if (eventId) {
          await prisma.$transaction(async (tx) => {
            // Record webhook event
            await tx.webhookEvent.create({
              data: {
                eventId: event.id,
                type: event.type,
                stripeIntentId: intent.id,
                meta: event as any,
              },
            });

            // Find deposit by stripePaymentIntentId
            const deposit = await tx.deposit.findUnique({
              where: { stripePaymentIntentId: intent.id },
              include: { event: true },
            });

            if (deposit && deposit.status === "PENDING") {
              // Get charge ID from the payment intent
              if (!stripe) {
                throw new Error("Stripe client is not available");
              }
              const charges = await stripe.paymentIntents.retrieve(intent.id, {
                expand: ["charges"],
              });
              const chargeId = (charges as any).charges?.data?.[0]?.id;

              await tx.deposit.update({
                where: { id: deposit.id },
                data: {
                  status: "SUCCEEDED",
                  stripeChargeId: chargeId || null,
                },
              });

              // Record activity
              await recordActivity({
                orgId: deposit.proOrgId,
                eventId: deposit.eventId,
                actorId: deposit.clientUserId,
                action: ACTIVITY_ACTIONS.PAYMENT_CONFIRMED,
                target: deposit.id,
                meta: {
                  depositId: deposit.id,
                  amountCents: deposit.amountCents,
                  currency: deposit.currency,
                  stripeIntentId: intent.id,
                  stripeChargeId: chargeId,
                  source: "stripe_webhook",
                },
              });

              logger.info({
                orgId: deposit.proOrgId,
                eventId: deposit.eventId,
                depositId: deposit.id,
                amountCents: deposit.amountCents,
                currency: deposit.currency,
                stripeIntentId: intent.id,
                route: "/api/stripe/webhook",
                eventType: "payment_intent.succeeded",
              }, "deposit.succeeded");
            }
          });
          break;
        }
      }

      const proposalId = intent.metadata?.proposalId;
      if (proposalId) {
        // Wrap in transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
          // Record webhook event first (unique constraint prevents duplicates)
          await tx.webhookEvent.create({
            data: {
              eventId: event.id,
              type: event.type,
              stripeIntentId: intent.id,
              meta: event as any,
            },
          });

          // Lookup escrow by stripe intent id
          const escrow = await tx.escrowAccount.findUnique({
            where: { stripeIntent: intent.id },
            include: { proposal: { include: { event: true } } },
          });

          if (!escrow) return;

          // Idempotency guard: only process if not already funded
          if (escrow.status !== "FUNDED") {
            const escrowStatusBefore = escrow.status;
            await tx.escrowAccount.update({
              where: { id: escrow.id },
              data: { status: "FUNDED", balanceCents: intent.amount },
            });

            // Create MoneyTx (unique constraint on stripeId prevents duplicates)
            await tx.moneyTx.create({
              data: {
                type: "FUND_ESCROW",
                proposalId,
                amountCents: intent.amount,
                currency: intent.currency,
                stripeId: intent.id,
              },
            });

            // Audit: Log that escrow was funded via Stripe webhook
            await recordActivity({
              orgId: escrow.proposal.event.orgId,
              eventId: escrow.eventId,
              actorId: null, // Webhook - no user actor
              action: ACTIVITY_ACTIONS.ESCROW_FUNDED,
              target: escrow.id,
              meta: {
                escrowAccountId: escrow.id,
                proposalId,
                amountCents: intent.amount,
                currency: intent.currency,
                stripeIntentId: intent.id,
                stripeCustomerId: intent.customer as string | undefined,
                escrowStatusBefore,
                escrowStatusAfter: "FUNDED",
                source: "stripe_webhook",
              },
            });

            // Structured logging
            logger.info({
              orgId: escrow.proposal.event.orgId,
              eventId: escrow.eventId,
              proposalId,
              escrowAccountId: escrow.id,
              amountCents: intent.amount,
              currency: intent.currency,
              stripeIntentId: intent.id,
              route: "/api/stripe/webhook",
              eventType: "payment_intent.succeeded",
            }, "payment.succeeded");
          }
        });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const paymentType = intent.metadata?.type;
      
      // Phase 7A: Handle deposit payment failures
      if (paymentType === "deposit") {
        const eventId = intent.metadata?.eventId;
        if (eventId) {
          await prisma.$transaction(async (tx) => {
            // Record webhook event
            await tx.webhookEvent.create({
              data: {
                eventId: event.id,
                type: event.type,
                stripeIntentId: intent.id,
                meta: event as any,
              },
            });

            // Find deposit by stripePaymentIntentId
            const deposit = await tx.deposit.findUnique({
              where: { stripePaymentIntentId: intent.id },
              include: { event: true },
            });

            if (deposit && deposit.status === "PENDING") {
              await tx.deposit.update({
                where: { id: deposit.id },
                data: {
                  status: "FAILED",
                },
              });

              // Record activity
              await recordActivity({
                orgId: deposit.proOrgId,
                eventId: deposit.eventId,
                actorId: deposit.clientUserId,
                action: ACTIVITY_ACTIONS.PAYMENT_FAILED || "DEPOSIT_FAILED",
                target: deposit.id,
                meta: {
                  depositId: deposit.id,
                  amountCents: deposit.amountCents,
                  currency: deposit.currency,
                  stripeIntentId: intent.id,
                  failureReason: intent.last_payment_error?.message,
                  source: "stripe_webhook",
                },
              });

              logger.error({
                orgId: deposit.proOrgId,
                eventId: deposit.eventId,
                depositId: deposit.id,
                amountCents: deposit.amountCents,
                currency: deposit.currency,
                stripeIntentId: intent.id,
                failureReason: intent.last_payment_error?.message,
                route: "/api/stripe/webhook",
                eventType: "payment_intent.payment_failed",
              }, "deposit.failed");
            }
          });
          break;
        }
      }

      const proposalId = intent.metadata?.proposalId;
      if (proposalId) {
        // Wrap in transaction
        await prisma.$transaction(async (tx) => {
          // Record webhook event
          await tx.webhookEvent.create({
            data: {
              eventId: event.id,
              type: event.type,
              stripeIntentId: intent.id,
              meta: event as any,
            },
          });

          const escrow = await tx.escrowAccount.findUnique({
            where: { stripeIntent: intent.id },
            include: { proposal: { include: { event: true } } },
          });

          if (escrow) {
            // Audit: Log payment failure (idempotent - can log multiple times)
            await recordActivity({
              orgId: escrow.proposal.event.orgId,
              eventId: escrow.eventId,
              actorId: null, // Webhook - no user actor
              action: ACTIVITY_ACTIONS.PAYMENT_FAILED,
              target: escrow.id,
              meta: {
                escrowAccountId: escrow.id,
                proposalId,
                amountCents: intent.amount,
                currency: intent.currency,
                stripeIntentId: intent.id,
                stripeCustomerId: intent.customer as string | undefined,
                failureReason: intent.last_payment_error?.message,
                source: "stripe_webhook",
              },
            });

            // Structured logging
            logger.error({
              orgId: escrow.proposal.event.orgId,
              eventId: escrow.eventId,
              proposalId,
              escrowAccountId: escrow.id,
              amountCents: intent.amount,
              currency: intent.currency,
              stripeIntentId: intent.id,
              failureReason: intent.last_payment_error?.message,
              route: "/api/stripe/webhook",
              eventType: "payment_intent.payment_failed",
            }, "payment.failed");
          }
        });
      }
      break;
    }
  }
  return NextResponse.json({ received: true });
}

