-- Core communications foundation hardening for event-scoped threads
ALTER TABLE "ThreadParticipant"
ADD COLUMN IF NOT EXISTS "userId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ThreadParticipant_userId_fkey'
  ) THEN
    ALTER TABLE "ThreadParticipant"
    ADD CONSTRAINT "ThreadParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Message_senderId_fkey'
  ) THEN
    ALTER TABLE "Message"
    ADD CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Thread_orgId_createdAt_idx" ON "Thread"("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "Thread_eventId_createdAt_idx" ON "Thread"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "Thread_proposalId_createdAt_idx" ON "Thread"("proposalId", "createdAt");
CREATE INDEX IF NOT EXISTS "Thread_listingId_createdAt_idx" ON "Thread"("listingId", "createdAt");
CREATE INDEX IF NOT EXISTS "ThreadParticipant_threadId_idx" ON "ThreadParticipant"("threadId");
CREATE INDEX IF NOT EXISTS "ThreadParticipant_userId_idx" ON "ThreadParticipant"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ThreadParticipant_threadId_email_key" ON "ThreadParticipant"("threadId", "email");
CREATE INDEX IF NOT EXISTS "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");
