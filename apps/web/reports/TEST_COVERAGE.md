# Test Coverage Report

## Unit Tests

### ✅ Budget Parser (`apps/web/src/lib/parsers/__tests__/budget.test.ts`)

**Coverage:**
- ✅ Single values: "$12,500", "12500", "12.5k"
- ✅ Ranges: "10k-15k", "10k – 15k", "10k to 15k"
- ✅ Limits: "under 5k", "below 5000", "max 5k"
- ✅ Approximations: "about 30k EUR", "~ 40k gbp"
- ✅ Currency detection: USD, EUR, GBP, CAD, AUD
- ✅ Edge cases: "no numbers here", empty string
- ✅ "About" with ±20% range calculation

**Status:** ✅ Complete - 18+ test cases

### ✅ Event Type Canonicalizer (`apps/web/src/lib/parsers/__tests__/eventType.test.ts`)

**Coverage:**
- ✅ Exact matches: "wedding" → "wedding"
- ✅ Synonyms: "marriage ceremony" → "wedding"
- ✅ Corporate variants: "offsite" → "corporate"
- ✅ Multi-word: "black-tie gala" → "corporate"
- ✅ Special characters: "wedding!" → "wedding"
- ✅ Unknown types: "unknown thing" → null

**Status:** ✅ Complete - 25+ test cases

## API Tests

### ⚠️ Missing Tests

**Needed:**
1. `POST /api/events/create` with:
   - RAW-only input (no normalization)
   - RAW + successful normalization
   - Invalid budget format (should still save)
   - Missing required fields (should 400)

2. `POST /api/dreams/create` with:
   - Legacy format (backward compatibility)
   - New format
   - Hybrid format

**Status:** ❌ Not created yet

## E2E Tests

### Existing Tests
- ✅ `e2e/health.spec.ts` - Basic health checks
- ✅ `e2e/actionbar.spec.ts` - Action bar verification

### ⚠️ Missing E2E Tests

**Needed:**
1. Event Wizard flow:
   - Open wizard from sidebar
   - Fill free-text fields
   - Submit event
   - Verify DB row has RAW + normalized fields
   - Verify AI payload logged

**Status:** ❌ Not created yet

## Test Execution

### Run Tests
```bash
# Unit tests
npm test

# E2E tests
npm run e2e
```

### Test Files Location
- Unit: `apps/web/src/lib/parsers/__tests__/`
- E2E: `e2e/`

## Coverage Summary

| Category | Coverage | Status |
|----------|----------|--------|
| Budget Parser | 18+ cases | ✅ Complete |
| Event Type Canonicalizer | 25+ cases | ✅ Complete |
| API Endpoints | 0 cases | ❌ Missing |
| E2E Flows | 0 cases | ❌ Missing |

## Recommendations

1. **Add API Tests:** Use Vitest or Jest to test endpoints
2. **Add E2E Test:** Playwright test for full wizard flow
3. **Integration Tests:** Test parsing → DB → AI payload flow

