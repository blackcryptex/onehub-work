# Logical Consistency Issues Report - OneHub

**Generated:** $(date)
**Scope:** Business logic, data flow, and feature consistency

---

## 1. Vendors → Proposals → Contracts Flow

### 1.1 Proposal Generation from Shortlist ✅
- **Status:** IMPLEMENTED CORRECTLY
- **File:** `components/panes/ProposalsPane.tsx`
- **Finding:** "Generate from Shortlist" button exists and calls AI service with shortlisted vendors
- **Flow:** VendorsPane → shortlist → ProposalsPane → Generate from Shortlist ✅

### 1.2 Preview-Before-Send Gate ✅
- **Status:** IMPLEMENTED CORRECTLY
- **Files:** 
  - `components/panes/ProposalsPane.tsx` (previewedIds state)
  - `components/panes/ContractsPane.tsx` (previewedIds state)
- **Finding:** Send buttons are disabled until `previewedIds` includes the item ID
- **Implementation:** Uses `ProposalPreviewModal` and `ContractPreviewModal`
- **Validation:** ✅ Correctly enforces review-first rule

### 1.3 Contracts from Accepted Proposals ✅
- **Status:** IMPLEMENTED CORRECTLY
- **File:** `components/panes/ContractsPane.tsx`
- **Finding:** Only shows "Generate Contract" for proposals with status='accepted'
- **Flow:** Proposal accepted → Generate Contract button appears → Creates contract with `fromProposalId` ✅

### 1.4 Contract-to-Proposal Binding ✅
- **Status:** IMPLEMENTED CORRECTLY
- **File:** `lib/types.event.ts` (Contract type)
- **Finding:** Contract has `fromProposalId: string` field
- **Validation:** Contracts are generated with correct proposal reference ✅

---

## 2. Budget Logic

### 2.1 Budget Calculation ✅
- **Status:** IMPLEMENTED CORRECTLY
- **Files:** 
  - `lib/budget.util.ts` (computeBudget function)
  - `components/panes/BudgetPane.tsx`
- **Finding:** 
  - Total: from `event.budget.total`
  - Planned: sum of allocations.planned
  - Projected: sum of allocations.projected (from proposals)
  - Actual: sum of allocations.actual (from contracts)
  - Remaining: Total - (Planned + max(Projected, Actual))
- **Validation:** ✅ All calculations correct

### 2.2 Budget AI Suggestions
- **Status:** IMPLEMENTED
- **File:** `lib/ai.budget.ts`
- **Finding:** AI suggestions generated, but no validation for negative remaining
- **Issue:** No warning when suggestions would push remaining below zero
- **Recommendation:** Add validation in `BudgetPane` before applying suggestions
- **Risk:** Low (user can see remaining before applying)
- **Effort:** 1 hour

### 2.3 Budget Allocations Sync
- **Status:** WORKING
- **File:** `components/panes/BudgetPane.tsx`
- **Finding:** `useEffect` recomputes when proposals/contracts change
- **Validation:** ✅ Dependencies correct

---

## 3. Tasks & Milestones

### 3.1 Single Pane with Subviews ✅
- **Status:** IMPLEMENTED CORRECTLY
- **File:** `components/panes/TasksMilestonesPane.tsx`
- **Finding:** Single pane with local sub-tabs ('tasks' and 'milestones')
- **Validation:** ✅ Correctly implemented

### 3.2 Milestone Roll-ups ✅
- **Status:** IMPLEMENTED CORRECTLY
- **File:** `components/milestones/MilestoneList.tsx`
- **Finding:** Auto-computes status based on linked tasks:
  - `achieved`: all tasks done
  - `at risk`: some tasks done, targetDate approaching
  - `slipped`: targetDate passed, not all tasks done
  - `planned`: default
- **Validation:** ✅ Status computation logic correct

### 3.3 Task-Milestone Cross-linking ✅
- **Status:** IMPLEMENTED CORRECTLY
- **Files:**
  - `components/tasks/TaskList.tsx` (shows milestone badge with jump)
  - `components/milestones/MilestoneList.tsx` (shows "View tasks" link)
- **Finding:** 
  - Tasks can link to milestones via `linkedTo='milestone'` and `linkedId`
  - Milestones track `linkedTaskIds[]`
  - Cross-linking works via `handleJumpToMilestone` and `handleViewTasks`
- **Validation:** ✅ Cross-linking functional

### 3.4 Task Filters ✅
- **Status:** IMPLEMENTED
- **File:** `components/tasks/TaskList.tsx`
- **Finding:** Filters by assignee, priority, done status
- **Validation:** ✅ Filtering works

---

## 4. Calendar Integration

### 4.1 Calendar Tab Routing ✅
- **Status:** IMPLEMENTED CORRECTLY
- **Files:**
  - `components/diy-planner/DIYSidebar.tsx` (Calendar tab)
  - `components/diy-planner/Dashboard.tsx` (Calendar route)
- **Finding:** Calendar tab correctly shows `CalendarPane` in main area
- **Validation:** ✅ No frame changes, pane mounts correctly

### 4.2 Google Calendar Overlay
- **Status:** IMPLEMENTED
- **File:** `components/panes/CalendarPane.tsx`
- **Finding:** Overlay toggle exists and fetches Google events
- **Potential Issue:** Overlay events may interfere with navigation if not handled
- **Recommendation:** Test overlay with navigation to ensure no conflicts
- **Risk:** Low (already has safeguards)
- **Effort:** 30 minutes (testing)

### 4.3 Calendar Sync Logic
- **Status:** IMPLEMENTED
- **Files:**
  - `app/api/google/sync/push/route.ts`
  - `lib/google.calendar.ts`
- **Finding:** Syncs events, tasks, milestones to Google Calendar
- **Potential Issue:** No handling for deleted entities (events/tasks removed from OneHub)
- **Recommendation:** Add cleanup logic to remove Google events when OneHub entities deleted
- **Risk:** Medium (orphaned Google events)
- **Effort:** 2 hours

---

## 5. Data Persistence

### 5.1 Event State Updates ✅
- **Status:** WORKING
- **Files:** All panes use `onUpdate` callback
- **Finding:** Changes propagate via `handleEventChange` in Dashboard
- **Validation:** ✅ State persistence via adapter pattern

### 5.2 Adapter Pattern ✅
- **Status:** WORKING BUT FRAGILE
- **File:** `lib/eventAdapter.ts`
- **Finding:** Converts between old/new EventItem formats
- **Issue:** Type safety not enforced at runtime
- **Recommendation:** Add runtime validation (Zod)
- **Risk:** Medium (data corruption potential)
- **Effort:** 4 hours

---

## 6. UI/UX Consistency

### 6.1 Action Bar Styling ✅
- **Status:** CONSISTENT
- **File:** `components/EventActionBar.tsx`
- **Finding:** All tabs use consistent styling, active state correctly shown

### 6.2 Pane Styling ✅
- **Status:** CONSISTENT
- **Finding:** All panes use `rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5` pattern
- **Validation:** ✅ Consistent OneHub palette usage

### 6.3 Button Patterns
- **Status:** MOSTLY CONSISTENT
- **Finding:** Some buttons use different variants
- **Recommendation:** Standardize button styles (primary/secondary/ghost)
- **Risk:** Low (cosmetic)
- **Effort:** 2 hours

---

## 7. Missing Features / Edge Cases

### 7.1 Payment Entity Sync
- **Status:** NOT IMPLEMENTED
- **Finding:** `paymentToGoogleEvent` exists in `lib/calendar.mapping.ts` but no Payment type in EventItem
- **Recommendation:** Add Payment entity to EventItem or remove payment mapping
- **Risk:** Low (unused code)
- **Effort:** 30 minutes (decision + cleanup)

### 7.2 Event Deletion Cleanup
- **Status:** NOT HANDLED
- **Finding:** No logic to remove Google Calendar events when OneHub events deleted
- **Recommendation:** Add cleanup in event deletion handler
- **Risk:** Medium (orphaned Google events)
- **Effort:** 2 hours

### 7.3 Token Refresh Error Handling
- **Status:** PARTIALLY HANDLED
- **File:** `lib/google.calendar.ts`
- **Finding:** Auto-refreshes tokens but error handling could be better
- **Recommendation:** Add user-facing error messages on refresh failure
- **Risk:** Low (already has error handling)
- **Effort:** 1 hour

---

## Summary of Logic Issues

### Critical Issues: 0
### High Priority: 2
1. Budget AI suggestions validation (negative remaining)
2. Calendar sync cleanup (deleted entities)

### Medium Priority: 3
3. Adapter pattern runtime validation
4. Event deletion cleanup
5. Token refresh error UX

### Low Priority: 2
6. Payment entity decision
7. Button style standardization

---

## Test Coverage Gaps

### Missing Tests:
1. Proposal generation from shortlist (E2E)
2. Preview-before-send enforcement (E2E)
3. Contract generation from accepted proposal (E2E)
4. Budget calculation accuracy (Unit)
5. Milestone status computation (Unit)
6. Calendar sync (E2E)
7. Event deletion cleanup (E2E)

### Recommendation:
Add comprehensive E2E tests in `e2e/health.spec.ts` (see below)

