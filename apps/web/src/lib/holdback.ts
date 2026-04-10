import { prisma } from "@/lib/prisma";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { resolveFeeProfile } from "@/lib/fee-profile";
import { recordAudit } from "@/server/lib/audit";
import type { AppUser } from "@/lib/auth-helpers";
import { recordAdminOverride } from "@/lib/admin-override";
import { isPlatformAdminForGuardedMvp } from "@/lib/rbac";

const GUARDED_MVP_HIGH_AMOUNT_CENTS = Number(process.env.GUARDED_MVP_HOLDBACK_THRESHOLD_CENTS || 250000);

export function canManageHoldbacks(user: AppUser | null | undefined) {
  return isPlatformAdminForGuardedMvp(user);
}

export async function getPaymentHoldbackByPaymentIntent(paymentIntentId: string) {
  return (prisma as any).paymentHoldback.findUnique({ where: { paymentIntentId } });
}

export async function getBlockingHoldbackForMilestone(milestoneId: string) {
  return (prisma as any).paymentHoldback.findFirst({
    where: {
      milestoneId,
      state: "ACTIVE",
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function evaluateHoldbackForPaymentIntent(input: {
  paymentIntentId: string;
  tx?: any;
  manualRiskFlag?: boolean;
}) {
  const db = input.tx ?? prisma;
  const paymentIntent = await (db as any).paymentIntent.findUnique({
    where: { id: input.paymentIntentId },
    include: {
      payer: { select: { id: true, role: true } },
      payee: { select: { id: true, role: true } },
      contract: {
        include: {
          proposal: {
            include: {
              event: { include: { org: true } },
              listing: { include: { org: true } },
              milestones: true,
            },
          },
        },
      },
      milestone: true,
    },
  });

  if (!paymentIntent) throw new Error("Payment intent not found for holdback evaluation");

  const bookingClassification = resolveBookingClassification({
    proposal: {
      bookingClassification: paymentIntent.contract.proposal.bookingClassification,
      listingId: paymentIntent.contract.proposal.listingId,
    },
    event: paymentIntent.contract.proposal.event,
  });

  const feeProfile = resolveFeeProfile({
    bookingClassification,
    grossAmountCents: paymentIntent.amountCents,
  });

  const acceptanceProof = await (db as any).acceptanceCapture.findFirst({
    where: {
      OR: [
        { paymentIntentId: paymentIntent.id },
        { contractId: paymentIntent.contractId },
        { proposalId: paymentIntent.contract.proposalId },
      ],
    },
    orderBy: { acceptedAt: "desc" },
  });

  const sellerOrg = paymentIntent.contract.proposal.listing?.org;
  const buyerOrgId = paymentIntent.contract.proposal.event.orgId;
  const sellerOrgId = sellerOrg?.id ?? paymentIntent.contract.sellerId ?? null;

  const priorTransactionCount = await (db as any).transaction.count({
    where: {
      payeeId: paymentIntent.payeeId,
      payerId: paymentIntent.payerId,
      paymentIntentId: { not: paymentIntent.id },
    },
  });

  const disputeCount = await (db as any).dispute.count({
    where: {
      OR: [
        { actorId: paymentIntent.payerId },
        { actorId: paymentIntent.payeeId },
        buyerOrgId ? { orgId: buyerOrgId } : undefined,
        sellerOrgId ? { orgId: sellerOrgId } : undefined,
      ].filter(Boolean),
    },
  });

  const refundCount = await (db as any).refundRequest.count({
    where: {
      OR: [
        { actorId: paymentIntent.payerId },
        { actorId: paymentIntent.payeeId },
        buyerOrgId ? { orgId: buyerOrgId } : undefined,
        sellerOrgId ? { orgId: sellerOrgId } : undefined,
      ].filter(Boolean),
    },
  });

  const triggers = {
    firstTransactionWithSeller: priorTransactionCount === 0,
    sellerNotFullyVerified: !(sellerOrg?.stripeConnectAccountId && sellerOrg?.profileStatus === "PUBLISHED"),
    unusuallyHighAmount: paymentIntent.amountCents >= GUARDED_MVP_HIGH_AMOUNT_CENTS,
    disputeOrRefundHistory: disputeCount > 0 || refundCount > 0,
    manualRiskFlag: Boolean(input.manualRiskFlag),
    thresholdAmountCents: GUARDED_MVP_HIGH_AMOUNT_CENTS,
    priorTransactionCount,
    disputeCount,
    refundCount,
    sellerVerification: {
      stripeConnectAccountIdPresent: Boolean(sellerOrg?.stripeConnectAccountId),
      profileStatus: sellerOrg?.profileStatus ?? null,
    },
  };

  const activeTriggerKeys = Object.entries(triggers)
    .filter(([key, value]) => key !== "thresholdAmountCents" && key !== "priorTransactionCount" && key !== "disputeCount" && key !== "refundCount" && key !== "sellerVerification" && value === true)
    .map(([key]) => key);

  const reason = activeTriggerKeys.length > 0
    ? `Guarded MVP high-risk holdback: ${activeTriggerKeys.join(", ")}`
    : null;

  const existing = await (db as any).paymentHoldback.findUnique({ where: { paymentIntentId: paymentIntent.id } });

  return (db as any).paymentHoldback.upsert({
    where: { paymentIntentId: paymentIntent.id },
    create: {
      paymentIntentId: paymentIntent.id,
      proposalId: paymentIntent.contract.proposalId,
      contractId: paymentIntent.contractId,
      milestoneId: paymentIntent.milestoneId,
      bookingClassification: bookingClassification === "planner-mediated" ? "PLANNER_MEDIATED" : bookingClassification.toUpperCase(),
      feeProfileSnapshot: feeProfile,
      acceptanceCaptureId: acceptanceProof?.id,
      highRiskTriggers: triggers,
      triggerSummary: activeTriggerKeys.join(", ") || null,
      state: activeTriggerKeys.length > 0 ? "ACTIVE" : "NONE",
      reason,
      manualRiskFlag: Boolean(input.manualRiskFlag),
      adminDecision: "AUTO_EVALUATED",
      auditTrail: {
        createdAt: new Date().toISOString(),
        source: "payments.confirm",
        evaluation: { activeTriggerKeys, reason },
      },
    },
    update: {
      proposalId: paymentIntent.contract.proposalId,
      contractId: paymentIntent.contractId,
      milestoneId: paymentIntent.milestoneId,
      bookingClassification: bookingClassification === "planner-mediated" ? "PLANNER_MEDIATED" : bookingClassification.toUpperCase(),
      feeProfileSnapshot: feeProfile,
      acceptanceCaptureId: acceptanceProof?.id,
      highRiskTriggers: triggers,
      triggerSummary: activeTriggerKeys.join(", ") || null,
      state: existing?.adminDecision === "RELEASED"
        ? existing.state
        : activeTriggerKeys.length > 0 ? "ACTIVE" : "NONE",
      reason: existing?.adminDecision === "RELEASED" ? existing.reason : reason,
      manualRiskFlag: Boolean(existing?.manualRiskFlag || input.manualRiskFlag),
      adminDecision: existing?.adminDecision ?? "AUTO_EVALUATED",
      auditTrail: {
        ...((existing?.auditTrail as Record<string, unknown> | null) ?? {}),
        lastEvaluationAt: new Date().toISOString(),
        source: "payments.confirm",
        evaluation: { activeTriggerKeys, reason },
      },
    },
  });
}

export async function applyHoldbackDecision(input: {
  paymentIntentId: string;
  actorId: string;
  actorRole: string;
  reason: string;
  action: "APPLY" | "RELEASE" | "CLEAR";
  holdbackAmountCents?: number;
  holdbackPercent?: number;
}) {
  if (!input.reason.trim()) throw new Error("Admin override reason is required");
  const existing = await (prisma as any).paymentHoldback.findUnique({ where: { paymentIntentId: input.paymentIntentId } });
  if (!existing) throw new Error("Holdback record not found");

  if (input.action === "APPLY" && (input.holdbackAmountCents != null || input.holdbackPercent != null)) {
    throw new Error("Holdback amount rewrite is disallowed in guarded MVP");
  }

  const nextState = input.action === "RELEASE" ? "RELEASED" : input.action === "APPLY" ? "ACTIVE" : "NONE";
  const nextDecision = input.action === "RELEASE" ? "RELEASED" : input.action === "APPLY" ? "APPLIED" : "OVERRIDDEN_NONE";

  const updated = await (prisma as any).paymentHoldback.update({
    where: { paymentIntentId: input.paymentIntentId },
    data: {
      state: nextState,
      reason: input.reason,
      holdbackAmountCents: input.holdbackAmountCents,
      holdbackPercent: input.holdbackPercent,
      actorAdminId: input.actorId,
      actorAdminRole: input.actorRole,
      manualRiskFlag: input.action === "APPLY" ? true : existing.manualRiskFlag,
      adminDecision: nextDecision,
      adminDecisionAt: new Date(),
      adminDecisionById: input.actorId,
      adminDecisionByRole: input.actorRole,
      adminDecisionReason: input.reason,
      releasedAt: input.action === "RELEASE" ? new Date() : existing.releasedAt,
      releasedById: input.action === "RELEASE" ? input.actorId : existing.releasedById,
      releasedByRole: input.action === "RELEASE" ? input.actorRole : existing.releasedByRole,
      releaseReason: input.action === "RELEASE" ? input.reason : existing.releaseReason,
      auditTrail: {
        ...((existing.auditTrail as Record<string, unknown> | null) ?? {}),
        lastDecision: {
          at: new Date().toISOString(),
          action: input.action,
          by: input.actorId,
          role: input.actorRole,
          reason: input.reason,
          holdbackAmountCents: input.holdbackAmountCents ?? null,
          holdbackPercent: input.holdbackPercent ?? null,
        },
      },
    },
  });

  await recordAudit({
    actorId: input.actorId,
    orgId: null,
    action: `holdback.${input.action.toLowerCase()}`,
    target: updated.id,
    metadata: {
      holdbackId: updated.id,
      paymentIntentId: updated.paymentIntentId,
      proposalId: updated.proposalId,
      contractId: updated.contractId,
      milestoneId: updated.milestoneId,
      reason: input.reason,
      state: updated.state,
    },
  });

  await recordAdminOverride({
    actorId: input.actorId,
    actorRole: input.actorRole,
    targetType: "PAYMENT_HOLDBACK",
    targetId: updated.id,
    bookingClassification: updated.bookingClassification,
    feeProfileSnapshot: updated.feeProfileSnapshot,
    acceptanceCaptureId: updated.acceptanceCaptureId,
    exceptionType: "HOLDBACK_DECISION",
    decision: input.action === "RELEASE" ? "RELEASED" : input.action === "CLEAR" ? "CLEARED" : "APPLIED",
    reason: input.reason,
    proposalId: updated.proposalId,
    contractId: updated.contractId,
    paymentIntentId: updated.paymentIntentId,
    milestoneId: updated.milestoneId,
    paymentHoldbackId: updated.id,
    metadata: {
      action: input.action,
      holdbackAmountCents: input.holdbackAmountCents ?? null,
      holdbackPercent: input.holdbackPercent ?? null,
      state: updated.state,
    },
  });

  return updated;
}

export async function getHoldbackVerificationContext(input: {
  paymentIntentId?: string;
  milestoneId?: string;
  proposalId?: string;
}) {
  const where = input.paymentIntentId
    ? { paymentIntentId: input.paymentIntentId }
    : input.milestoneId
      ? { milestoneId: input.milestoneId }
      : input.proposalId
        ? { proposalId: input.proposalId }
        : null;

  if (!where) throw new Error("A paymentIntentId, milestoneId, or proposalId is required");

  const holdback = await (prisma as any).paymentHoldback.findFirst({ where, orderBy: { updatedAt: "desc" } });
  if (!holdback) throw new Error("Holdback record not found");

  const acceptanceProof = holdback.acceptanceCaptureId
    ? await (prisma as any).acceptanceCapture.findUnique({ where: { id: holdback.acceptanceCaptureId } })
    : await (prisma as any).acceptanceCapture.findFirst({
        where: {
          OR: [
            holdback.paymentIntentId ? { paymentIntentId: holdback.paymentIntentId } : undefined,
            holdback.contractId ? { contractId: holdback.contractId } : undefined,
            { proposalId: holdback.proposalId },
          ].filter(Boolean),
        },
        orderBy: { acceptedAt: "desc" },
      });

  const disputes = await (prisma as any).dispute.findMany({
    where: {
      proposalId: holdback.proposalId,
      ...(holdback.milestoneId ? { OR: [{ milestoneId: holdback.milestoneId }, { milestoneId: null }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const refundRequests = await (prisma as any).refundRequest.findMany({
    where: {
      proposalId: holdback.proposalId,
      ...(holdback.milestoneId ? { OR: [{ milestoneId: holdback.milestoneId }, { milestoneId: null }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    holdback,
    acceptanceProof,
    feeProfile: holdback.feeProfileSnapshot,
    disputes,
    refundRequests,
  };
}
