/*
  Warnings:

  - A unique constraint covering the columns `[userId,provider]` on the table `CalendarAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CalendarAccount" ADD COLUMN     "googleCalendarId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "about" TEXT,
ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "availabilityJson" JSONB,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'US',
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "mediaJson" JSONB,
ADD COLUMN     "notificationsJson" JSONB,
ADD COLUMN     "paymentsJson" JSONB,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "profileStatus" TEXT,
ADD COLUMN     "servicesJson" JSONB,
ADD COLUMN     "spacesJson" JSONB,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "ShortlistItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarMapping" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calendarAccountId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "googleCalendarId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSyncState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calendarAccountId" TEXT NOT NULL,
    "googleCalendarId" TEXT NOT NULL,
    "syncMode" TEXT NOT NULL DEFAULT 'one-way',
    "watchResourceId" TEXT,
    "watchChannelId" TEXT,
    "watchExpiration" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShortlistItem_eventId_vendorId_key" ON "ShortlistItem"("eventId", "vendorId");

-- CreateIndex
CREATE INDEX "CalendarMapping_googleEventId_idx" ON "CalendarMapping"("googleEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarMapping_userId_entityType_entityId_key" ON "CalendarMapping"("userId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSyncState_userId_key" ON "CalendarSyncState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSyncState_calendarAccountId_key" ON "CalendarSyncState"("calendarAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarAccount_userId_provider_key" ON "CalendarAccount"("userId", "provider");

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarMapping" ADD CONSTRAINT "CalendarMapping_calendarAccountId_fkey" FOREIGN KEY ("calendarAccountId") REFERENCES "CalendarAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncState" ADD CONSTRAINT "CalendarSyncState_calendarAccountId_fkey" FOREIGN KEY ("calendarAccountId") REFERENCES "CalendarAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
