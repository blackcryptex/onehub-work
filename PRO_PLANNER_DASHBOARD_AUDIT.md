# Pro Planner Dashboard - Logic Audit Report

**Date:** Generated via code audit  
**Status:** READ-ONLY Analysis (No Code Changes Made)

---

## 1. Overview

### Summary of Issues

- **Edit/Delete buttons visibility**: The buttons ARE implemented in the code (lines 168-192 of `Dashboard.tsx`), but they only render when `canManageEvent(event)` returns `true`. The `canManageEvent` function checks if `event.createdBy.id === userId`. This means:
  - If a Pro Planner user did NOT create the event, the buttons will not appear
  - The logic exists and is wired correctly, but the condition may be too restrictive

- **Manage Guest List / View Budget / Checklist actions**: These actions are implemented as buttons in the Event Vault detail page (`/app/vault/[eventSlug]/page.tsx`), but there are **route mismatches**:
  - The buttons link to `/app/events/[eventSlug]/guests`, `/app/events/[eventSlug]/budget`, and `/app/events/[eventSlug]/checklists`
  - The **guests page does not exist** (no file found at `apps/web/src/app/(app)/events/[eventSlug]/guests/page.tsx`)
  - The budget and checklists pages DO exist, but they may not be accessible from the Pro Planner dashboard flow

- **Navigation flow**: Pro Planner dashboard links event names to `/app/vault/[eventSlug]`, which is correct. However, the vault detail page's "Quick Actions" buttons point to routes that may not be properly set up for Pro Planner users.

---

## 2. Pro Planner Dashboard – Edit/Delete Visibility

### Current Implementation

**File:** `apps/web/src/components/pro-planner/Dashboard.tsx`

**Lines 92-95:** `canManageEvent` function definition
```typescript
const canManageEvent = (event: Event): boolean => {
  // User can manage event if they created it or are admin (admin check would be server-side)
  return event.createdBy.id === userId;
};
```

**Lines 129-192:** Edit/Delete buttons rendering
```typescript
{canManage && (
  <div className="flex items-center gap-2">
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        router.push(`/app/vault/${event.slug}` as any);
      }}
    >
      <Edit className="w-4 h-4 mr-1.5" />
      Edit
    </Button>
    <Button
      size="sm"
      variant="secondary"
      onClick={() => handleDeleteEvent(event.slug, event.id, event.name)}
      disabled={deletingEventId === event.id}
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      <Trash2 className="w-4 h-4 mr-1.5" />
      {deletingEventId === event.id ? "Deleting..." : "Delete"}
    </Button>
  </div>
)}
```

**Lines 66-90:** `handleDeleteEvent` function exists and is properly implemented
- Makes DELETE request to `/api/events/${eventSlug}`
- Updates local state to remove deleted event
- Has proper error handling and loading states

### Analysis

**Why Edit/Delete buttons may not be visible:**

1. **Conditional rendering**: The buttons only render when `canManage` is `true`
2. **`canManageEvent` logic**: The function checks `event.createdBy.id === userId`
   - This means only the user who CREATED the event can see Edit/Delete buttons
   - If events are created by other users (e.g., admin, another planner in the same org), the buttons won't appear
3. **Server-side vs Client-side**: The comment says "admin check would be server-side", but the client-side function doesn't account for admin status
4. **RBAC mismatch**: The server-side `canManageEvent` function in `apps/web/src/lib/rbac.ts` (lines 90-104) has more complex logic:
   - Admin can manage all events
   - Org owner can manage all events in their org
   - Planners can only manage events they created (planner isolation)
   - Other org members can manage events in their org
   
   However, the **client-side** `canManageEvent` in the Pro Planner dashboard only checks `createdBy.id === userId`, which is more restrictive than the server-side version.

### Conclusion

The Edit/Delete buttons **DO exist** in the code and are properly wired. They are not visible because:
- The `canManageEvent` check is too restrictive (only checks if user created the event)
- The client-side logic doesn't match the server-side RBAC logic
- If a user didn't create the event, they won't see the buttons even if they should have access

---

## 3. Pro Planner Dashboard – Manage Guest List / View Budget / Checklist

### Current Implementation

**File:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`

**Lines 480-492:** Quick Actions buttons
```typescript
<Card className="p-6">
  <h3 className="text-base font-semibold mb-4">Quick Actions</h3>
  <div className="space-y-2">
    <Button asChild variant="secondary" className="w-full justify-start">
      <Link href={`/app/events/${params.eventSlug}/guests` as any}>Manage Guest List</Link>
    </Button>
    <Button asChild variant="secondary" className="w-full justify-start">
      <Link href={`/app/events/${params.eventSlug}/budget` as any}>View Budget</Link>
    </Button>
    <Button asChild variant="secondary" className="w-full justify-start">
      <Link href={`/app/events/${params.eventSlug}/checklists` as any}>Checklists</Link>
    </Button>
  </div>
</Card>
```

### Route Analysis

#### 1. Manage Guest List
- **Button links to:** `/app/events/[eventSlug]/guests`
- **File exists:** ❌ **NO** - No file found at `apps/web/src/app/(app)/events/[eventSlug]/guests/page.tsx`
- **Status:** **BROKEN** - Clicking this button will result in a 404 error

#### 2. View Budget
- **Button links to:** `/app/events/[eventSlug]/budget`
- **File exists:** ✅ **YES** - `apps/web/src/app/(app)/events/[eventSlug]/budget/page.tsx`
- **Implementation:** Simple page that fetches event and displays `BudgetTable` component
- **Status:** **WORKS** - Page exists and should function correctly

#### 3. Checklists
- **Button links to:** `/app/events/[eventSlug]/checklists`
- **File exists:** ✅ **YES** - `apps/web/src/app/(app)/events/[eventSlug]/checklists/page.tsx`
- **Implementation:** Simple page that fetches event checklists and displays them
- **Status:** **WORKS** - Page exists and should function correctly

### Navigation Flow

**Pro Planner Dashboard → Event Vault Detail:**
1. User clicks event name in Pro Planner dashboard (line 146): Links to `/app/vault/${event.slug}`
2. User clicks "Edit" button (line 175): Also links to `/app/vault/${event.slug}`
3. Both lead to the Event Vault detail page, which has the Quick Actions buttons

**Issue:** The Quick Actions buttons point to `/app/events/[eventSlug]/...` routes, but:
- The guests route doesn't exist
- The budget and checklists routes exist but may not be the intended navigation pattern for Pro Planner users

### Comparison with DIY Planner

**DIY Planner approach** (`apps/web/src/components/diy-planner/Dashboard.tsx`):
- Uses `EventManagementSection` component (line 305)
- This component has **client-side tabs** for: vendors, proposals, contracts, budget, guests, tasks, milestones
- All tabs are rendered within the same component, no separate pages
- Uses `EventActionBar` to switch between tabs (line 21 of `EventManagementSection.tsx`)

**Pro Planner approach:**
- Links to separate pages: `/app/events/[eventSlug]/guests`, `/app/events/[eventSlug]/budget`, etc.
- These pages are server-side rendered Next.js pages
- One of these pages (guests) doesn't exist

### Conclusion

**Why "Manage Guest List / View Budget / Checklist" stopped working:**

1. **Missing guests page**: The `/app/events/[eventSlug]/guests` route doesn't exist, so clicking "Manage Guest List" results in a 404
2. **Route pattern mismatch**: Pro Planner uses separate pages (`/app/events/[eventSlug]/...`), while DIY Planner uses client-side tabs within the same component
3. **Incomplete migration**: It appears the Pro Planner dashboard was updated to link to separate pages, but the guests page was never created

---

## 4. Redundancies / Conflicting Logic

### 1. Multiple `canManageEvent` Implementations

**Client-side (Pro Planner Dashboard):**
- **File:** `apps/web/src/components/pro-planner/Dashboard.tsx` (lines 92-95)
- **Logic:** Only checks `event.createdBy.id === userId`
- **Scope:** Client-side only, used for UI visibility

**Server-side (RBAC):**
- **File:** `apps/web/src/lib/rbac.ts` (lines 90-104)
- **Logic:** More comprehensive:
  - Admin can manage all events
  - Org owner can manage all events in their org
  - Planners can only manage events they created
  - Other org members can manage events in their org
- **Scope:** Used for server-side authorization

**Conflict:** The client-side version is more restrictive than the server-side version, leading to inconsistent behavior where:
- A user might have server-side permission to manage an event
- But the client-side check hides the Edit/Delete buttons

### 2. Multiple Event Detail Pages

**Event Vault Detail Page:**
- **Route:** `/app/vault/[eventSlug]`
- **File:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
- **Purpose:** Shows event overview with Quick Actions buttons
- **Used by:** Pro Planner dashboard links to this page

**Event Overview Page:**
- **Route:** `/app/events/[eventSlug]`
- **File:** `apps/web/src/app/(app)/events/[eventSlug]/page.tsx`
- **Purpose:** Shows basic event stats (status, dates, budget)
- **Status:** Simpler page, may be legacy or for different use case

**Redundancy:** Two different pages for viewing event details, with different purposes and different navigation patterns.

### 3. Different Navigation Patterns for Event Actions

**DIY Planner:**
- Uses client-side tabs within `EventManagementSection`
- All actions (guests, budget, checklist) are tabs in the same component
- No separate pages needed

**Pro Planner:**
- Uses separate Next.js pages for each action
- `/app/events/[eventSlug]/budget`
- `/app/events/[eventSlug]/checklists`
- `/app/events/[eventSlug]/guests` (missing)

**Conflict:** Two different architectural approaches for the same functionality, leading to:
- Incomplete implementation (missing guests page)
- Inconsistent user experience between DIY and Pro Planner

### 4. Unused or Partially Migrated Code

**Pro Planner Dashboard:**
- Has `handleDeleteEvent` function that works correctly
- Has Edit/Delete buttons that are conditionally rendered
- But the conditional logic may be too restrictive

**Event Vault Detail Page:**
- Has Quick Actions buttons that link to separate pages
- But one of those pages (guests) doesn't exist
- Suggests incomplete migration from one pattern to another

---

## 5. Recommended Next Fixes (DO NOT APPLY)

### Priority 1: Fix Missing Guests Page

**Issue:** `/app/events/[eventSlug]/guests` route doesn't exist, causing 404 errors

**Fix:**
1. Create `apps/web/src/app/(app)/events/[eventSlug]/guests/page.tsx`
2. Implement similar to the checklists page:
   - Fetch event by slug
   - Fetch guest lists and guests
   - Display guest list management UI
   - Or, alternatively, redirect to a working guests management component

**Alternative Fix:**
- Change the "Manage Guest List" button in vault detail page to use a different route that exists
- Or implement guests management as a client-side tab similar to DIY Planner

### Priority 2: Align Client-Side and Server-Side `canManageEvent` Logic

**Issue:** Client-side `canManageEvent` is more restrictive than server-side, causing Edit/Delete buttons to not appear when they should

**Fix:**
1. Remove the client-side `canManageEvent` function from Pro Planner Dashboard
2. Pass `canManage` as a prop from the server-side page component
3. The server-side page (`apps/web/src/app/pro/planner/page.tsx`) should:
   - Use the server-side `canManageEvent` from `@/lib/rbac` for each event
   - Pass `canManage: boolean` as part of the event data to the dashboard component
4. Update the dashboard component to use the prop instead of calculating it client-side

**Alternative Fix:**
- Make an API call to check permissions, but this adds unnecessary complexity

### Priority 3: Standardize Navigation Pattern

**Issue:** Pro Planner uses separate pages while DIY Planner uses client-side tabs, leading to inconsistency

**Options:**

**Option A: Make Pro Planner use client-side tabs (like DIY Planner)**
1. Update Pro Planner dashboard to use `EventManagementSection` component
2. Remove the separate page routes for budget/checklists/guests
3. Implement tabs within the vault detail page or dashboard

**Option B: Complete the separate pages approach**
1. Create the missing guests page
2. Ensure all pages have consistent styling and functionality
3. Update navigation to be consistent across all event action pages

**Recommendation:** Option A (client-side tabs) is more consistent with DIY Planner and reduces the number of routes to maintain.

### Priority 4: Fix Edit Button Navigation

**Issue:** Edit button navigates to `/app/vault/[eventSlug]` which shows the detail page, not an edit form

**Fix:**
1. Create an edit page at `/app/vault/[eventSlug]/edit` or `/app/events/[eventSlug]/edit`
2. Update the Edit button to navigate to the edit page
3. Or, implement inline editing in the vault detail page

### Priority 5: Add Admin/Org Owner Support to Client-Side Visibility

**Issue:** Even if server-side allows admin/org owner to manage events, client-side doesn't show buttons

**Fix:**
- This is covered by Priority 2 (aligning client/server logic)
- But specifically: ensure the dashboard receives user role information and uses it in permission checks

### Priority 6: Verify Route Accessibility

**Issue:** Need to ensure `/app/events/[eventSlug]/budget` and `/app/events/[eventSlug]/checklists` are accessible to Pro Planner users

**Fix:**
1. Check if these routes have proper authentication/authorization middleware
2. Verify they work correctly when accessed from Pro Planner dashboard
3. Test that they display the correct data for Pro Planner users

---

## Appendix: File Locations

### Key Files Analyzed

1. **Pro Planner Dashboard Page:**
   - `apps/web/src/app/pro/planner/page.tsx`

2. **Pro Planner Dashboard Component:**
   - `apps/web/src/components/pro-planner/Dashboard.tsx`

3. **DIY Planner Dashboard (for comparison):**
   - `apps/web/src/components/diy-planner/Dashboard.tsx`

4. **Event Vault Detail Page:**
   - `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`

5. **Event Management Section (DIY Planner):**
   - `apps/web/src/components/EventManagementSection.tsx`

6. **API Route for Event Deletion:**
   - `apps/web/src/app/api/events/[eventSlug]/route.ts`

7. **RBAC Logic:**
   - `apps/web/src/lib/rbac.ts`

8. **Event Action Pages:**
   - `apps/web/src/app/(app)/events/[eventSlug]/budget/page.tsx` ✅
   - `apps/web/src/app/(app)/events/[eventSlug]/checklists/page.tsx` ✅
   - `apps/web/src/app/(app)/events/[eventSlug]/guests/page.tsx` ❌ (does not exist)

---

## Summary

The Pro Planner dashboard has the following issues:

1. **Edit/Delete buttons exist but are conditionally hidden** due to overly restrictive client-side permission check
2. **Manage Guest List button is broken** - links to a non-existent page
3. **View Budget and Checklists buttons work** - pages exist and should function
4. **Inconsistent navigation patterns** between DIY and Pro Planner dashboards
5. **Client-side and server-side permission logic mismatch** causing visibility issues

All issues are fixable with the recommended changes above.

