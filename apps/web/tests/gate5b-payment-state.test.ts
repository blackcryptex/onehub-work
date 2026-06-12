import { describe, expect, it } from "vitest";

import {
  applyPaymentFailureTransition,
  buildPaymentIntentFundingPlan,
  buildPaymentSuccessTransitionPlan,
  buildReleasePayoutPlan,
  buildStripeTransferIdempotencyKey,
  isDisputeCaseBlockingPayout,
  isRefundRequestBlockingPayout,
  normalizeStripeCurrency,
  resolvePaymentIntentGrossAmountCents,
  validatePaymentIntentCreationPolicy,
  validateStripePaymentSuccessMatch,
} from "../src/lib/payments/money-state";
import { resolveFeeProfile } from "../src/lib/fee-profile";

describe("Gate 5B canonical payment state reducer", () => {
  it("applies one canonical success transition once for duplicate webhook/local confirm delivery", () => {
    const first = buildPaymentSuccessTransitionPlan({
      paymentIntent: {
        id: "pi_local_1",
        status: "REQUIRES_PAYMENT",
        amountCents: 120000,
        currency: "USD",
        milestoneId: "milestone_1",
        paymentMethod: null,
      },
      contract: { id: "contract_1", status: "FULLY_SIGNED" },
      escrowAccount: { id: "escrow_1", balanceCents: 0, status: "OPEN" },
      stripe: {
        amountReceivedCents: 120000,
        currency: "usd",
        paymentMethod: "card",
        chargeId: "ch_test_1",
        metadata: {
          paymentIntentId: "pi_local_1",
          contractId: "contract_1",
          milestoneId: "milestone_1",
        },
      },
      source: "stripe.webhook",
    });

    expect(first.kind).toBe("apply-success");
    expect(first.escrowBalanceIncrementCents).toBe(120000);
    expect(first.escrowStatusAfter).toBe("FUNDED");
    expect(first.milestoneStatusAfter).toBe("IN_ESCROW");
    expect(first.contractStatusAfter).toBe("IN_PAYMENT");
    expect(first.createTransaction).toBe(true);
    expect(first.evaluateHoldback).toBe(true);

    const duplicate = buildPaymentSuccessTransitionPlan({
      paymentIntent: {
        id: "pi_local_1",
        status: "SUCCEEDED",
        amountCents: 120000,
        currency: "USD",
        milestoneId: "milestone_1",
        paymentMethod: "card",
      },
      contract: { id: "contract_1", status: "IN_PAYMENT" },
      escrowAccount: { id: "escrow_1", balanceCents: 120000, status: "FUNDED" },
      stripe: {
        amountReceivedCents: 120000,
        currency: "USD",
        paymentMethod: "card",
        chargeId: "ch_test_1",
        metadata: {
          paymentIntentId: "pi_local_1",
          contractId: "contract_1",
          milestoneId: "milestone_1",
        },
      },
      source: "local.confirm",
    });

    expect(duplicate).toEqual({
      kind: "already-applied",
      paymentIntentId: "pi_local_1",
      reason: "payment intent already succeeded",
    });
  });

  it("keeps escrow FUNDED when additional milestone funding arrives instead of marking it partially released", () => {
    const plan = buildPaymentSuccessTransitionPlan({
      paymentIntent: {
        id: "pi_local_2",
        status: "PROCESSING",
        amountCents: 240000,
        currency: "USD",
        milestoneId: "milestone_2",
        paymentMethod: null,
      },
      contract: { id: "contract_1", status: "IN_PAYMENT" },
      escrowAccount: { id: "escrow_1", balanceCents: 120000, status: "FUNDED" },
      stripe: {
        amountReceivedCents: 240000,
        currency: "usd",
        paymentMethod: "card",
        chargeId: "ch_test_2",
        metadata: {
          paymentIntentId: "pi_local_2",
          contractId: "contract_1",
          milestoneId: "milestone_2",
        },
      },
      source: "local.confirm",
    });

    expect(plan.kind).toBe("apply-success");
    expect(plan.escrowStatusAfter).toBe("FUNDED");
    expect(plan.escrowBalanceIncrementCents).toBe(240000);
  });

  it("rejects amount, currency, and metadata mismatches before success is applied", () => {
    expect(() =>
      validateStripePaymentSuccessMatch({
        paymentIntent: { id: "pi_local_1", contractId: "contract_1", milestoneId: "milestone_1", amountCents: 120000, currency: "USD" },
        stripe: {
          amountReceivedCents: 120000,
          currency: "usd",
          metadata: {},
        },
      })
    ).toThrow("Stripe metadata paymentIntentId is required");

    expect(() =>
      validateStripePaymentSuccessMatch({
        paymentIntent: { id: "pi_local_1", contractId: "contract_1", milestoneId: "milestone_1", amountCents: 120000, currency: "USD" },
        stripe: {
          amountReceivedCents: 119999,
          currency: "usd",
          metadata: { paymentIntentId: "pi_local_1", contractId: "contract_1", milestoneId: "milestone_1" },
        },
      })
    ).toThrow("Stripe amount does not match local payment intent");

    expect(() =>
      validateStripePaymentSuccessMatch({
        paymentIntent: { id: "pi_local_1", contractId: "contract_1", milestoneId: "milestone_1", amountCents: 120000, currency: "USD" },
        stripe: {
          amountReceivedCents: 120000,
          currency: "eur",
          metadata: { paymentIntentId: "pi_local_1", contractId: "contract_1", milestoneId: "milestone_1" },
        },
      })
    ).toThrow("Stripe currency does not match local payment intent");

    expect(() =>
      validateStripePaymentSuccessMatch({
        paymentIntent: { id: "pi_local_1", contractId: "contract_1", milestoneId: "milestone_1", amountCents: 120000, currency: "USD" },
        stripe: {
          amountReceivedCents: 120000,
          currency: "usd",
          metadata: { paymentIntentId: "other", contractId: "contract_1", milestoneId: "milestone_1" },
        },
      })
    ).toThrow("Stripe metadata paymentIntentId does not match local payment intent");
  });

  it("enforces first-pilot milestone payment policy and currency normalization", () => {
    expect(normalizeStripeCurrency("usd")).toBe("USD");
    expect(() => normalizeStripeCurrency("US")).toThrow("Currency must be a three-letter ISO currency code");

    expect(
      validatePaymentIntentCreationPolicy({
        contractStatus: "FULLY_SIGNED",
        milestoneStatus: "PENDING",
        amountCents: 120000,
        currency: "usd",
        target: "milestone",
      })
    ).toEqual({ amountCents: 120000, currency: "USD" });

    expect(() =>
      validatePaymentIntentCreationPolicy({
        contractStatus: "DRAFT",
        milestoneStatus: "PENDING",
        amountCents: 120000,
        currency: "usd",
        target: "milestone",
      })
    ).toThrow("Contract is not in a payable state");

    expect(() =>
      validatePaymentIntentCreationPolicy({
        contractStatus: "FULLY_SIGNED",
        milestoneStatus: "PAID",
        amountCents: 120000,
        currency: "usd",
        target: "milestone",
      })
    ).toThrow("Milestone is not payable");

    expect(() =>
      validatePaymentIntentCreationPolicy({
        contractStatus: "FULLY_SIGNED",
        amountCents: 120000,
        currency: "usd",
        target: "deposit",
      })
    ).toThrow("Deposit payment intents remain manual-status-first in Gate 5B");
  });

  it("does not let failed/cancelled Stripe events regress succeeded payment state", () => {
    expect(applyPaymentFailureTransition({ currentStatus: "SUCCEEDED", eventType: "payment_intent.payment_failed" })).toEqual({
      kind: "ignored-terminal-success",
      statusAfter: "SUCCEEDED",
    });

    expect(applyPaymentFailureTransition({ currentStatus: "PROCESSING", eventType: "payment_intent.payment_failed" })).toEqual({
      kind: "apply-failure",
      statusAfter: "FAILED",
    });

    expect(applyPaymentFailureTransition({ currentStatus: "REQUIRES_PAYMENT", eventType: "payment_intent.canceled" })).toEqual({
      kind: "apply-cancellation",
      statusAfter: "CANCELLED",
    });
  });

  it("charges Stripe the fee-profile charge amount while preserving seller payout basis", () => {
    const feeProfile = resolveFeeProfile({ bookingClassification: "direct", grossAmountCents: 100_000 });
    const fundingPlan = buildPaymentIntentFundingPlan({ grossAmountCents: 100_000, feeProfile });

    expect(fundingPlan.grossAmountCents).toBe(100_000);
    expect(fundingPlan.stripeChargeAmountCents).toBe(feeProfile.totalChargeAmountCents);
    expect(fundingPlan.localPaymentIntentAmountCents).toBe(feeProfile.totalChargeAmountCents);
    expect(fundingPlan.payoutBasisAmountCents).toBe(95_000);
    expect(fundingPlan.stripeChargeAmountCents).toBe(102_930);
  });

  it("derives fee math from milestone gross instead of the charged payment-intent amount", () => {
    const feeProfile = resolveFeeProfile({ bookingClassification: "direct", grossAmountCents: 100_000 });

    expect(
      resolvePaymentIntentGrossAmountCents({
        paymentIntentAmountCents: feeProfile.totalChargeAmountCents,
        milestoneAmountCents: 100_000,
        contractMilestoneAmountsCents: [100_000],
      })
    ).toBe(100_000);
  });

  it("blocks payouts for open or approved refunds and dispute refund-pending freezes", () => {
    expect(isRefundRequestBlockingPayout({ status: "OPEN" })).toBe(true);
    expect(isRefundRequestBlockingPayout({ status: "APPROVED" })).toBe(true);
    expect(isRefundRequestBlockingPayout({ status: "DENIED" })).toBe(false);

    expect(isDisputeCaseBlockingPayout({ status: "OPEN", freezeState: "FROZEN" })).toBe(true);
    expect(isDisputeCaseBlockingPayout({ status: "RESOLVED_REFUND", freezeState: "REFUND_PENDING" })).toBe(true);
    expect(isDisputeCaseBlockingPayout({ status: "RESOLVED_SELLER_FAVOR", freezeState: "RELEASE_ELIGIBLE" })).toBe(false);
  });

  it("uses payout basis for release and stable Stripe transfer idempotency", () => {
    const feeProfile = resolveFeeProfile({ bookingClassification: "planner-mediated", grossAmountCents: 200_000 });
    const releasePlan = buildReleasePayoutPlan({
      milestoneId: "milestone_1",
      grossAmountCents: 200_000,
      currency: "USD",
      escrowBalanceCents: 200_000,
      feeProfile,
      stripeAccountId: "acct_1",
      sourceStripeChargeId: "ch_1",
    });

    expect(releasePlan.payoutAmountCents).toBe(feeProfile.payoutBasisAmountCents);
    expect(releasePlan.escrowDecrementAmountCents).toBe(feeProfile.payoutBasisAmountCents);
    expect(releasePlan.requiresStripeTransfer).toBe(true);
    expect(releasePlan.stripeTransferIdempotencyKey).toBe(
      buildStripeTransferIdempotencyKey({ milestoneId: "milestone_1", amountCents: feeProfile.payoutBasisAmountCents, currency: "USD" })
    );
  });
});
