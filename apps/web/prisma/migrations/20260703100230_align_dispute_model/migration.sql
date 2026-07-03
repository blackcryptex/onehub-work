-- Align Dispute table with the current Prisma schema.
-- Forward-only compatibility migration for databases replayed from the original Dispute migration.

-- Add current DisputeStatus values without removing legacy enum values that may exist in PostgreSQL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'DisputeStatus' AND e.enumlabel = 'UNDER_ADMIN_REVIEW'
  ) THEN
    ALTER TYPE "DisputeStatus" ADD VALUE 'UNDER_ADMIN_REVIEW';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'DisputeStatus' AND e.enumlabel = 'RESOLVED_SELLER_FAVOR'
  ) THEN
    ALTER TYPE "DisputeStatus" ADD VALUE 'RESOLVED_SELLER_FAVOR';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'DisputeStatus' AND e.enumlabel = 'RESOLVED_REFUND'
  ) THEN
    ALTER TYPE "DisputeStatus" ADD VALUE 'RESOLVED_REFUND';
  END IF;
END $$;

-- Create Dispute enums introduced after the original Dispute migration if they are missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeFreezeState') THEN
    CREATE TYPE "DisputeFreezeState" AS ENUM (
      'FROZEN',
      'ADMIN_REVIEW',
      'RELEASE_ELIGIBLE',
      'REFUND_PENDING',
      'RELEASED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeResolutionType') THEN
    CREATE TYPE "DisputeResolutionType" AS ENUM (
      'SELLER_FAVOR',
      'REFUND',
      'REJECTED'
    );
  END IF;
END $$;

-- Add nullable Dispute columns now present in the Prisma schema.
ALTER TABLE "Dispute"
  ADD COLUMN IF NOT EXISTS "contractId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentIntentId" TEXT,
  ADD COLUMN IF NOT EXISTS "linkedRefundRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "acceptanceCaptureId" TEXT,
  ADD COLUMN IF NOT EXISTS "requestContextId" TEXT,
  ADD COLUMN IF NOT EXISTS "resolutionType" "DisputeResolutionType",
  ADD COLUMN IF NOT EXISTS "adminDecisionAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "adminDecisionById" TEXT,
  ADD COLUMN IF NOT EXISTS "adminDecisionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "auditTrail" JSONB;

-- Add required Dispute columns with neutral backfills for any pre-existing rows, then
-- drop defaults where the Prisma schema does not define a persistent DB default.
ALTER TABLE "Dispute"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "actorId" TEXT NOT NULL DEFAULT 'migration-backfill',
  ADD COLUMN IF NOT EXISTS "actorRole" TEXT NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS "bookingClassification" "BookingClassification" NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS "feeProfileSnapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "disputeReason" TEXT NOT NULL DEFAULT 'migration-backfill',
  ADD COLUMN IF NOT EXISTS "freezeState" "DisputeFreezeState" NOT NULL DEFAULT 'FROZEN';

UPDATE "Dispute"
SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP),
    "actorId" = COALESCE("actorId", 'migration-backfill'),
    "actorRole" = COALESCE("actorRole", 'SYSTEM'),
    "bookingClassification" = COALESCE("bookingClassification", 'DIRECT'::"BookingClassification"),
    "feeProfileSnapshot" = COALESCE("feeProfileSnapshot", '{}'::jsonb),
    "disputeReason" = COALESCE("disputeReason", 'migration-backfill'),
    "freezeState" = COALESCE("freezeState", 'FROZEN'::"DisputeFreezeState");

ALTER TABLE "Dispute"
  ALTER COLUMN "updatedAt" DROP DEFAULT,
  ALTER COLUMN "actorId" DROP DEFAULT,
  ALTER COLUMN "actorRole" DROP DEFAULT,
  ALTER COLUMN "bookingClassification" DROP DEFAULT,
  ALTER COLUMN "feeProfileSnapshot" DROP DEFAULT,
  ALTER COLUMN "disputeReason" DROP DEFAULT;

-- Add indexes declared on the current Prisma Dispute model.
CREATE INDEX IF NOT EXISTS "Dispute_proposalId_status_createdAt_idx" ON "Dispute"("proposalId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Dispute_milestoneId_status_idx" ON "Dispute"("milestoneId", "status");
CREATE INDEX IF NOT EXISTS "Dispute_linkedRefundRequestId_idx" ON "Dispute"("linkedRefundRequestId");
CREATE INDEX IF NOT EXISTS "Dispute_contractId_status_idx" ON "Dispute"("contractId", "status");
CREATE INDEX IF NOT EXISTS "Dispute_paymentIntentId_status_idx" ON "Dispute"("paymentIntentId", "status");
