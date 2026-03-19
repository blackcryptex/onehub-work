# AI Planner Prompt Guidelines

## System Prompt

```
You are an expert event planner AI assistant. You receive both raw user text and normalized fields for event planning.

Guidelines:
• Use RAW fields to preserve user intent and nuance (style, qualifiers, specific language).
• Prefer NORMALIZED numbers/currency for calculations and vendor matching.
• If normalization is missing or ambiguous, infer a working range and state confidence.
• Never reject plans due to missing normalization if RAW text is present.
• When providing recommendations, reference the user's exact wording from RAW fields when relevant.
• Use normalized budget ranges for vendor matching and budget allocation.
• If currency is not specified, default to USD and note this assumption.
```

## Payload Structure

The AI planner receives events in this format:

```json
{
  "event_type": {
    "raw": "black-tie wedding with garden ceremony",
    "canonical": "wedding"
  },
  "budget": {
    "raw": "$15,000 - $20,000",
    "min": 1500000,
    "max": 2000000,
    "currency": "USD"
  }
}
```

## Field Usage

### Event Type

**Raw (`event_type.raw`):**
- Use for: Understanding style, tone, specific requirements
- Example: "black-tie wedding" → suggests formal attire, elegant venue
- Example: "rustic barn wedding" → suggests casual, outdoor, natural decor

**Canonical (`event_type.canonical`):**
- Use for: Vendor category matching, default checklist templates
- Example: "wedding" → prioritize venue, catering, photography vendors
- Fallback: If null, infer from raw text or ask clarifying questions

### Budget

**Raw (`budget.raw`):**
- Use for: Understanding user's budget mindset and constraints
- Example: "about 30k" → flexible, ±20% acceptable
- Example: "under 5k" → strict upper limit, must stay below

**Normalized (`budget.min`, `budget.max`, `budget.currency`):**
- Use for: Vendor price filtering, budget allocation calculations
- Example: Match vendors within min-max range
- Example: Allocate 30% to venue, 25% to catering from normalized max
- Fallback: If null, infer from raw text with confidence level

## Example Interactions

### Case 1: Full Normalization
```
Input:
  raw: "about $25k"
  normalized: { min: 2000000, max: 3000000, currency: "USD" }

AI Action:
  - Use "about $25k" in user-facing responses
  - Use $20k-$30k range for vendor matching
  - Allocate budget categories based on normalized max ($30k)
```

### Case 2: Partial Normalization
```
Input:
  raw: "10k-15k EUR"
  normalized: { min: 1000000, max: 1500000, currency: "EUR" }

AI Action:
  - Note currency is EUR (convert vendor prices if needed)
  - Use normalized range for calculations
  - Reference "10k-15k EUR" in user communications
```

### Case 3: No Normalization
```
Input:
  raw: "moderate budget for a nice party"
  normalized: null

AI Action:
  - Infer budget range: $5k-$15k (medium confidence)
  - Ask clarifying questions: "What's your target budget?"
  - Use raw text to understand style/tone requirements
```

## Confidence Levels

When inferring from RAW-only data:

- **High Confidence:** Clear patterns ("under 5k", "about 30k")
- **Medium Confidence:** Vague ranges ("moderate", "reasonable")
- **Low Confidence:** No budget info → ask user

Always state confidence level when inferring:
```
"I've estimated a budget range of $10k-$15k based on your event type, 
but please confirm your actual budget for more accurate vendor matching."
```

## Implementation

The payload builder is in `apps/web/src/lib/ai/buildPlannerPayload.ts`:

```typescript
export function buildPlannerPayload(evt: {
  eventTypeRaw: string | null;
  eventTypeCanonical: string | null;
  budgetRaw: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string | null;
}): PlannerPayload
```

This ensures AI always receives both RAW and normalized fields when available.

