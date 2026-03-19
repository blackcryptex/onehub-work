/*
  Warnings:

  - You are about to drop the column `vendorId` on the `ShortlistItem` table. All the data in the column will be lost.
  - You are about to drop the column `vendorName` on the `ShortlistItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeIntent]` on the table `EscrowAccount` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeId]` on the table `MoneyTx` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeIntentId]` on the table `PaymentIntent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[milestoneId]` on the table `Payout` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eventId,listingId]` on the table `ShortlistItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paymentIntentId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeChargeId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `listingId` to the `ShortlistItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ShortlistItem_eventId_vendorId_key";

-- AlterTable
ALTER TABLE "ShortlistItem" DROP COLUMN "vendorId",
DROP COLUMN "vendorName",
ADD COLUMN     "listingId" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "ProposalSection" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProposalSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stripeIntentId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProposalSection_proposalId_order_idx" ON "ProposalSection"("proposalId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowAccount_stripeIntent_key" ON "EscrowAccount"("stripeIntent");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyTx_stripeId_key" ON "MoneyTx"("stripeId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_stripeIntentId_key" ON "PaymentIntent"("stripeIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_milestoneId_key" ON "Payout"("milestoneId");

-- CreateIndex
CREATE INDEX "ShortlistItem_eventId_idx" ON "ShortlistItem"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortlistItem_eventId_listingId_key" ON "ShortlistItem"("eventId", "listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_paymentIntentId_key" ON "Transaction"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripeChargeId_key" ON "Transaction"("stripeChargeId");

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalSection" ADD CONSTRAINT "ProposalSection_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
