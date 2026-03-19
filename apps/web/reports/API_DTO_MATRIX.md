# API DTO Matrix: Database ↔ DTO ↔ UI

## Event Creation Flow

### Database Schema (Prisma)
```prisma
model Event {
  eventTypeRaw       String?      // Free-text event type
  eventTypeCanonical String?      // AI-normalized label
  budgetRaw          String?      // Free-text budget
  budgetMin          Int?         // Parsed min (cents)
  budgetMax          Int?         // Parsed max (cents)
  budgetCurrency     String?      // ISO 4217 (USD, EUR, etc.)
  type               EventType    // Legacy enum (kept for compatibility)
  budgetCents        Int          // Legacy budget (kept for compatibility)
}
```

### API DTO (Zod Schema)
```typescript
// apps/web/src/app/api/events/create/route.ts
const createEventSchema = z.object({
  event_type_raw: z.string().min(1, "Event type is required"),
  budget_raw: z.string().min(1, "Budget is required"),
  // ... other fields
});
```

### UI Components

#### ✅ Updated (New DTO)
- `apps/web/src/components/event-wizard/EventWizard.tsx`
  - Uses `eventTypeRaw` and `budgetRaw` state
  - Sends `event_type_raw` and `budget_raw` to API

#### ❌ Needs Update (Legacy DTO)
- `apps/web/src/app/events/new/page.tsx`
  - Still uses `type: EventType` enum
  - Still uses `budgetRange: string` dropdown
  - **Action:** Update to free-text inputs

- `apps/web/src/app/event-dreamer/create/page.tsx`
  - Uses `eventType: string` (legacy)
  - **Action:** Update to `event_type_raw`

### API Endpoints Status

| Endpoint | Status | DTO Format | Notes |
|----------|--------|------------|-------|
| `POST /api/events/create` | ✅ Updated | New (event_type_raw, budget_raw) | Parses & normalizes |
| `POST /api/dreams/create` | ✅ Updated | Hybrid (accepts both) | Backward compatible |
| `GET /api/events/[slug]` | ⚠️ Partial | Returns all fields | May need new fields in response |

### Data Flow

```
UI (EventWizard)
  ↓
  event_type_raw: "black-tie wedding"
  budget_raw: "$15,000 - $20,000"
  ↓
API (events/create)
  ↓
  parseBudget() → { min: 1500000, max: 2000000, currency: "USD" }
  canonicalizeEventType() → "wedding"
  ↓
Database (Event)
  ↓
  eventTypeRaw: "black-tie wedding"
  eventTypeCanonical: "wedding"
  budgetRaw: "$15,000 - $20,000"
  budgetMin: 1500000
  budgetMax: 2000000
  budgetCurrency: "USD"
  ↓
AI Planner Payload
  ↓
  {
    event_type: { raw: "...", canonical: "..." },
    budget: { raw: "...", min: ..., max: ..., currency: "..." }
  }
```

## Field Mapping

| Database Field | API DTO Field | UI State Field | Required | Notes |
|---------------|--------------|----------------|----------|-------|
| `eventTypeRaw` | `event_type_raw` | `eventTypeRaw` | ✅ Yes | User's free text |
| `eventTypeCanonical` | - | - | ❌ No | Auto-generated |
| `budgetRaw` | `budget_raw` | `budgetRaw` | ✅ Yes | User's free text |
| `budgetMin` | - | - | ❌ No | Auto-parsed |
| `budgetMax` | - | - | ❌ No | Auto-parsed |
| `budgetCurrency` | - | - | ❌ No | Auto-detected |
| `type` (legacy) | - | - | ❌ No | Backward compat |
| `budgetCents` (legacy) | - | - | ❌ No | Backward compat |

## Validation Rules

1. **UI Level:** Only `event_type_raw` and `budget_raw` are required
2. **API Level:** Zod validates both required, min length 1
3. **Database Level:** Both nullable (for migration safety)
4. **Parsing:** Never blocks save; normalized fields are optional

## Backward Compatibility

The `dreams/create` endpoint supports both formats:
- Legacy: `eventType`, `budget`
- New: `event_type_raw`, `budget_raw`

This allows gradual migration of client apps.

