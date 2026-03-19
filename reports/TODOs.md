# TODO - Risky Refactors & Future Improvements

**Generated:** $(date)
**Status:** Future work items requiring careful planning

---

## High-Risk Refactors (Require Planning)

### 1. State Re-Architecture
- **Current:** Event state managed via props drilling and `onUpdate` callbacks
- **Proposal:** Move to React Context or Zustand store for global event state
- **Risk:** High (affects all panes, data flow)
- **Effort:** 8-12 hours
- **Dependencies:** None
- **Plan:**
  1. Create EventContext with provider
  2. Migrate Dashboard to use context
  3. Update all panes to consume context
  4. Test thoroughly for regressions

### 2. Runtime Validation with Zod
- **Current:** Type safety only at compile time
- **Proposal:** Add Zod schemas for EventItem and validate at adapter boundaries
- **Risk:** Medium (could break existing data)
- **Effort:** 6-8 hours
- **Dependencies:** Install `zod`
- **Plan:**
  1. Define Zod schemas matching EventItem types
  2. Add validation in `eventAdapter.ts`
  3. Add error handling for invalid data
  4. Create migration script for existing data

### 3. Consolidate Duplicate Layout Files
- **Current:** `app/(app)/layout.tsx` and `app/app/layout.tsx` are identical
- **Proposal:** Consolidate or document why both exist
- **Risk:** Medium (routing structure)
- **Effort:** 2-3 hours
- **Dependencies:** Understand Next.js routing structure
- **Plan:**
  1. Investigate if both are needed (route groups)
  2. If duplicate, consolidate
  3. If intentional, document reason
  4. Update all references

### 4. Replace `href="#"` with Buttons
- **Current:** Sidebar uses `<Link href="#">` with onClick handlers
- **Proposal:** Replace with `<button>` for better semantics
- **Risk:** Low (cosmetic, accessibility improvement)
- **Effort:** 2-3 hours
- **Dependencies:** None
- **Plan:**
  1. Update `SidebarLink.tsx` to accept `asButton` prop
  2. Update `DIYSidebar.tsx` to use buttons for client-side routes
  3. Test navigation still works
  4. Verify accessibility

---

## Medium-Risk Improvements

### 5. Add Input Validation Schemas
- **Current:** API routes lack validation
- **Proposal:** Add Zod validation to all create/update endpoints
- **Risk:** Medium (could reject valid requests)
- **Effort:** 4-6 hours
- **Dependencies:** Install `zod`
- **Plan:**
  1. Create validation schemas for each entity
  2. Add middleware or inline validation
  3. Return proper error responses
  4. Update frontend to handle errors

### 6. Calendar Sync Cleanup Logic
- **Current:** No cleanup when OneHub entities deleted
- **Proposal:** Add cleanup to remove Google Calendar events
- **Risk:** Low (additive feature)
- **Effort:** 2 hours
- **Dependencies:** None
- **Plan:**
  1. Add `deleteGoogleEvent` calls in event deletion handlers
  2. Query CalendarMapping for related Google events
  3. Delete Google events and mappings
  4. Add error handling

### 7. Budget AI Suggestions Validation
- **Current:** No warning when suggestions push remaining below zero
- **Proposal:** Add validation before applying suggestions
- **Risk:** Low (additive feature)
- **Effort:** 1 hour
- **Dependencies:** None
- **Plan:**
  1. Add check in `BudgetPane` before applying suggestion
  2. Show warning modal if remaining would be negative
  3. Allow user to proceed or cancel

---

## Low-Risk Improvements

### 8. Fix Next.js Route Type Warnings
- **Current:** Many routes show type warnings
- **Proposal:** Use `as const` or type assertions
- **Risk:** Low (cosmetic)
- **Effort:** 2-3 hours
- **Dependencies:** None
- **Plan:**
  1. Find all route type errors
  2. Apply `as const` where possible
  3. Use type assertions where needed
  4. Verify runtime behavior unchanged

### 9. Standardize Button Styles
- **Current:** Inconsistent button variants
- **Proposal:** Create button component library with variants
- **Risk:** Low (cosmetic)
- **Effort:** 2 hours
- **Dependencies:** None
- **Plan:**
  1. Audit all button usage
  2. Define standard variants (primary/secondary/ghost)
  3. Update components to use variants
  4. Test visual consistency

### 10. Add Missing Aria-Labels
- **Current:** Some icon-only buttons lack labels
- **Proposal:** Add `aria-label` to all icon buttons
- **Risk:** Low (accessibility improvement)
- **Effort:** 2 hours
- **Dependencies:** None
- **Plan:**
  1. Find all icon-only buttons
  2. Add descriptive `aria-label`
  3. Test with screen reader
  4. Verify accessibility score improves

---

## Performance Optimizations

### 11. Bundle Size Analysis
- **Current:** No bundle size monitoring
- **Proposal:** Set up `@next/bundle-analyzer`
- **Risk:** None (analysis only)
- **Effort:** 1 hour
- **Dependencies:** Install `@next/bundle-analyzer`
- **Plan:**
  1. Install and configure bundle analyzer
  2. Run analysis
  3. Identify large dependencies
  4. Document findings and recommendations

### 12. Audit useMemo/useEffect Dependencies
- **Current:** Some dependencies may be incomplete
- **Proposal:** Comprehensive review of all dependency arrays
- **Risk:** Low (optimization)
- **Effort:** 2-3 hours
- **Dependencies:** None
- **Plan:**
  1. Review all `useMemo` and `useEffect` hooks
  2. Verify dependency arrays are complete
  3. Fix any missing dependencies
  4. Test for regressions

---

## Testing Improvements

### 13. Comprehensive E2E Test Suite
- **Current:** Basic health check test exists
- **Proposal:** Add full E2E coverage for all flows
- **Risk:** Low (additive)
- **Effort:** 8-12 hours
- **Dependencies:** Playwright setup
- **Plan:**
  1. Test Vendors → Proposals → Contracts flow
  2. Test Budget calculations
  3. Test Tasks/Milestones cross-linking
  4. Test Calendar sync
  5. Test preview-before-send enforcement

### 14. Unit Tests for Utility Functions
- **Current:** No unit tests for budget/util functions
- **Proposal:** Add Jest/Vitest tests
- **Risk:** Low (additive)
- **Effort:** 4-6 hours
- **Dependencies:** Test framework setup
- **Plan:**
  1. Test `computeBudget` with various inputs
  2. Test `aiBudgetSuggestions` logic
  3. Test milestone status computation
  4. Test event adapter conversions

---

## Priority Ranking

1. **P0 (Critical):** None (all critical issues fixed)
2. **P1 (High):** #1, #2, #3 (architecture improvements)
3. **P2 (Medium):** #5, #6, #7 (feature completeness)
4. **P3 (Low):** #8, #9, #10, #11, #12 (polish)
5. **P4 (Testing):** #13, #14 (quality assurance)

---

## Notes

- All refactors should be done in separate feature branches
- Each refactor should include:
  - Planning document
  - Implementation
  - Tests
  - Documentation updates
- Coordinate with team before starting high-risk items
- Consider user impact for each change

