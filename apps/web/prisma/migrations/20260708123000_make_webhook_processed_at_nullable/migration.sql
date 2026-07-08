-- Allow webhook rows to reserve event IDs before business handling succeeds.
-- processedAt remains NULL until the handler completes successfully.
ALTER TABLE "WebhookEvent" ALTER COLUMN "processedAt" DROP DEFAULT;
ALTER TABLE "WebhookEvent" ALTER COLUMN "processedAt" DROP NOT NULL;
