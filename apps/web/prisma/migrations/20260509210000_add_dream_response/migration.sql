-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DreamResponseStatus') THEN
    CREATE TYPE "DreamResponseStatus" AS ENUM ('OPEN', 'VIEWED', 'INTERESTED', 'ARCHIVED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DreamResponseType') THEN
    CREATE TYPE "DreamResponseType" AS ENUM ('IDEAS', 'ROUGH_PRICING', 'PACKAGE_SUGGESTION', 'VENUE_RECOMMENDATION');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DreamResponseProviderType') THEN
    CREATE TYPE "DreamResponseProviderType" AS ENUM ('VENDOR', 'VENUE');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DreamResponse" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "eventId" TEXT NOT NULL,
  "providerOrgId" TEXT NOT NULL,
  "providerType" "DreamResponseProviderType" NOT NULL,
  "status" "DreamResponseStatus" NOT NULL DEFAULT 'OPEN',
  "responseType" "DreamResponseType" NOT NULL,
  "message" TEXT NOT NULL,
  "roughPriceMin" INTEGER,
  "roughPriceMax" INTEGER,
  "currency" VARCHAR(3) DEFAULT 'USD',
  "preferredNextStep" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3),
  "interestedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "DreamResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DreamResponse_eventId_createdAt_idx" ON "DreamResponse"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "DreamResponse_providerOrgId_createdAt_idx" ON "DreamResponse"("providerOrgId", "createdAt");
CREATE INDEX IF NOT EXISTS "DreamResponse_status_createdAt_idx" ON "DreamResponse"("status", "createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DreamResponse_eventId_fkey') THEN
    ALTER TABLE "DreamResponse" ADD CONSTRAINT "DreamResponse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DreamResponse_providerOrgId_fkey') THEN
    ALTER TABLE "DreamResponse" ADD CONSTRAINT "DreamResponse_providerOrgId_fkey" FOREIGN KEY ("providerOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DreamResponse_createdByUserId_fkey') THEN
    ALTER TABLE "DreamResponse" ADD CONSTRAINT "DreamResponse_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
