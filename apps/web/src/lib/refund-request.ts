import { prisma } from "@/lib/prisma";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { resolveFeeProfile } from "@/lib/fee-profile";
import { recordAudit } from "@/server/lib/audit";
import { feeOverrideRequiresAdminOverride, recordAdminOverride } from "@/lib/admin-override";
import { getGuardedMvpAuthorityForUserId } from "@/lib/rbac";

export type RefundFeeTreatment = "BUYER_ABSORBS" | "REFUND_TO_BUYER" | "NON_REFUNDABLE";
export type RefundRequestStatus = "OPEN" | "APPROVED" | "DENIED" | "CANCELED";

export async function buildRefundRequestContext(proposalId: string, milestoneId?: string | null) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      contract: true,
      event: true,
      milestones: true,
    },
  });

  if (!proposal) {
    throw new Error("Proposal not found");
  }

  const milestone = milestoneId
    ? proposal.milestones.find((item) => item.id === milestoneId) ?? null
    : null;

  const paymentIntent = await (prisma as any).paymentIntent.findFirst({
    where: {
      contractId: proposal.contract?.id,
      ...(milestoneId ? { milestoneId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const bookingClassification = resolveBookingClassification({
    proposal: {
      bookingClassification: proposal.bookingClassification,
      listingId: proposal.listingId,
    },
    event: { org: { type: (proposal.event as any)?.org?.type } },
  });

  const grossAmountCents = milestone?.amountCents ?? paymentIntent?.amountCents ?? proposal.totalCents;
  const feeProfile = resolveFeeProfile({
    bookingClassification,
    grossAmountCents,
  });

  const acceptanceProof = await (prisma as any).acceptanceCapture.findFirst({
    where: {
      OR: [
        paymentIntent?.id ? { paymentIntentId: paymentIntent.id } : undefined,
        proposal.contract?.id ? { contractId: proposal.contract.id } : undefined,
        { proposalId: proposal.id },
      ].filter(Boolean),
    },
    orderBy: { acceptedAt: "desc" },
  });

  return {
    proposal,
    milestone,
    paymentIntent,
    bookingClassification,
    feeProfile,
    acceptanceProof,
  };
}

export async function createRefundRequest(input: {
  actorId: string;
  actorRole: string;
  proposalId: string;
  milestoneId?: string | null;
  amountRequestedCents: number;
  reason: string;
  orgId?: string | null;
  requestContextId?: string | null;
}) {
  const context = await buildRefundRequestContext(input.proposalId, input.milestoneId);
  const defaultProcessingFeeTreatment: RefundFeeTreatment = "BUYER_ABSORBS";
  const defaultPlatformFeeTreatment: RefundFeeTreatment = "NON_REFUNDABLE";

  return (prisma as any).refundRequest.create({
    data: {
      orgId: input.orgId ?? context.proposal.event.orgId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      proposalId: context.proposal.id,
      contractId: context.proposal.contract?.id,
      paymentIntentId: context.paymentIntent?.id,
      milestoneId: context.milestone?.id,
      acceptanceCaptureId: context.acceptanceProof?.id,
      bookingClassification: context.bookingClassification,
      feeProfileSnapshot: context.feeProfile,
      amountRequestedCents: input.amountRequestedCents,
      currency: context.paymentIntent?.currency ?? context.proposal.currency,
      reason: input.reason,
      processingFeeTreatment: defaultProcessingFeeTreatment,
      platformFeeTreatment: defaultPlatformFeeTreatment,
      requestContextId: input.requestContextId ?? undefined,
      auditTrail: {
        createdBy: input.actorId,
        createdRole: input.actorRole,
        createdAt: new Date().toISOString(),
        policy: {
          adminApprovedOnly: true,
          processingFeeDefault: defaultProcessingFeeTreatment,
          platformFeeDefault: defaultPlatformFeeTreatment,
        },
      },
    },
  });
}

export async function reviewRefundRequest(input: {
  refundRequestId: string;
  adminId: string;
  decision: "APPROVED" | "DENIED";
  decisionReason: string;
  processingFeeTreatment?: RefundFeeTreatment;
  platformFeeTreatment?: RefundFeeTreatment;
}) {
  const platformAdmin = await getGuardedMvpAuthorityForUserId(input.adminId);
  if (!platformAdmin) {
    throw new Error("PLATFORM_ADMIN authority is required");
  }

  const existing = await (prisma as any).refundRequest.findUnique({
    where: { id: input.refundRequestId },
  });

  if (!existing) {
    throw new Error("Refund request not found");
  }

  if (existing.status !== "OPEN") {
    throw new Error("Refund request is not open for review");
  }

  const processingFeeTreatment = input.processingFeeTreatment ?? existing.processingFeeTreatment;
  const platformFeeTreatment = input.platformFeeTreatment ?? existing.platformFeeTreatment;

  if (platformFeeTreatment !== existing.platformFeeTreatment) {
    throw new Error("Platform fee override is disallowed in guarded MVP");
  }

  if (existing.paymentIntentId == null && input.decision === "APPROVED") {
    throw new Error("Off-ledger goodwill refund is disallowed in guarded MVP");
  }
  const hasFeeDeviation =
    processingFeeTreatment !== existing.processingFeeTreatment ||
    platformFeeTreatment !== existing.platformFeeTreatment;

  if (feeOverrideRequiresAdminOverride({ feeProfile: existing.feeProfileSnapshot as any, hasDeviation: hasFeeDeviation })) {
    if (!input.decisionReason.trim()) {
      throw new Error("Admin override reason is required");
    }
  }

  const updated = await (prisma as any).refundRequest.update({
    where: { id: input.refundRequestId },
    data: {
      status: input.decision,
      adminDecisionAt: new Date(),
      adminDecisionById: input.adminId,
      adminDecisionReason: input.decisionReason,
      processingFeeTreatment,
      platformFeeTreatment,
      auditTrail: {
        ...(existing.auditTrail as Record<string, unknown> | null ?? {}),
        adminDecision: {
          by: input.adminId,
          at: new Date().toISOString(),
          decision: input.decision,
          reason: input.decisionReason,
          processingFeeTreatment,
          platformFeeTreatment,
        },
      },
    },
  });

  await recordAudit({
    actorId: input.adminId,
    orgId: existing.orgId,
    action: `refund-request.${input.decision.toLowerCase()}`,
    target: existing.id,
    metadata: {
      refundRequestId: existing.id,
      proposalId: existing.proposalId,
      contractId: existing.contractId,
      paymentIntentId: existing.paymentIntentId,
      milestoneId: existing.milestoneId,
      decisionReason: input.decisionReason,
      processingFeeTreatment,
      platformFeeTreatment,
    },
  });

  await recordAdminOverride({
    actorId: input.adminId,
    actorRole: platformAdmin.role,
    orgId: existing.orgId,
    targetType: "REFUND_REQUEST",
    targetId: existing.id,
    bookingClassification: existing.bookingClassification,
    feeProfileSnapshot: existing.feeProfileSnapshot,
    acceptanceCaptureId: existing.acceptanceCaptureId,
    exceptionType: hasFeeDeviation ? "REFUND_FEE_DEVIATION" : "REFUND_DECISION",
    decision: input.decision,
    reason: input.decisionReason,
    proposalId: existing.proposalId,
    contractId: existing.contractId,
    paymentIntentId: existing.paymentIntentId,
    milestoneId: existing.milestoneId,
    refundRequestId: existing.id,
    metadata: {
      processingFeeTreatment,
      platformFeeTreatment,
      hasFeeDeviation,
    },
  });

  return updated;
}

export async function listOpenRefundRequestsForProposal(proposalId: string) {
  return (prisma as any).refundRequest.findMany({
    where: {
      proposalId,
      status: "OPEN",
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function hasBlockingRefundRequest(proposalId: string, milestoneId?: string | null) {
  const openRequest = await (prisma as any).refundRequest.findFirst({
    where: {
      proposalId,
      status: "OPEN",
      ...(milestoneId ? { OR: [{ milestoneId }, { milestoneId: null }] } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return openRequest;
}
