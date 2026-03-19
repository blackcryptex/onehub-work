# Static Analysis Issues

Generated: $(date)

## Critical Issues (Blocking)

### 1. Prisma Schema Type Mismatch
**File:** `apps/web/src/app/api/events/create/route.ts:99`
**Issue:** `eventTypeRaw` property not recognized in Prisma types
**Cause:** Prisma client not regenerated after schema change
**Fix:** Run `npx prisma generate` after migration
**Status:** ✅ Fixed - Migration applied, client regenerated

### 2. Missing Event Type/Budget Fields in Legacy Pages
**Files:** 
- `apps/web/src/app/events/new/page.tsx` - Still uses `type` enum and `budgetRange` dropdown
- `apps/web/src/app/event-dreamer/create/page.tsx` - Still uses `eventType` string
**Issue:** These pages haven't been updated to use free-text fields
**Fix:** Update to use `event_type_raw` and `budget_raw` inputs
**Priority:** High (blocks consistent UX)

## High Priority Issues

### 3. Prisma Include Type Errors
**File:** `apps/web/src/app/api/events/[eventSlug]/route.ts:41,53`
**Issue:** `payouts` relation doesn't exist on Proposal model; `org` property access issue
**Fix:** Remove `payouts` include or add relation to schema; fix `org` include
**Status:** Needs schema verification

### 4. Type Assertions in Router
**Files:** Multiple files using `as any` for Next.js router.push
**Issue:** Type safety bypassed for routing
**Fix:** Use proper Next.js routing types or update type definitions
**Priority:** Medium (works but loses type safety)

## Medium Priority Issues

### 5. Missing Axios Dependency
**File:** `scripts/verifyLinks.ts:3`
**Issue:** Cannot find module 'axios'
**Fix:** Install axios or use native fetch
**Priority:** Low (only affects link verification script)

### 6. Type Mismatches in Event Adapter
**File:** `apps/web/src/lib/eventAdapter.ts:64,174`
**Issue:** Milestone status type mismatches
**Fix:** Align status enum values between old and new formats
**Priority:** Medium

## Low Priority Issues

### 7. Unused Type Directives
**Files:** `apps/web/src/app/not-found.tsx:11`, `apps/web/src/components/layout/Topbar.tsx:19,24`
**Issue:** `@ts-expect-error` directives are unused
**Fix:** Remove or update directives
**Priority:** Low

### 8. Implicit Any Types
**File:** `apps/web/src/app/event-vault/[eventSlug]/page.tsx:91,92`
**Issue:** Parameter 'pay' has implicit any type
**Fix:** Add explicit type annotations
**Priority:** Low

## Summary

- **Total Issues:** 8+
- **Critical:** 2 (1 resolved)
- **High:** 2
- **Medium:** 2
- **Low:** 4+

## Next Steps

1. ✅ Apply migration and regenerate Prisma client (DONE)
2. Update legacy event creation pages to use new DTO
3. Fix Prisma relation includes
4. Resolve type mismatches in event adapter

