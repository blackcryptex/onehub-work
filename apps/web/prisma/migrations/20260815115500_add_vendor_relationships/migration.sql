-- Add Pro Planner vendor relationship records for planner-owned CRM notes and follow-ups.
CREATE TYPE "VendorRelationshipStatus" AS ENUM ('ACTIVE', 'PREFERRED', 'WATCHLIST', 'DO_NOT_USE');

CREATE TABLE "VendorRelationship" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "orgId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "status" "VendorRelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
  "ownerUserId" TEXT,
  "lastContactAt" TIMESTAMP(3),
  "nextFollowUpAt" TIMESTAMP(3),
  "reliability" INTEGER,
  "notes" TEXT,

  CONSTRAINT "VendorRelationship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorRelationship_orgId_listingId_key" ON "VendorRelationship"("orgId", "listingId");
CREATE INDEX "VendorRelationship_orgId_status_nextFollowUpAt_idx" ON "VendorRelationship"("orgId", "status", "nextFollowUpAt");
CREATE INDEX "VendorRelationship_listingId_idx" ON "VendorRelationship"("listingId");

ALTER TABLE "VendorRelationship" ADD CONSTRAINT "VendorRelationship_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorRelationship" ADD CONSTRAINT "VendorRelationship_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
