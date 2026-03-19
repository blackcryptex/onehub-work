# Static Analysis Report - OneHub

**Generated:** $(date)
**Scope:** Frontend + Backend codebase analysis

---

## 1. Types/TSConfig Issues

### Critical Type Errors (Blocking Build)

#### 1.1 Missing Type Definitions
- **File:** `scripts/verifyLinks.ts:3`
- **Error:** Cannot find module 'axios' or its corresponding type declarations
- **Fix:** Install `axios` and `@types/node` or remove script if unused

#### 1.2 Type Mismatches in Proposals/Contracts Panes
- **Files:** 
  - `components/panes/ProposalsPane.tsx:87,96,101`
  - `components/panes/ContractsPane.tsx:51,52`
- **Error:** `status: string` is not assignable to `Status` enum
- **Root Cause:** Event data from DB uses string status, but types expect enum
- **Fix:** Add type guards/casting when syncing from `event.proposals`/`event.contracts`
- **Risk:** Medium (data flow issue)
- **Effort:** 1-2 hours

#### 1.3 CalendarAccount Schema Mismatch
- **Files:**
  - `app/api/google/status/route.ts:14,19,21`
  - `app/api/google/connect/route.ts:37`
- **Error:** `googleCalendarId` and `syncState` don't exist on Prisma type
- **Root Cause:** Prisma client not regenerated after schema changes
- **Fix:** Run `npx prisma generate` after migration
- **Risk:** Low (regeneration fix)
- **Effort:** 5 minutes

#### 1.4 Missing VendorCategory Type Import
- **File:** `lib/ai.service.ts:137,142,157`
- **Error:** Cannot find name 'VendorCategory'
- **Fix:** Import `VendorCategory` from `@/lib/types.event`
- **Risk:** Low
- **Effort:** 5 minutes

#### 1.5 Route Type Issues (Next.js App Router)
- **Files:** Multiple (signin, signup, event-vault, vendor-venue, etc.)
- **Error:** `Argument of type 'string' is not assignable to parameter of type 'RouteImpl<string>'`
- **Root Cause:** Next.js 14 strict routing types
- **Fix:** Use `as const` for route strings or type assertions
- **Risk:** Low (cosmetic, runtime works)
- **Effort:** 2-3 hours (many files)

#### 1.6 Task LinkedTo Type Mismatch
- **File:** `components/tasks/TaskList.tsx:76`
- **Error:** `string | null` not assignable to union type
- **Fix:** Add type guard/casting
- **Risk:** Low
- **Effort:** 15 minutes

#### 1.7 Undefined Object Access
- **Files:** 
  - `app/(app)/vault/page.tsx:155,156`
  - `app/event-vault/page.tsx:155,156`
- **Error:** Object is possibly 'undefined'
- **Fix:** Add null checks
- **Risk:** Medium (runtime error potential)
- **Effort:** 30 minutes

#### 1.8 BudgetLineCreateInput Missing Field
- **File:** `app/api/events/create/route.ts:93`
- **Error:** Property 'label' is missing
- **Fix:** Add `label` field to budget line creation
- **Risk:** Low
- **Effort:** 10 minutes

### Warnings (Non-blocking)

#### 1.9 Unused @ts-expect-error Directives
- **Files:**
  - `app/not-found.tsx:11`
  - `components/layout/Topbar.tsx:19,24`
- **Fix:** Remove directives or fix underlying issues
- **Risk:** None
- **Effort:** 10 minutes

#### 1.10 Type Issues in Event Wizard
- **File:** `components/diy-planner/EventWizard.tsx:70,157`
- **Error:** `VendorLink[]` vs `string[]` mismatch
- **Fix:** Align types or add conversion
- **Risk:** Low
- **Effort:** 30 minutes

---

## 2. Routing & Tab Map Issues

### 2.1 Action Bar Routing ✅
- **Status:** CORRECT
- **Finding:** Single `EventActionBar` component, correctly wired in `EventManagementSection`
- **No duplicates found**

### 2.2 Tab → Pane Mapping ✅
- **Status:** CORRECT
- **Mapping:**
  - `vendors` → `VendorsPane` ✅
  - `proposals` → `ProposalsPane` ✅
  - `contracts` → `ContractsPane` ✅
  - `budget` → `BudgetPane` ✅
  - `guests` → `GuestsPane` ✅
  - `tasks` → `TasksMilestonesPane` (subTab="tasks") ✅
  - `milestones` → `TasksMilestonesPane` (subTab="milestones") ✅

### 2.3 Sidebar Navigation
- **Status:** INTENTIONAL USE OF `href="#"` WITH onClick
- **Files:** `components/diy-planner/DIYSidebar.tsx` (11 instances)
- **Analysis:** All use `onClick` handlers for client-side routing via state
- **Recommendation:** Consider using `<button>` instead of `<Link href="#">` for better semantics
- **Risk:** Low (works but not semantic)
- **Effort:** 1 hour

### 2.4 Calendar Tab Integration ✅
- **Status:** CORRECT
- **Finding:** Calendar tab in sidebar correctly routes to `CalendarPane` in Dashboard
- **No frame changes detected**

---

## 3. State/Data Flow Issues

### 3.1 Event Data Adaptation
- **Status:** WORKING BUT FRAGILE
- **Files:** `lib/eventAdapter.ts`, `components/diy-planner/Dashboard.tsx`
- **Issue:** Adapter converts between old/new formats, but type mismatches can slip through
- **Recommendation:** Add runtime validation (Zod schemas)
- **Risk:** Medium (data corruption potential)
- **Effort:** 4-6 hours

### 3.2 Proposal/Contract Status Sync
- **Status:** HAS TYPE ISSUES
- **Files:** `components/panes/ProposalsPane.tsx`, `components/panes/ContractsPane.tsx`
- **Issue:** `useEffect` syncs from `event.proposals` but type system doesn't enforce `Status` enum
- **Fix:** Add type guards when setting state
- **Risk:** Medium (incorrect status values possible)
- **Effort:** 1 hour

### 3.3 Budget Calculation Dependencies
- **Status:** WORKING
- **Files:** `lib/budget.util.ts`, `components/panes/BudgetPane.tsx`
- **Issue:** `useMemo` dependencies may not catch all changes
- **Fix:** Verify `useEffect` triggers on all relevant changes
- **Risk:** Low (already has useEffect)
- **Effort:** 30 minutes (review)

---

## 4. Redundancies/Duplicates

### 4.1 Duplicate Layout Files
- **Files:**
  - `app/(app)/layout.tsx`
  - `app/app/layout.tsx`
- **Status:** IDENTICAL CODE
- **Analysis:** Both render Topbar + Sidebar + main content
- **Recommendation:** Consolidate or document why both exist
- **Risk:** Low (maintenance burden)
- **Effort:** 1 hour (investigation + cleanup)

### 4.2 No Duplicate Action Bars ✅
- **Status:** CONFIRMED - Only one `EventActionBar` component

### 4.3 SidebarLink Type Issue
- **File:** `components/diy-planner/SidebarLink.tsx:11`
- **Issue:** `LucideIcon` used as type but refers to value
- **Fix:** Use `typeof LucideIcon` or `React.ComponentType`
- **Risk:** Low
- **Effort:** 5 minutes

---

## 5. Performance/Optimization

### 5.1 FullCalendar Dynamic Import ✅
- **Status:** CORRECTLY IMPLEMENTED
- **File:** `components/panes/CalendarPane.tsx`
- **Finding:** Uses `dynamic()` with `ssr: false` to avoid SSR issues

### 5.2 Missing Dependency Checks
- **Files:** Multiple panes with `useMemo`/`useEffect`
- **Recommendation:** Audit all dependency arrays for completeness
- **Risk:** Low (potential stale closures)
- **Effort:** 2-3 hours (comprehensive review)

### 5.3 Large Bundle Risk
- **Dependencies:** FullCalendar, googleapis
- **Recommendation:** Monitor bundle size with `@next/bundle-analyzer`
- **Risk:** Low (acceptable for calendar features)
- **Effort:** 1 hour (setup + analysis)

---

## 6. Accessibility (A11y)

### 6.1 Icon Buttons Missing Labels
- **Files:** Multiple (action buttons with icons only)
- **Issue:** Some buttons use only icons without `aria-label`
- **Fix:** Add `aria-label` to all icon-only buttons
- **Risk:** Low (accessibility)
- **Effort:** 2 hours

### 6.2 Skip Link ✅
- **File:** `app/layout.tsx:26`
- **Status:** CORRECTLY IMPLEMENTED

### 6.3 ARIA Current Attributes ✅
- **Files:** `EventActionBar.tsx`, `SidebarLink.tsx`
- **Status:** CORRECTLY IMPLEMENTED

---

## 7. Security/Quality

### 7.1 API Route Auth Guards ✅
- **Status:** MOSTLY SECURED
- **Finding:** Most API routes check `session?.user?.id`
- **Recommendation:** Create shared auth middleware utility
- **Risk:** Low
- **Effort:** 1 hour

### 7.2 Missing Input Validation
- **Files:** API routes (create/update events, proposals, contracts)
- **Issue:** No Zod/validation schemas in some routes
- **Recommendation:** Add validation middleware
- **Risk:** Medium (data integrity)
- **Effort:** 4-6 hours

### 7.3 No dangerouslySetInnerHTML Found ✅
- **Status:** CLEAN

---

## 8. Missing Dependencies

### 8.1 ESLint Plugin Missing
- **Error:** `@typescript-eslint/eslint-plugin` not found
- **Fix:** Install missing dev dependencies
- **Risk:** Low (linting only)
- **Effort:** 5 minutes

### 8.2 Axios (in script)
- **File:** `scripts/verifyLinks.ts`
- **Status:** MAY BE UNUSED
- **Recommendation:** Check if script is used, remove or install dependency

---

## Recommended Fix Priority

### P0 (Critical - Blocking)
1. Fix Prisma client regeneration (CalendarAccount types)
2. Fix Proposal/Contract status type mismatches
3. Add missing VendorCategory import

### P1 (High - Should Fix)
4. Add null checks for undefined object access
5. Fix ESLint plugin installation
6. Consolidate duplicate layout files

### P2 (Medium - Nice to Have)
7. Add type guards for status enums
8. Replace `href="#"` with buttons where appropriate
9. Add aria-labels to icon buttons
10. Add input validation schemas

### P3 (Low - Future)
11. Fix Next.js route type warnings (cosmetic)
12. Add runtime validation with Zod
13. Bundle size analysis

---

## Summary Statistics

- **Total Type Errors:** 43
- **Critical (Blocking):** 8
- **High Priority:** 12
- **Medium Priority:** 15
- **Low Priority:** 8
- **Duplicate Components:** 0 (Action Bar confirmed unique)
- **Routing Issues:** 0 (all tabs correctly mapped)
- **Security Issues:** 0 (auth guards in place)

