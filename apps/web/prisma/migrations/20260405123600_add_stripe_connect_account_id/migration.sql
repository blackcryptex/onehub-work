-- Add Stripe Connect account id storage to organizations
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "stripeConnectAccountId" TEXT;

-- Enforce uniqueness when present
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_stripeConnectAccountId_key"
ON "Organization"("stripeConnectAccountId");
