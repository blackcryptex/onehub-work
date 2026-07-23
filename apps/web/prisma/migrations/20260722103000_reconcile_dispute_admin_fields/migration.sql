-- Reconcile Dispute table with the current Prisma schema.
-- Source of issue: the base migration created an early, minimal Dispute table, but
-- later schema-level dispute/admin safety fields were added without a matching
-- migration. A clean migrated database therefore lacked columns Prisma writes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeFreezeState') THEN
    CREATE TYPE "DisputeFreezeState" AS ENUM ('FROZEN', 'ADMIN_REVIEW', 'RELEASE_ELIGIBLE', 'REFUND_PENDING', 'RELEASED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeResolutionType') THEN
    CREATE TYPE "DisputeResolutionType" AS ENUM ('SELLER_FAVOR', 'REFUND', 'REJECTED');
  END IF;
END
$$;

ALTER TYPE "DisputeStatus" ADD VALUE IF NOT EXISTS 'UNDER_ADMIN_REVIEW';
ALTER TYPE "DisputeStatus" ADD VALUE IF NOT EXISTS 'RESOLVED_SELLER_FAVOR';
ALTER TYPE "DisputeStatus" ADD VALUE IF NOT EXISTS 'RESOLVED_REFUND';

ALTER TABLE "Dispute"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "contractId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentIntentId" TEXT,
  ADD COLUMN IF NOT EXISTS "linkedRefundRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "actorId" TEXT NOT NULL DEFAULT 'system-migration',
  ADD COLUMN IF NOT EXISTS "actorRole" TEXT NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS "bookingClassification" "BookingClassification" NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS "feeProfileSnapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "acceptanceCaptureId" TEXT,
  ADD COLUMN IF NOT EXISTS "requestContextId" TEXT,
  ADD COLUMN IF NOT EXISTS "disputeReason" TEXT NOT NULL DEFAULT 'legacy-dispute',
  ADD COLUMN IF NOT EXISTS "freezeState" "DisputeFreezeState" NOT NULL DEFAULT 'FROZEN',
  ADD COLUMN IF NOT EXISTS "resolutionType" "DisputeResolutionType",
  ADD COLUMN IF NOT EXISTS "adminDecisionAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "adminDecisionById" TEXT,
  ADD COLUMN IF NOT EXISTS "adminDecisionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "auditTrail" JSONB;

CREATE INDEX IF NOT EXISTS "Dispute_proposalId_status_createdAt_idx" ON "Dispute"("proposalId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Dispute_milestoneId_status_idx" ON "Dispute"("milestoneId", "status");
CREATE INDEX IF NOT EXISTS "Dispute_linkedRefundRequestId_idx" ON "Dispute"("linkedRefundRequestId");
CREATE INDEX IF NOT EXISTS "Dispute_contractId_status_idx" ON "Dispute"("contractId", "status");
CREATE INDEX IF NOT EXISTS "Dispute_paymentIntentId_status_idx" ON "Dispute"("paymentIntentId", "status");
