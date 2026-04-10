-- CreateEnum
CREATE TYPE "BookingClassification" AS ENUM ('MARKETPLACE', 'PLANNER_MEDIATED', 'DIRECT');

-- AlterTable
ALTER TABLE "Proposal"
ADD COLUMN "bookingClassification" "BookingClassification" NOT NULL DEFAULT 'DIRECT';
