CREATE TYPE "AdminOverrideTargetType" AS ENUM (
  'REFUND_REQUEST',
  'DISPUTE',
  'PAYMENT_HOLDBACK',
  'PAYOUT',
  'FEE_PROFILE'
);

CREATE TYPE "AdminOverrideExceptionType" AS ENUM (
  'REFUND_DECISION',
  'REFUND_FEE_DEVIATION',
  'DISPUTE_FREEZE_STATE',
  'HOLDBACK_DECISION',
  'PAYOUT_RELEASE',
  'FEE_DEVIATION'
);

CREATE TYPE "AdminOverrideDecision" AS ENUM (
  'APPROVED',
  'DENIED',
  'APPLIED',
  'RELEASED',
  'CLEARED'
);

CREATE TABLE "AdminOverride" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT NOT NULL,
  "actorRole" "Role" NOT NULL,
  "orgId" TEXT,
  "targetType" "AdminOverrideTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "bookingClassification" "BookingClassification",
  "feeProfileSnapshot" JSONB,
  "acceptanceCaptureId" TEXT,
  "exceptionType" "AdminOverrideExceptionType" NOT NULL,
  "decision" "AdminOverrideDecision" NOT NULL,
  "authorityPath" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "refundRequestId" TEXT,
  "disputeId" TEXT,
  "paymentHoldbackId" TEXT,
  "payoutId" TEXT,
  "paymentIntentId" TEXT,
  "contractId" TEXT,
  "proposalId" TEXT,
  "milestoneId" TEXT,
  "auditLogId" TEXT NOT NULL,
  "metadata" JSONB,
  CONSTRAINT "AdminOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminOverride_auditLogId_key" ON "AdminOverride"("auditLogId");
CREATE INDEX "AdminOverride_targetType_targetId_createdAt_idx" ON "AdminOverride"("targetType", "targetId", "createdAt");
CREATE INDEX "AdminOverride_proposalId_createdAt_idx" ON "AdminOverride"("proposalId", "createdAt");
CREATE INDEX "AdminOverride_paymentIntentId_createdAt_idx" ON "AdminOverride"("paymentIntentId", "createdAt");
CREATE INDEX "AdminOverride_refundRequestId_createdAt_idx" ON "AdminOverride"("refundRequestId", "createdAt");
CREATE INDEX "AdminOverride_disputeId_createdAt_idx" ON "AdminOverride"("disputeId", "createdAt");
CREATE INDEX "AdminOverride_paymentHoldbackId_createdAt_idx" ON "AdminOverride"("paymentHoldbackId", "createdAt");
CREATE INDEX "AdminOverride_payoutId_createdAt_idx" ON "AdminOverride"("payoutId", "createdAt");

ALTER TABLE "AdminOverride" ADD CONSTRAINT "AdminOverride_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;