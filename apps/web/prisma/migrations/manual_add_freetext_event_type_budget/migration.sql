-- Migration: Add free-text event type and budget fields
-- This migration adds new fields while keeping legacy enum fields for backward compatibility

-- Add new columns (all nullable for safe migration)
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "eventTypeRaw" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "eventTypeCanonical" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "budgetRaw" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "budgetMin" INTEGER;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "budgetMax" INTEGER;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "budgetCurrency" VARCHAR(3);

-- Backfill existing rows: map legacy enum to raw text
UPDATE "Event" 
SET 
  "eventTypeRaw" = CASE 
    WHEN "type" = 'WEDDING' THEN 'Wedding'
    WHEN "type" = 'CORPORATE_GALA' THEN 'Corporate Gala'
    WHEN "type" = 'FUNDRAISER' THEN 'Fundraiser'
    WHEN "type" = 'BIRTHDAY' THEN 'Birthday'
    WHEN "type" = 'CONFERENCE' THEN 'Conference'
    WHEN "type" = 'FESTIVAL' THEN 'Festival'
    WHEN "type" = 'SPORTS' THEN 'Sports'
    WHEN "type" = 'OTHER' THEN 'Other'
    ELSE 'Other'
  END,
  "eventTypeCanonical" = CASE 
    WHEN "type" = 'WEDDING' THEN 'wedding'
    WHEN "type" = 'CORPORATE_GALA' THEN 'corporate'
    WHEN "type" = 'FUNDRAISER' THEN 'fundraiser'
    WHEN "type" = 'BIRTHDAY' THEN 'birthday'
    WHEN "type" = 'CONFERENCE' THEN 'conference'
    WHEN "type" = 'FESTIVAL' THEN 'festival'
    WHEN "type" = 'SPORTS' THEN 'sports'
    ELSE 'other'
  END,
  "budgetRaw" = CASE 
    WHEN "budgetCents" = 0 THEN NULL
    WHEN "budgetCents" < 500000 THEN 'Under $5,000'
    WHEN "budgetCents" < 1000000 THEN '$5,000 - $10,000'
    WHEN "budgetCents" < 2500000 THEN '$10,000 - $25,000'
    WHEN "budgetCents" < 5000000 THEN '$25,000 - $50,000'
    WHEN "budgetCents" < 10000000 THEN '$50,000 - $100,000'
    ELSE '$100,000+'
  END,
  "budgetMin" = CASE 
    WHEN "budgetCents" = 0 THEN NULL
    WHEN "budgetCents" < 500000 THEN 0
    WHEN "budgetCents" < 1000000 THEN 500000
    WHEN "budgetCents" < 2500000 THEN 1000000
    WHEN "budgetCents" < 5000000 THEN 2500000
    WHEN "budgetCents" < 10000000 THEN 5000000
    ELSE 10000000
  END,
  "budgetMax" = CASE 
    WHEN "budgetCents" = 0 THEN NULL
    WHEN "budgetCents" < 500000 THEN 500000
    WHEN "budgetCents" < 1000000 THEN 1000000
    WHEN "budgetCents" < 2500000 THEN 2500000
    WHEN "budgetCents" < 5000000 THEN 5000000
    WHEN "budgetCents" < 10000000 THEN 10000000
    ELSE 15000000
  END,
  "budgetCurrency" = 'USD'
WHERE "eventTypeRaw" IS NULL;

