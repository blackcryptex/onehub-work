import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { GUARDED_MVP_PLATFORM_ADMIN_AUTHORITY, getGuardedMvpAuthorityForUserId } from "@/lib/rbac";

async function requireOverrideAuthority(actorId: string, reason: string) {
  const user = await getGuardedMvpAuthorityForUserId(actorId);
  if (!user) {
    throw new Error("PLATFORM_ADMIN override authority is required");
  }

  if (!reason.trim()) {
    throw new Error("Admin override reason is required");
  }

  return `guarded-mvp.${GUARDED_MVP_PLATFORM_ADMIN_AUTHORITY}`;
}

export async function recordAdminOverride(input: {
  actorId: string;
  actorRole: string;
  orgId?: string | null;
  targetType: "REFUND_REQUEST" | "DISPUTE" | "PAYMENT_HOLDBACK" | "PAYOUT" | "FEE_PROFILE";
  targetId: string;
  bookingClassification?: Prisma.JsonValue | string | null;
  feeProfileSnapshot?: Prisma.JsonValue;
  acceptanceCaptureId?: string | null;
  exceptionType:
    | "REFUND_DECISION"
    | "REFUND_FEE_DEVIATION"
    | "DISPUTE_FREEZE_STATE"
    | "HOLDBACK_DECISION"
    | "PAYOUT_RELEASE"
    | "FEE_DEVIATION";
  decision: "APPROVED" | "DENIED" | "APPLIED" | "RELEASED" | "CLEARED";
  reason: string;
  proposalId?: string | null;
  contractId?: string | null;
  paymentIntentId?: string | null;
  milestoneId?: string | null;
  refundRequestId?: string | null;
  disputeId?: string | null;
  paymentHoldbackId?: string | null;
  payoutId?: string | null;
  metadata?: Prisma.JsonValue;
}) {
  const authorityPath = await requireOverrideAuthority(input.actorId, input.reason);

  return prisma.$transaction(async (tx) => {
    const audit = await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        orgId: input.orgId ?? undefined,
        action: "admin-override.recorded",
        target: input.targetId,
        metadata: {
          targetType: input.targetType,
          targetId: input.targetId,
          exceptionType: input.exceptionType,
          decision: input.decision,
          reason: input.reason,
          authorityPath,
          proposalId: input.proposalId ?? null,
          contractId: input.contractId ?? null,
          paymentIntentId: input.paymentIntentId ?? null,
          milestoneId: input.milestoneId ?? null,
          refundRequestId: input.refundRequestId ?? null,
          disputeId: input.disputeId ?? null,
          paymentHoldbackId: input.paymentHoldbackId ?? null,
          payoutId: input.payoutId ?? null,
        } satisfies Record<string, unknown>,
      },
    });

    return (tx as any).adminOverride.create({
      data: {
        actorId: input.actorId,
        actorRole: input.actorRole,
        orgId: input.orgId ?? undefined,
        targetType: input.targetType,
        targetId: input.targetId,
        bookingClassification: typeof input.bookingClassification === "string" ? input.bookingClassification : undefined,
        feeProfileSnapshot: input.feeProfileSnapshot,
        acceptanceCaptureId: input.acceptanceCaptureId ?? undefined,
        exceptionType: input.exceptionType,
        decision: input.decision,
        authorityPath,
        reason: input.reason,
        proposalId: input.proposalId ?? undefined,
        contractId: input.contractId ?? undefined,
        paymentIntentId: input.paymentIntentId ?? undefined,
        milestoneId: input.milestoneId ?? undefined,
        refundRequestId: input.refundRequestId ?? undefined,
        disputeId: input.disputeId ?? undefined,
        paymentHoldbackId: input.paymentHoldbackId ?? undefined,
        payoutId: input.payoutId ?? undefined,
        auditLogId: audit.id,
        metadata: input.metadata,
      },
    });
  });
}

export async function listAdminOverrides(where: {
  targetType?: "REFUND_REQUEST" | "DISPUTE" | "PAYMENT_HOLDBACK" | "PAYOUT" | "FEE_PROFILE";
  targetId?: string;
  proposalId?: string;
  paymentIntentId?: string;
  refundRequestId?: string;
  disputeId?: string;
  paymentHoldbackId?: string;
  payoutId?: string;
}) {
  return (prisma as any).adminOverride.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export function feeOverrideRequiresAdminOverride(input: {
  feeProfile: { overrideHook?: { allowed?: boolean; reasonRequired?: boolean; auditRequired?: boolean } };
  hasDeviation: boolean;
}) {
  if (!input.hasDeviation) return false;

  return Boolean(
    input.feeProfile.overrideHook?.allowed &&
      input.feeProfile.overrideHook?.reasonRequired &&
      input.feeProfile.overrideHook?.auditRequired,
  );
}
