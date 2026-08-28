-- Phase 5-6 communication accountability: make thread visibility/read state durable.
CREATE TYPE "ThreadVisibility" AS ENUM ('INTERNAL', 'CLIENT_VISIBLE', 'PROVIDER_VISIBLE', 'ALL_PARTIES');
CREATE TYPE "ThreadPurpose" AS ENUM ('EVENT_COORDINATION', 'PROPOSAL', 'BOOKING_REQUEST', 'INTERNAL_NOTE', 'DOCUMENT_REVIEW', 'ADMIN_REVIEW');

ALTER TABLE "Thread"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "visibility" "ThreadVisibility" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN "purpose" "ThreadPurpose" NOT NULL DEFAULT 'EVENT_COORDINATION';

ALTER TABLE "ThreadParticipant"
  ADD COLUMN "lastReadAt" TIMESTAMP(3);

CREATE INDEX "Thread_updatedAt_idx" ON "Thread"("updatedAt");
