# Migration Guide: Free-Text Event Type & Budget

## Overview

This migration adds support for free-text event types and budgets, replacing dropdown selections with flexible text inputs that are parsed and normalized for AI processing.

## Migration Steps

### 1. Generate Prisma Client

```bash
cd apps/web
npx prisma generate
```

### 2. Apply Database Migration

The migration SQL is located at:
```
apps/web/prisma/migrations/manual_add_freetext_event_type_budget/migration.sql
```

**Option A: Using Prisma Migrate (Recommended for Development)**
```bash
cd apps/web
npx prisma migrate dev --name add_freetext_event_type_budget
```

**Option B: Manual Application (For Production)**
1. Review the migration SQL file
2. Apply it to your database using your preferred database tool
3. Mark the migration as applied:
```bash
npx prisma migrate resolve --applied add_freetext_event_type_budget
```

### 3. Verify Schema

After migration, verify the `Event` table has these new fields:
- `eventTypeRaw` (String, nullable)
- `eventTypeCanonical` (String, nullable)
- `budgetRaw` (String, nullable)
- `budgetMin` (Int, nullable)
- `budgetMax` (Int, nullable)
- `budgetCurrency` (VarChar(3), nullable)

### 4. Backfill Existing Data

The migration SQL includes backfill logic that:
- Maps legacy `EventType` enum values to `eventTypeRaw` text
- Sets `eventTypeCanonical` based on enum mapping
- Estimates `budgetRaw`, `budgetMin`, `budgetMax` from existing `budgetCents`

## Testing

Run unit tests to verify parsing:
```bash
npm test
```

Tests cover:
- Budget parsing across multiple formats
- Event type canonicalization
- Currency detection

## API Changes

### Event Creation Endpoint

**Old format:**
```json
{
  "eventType": "WEDDING",
  "budgetRange": "10K_25K"
}
```

**New format:**
```json
{
  "event_type_raw": "black-tie wedding",
  "budget_raw": "$15,000 - $20,000"
}
```

The API automatically:
- Parses budget text into min/max/currency
- Canonicalizes event type for AI processing
- Stores both raw and normalized values

### Backward Compatibility

The `dreams/create` endpoint supports both old and new field names:
- `eventType` or `event_type_raw`
- `budget` or `budget_raw`

Legacy fields are automatically converted to new format.

## AI Integration

The AI planner now receives both raw and normalized fields:

```typescript
{
  event_type: {
    raw: "black-tie wedding",
    canonical: "wedding"
  },
  budget: {
    raw: "$15,000 - $20,000",
    min: 1500000,  // cents
    max: 2000000,  // cents
    currency: "USD"
  }
}
```

The AI system prompt instructs the model to:
- Use RAW fields to preserve user intent and nuance
- Prefer NORMALIZED numbers/currency for calculations
- Infer working ranges when normalization is missing

## Telemetry

The API logs parsing metrics:
- `event_type_raw_length`
- `budget_raw_length`
- `budget_parse_success`
- `budget_currency_detected`
- `event_type_canonicalized`

## Rollback

If needed, rollback by:
1. Reverting the migration SQL (DROP COLUMN statements)
2. Reverting code changes
3. Regenerating Prisma client

