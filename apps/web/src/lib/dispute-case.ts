import { prisma } from "@/lib/prisma";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { resolveFeeProfile } from "@/lib/fee-profile";
import { createRefundRequest } from "@/lib/refund-request";
import { recordAudit } from "@/server/lib/audit";
import { recordAdminOverride } from "@/lib/admin-override";
import { getGuardedMvpAuthorityForUserId } from "@/lib/rbac";

const OPEN_DISPUTE_STATUSES = ["OPEN", "NEEDS_INFO", "UNDER_ADMIN_REVIEW", "ESCALATED"] as const;

type DisputeReviewAction = "REQUEST_INFO" | "ESCALATE" | "SELLER_FAVOR" | "REFUND" | "REOPEN";

export async function buildDisputeCaseContext(proposalId: string, milestoneId?: string | null) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      contract: true,
      event: true,
      milestones: true,
      refundRequests: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!proposal) throw new Error("Proposal not found");

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
    latestRefundRequest: proposal.refundRequests[0] ?? null,
  };
}

export async function createDisputeCase(input: {
  actorId: string;
  actorRole: string;
  proposalId: string;
  milestoneId?: string | null;
  title: string;
  body?: string | null;
  reason: string;
  orgId?: string | null;
  requestContextId?: string | null;
}) {
  const context = await buildDisputeCaseContext(input.proposalId, input.milestoneId);

  return (prisma as any).dispute.create({
    data: {
      orgId: input.orgId ?? context.proposal.event.orgId,
      eventId: context.proposal.eventId,
      proposalId: context.proposal.id,
      contractId: context.proposal.contract?.id,
      paymentIntentId: context.paymentIntent?.id,
      milestoneId: context.milestone?.id,
      linkedRefundRequestId: context.latestRefundRequest?.id,
      actorId: input.actorId,
      actorRole: input.actorRole,
      bookingClassification: context.bookingClassification,
      feeProfileSnapshot: context.feeProfile,
      acceptanceCaptureId: context.acceptanceProof?.id,
      requestContextId: input.requestContextId ?? undefined,
      title: input.title,
      body: input.body ?? undefined,
      disputeReason: input.reason,
      status: "OPEN",
      freezeState: "FROZEN",
      auditTrail: {
        createdAt: new Date().toISOString(),
        createdBy: input.actorId,
        createdRole: input.actorRole,
        reason: input.reason,
        freezeState: "FROZEN",
      },
    },
  });
}

export async function getBlockingDisputeCase(proposalId: string, milestoneId?: string | null) {
  return (prisma as any).dispute.findFirst({
    where: {
      proposalId,
      status: { in: [...OPEN_DISPUTE_STATUSES] },
      ...(milestoneId ? { OR: [{ milestoneId }, { milestoneId: null }] } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function reviewDisputeCase(input: {
  disputeId: string;
  adminId: string;
  action: DisputeReviewAction;
  decisionReason: string;
}) {
  const platformAdmin = await getGuardedMvpAuthorityForUserId(input.adminId);
  if (!platformAdmin) throw new Error("PLATFORM_ADMIN authority is required");

  const existing = await (prisma as any).dispute.findUnique({ where: { id: input.disputeId } });
  if (!existing) throw new Error("Dispute not found");

  if (!input.decisionReason.trim()) {
    throw new Error("Dispute evidence and rationale are required");
  }

  const action = input.action;

  let status = existing.status;
  let freezeState = existing.freezeState;
  let resolutionType = existing.resolutionType ?? undefined;
  let linkedRefundRequestId = existing.linkedRefundRequestId ?? undefined;

  if (action === "REQUEST_INFO") {
    status = "NEEDS_INFO";
    freezeState = "ADMIN_REVIEW";
  } else if (action === "ESCALATE") {
    status = "UNDER_ADMIN_REVIEW";
    freezeState = "ADMIN_REVIEW";
  } else if (action === "SELLER_FAVOR") {
    status = "RESOLVED_SELLER_FAVOR";
    freezeState = "RELEASE_ELIGIBLE";
    resolutionType = "SELLER_FAVOR";
  } else if (action === "REOPEN") {
    status = "OPEN";
    freezeState = "FROZEN";
    resolutionType = undefined;
  } else if (action === "REFUND") {
    status = "RESOLVED_REFUND";
    freezeState = "REFUND_PENDING";
    resolutionType = "REFUND";

    if (!linkedRefundRequestId) {
      const refundRequest = await createRefundRequest({
        actorId: existing.actorId,
        actorRole: existing.actorRole,
        proposalId: existing.proposalId,
        milestoneId: existing.milestoneId,
        amountRequestedCents: 0,
        reason: `Refund resolution linked to dispute ${existing.id}: ${input.decisionReason}`,
        orgId: existing.orgId,
        requestContextId: existing.requestContextId,
      });
      linkedRefundRequestId = refundRequest.id;
    }
  }

  const updated = await (prisma as any).dispute.update({
    where: { id: input.disputeId },
    data: {
      status,
      freezeState,
      resolutionType,
      linkedRefundRequestId,
      resolution: input.decisionReason,
      adminDecisionAt: new Date(),
      adminDecisionById: input.adminId,
      adminDecisionReason: input.decisionReason,
      auditTrail: {
        ...((existing.auditTrail as Record<string, unknown> | null) ?? {}),
        lastAdminDecision: {
          by: input.adminId,
          at: new Date().toISOString(),
          action: action,
          reason: input.decisionReason,
          status,
          freezeState,
          resolutionType,
          linkedRefundRequestId,
        },
      },
    },
  });

  await recordAudit({
    actorId: input.adminId,
    orgId: existing.orgId,
    action: `dispute.${action.toLowerCase()}`,
    target: existing.id,
    metadata: {
      disputeId: existing.id,
      proposalId: existing.proposalId,
      contractId: existing.contractId,
      paymentIntentId: existing.paymentIntentId,
      milestoneId: existing.milestoneId,
      linkedRefundRequestId,
      freezeState,
      resolutionType,
      decisionReason: input.decisionReason,
    },
  });

  await recordAdminOverride({
    actorId: input.adminId,
    actorRole: platformAdmin.role,
    orgId: existing.orgId,
    targetType: "DISPUTE",
    targetId: existing.id,
    bookingClassification: existing.bookingClassification,
    feeProfileSnapshot: existing.feeProfileSnapshot,
    acceptanceCaptureId: existing.acceptanceCaptureId,
    exceptionType: "DISPUTE_FREEZE_STATE",
    decision:
      action === "REFUND" || action === "SELLER_FAVOR"
        ? "APPROVED"
        : "APPLIED",
    reason: input.decisionReason,
    proposalId: existing.proposalId,
    contractId: existing.contractId,
    paymentIntentId: existing.paymentIntentId,
    milestoneId: existing.milestoneId,
    disputeId: existing.id,
    refundRequestId: linkedRefundRequestId,
    metadata: {
      action: action,
      freezeState,
      resolutionType,
      linkedRefundRequestId,
    },
  });

  return updated;
}

export async function getDisputeCaseForVerification(disputeId: string) {
  return (prisma as any).dispute.findUnique({
    where: { id: disputeId },
    include: {
      proposal: true,
      event: true,
    },
  });
}
