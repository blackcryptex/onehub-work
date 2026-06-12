-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('OPEN', 'APPROVED', 'DENIED', 'CANCELED');

-- CreateEnum
CREATE TYPE "HoldbackState" AS ENUM ('NONE', 'ACTIVE', 'RELEASED');

-- CreateEnum
CREATE TYPE "HoldbackDecision" AS ENUM ('AUTO_EVALUATED', 'APPLIED', 'OVERRIDDEN_NONE', 'RELEASED');

-- CreateEnum
CREATE TYPE "RefundFeeTreatment" AS ENUM ('BUYER_ABSORBS', 'REFUND_TO_BUYER', 'NON_REFUNDABLE');

-- CreateTable
CREATE TABLE "PaymentHoldback" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "paymentIntentId" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "contractId" TEXT,
  "milestoneId" TEXT,
  "bookingClassification" "BookingClassification" NOT NULL,
  "feeProfileSnapshot" JSONB NOT NULL,
  "acceptanceCaptureId" TEXT,
  "highRiskTriggers" JSONB NOT NULL,
  "triggerSummary" TEXT,
  "state" "HoldbackState" NOT NULL DEFAULT 'NONE',
  "reason" TEXT,
  "holdbackAmountCents" INTEGER,
  "holdbackPercent" DOUBLE PRECISION,
  "actorAdminId" TEXT,
  "actorAdminRole" TEXT,
  "manualRiskFlag" BOOLEAN NOT NULL DEFAULT false,
  "adminDecision" "HoldbackDecision",
  "adminDecisionAt" TIMESTAMP(3),
  "adminDecisionById" TEXT,
  "adminDecisionByRole" TEXT,
  "adminDecisionReason" TEXT,
  "releasedAt" TIMESTAMP(3),
  "releasedById" TEXT,
  "releasedByRole" TEXT,
  "releaseReason" TEXT,
  "auditTrail" JSONB,
  CONSTRAINT "PaymentHoldback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRequest" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "orgId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "contractId" TEXT,
  "paymentIntentId" TEXT,
  "milestoneId" TEXT,
  "acceptanceCaptureId" TEXT,
  "bookingClassification" "BookingClassification" NOT NULL,
  "feeProfileSnapshot" JSONB NOT NULL,
  "amountRequestedCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "reason" TEXT NOT NULL,
  "processingFeeTreatment" "RefundFeeTreatment" NOT NULL DEFAULT 'BUYER_ABSORBS',
  "platformFeeTreatment" "RefundFeeTreatment" NOT NULL DEFAULT 'NON_REFUNDABLE',
  "status" "RefundRequestStatus" NOT NULL DEFAULT 'OPEN',
  "requestContextId" TEXT,
  "adminDecisionAt" TIMESTAMP(3),
  "adminDecisionById" TEXT,
  "adminDecisionReason" TEXT,
  "auditTrail" JSONB,
  CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentHoldback_paymentIntentId_key" ON "PaymentHoldback"("paymentIntentId");
CREATE INDEX "PaymentHoldback_proposalId_createdAt_idx" ON "PaymentHoldback"("proposalId", "createdAt");
CREATE INDEX "PaymentHoldback_milestoneId_state_idx" ON "PaymentHoldback"("milestoneId", "state");
CREATE INDEX "PaymentHoldback_contractId_state_idx" ON "PaymentHoldback"("contractId", "state");
CREATE INDEX "PaymentHoldback_state_updatedAt_idx" ON "PaymentHoldback"("state", "updatedAt");

-- CreateIndex
CREATE INDEX "RefundRequest_proposalId_status_createdAt_idx" ON "RefundRequest"("proposalId", "status", "createdAt");
CREATE INDEX "RefundRequest_paymentIntentId_status_idx" ON "RefundRequest"("paymentIntentId", "status");
CREATE INDEX "RefundRequest_milestoneId_status_idx" ON "RefundRequest"("milestoneId", "status");
CREATE INDEX "RefundRequest_contractId_status_idx" ON "RefundRequest"("contractId", "status");

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "PaymentMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
