import type Stripe from "stripe";
import type { CanonicalFeeProfile } from "../fee-profile";

const ACTIVITY_ACTIONS = {
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
} as const;

const PAYABLE_CONTRACT_STATES = new Set(["FULLY_SIGNED", "IN_PAYMENT"]);
const PAYABLE_MILESTONE_STATES = new Set(["PENDING", "OVERDUE"]);
const TERMINAL_SUCCESS_STATES = new Set(["SUCCEEDED"]);

export type MoneyEventSource = "stripe.webhook" | "local.confirm";

type LocalPaymentIntentForValidation = {
  id: string;
  contractId: string;
  milestoneId?: string | null;
  amountCents: number;
  currency: string;
};

type StripeSuccessForValidation = {
  amountReceivedCents: number;
  currency: string;
  metadata?: Record<string, string | undefined> | null;
};

export function normalizeStripeCurrency(currency: string) {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error("Currency must be a three-letter ISO currency code");
  }
  return normalized;
}

export function ensureTestModeStripeSecret(secretKey: string | undefined | null) {
  if (!secretKey) {
    throw new Error("Stripe secret key is not configured");
  }
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Gate 5B only allows Stripe test-mode secret keys");
  }
}

export function validatePaymentIntentCreationPolicy(input: {
  contractStatus: string;
  milestoneStatus?: string | null;
  amountCents: number;
  currency: string;
  target: "milestone" | "contract-total" | "deposit";
}) {
  if (input.target === "deposit") {
    throw new Error("Deposit payment intents remain manual-status-first in Gate 5B");
  }
  if (!PAYABLE_CONTRACT_STATES.has(input.contractStatus)) {
    throw new Error("Contract is not in a payable state");
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Payment amount must be a positive integer number of cents");
  }
  const currency = normalizeStripeCurrency(input.currency);
  if (input.target === "milestone" && !PAYABLE_MILESTONE_STATES.has(input.milestoneStatus ?? "")) {
    throw new Error("Milestone is not payable");
  }
  return { amountCents: input.amountCents, currency };
}

export function buildPaymentIntentFundingPlan(input: {
  grossAmountCents: number;
  feeProfile: CanonicalFeeProfile;
}) {
  if (!Number.isInteger(input.grossAmountCents) || input.grossAmountCents <= 0) {
    throw new Error("Gross payment amount must be a positive integer number of cents");
  }
  if (input.feeProfile.grossAmountCents !== input.grossAmountCents) {
    throw new Error("Fee profile gross amount does not match payment amount");
  }

  return {
    grossAmountCents: input.grossAmountCents,
    localPaymentIntentAmountCents: input.feeProfile.totalChargeAmountCents,
    stripeChargeAmountCents: input.feeProfile.totalChargeAmountCents,
    payoutBasisAmountCents: input.feeProfile.payoutBasisAmountCents,
    platformFeeAmountCents: input.feeProfile.platformFeeAmountCents,
    processingFeeAmountCents: input.feeProfile.processingFeeAmountCents,
  };
}

export function resolvePaymentIntentGrossAmountCents(input: {
  paymentIntentAmountCents: number;
  milestoneAmountCents?: number | null;
  contractMilestoneAmountsCents?: number[] | null;
}) {
  if (Number.isInteger(input.milestoneAmountCents) && (input.milestoneAmountCents ?? 0) > 0) {
    return input.milestoneAmountCents as number;
  }

  const milestoneAmounts = input.contractMilestoneAmountsCents ?? [];
  if (milestoneAmounts.length > 0 && milestoneAmounts.every((amount) => Number.isInteger(amount) && amount > 0)) {
    return milestoneAmounts.reduce((total, amount) => total + amount, 0);
  }

  return input.paymentIntentAmountCents;
}

export const PAYOUT_BLOCKING_REFUND_STATUSES = ["OPEN", "APPROVED"] as const;
export const PAYOUT_BLOCKING_DISPUTE_STATUSES = ["OPEN", "NEEDS_INFO", "UNDER_ADMIN_REVIEW", "ESCALATED"] as const;
export const PAYOUT_BLOCKING_DISPUTE_FREEZE_STATES = ["FROZEN", "ADMIN_REVIEW", "REFUND_PENDING"] as const;

export function isRefundRequestBlockingPayout(input: { status: string }) {
  return (PAYOUT_BLOCKING_REFUND_STATUSES as readonly string[]).includes(input.status);
}

export function isDisputeCaseBlockingPayout(input: { status: string; freezeState?: string | null }) {
  if ((PAYOUT_BLOCKING_DISPUTE_STATUSES as readonly string[]).includes(input.status)) return true;
  return input.status === "RESOLVED_REFUND" && input.freezeState === "REFUND_PENDING";
}

export function buildStripeTransferIdempotencyKey(input: {
  milestoneId: string;
  amountCents: number;
  currency: string;
}) {
  return `test:transfer:milestone:${input.milestoneId}:amount:${input.amountCents}:currency:${normalizeStripeCurrency(input.currency)}:v1`;
}

export function buildReleasePayoutPlan(input: {
  milestoneId: string;
  grossAmountCents: number;
  currency: string;
  escrowBalanceCents: number;
  feeProfile: CanonicalFeeProfile;
  stripeAccountId?: string | null;
  sourceStripeChargeId?: string | null;
}) {
  if (input.feeProfile.grossAmountCents !== input.grossAmountCents) {
    throw new Error("Fee profile gross amount does not match milestone amount");
  }
  const payoutAmountCents = input.feeProfile.payoutBasisAmountCents;
  if (!Number.isInteger(payoutAmountCents) || payoutAmountCents <= 0) {
    throw new Error("Payout basis amount must be a positive integer number of cents");
  }
  if (input.escrowBalanceCents < payoutAmountCents) {
    throw new Error("Insufficient escrow balance");
  }

  return {
    grossAmountCents: input.grossAmountCents,
    payoutAmountCents,
    escrowDecrementAmountCents: payoutAmountCents,
    currency: normalizeStripeCurrency(input.currency),
    requiresStripeTransfer: Boolean(input.stripeAccountId),
    sourceStripeChargeId: input.sourceStripeChargeId ?? undefined,
    stripeTransferIdempotencyKey: buildStripeTransferIdempotencyKey({
      milestoneId: input.milestoneId,
      amountCents: payoutAmountCents,
      currency: input.currency,
    }),
  };
}

export function validateStripePaymentSuccessMatch(input: {
  paymentIntent: LocalPaymentIntentForValidation;
  stripe: StripeSuccessForValidation;
}) {
  if (input.stripe.amountReceivedCents !== input.paymentIntent.amountCents) {
    throw new Error("Stripe amount does not match local payment intent");
  }

  if (normalizeStripeCurrency(input.stripe.currency) !== normalizeStripeCurrency(input.paymentIntent.currency)) {
    throw new Error("Stripe currency does not match local payment intent");
  }

  const metadata = input.stripe.metadata ?? {};
  if (!metadata.paymentIntentId) {
    throw new Error("Stripe metadata paymentIntentId is required");
  }
  if (metadata.paymentIntentId !== input.paymentIntent.id) {
    throw new Error("Stripe metadata paymentIntentId does not match local payment intent");
  }
  if (!metadata.contractId) {
    throw new Error("Stripe metadata contractId is required");
  }
  if (metadata.contractId !== input.paymentIntent.contractId) {
    throw new Error("Stripe metadata contractId does not match local payment intent");
  }
  if (input.paymentIntent.milestoneId && !metadata.milestoneId) {
    throw new Error("Stripe metadata milestoneId is required for milestone payment intents");
  }
  if (input.paymentIntent.milestoneId && metadata.milestoneId !== input.paymentIntent.milestoneId) {
    throw new Error("Stripe metadata milestoneId does not match local payment intent");
  }

  return true;
}

export function buildPaymentSuccessTransitionPlan(input: {
  paymentIntent: {
    id: string;
    status: string;
    amountCents: number;
    currency: string;
    milestoneId?: string | null;
    paymentMethod?: string | null;
  };
  contract: { id: string; status: string };
  escrowAccount?: { id: string; balanceCents: number; status: string } | null;
  stripe: StripeSuccessForValidation & {
    paymentMethod?: string | null;
    chargeId?: string | null;
  };
  source: MoneyEventSource;
}) {
  if (TERMINAL_SUCCESS_STATES.has(input.paymentIntent.status)) {
    return {
      kind: "already-applied" as const,
      paymentIntentId: input.paymentIntent.id,
      reason: "payment intent already succeeded",
    };
  }

  validateStripePaymentSuccessMatch({
    paymentIntent: {
      id: input.paymentIntent.id,
      contractId: input.contract.id,
      milestoneId: input.paymentIntent.milestoneId,
      amountCents: input.paymentIntent.amountCents,
      currency: input.paymentIntent.currency,
    },
    stripe: input.stripe,
  });

  return {
    kind: "apply-success" as const,
    source: input.source,
    paymentIntentId: input.paymentIntent.id,
    paymentStatusAfter: "SUCCEEDED" as const,
    paymentMethod: input.stripe.paymentMethod ?? input.paymentIntent.paymentMethod ?? "card",
    milestoneStatusAfter: input.paymentIntent.milestoneId ? ("IN_ESCROW" as const) : null,
    escrowBalanceIncrementCents: input.paymentIntent.amountCents,
    escrowStatusAfter: "FUNDED" as const,
    contractStatusAfter: input.contract.status === "FULLY_SIGNED" ? ("IN_PAYMENT" as const) : input.contract.status,
    createTransaction: true,
    evaluateHoldback: true,
    stripeChargeId: input.stripe.chargeId ?? undefined,
  };
}

export function applyPaymentFailureTransition(input: {
  currentStatus: string;
  eventType: "payment_intent.payment_failed" | "payment_intent.canceled";
}) {
  if (input.currentStatus === "SUCCEEDED") {
    return { kind: "ignored-terminal-success" as const, statusAfter: "SUCCEEDED" as const };
  }
  if (input.eventType === "payment_intent.canceled") {
    return { kind: "apply-cancellation" as const, statusAfter: "CANCELLED" as const };
  }
  return { kind: "apply-failure" as const, statusAfter: "FAILED" as const };
}

type WebhookProcessingStatus = "processing" | "completed" | "failed";

type WebhookEventMeta = {
  processingStatus?: WebhookProcessingStatus;
  processingStartedAt?: string;
  completedAt?: string;
  failedAt?: string;
  [key: string]: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function webhookMeta(value: unknown): WebhookEventMeta {
  return asRecord(value) as WebhookEventMeta;
}

function millisecondsSince(value: unknown, now: Date) {
  if (typeof value !== "string") return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
  return now.getTime() - parsed;
}

export function classifyWebhookProcessingState(input: {
  existing?: { eventId: string; meta?: unknown } | null;
  now?: Date;
  staleAfterMs?: number;
}) {
  if (!input.existing) {
    return { action: "claim" as const, reason: "event has not been seen" };
  }

  const now = input.now ?? new Date();
  const staleAfterMs = input.staleAfterMs ?? 5 * 60 * 1000;
  const meta = webhookMeta(input.existing.meta);

  if (meta.processingStatus === "completed") {
    return { action: "duplicate" as const, reason: "event already processed successfully" };
  }

  if (meta.processingStatus === "failed") {
    return { action: "retry" as const, reason: "previous processing attempt failed" };
  }

  if (meta.processingStatus === "processing") {
    const ageMs = millisecondsSince(meta.processingStartedAt, now);
    if (ageMs >= staleAfterMs) {
      return { action: "retry" as const, reason: "previous processing attempt is stale" };
    }
    return { action: "in-progress" as const, reason: "event is currently processing" };
  }

  return { action: "retry" as const, reason: "legacy webhook marker has no processing status" };
}

const AUTOMATIC_WEBHOOK_EVENTS = new Set([
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]);

const MANUAL_ONLY_WEBHOOK_PATTERNS = ["dispute", "refund", "payout", "transfer"];

export function classifyStripeWebhookEventType(eventType: string) {
  if (AUTOMATIC_WEBHOOK_EVENTS.has(eventType)) {
    return { kind: "automatic" as const, handled: true as const };
  }
  if (MANUAL_ONLY_WEBHOOK_PATTERNS.some((pattern) => eventType.includes(pattern))) {
    return {
      kind: "manual-admin-only" as const,
      handled: false as const,
      reason: "dispute/refund/payout automation is blocked pending separate approval",
    };
  }
  return { kind: "ignored" as const, handled: false as const };
}

type LocalPaymentForReconciliation = {
  id: string;
  stripeIntentId?: string | null;
  status: string;
  amountCents: number;
  currency: string;
};

type StripePaymentForReconciliation = {
  id: string;
  status: string;
  amountReceivedCents: number;
  currency: string;
};

type ReconciliationAnomaly = {
  kind:
    | "missing_stripe_evidence"
    | "stripe_succeeded_local_not_succeeded"
    | "local_succeeded_stripe_not_succeeded"
    | "stripe_failed_local_not_failed"
    | "stripe_canceled_local_not_canceled"
    | "amount_mismatch"
    | "currency_mismatch";
  severity: "critical" | "warning";
  localPaymentIntentId: string;
  stripeIntentId?: string | null;
  message: string;
};

function normalizedStripeStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  if (["succeeded", "paid"].includes(normalized)) return "succeeded";
  if (["payment_failed", "failed", "requires_payment_method"].includes(normalized)) return "failed";
  if (["canceled", "cancelled"].includes(normalized)) return "canceled";
  return normalized;
}

export function buildPaymentReconciliationReport(input: {
  generatedAt: string;
  localPayments: LocalPaymentForReconciliation[];
  stripePayments: StripePaymentForReconciliation[];
}) {
  const stripeById = new Map(input.stripePayments.map((payment) => [payment.id, payment]));
  const anomalies: ReconciliationAnomaly[] = [];

  for (const localPayment of input.localPayments) {
    const stripePayment = localPayment.stripeIntentId ? stripeById.get(localPayment.stripeIntentId) : undefined;
    if (!stripePayment) {
      anomalies.push({
        kind: "missing_stripe_evidence",
        severity: localPayment.status === "SUCCEEDED" ? "critical" : "warning",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: localPayment.stripeIntentId,
        message: "Local payment intent has no matching Stripe/test-mode evidence",
      });
      continue;
    }

    const stripeStatus = normalizedStripeStatus(stripePayment.status);
    if (stripeStatus === "succeeded" && localPayment.status !== "SUCCEEDED") {
      anomalies.push({
        kind: "stripe_succeeded_local_not_succeeded",
        severity: "critical",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Stripe/test-mode evidence succeeded but local state was not updated",
      });
    }

    if (localPayment.status === "SUCCEEDED" && stripeStatus !== "succeeded") {
      anomalies.push({
        kind: "local_succeeded_stripe_not_succeeded",
        severity: "critical",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Local state says success but Stripe/test-mode evidence is not succeeded",
      });
    }

    if (stripeStatus === "failed" && !["FAILED", "SUCCEEDED"].includes(localPayment.status)) {
      anomalies.push({
        kind: "stripe_failed_local_not_failed",
        severity: "warning",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Stripe/test-mode evidence failed but local state is not FAILED",
      });
    }

    if (stripeStatus === "canceled" && !["CANCELLED", "SUCCEEDED"].includes(localPayment.status)) {
      anomalies.push({
        kind: "stripe_canceled_local_not_canceled",
        severity: "warning",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Stripe/test-mode evidence canceled but local state is not CANCELLED",
      });
    }

    if (stripePayment.amountReceivedCents !== localPayment.amountCents) {
      anomalies.push({
        kind: "amount_mismatch",
        severity: "warning",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Stripe/test-mode amount does not match local payment amount",
      });
    }

    if (normalizeStripeCurrency(stripePayment.currency) !== normalizeStripeCurrency(localPayment.currency)) {
      anomalies.push({
        kind: "currency_mismatch",
        severity: "warning",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Stripe/test-mode currency does not match local payment currency",
      });
    }
  }

  const critical = anomalies.filter((anomaly) => anomaly.severity === "critical").length;
  const warning = anomalies.filter((anomaly) => anomaly.severity === "warning").length;

  return {
    generatedAt: input.generatedAt,
    summary: {
      localPayments: input.localPayments.length,
      stripePayments: input.stripePayments.length,
      totalAnomalies: anomalies.length,
      critical,
      warning,
      clean: anomalies.length === 0,
    },
    anomalies,
  };
}

function stripeAmountReceivedCents(paymentIntent: Stripe.PaymentIntent) {
  return paymentIntent.amount_received || paymentIntent.amount;
}

function stripePaymentMethod(paymentIntent: Stripe.PaymentIntent) {
  if (typeof paymentIntent.payment_method === "string") return paymentIntent.payment_method;
  return paymentIntent.payment_method_types?.[0] || "card";
}

export async function findPaymentIntentForStripeEvent(db: any, paymentIntent: Stripe.PaymentIntent) {
  const stripeIntentId = paymentIntent.id;
  const metadataPaymentIntentId = paymentIntent.metadata?.paymentIntentId;

  const internalPaymentIntent = await db.paymentIntent.findUnique({
    where: { stripeIntentId },
    include: {
      contract: {
        include: {
          proposal: {
            include: {
              milestones: true,
              escrowAccount: true,
              event: { select: { orgId: true } },
            },
          },
        },
      },
      milestone: true,
    },
  });

  if (internalPaymentIntent) return internalPaymentIntent;
  if (!metadataPaymentIntentId) return null;

  return db.paymentIntent.update({
    where: { id: metadataPaymentIntentId },
    data: { stripeIntentId },
    include: {
      contract: {
        include: {
          proposal: {
            include: {
              milestones: true,
              escrowAccount: true,
              event: { select: { orgId: true } },
            },
          },
        },
      },
      milestone: true,
    },
  });
}

export async function applyPaymentSuccessStateTransition(input: {
  db: any;
  paymentIntentId?: string;
  stripePaymentIntent: Stripe.PaymentIntent;
  source: MoneyEventSource;
  actorId?: string | null;
}) {
  const db = input.db;
  const localPaymentIntentId = input.paymentIntentId ?? input.stripePaymentIntent.metadata?.paymentIntentId;

  return db.$transaction(async (tx: any) => {
    const currentPaymentIntent = localPaymentIntentId
      ? await tx.paymentIntent.findUnique({
          where: { id: localPaymentIntentId },
          include: {
            contract: {
              include: {
                proposal: {
                  include: {
                    milestones: true,
                    escrowAccount: true,
                    event: { select: { orgId: true } },
                  },
                },
              },
            },
            milestone: true,
          },
        })
      : await findPaymentIntentForStripeEvent(tx, input.stripePaymentIntent);

    if (!currentPaymentIntent) {
      return { kind: "not-found" as const };
    }

    const plan = buildPaymentSuccessTransitionPlan({
      paymentIntent: currentPaymentIntent,
      contract: currentPaymentIntent.contract,
      escrowAccount: currentPaymentIntent.contract.proposal.escrowAccount,
      stripe: {
        amountReceivedCents: stripeAmountReceivedCents(input.stripePaymentIntent),
        currency: input.stripePaymentIntent.currency,
        paymentMethod: stripePaymentMethod(input.stripePaymentIntent),
        chargeId: typeof input.stripePaymentIntent.latest_charge === "string" ? input.stripePaymentIntent.latest_charge : undefined,
        metadata: input.stripePaymentIntent.metadata,
      },
      source: input.source,
    });

    if (plan.kind !== "apply-success") return plan;

    const fundingApplied = await tx.paymentIntent.updateMany({
      where: {
        id: currentPaymentIntent.id,
        status: { not: "SUCCEEDED" },
      },
      data: {
        status: plan.paymentStatusAfter,
        fundedAt: new Date(),
        paymentMethod: plan.paymentMethod,
        stripeIntentId: input.stripePaymentIntent.id,
      },
    });

    if (fundingApplied.count === 0) {
      return {
        kind: "already-applied" as const,
        paymentIntentId: currentPaymentIntent.id,
        reason: "payment intent already succeeded",
      };
    }

    if (currentPaymentIntent.milestoneId) {
      await tx.paymentMilestone.update({
        where: { id: currentPaymentIntent.milestoneId },
        data: { status: plan.milestoneStatusAfter },
      });
    }

    const escrowAccount = currentPaymentIntent.contract.proposal.escrowAccount;
    if (escrowAccount) {
      await tx.escrowAccount.update({
        where: { id: escrowAccount.id },
        data: {
          balanceCents: { increment: plan.escrowBalanceIncrementCents },
          status: plan.escrowStatusAfter,
        },
      });
    }

    const { resolveBookingClassification } = await import("../booking-classification");
    const { resolveFeeProfile } = await import("../fee-profile");
    const { evaluateHoldbackForPaymentIntent } = await import("../holdback");

    const bookingClassification = resolveBookingClassification({
      proposal: {
        bookingClassification: currentPaymentIntent.contract.proposal.bookingClassification,
        listingId: currentPaymentIntent.contract.proposal.listingId,
      },
      event: currentPaymentIntent.contract.proposal.event,
    });
    const grossAmountCents = resolvePaymentIntentGrossAmountCents({
      paymentIntentAmountCents: currentPaymentIntent.amountCents,
      milestoneAmountCents: currentPaymentIntent.milestone?.amountCents,
      contractMilestoneAmountsCents: currentPaymentIntent.contract.proposal.milestones?.map((milestone: { amountCents: number }) => milestone.amountCents),
    });
    const feeProfile = resolveFeeProfile({
      bookingClassification,
      grossAmountCents,
    });

    await tx.transaction.upsert({
      where: { paymentIntentId: currentPaymentIntent.id },
      create: {
        paymentIntentId: currentPaymentIntent.id,
        payerId: currentPaymentIntent.payerId,
        payeeId: currentPaymentIntent.payeeId,
        netAmountCents: feeProfile.netAmountCents,
        platformFeeCents: feeProfile.platformFeeAmountCents,
        totalAmountCents: currentPaymentIntent.amountCents,
        currency: currentPaymentIntent.currency,
        stripeChargeId: plan.stripeChargeId,
        processedAt: new Date(),
      },
      update: {
        stripeChargeId: plan.stripeChargeId,
        processedAt: new Date(),
      },
    });

    await evaluateHoldbackForPaymentIntent({ paymentIntentId: currentPaymentIntent.id, tx });

    if (currentPaymentIntent.contract.status === "FULLY_SIGNED") {
      await tx.contract.update({
        where: { id: currentPaymentIntent.contractId },
        data: { status: plan.contractStatusAfter },
      });
    }

    await tx.activity.create({
      data: {
        orgId: currentPaymentIntent.contract.proposal.event.orgId,
        eventId: currentPaymentIntent.contract.eventId,
        actorId: input.actorId ?? currentPaymentIntent.payerId,
        action: ACTIVITY_ACTIONS.PAYMENT_CONFIRMED,
        target: currentPaymentIntent.id,
        meta: {
          source: input.source,
          paymentIntentId: currentPaymentIntent.id,
          stripePaymentIntentId: input.stripePaymentIntent.id,
          milestoneId: currentPaymentIntent.milestoneId,
          amountCents: currentPaymentIntent.amountCents,
          currency: currentPaymentIntent.currency,
          platformFeeCents: feeProfile.platformFeeAmountCents,
          netAmountCents: feeProfile.netAmountCents,
          stripeChargeId: plan.stripeChargeId,
          milestoneStatusBefore: currentPaymentIntent.milestone?.status,
          milestoneStatusAfter: plan.milestoneStatusAfter,
          escrowStatusBefore: escrowAccount?.status,
          escrowStatusAfter: plan.escrowStatusAfter,
          contractStatusBefore: currentPaymentIntent.contract.status,
          contractStatusAfter: plan.contractStatusAfter,
          bookingClassification,
          feeProfile,
        },
      },
    });

    return plan;
  });
}

export async function applyPaymentFailureStateTransition(input: {
  db: any;
  stripePaymentIntent: Stripe.PaymentIntent;
  eventType: "payment_intent.payment_failed" | "payment_intent.canceled";
}) {
  const internalPaymentIntent = await findPaymentIntentForStripeEvent(input.db, input.stripePaymentIntent);
  if (!internalPaymentIntent) return { kind: "not-found" as const };

  const transition = applyPaymentFailureTransition({
    currentStatus: internalPaymentIntent.status,
    eventType: input.eventType,
  });

  if (transition.kind === "ignored-terminal-success") return transition;

  await input.db.paymentIntent.update({
    where: { id: internalPaymentIntent.id },
    data: { status: transition.statusAfter },
  });

  return transition;
}
