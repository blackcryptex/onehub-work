-- Phase 7 crisis execution workflow: event-linked issue/impact records.
CREATE TYPE "CrisisIssueType" AS ENUM (
  'VENDOR_CANCELLATION',
  'VENUE_CANCELLATION',
  'PROVIDER_PROBLEM',
  'PAYMENT_PROBLEM',
  'CONTRACT_PROBLEM',
  'MILESTONE_RISK',
  'OTHER'
);

CREATE TYPE "CrisisIssueSeverity" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "CrisisIssueStatus" AS ENUM (
  'OPEN',
  'IMPACT_REVIEW',
  'REPLACEMENT_STARTED',
  'RESOLVED',
  'CANCELED'
);

CREATE TABLE "CrisisIssue" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "reportedById" TEXT,
  "issueType" "CrisisIssueType" NOT NULL,
  "severity" "CrisisIssueSeverity" NOT NULL DEFAULT 'HIGH',
  "status" "CrisisIssueStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "listingId" TEXT,
  "bookingRequestId" TEXT,
  "proposalId" TEXT,
  "contractId" TEXT,
  "paymentMilestoneId" TEXT,
  "impactSummary" TEXT NOT NULL,
  "recommendedNextAction" TEXT NOT NULL,
  "replacementSearchStartedAt" TIMESTAMP(3),
  "replacementListingId" TEXT,
  "replacementBookingRequestId" TEXT,
  "manualReviewNotes" TEXT,
  "auditTrail" JSONB,

  CONSTRAINT "CrisisIssue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrisisIssue_eventId_status_severity_createdAt_idx" ON "CrisisIssue"("eventId", "status", "severity", "createdAt");
CREATE INDEX "CrisisIssue_orgId_status_createdAt_idx" ON "CrisisIssue"("orgId", "status", "createdAt");
CREATE INDEX "CrisisIssue_listingId_status_idx" ON "CrisisIssue"("listingId", "status");
CREATE INDEX "CrisisIssue_proposalId_status_idx" ON "CrisisIssue"("proposalId", "status");
CREATE INDEX "CrisisIssue_contractId_status_idx" ON "CrisisIssue"("contractId", "status");
CREATE INDEX "CrisisIssue_paymentMilestoneId_status_idx" ON "CrisisIssue"("paymentMilestoneId", "status");

ALTER TABLE "CrisisIssue" ADD CONSTRAINT "CrisisIssue_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
