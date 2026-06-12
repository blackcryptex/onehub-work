import { describe, expect, it } from "vitest";

import {
  buildPaymentReconciliationReport,
  classifyStripeWebhookEventType,
  classifyWebhookProcessingState,
} from "../src/lib/payments/money-state";

describe("Gate 5C webhook processing safety", () => {
  const now = new Date("2026-06-03T12:00:00.000Z");

  it("allows failed webhook handler attempts to be retried instead of suppressing Stripe redelivery", () => {
    expect(
      classifyWebhookProcessingState({
        existing: {
          eventId: "evt_failed_after_marker",
          meta: {
            processingStatus: "failed",
            failedAt: "2026-06-03T11:59:00.000Z",
          },
        },
        now,
      })
    ).toEqual({ action: "retry", reason: "previous processing attempt failed" });
  });

  it("treats completed webhook events as true duplicates and fresh in-progress attempts as non-retriable", () => {
    expect(
      classifyWebhookProcessingState({
        existing: {
          eventId: "evt_done",
          meta: { processingStatus: "completed", completedAt: "2026-06-03T11:59:30.000Z" },
        },
        now,
      })
    ).toEqual({ action: "duplicate", reason: "event already processed successfully" });

    expect(
      classifyWebhookProcessingState({
        existing: {
          eventId: "evt_processing",
          meta: { processingStatus: "processing", processingStartedAt: "2026-06-03T11:59:30.000Z" },
        },
        now,
        staleAfterMs: 5 * 60 * 1000,
      })
    ).toEqual({ action: "in-progress", reason: "event is currently processing" });
  });

  it("keeps refund payout and dispute events manual/admin-only until separate approval", () => {
    expect(classifyStripeWebhookEventType("payment_intent.succeeded")).toEqual({ kind: "automatic", handled: true });
    expect(classifyStripeWebhookEventType("charge.dispute.created")).toEqual({
      kind: "manual-admin-only",
      handled: false,
      reason: "dispute/refund/payout automation is blocked pending separate approval",
    });
    expect(classifyStripeWebhookEventType("payout.failed")).toEqual({
      kind: "manual-admin-only",
      handled: false,
      reason: "dispute/refund/payout automation is blocked pending separate approval",
    });
    expect(classifyStripeWebhookEventType("charge.refunded")).toEqual({
      kind: "manual-admin-only",
      handled: false,
      reason: "dispute/refund/payout automation is blocked pending separate approval",
    });
  });
});

describe("Gate 5C payment monitoring and reconciliation", () => {
  it("detects Stripe success when local state was not updated", () => {
    const report = buildPaymentReconciliationReport({
      generatedAt: "2026-06-03T12:00:00.000Z",
      localPayments: [
        {
          id: "pi_local_1",
          stripeIntentId: "pi_stripe_1",
          status: "PROCESSING",
          amountCents: 120000,
          currency: "USD",
        },
      ],
      stripePayments: [
        {
          id: "pi_stripe_1",
          status: "succeeded",
          amountReceivedCents: 120000,
          currency: "usd",
        },
      ],
    });

    expect(report.anomalies).toEqual([
      expect.objectContaining({
        kind: "stripe_succeeded_local_not_succeeded",
        severity: "critical",
        localPaymentIntentId: "pi_local_1",
        stripeIntentId: "pi_stripe_1",
      }),
    ]);
    expect(report.summary.critical).toBe(1);
    expect(report.summary.totalAnomalies).toBe(1);
  });

  it("detects local success when Stripe evidence disagrees and amount/currency mismatches", () => {
    const report = buildPaymentReconciliationReport({
      generatedAt: "2026-06-03T12:00:00.000Z",
      localPayments: [
        {
          id: "pi_local_2",
          stripeIntentId: "pi_stripe_2",
          status: "SUCCEEDED",
          amountCents: 120000,
          currency: "USD",
        },
      ],
      stripePayments: [
        {
          id: "pi_stripe_2",
          status: "requires_payment_method",
          amountReceivedCents: 119999,
          currency: "eur",
        },
      ],
    });

    expect(report.anomalies.map((anomaly) => anomaly.kind)).toEqual([
      "local_succeeded_stripe_not_succeeded",
      "amount_mismatch",
      "currency_mismatch",
    ]);
    expect(report.summary.critical).toBe(1);
    expect(report.summary.warning).toBe(2);
  });

  it("detects failed and canceled Stripe states that local records still consider payable/processing", () => {
    const report = buildPaymentReconciliationReport({
      generatedAt: "2026-06-03T12:00:00.000Z",
      localPayments: [
        {
          id: "pi_local_failed",
          stripeIntentId: "pi_stripe_failed",
          status: "PROCESSING",
          amountCents: 5000,
          currency: "USD",
        },
        {
          id: "pi_local_canceled",
          stripeIntentId: "pi_stripe_canceled",
          status: "REQUIRES_PAYMENT",
          amountCents: 6000,
          currency: "USD",
        },
      ],
      stripePayments: [
        { id: "pi_stripe_failed", status: "payment_failed", amountReceivedCents: 5000, currency: "usd" },
        { id: "pi_stripe_canceled", status: "canceled", amountReceivedCents: 6000, currency: "usd" },
      ],
    });

    expect(report.anomalies.map((anomaly) => anomaly.kind)).toEqual([
      "stripe_failed_local_not_failed",
      "stripe_canceled_local_not_canceled",
    ]);
    expect(report.summary.warning).toBe(2);
  });
});
