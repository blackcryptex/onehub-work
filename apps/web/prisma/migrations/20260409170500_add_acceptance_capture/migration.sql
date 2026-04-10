CREATE TABLE "AcceptanceCapture" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "orgId" TEXT,
  "bookingClassification" TEXT NOT NULL,
  "feeProfileSnapshot" JSONB NOT NULL,
  "legalSurface" TEXT NOT NULL,
  "legalVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL,
  "sourceSurface" TEXT NOT NULL,
  "requestContextId" TEXT,
  "proposalId" TEXT,
  "contractId" TEXT,
  "paymentIntentId" TEXT,
  "adminOverrideId" TEXT,
  "metadata" JSONB,
  CONSTRAINT "AcceptanceCapture_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AcceptanceCapture_proposalId_acceptedAt_idx" ON "AcceptanceCapture"("proposalId", "acceptedAt");
CREATE INDEX "AcceptanceCapture_contractId_acceptedAt_idx" ON "AcceptanceCapture"("contractId", "acceptedAt");
CREATE INDEX "AcceptanceCapture_paymentIntentId_acceptedAt_idx" ON "AcceptanceCapture"("paymentIntentId", "acceptedAt");
CREATE INDEX "AcceptanceCapture_adminOverrideId_acceptedAt_idx" ON "AcceptanceCapture"("adminOverrideId", "acceptedAt");
CREATE INDEX "AcceptanceCapture_actorId_acceptedAt_idx" ON "AcceptanceCapture"("actorId", "acceptedAt");
