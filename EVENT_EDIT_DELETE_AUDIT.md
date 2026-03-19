# Event Edit/Delete Logic Audit Report

**Date:** 2024  
**Scope:** DIY Planner and Pro Planner event editing/deleting capabilities  
**Status:** READ-ONLY AUDIT (No code changes)

---

## 1. Overview

### Summary of Findings

- **Edit/Delete controls exist in limited locations:**
  - Pro Planner dashboard shows Edit/Delete buttons conditionally based on client-side `canManageEvent` check
  - DIY Planner dashboard shows an "Edit" button (always visible, no conditional check) that opens the wizard
  - Event Vault list page has NO Edit/Delete buttons (only links to detail page)
  - Event Vault detail page has NO Edit/Delete buttons (only shows event details and navigation links)

- **Role-based visibility:**
  - Pro Planner dashboard correctly gates Edit/Delete based on `canManageEvent` (checks if user created the event OR is admin OR is org owner)
  - DIY Planner dashboard shows Edit button unconditionally (no permission check)
  - Event Vault pages do not render Edit/Delete controls at all

- **High-level issues:**
  - **Missing UI controls:** Event Vault detail page checks `canManageEvent` server-side but never renders Edit/Delete buttons
  - **Inconsistent checks:** DIY Planner dashboard shows Edit button without any permission check
  - **Client-side duplication:** Pro Planner dashboard duplicates RBAC logic client-side instead of using server-provided flags
  - **Backend allows more than UI shows:** Backend `canManageEvent` allows non-planner org members to manage events, but UI only shows controls for event creators/admins/org owners

---

## 2. DIY Planner – Edit/Delete Logic

### 2.1 DIY Planner Dashboard (`apps/web/src/components/diy-planner/Dashboard.tsx`)

**Location:** Event detail view (`uiRoute === "eventDetail"`)

**Edit Button:**
- **JSX Location:** Line 264-269
- **Condition:** Always visible (no conditional check)
- **Action:** Opens wizard (`setUiRoute("wizard")`)
- **Code:**
  ```tsx
  <button
    className="rounded-lg px-3 py-2 text-sm font-semibold text-white bg-[color:var(--oh-primary)] hover:bg-[color:var(--oh-primary-700)]"
    onClick={() => setUiRoute("wizard")}
  >
    Edit
  </button>
  ```

**Delete Button:**
- **Status:** ❌ NOT PRESENT

**User Context:**
- Component receives `events` array from API (`/api/diy/events`)
- No `user` prop or `userId` prop passed to component
- No server-side permission check before rendering Edit button

**Backend Comparison:**
- Backend `canEditEvent` requires: Admin OR org owner OR planner who created event OR non-planner org member
- UI shows Edit button unconditionally → **MISMATCH**: UI is more permissive than backend

---

### 2.2 Event Vault List (`apps/web/src/app/(app)/vault/page.tsx`)

**Edit/Delete Buttons:**
- **Status:** ❌ NOT PRESENT
- **UI:** Only renders event cards as links to detail page (`/app/vault/${ev.slug}`)
- **Code:** Lines 96-197 show event cards with no action buttons

**User Context:**
- Server component with `getCurrentUser()` call
- Filters events server-side: planners only see events they created (line 42)
- No Edit/Delete UI controls rendered

**Backend Comparison:**
- Backend filters events correctly (planner isolation)
- But no way to edit/delete from this view → **GAP**: Users must navigate to detail page, which also has no Edit/Delete buttons

---

### 2.3 Event Vault Detail (`apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`)

**Edit/Delete Buttons:**
- **Status:** ❌ NOT PRESENT
- **UI:** Shows event details, timeline, proposals, quick actions (links to other pages)
- **Code:** Lines 225-580 show full event detail view with NO Edit/Delete buttons

**Permission Check:**
- **Server-side check:** Line 172 uses `canManageEvent(user, event)`
- **Result:** If `canManage` is false, returns `notFound()` (line 182)
- **But:** Even when `canManage` is true, no Edit/Delete buttons are rendered

**Backend Comparison:**
- Backend correctly checks permissions
- UI never renders Edit/Delete controls → **GAP**: Permission check exists but UI doesn't use it

---

## 3. Pro Planner – Edit/Delete Logic

### 3.1 Pro Planner Dashboard (`apps/web/src/components/pro-planner/Dashboard.tsx`)

**Location:** Events list in overview (`uiRoute === "overview"`)

**Edit Button:**
- **JSX Location:** Lines 185-195
- **Condition:** Only shown if `canManageEvent(event)` returns true (line 183)
- **Action:** Navigates to `/app/vault/${event.slug}` (line 190)
- **Code:**
  ```tsx
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
      ...
    </div>
  )}
  ```

**Delete Button:**
- **JSX Location:** Lines 196-205
- **Condition:** Only shown if `canManageEvent(event)` returns true (line 183)
- **Action:** Calls `handleDeleteEvent` which sends DELETE to `/api/events/${eventSlug}` (line 76)
- **Code:**
  ```tsx
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
  ```

**Client-Side `canManageEvent` Function:**
- **Location:** Lines 95-110
- **Logic:**
  ```tsx
  const canManageEvent = (event: Event): boolean => {
    // Admin can manage all events
    if (userRole === "ADMIN") return true;
    // Org owner can manage all events in their org
    if (orgOwnerId === userId) return true;
    // Planner isolation: planners can only manage events they created
    if (userRole === "DIY_PLANNER" || userRole === "PRO_PLANNER") {
      return event.createdBy.id === userId;
    }
    // Other org members (non-planners) can manage events in their org
    return event.createdBy.id === userId;
  };
  ```

**User Context:**
- Receives `userId`, `userRole`, `orgOwnerId` as props from server component
- Uses client-side logic to determine visibility

**Backend Comparison:**
- **Backend `canManageEvent`** (from `rbac.ts` lines 90-104):
  - Admin → true
  - Org owner → true
  - Planner → only if `event.createdById === user.id`
  - Non-planner org member → true (if org member)
- **Client-side `canManageEvent`**:
  - Admin → true ✅
  - Org owner → true ✅
  - Planner → only if `event.createdBy.id === userId` ✅
  - Non-planner org member → only if `event.createdBy.id === userId` ❌ **MISMATCH**: Backend allows non-planner org members to manage ANY event in their org, but client-side only allows if they created it

---

### 3.2 Event Vault List (`apps/web/src/app/(app)/vault/page.tsx`)

**Edit/Delete Buttons:**
- **Status:** ❌ NOT PRESENT (same as DIY Planner)
- **UI:** Only renders event cards as links to detail page
- **Note:** This is the same component used by both DIY and Pro Planners

---

### 3.3 Event Vault Detail (`apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`)

**Edit/Delete Buttons:**
- **Status:** ❌ NOT PRESENT (same as DIY Planner)
- **UI:** Shows event details but no Edit/Delete controls
- **Permission Check:** Server-side `canManageEvent` check exists but UI doesn't use it

---

## 4. Backend Permission Rules

### 4.1 `canManageEvent` Function (`apps/web/src/lib/rbac.ts` lines 90-104)

**Definition:**
```typescript
export function canManageEvent(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  if (!user || !event) return false;
  // Admin can manage all events
  if (isAdmin(user)) return true;
  // Need org info to check ownership/membership
  const org = event.org || { ownerId: "", members: [] };
  // Org owner can manage all events in their org
  if (isOrgOwner(user, org)) return true;
  // Planner isolation: planners can only manage events they created
  if (isPlanner(user)) {
    return isEventOwnedByPlanner(user, event);
  }
  // Other org members (non-planners) can manage events in their org
  return isOrgMember(user, org);
}
```

**Rules:**
1. **ADMIN:** Can manage all events ✅
2. **Org Owner:** Can manage all events in their org ✅
3. **DIY_PLANNER / PRO_PLANNER:** Can only manage events they created (`event.createdById === user.id`) ✅
4. **Non-planner org members:** Can manage any event in their org (if they are org members) ✅

---

### 4.2 `canEditEvent` Function (`apps/web/src/lib/rbac.ts` lines 368-385)

**Definition:**
```typescript
export function canEditEvent(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  if (!user || !event) return false;
  
  // Admin can edit all events
  if (isAdmin(user)) return true;
  
  // Org owner can edit all events in their org
  const org = event.org || { ownerId: "", members: [] };
  if (isOrgOwner(user, org)) return true;
  
  // Planner isolation: planners can only edit events they created
  if (isPlanner(user)) {
    return isEventOwnedByPlanner(user, event);
  }
  
  // Vendors/Venues and others: no access by default
  return false;
}
```

**Rules:**
1. **ADMIN:** Can edit all events ✅
2. **Org Owner:** Can edit all events in their org ✅
3. **DIY_PLANNER / PRO_PLANNER:** Can only edit events they created ✅
4. **Non-planner org members:** ❌ **NO ACCESS** (different from `canManageEvent`!)

**Note:** There's a **discrepancy** between `canManageEvent` and `canEditEvent`:
- `canManageEvent` allows non-planner org members to manage events
- `canEditEvent` does NOT allow non-planner org members to edit events

---

### 4.3 `canDeleteEvent` Function (`apps/web/src/lib/rbac.ts` lines 395-398)

**Definition:**
```typescript
export function canDeleteEvent(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  // Same rules as canEditEvent
  return canEditEvent(user, event);
}
```

**Rules:** Same as `canEditEvent` (see above)

---

### 4.4 API Endpoints

**DELETE `/api/events/[eventSlug]`** (`apps/web/src/app/api/events/[eventSlug]/route.ts` lines 66-124):
- Uses `canDeleteEvent(user, event)` check (line 101)
- Follows `canEditEvent` rules (which disallows non-planner org members)

**tRPC `event.update`** (`apps/web/src/server/routers/event.ts` lines 96-134):
- Uses `canEditEvent(user, ev0)` check (line 101)
- Follows `canEditEvent` rules

**tRPC `event.setStatus`** (`apps/web/src/server/routers/event.ts` lines 135-144):
- Uses `canEditEvent(user, ev0)` check (line 140)
- Follows `canEditEvent` rules

---

## 5. Logic Conflicts & Gaps

### 5.1 Critical Gaps

1. **Event Vault Detail Page Missing Edit/Delete Buttons**
   - **Location:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
   - **Issue:** Server-side `canManageEvent` check exists (line 172) but UI never renders Edit/Delete buttons
   - **Impact:** DIY and Pro Planners cannot edit/delete events from Event Vault detail page, even though backend allows it
   - **Severity:** HIGH

2. **DIY Planner Dashboard Edit Button Has No Permission Check**
   - **Location:** `apps/web/src/components/diy-planner/Dashboard.tsx` line 264
   - **Issue:** Edit button always visible, no conditional check
   - **Impact:** Button may appear for events user cannot actually edit (though backend would reject)
   - **Severity:** MEDIUM

3. **Pro Planner Client-Side Logic Mismatch**
   - **Location:** `apps/web/src/components/pro-planner/Dashboard.tsx` lines 95-110
   - **Issue:** Client-side `canManageEvent` only checks `event.createdBy.id === userId` for non-planners, but backend `canManageEvent` allows non-planner org members to manage ANY event in their org
   - **Impact:** Non-planner org members won't see Edit/Delete buttons even though backend would allow the operation
   - **Note:** However, `canEditEvent` (used by actual API) disallows non-planner org members anyway, so this may be intentional
   - **Severity:** LOW (if intentional) or MEDIUM (if non-planner org members should be able to edit)

4. **Event Vault List Has No Edit/Delete Actions**
   - **Location:** `apps/web/src/app/(app)/vault/page.tsx`
   - **Issue:** No Edit/Delete buttons on event cards
   - **Impact:** Users must navigate to detail page (which also has no Edit/Delete buttons)
   - **Severity:** MEDIUM

### 5.2 Backend Logic Inconsistencies

1. **`canManageEvent` vs `canEditEvent` Discrepancy**
   - **Issue:** `canManageEvent` allows non-planner org members, but `canEditEvent` does not
   - **Impact:** Confusing - "manage" suggests edit capability, but edit is more restrictive
   - **Severity:** LOW (if intentional) or MEDIUM (if needs clarification)

2. **`canDeleteEvent` Uses `canEditEvent` Rules**
   - **Status:** ✅ Consistent (delete uses same rules as edit)
   - **Note:** This is correct behavior

---

## 6. Suggested Fix Directions (DO NOT APPLY)

### 6.1 High Priority

1. **Add Edit/Delete buttons to Event Vault Detail page**
   - Use server-side `canManageEvent` result (already computed) to conditionally render buttons
   - Edit button should navigate to edit form or open wizard
   - Delete button should call DELETE API endpoint with confirmation

2. **Add permission check to DIY Planner Edit button**
   - Pass `user` or `userId` to `DIYPlannerDashboard` component
   - Check `canManageEvent` (or `canEditEvent`) before showing Edit button
   - Consider using server-side check and passing result as prop

### 6.2 Medium Priority

3. **Add Edit/Delete actions to Event Vault list page**
   - Add action buttons to each event card
   - Use server-side permission check for each event
   - Consider dropdown menu for actions to save space

4. **Clarify `canManageEvent` vs `canEditEvent`**
   - Document the difference (or align them if they should be the same)
   - Update UI to use appropriate function (`canEditEvent` for edit buttons, `canManageEvent` for general management UI)

### 6.3 Low Priority

5. **Standardize client-side vs server-side permission checks**
   - Prefer server-side checks and pass results as props
   - If client-side checks are needed, ensure they match backend logic exactly
   - Consider creating a shared permission utility that can run on both client and server

6. **Add Edit/Delete to other event views**
   - Check if other pages (e.g., `/app/events/[eventSlug]`) need Edit/Delete buttons
   - Ensure consistency across all event detail views

---

## 7. Summary Matrix

| Screen | DIY Planner | Pro Planner | Backend Allows |
|--------|-------------|-------------|---------------|
| **DIY Dashboard - Edit** | ✅ Always visible (no check) | N/A | ✅ If created OR admin OR org owner |
| **DIY Dashboard - Delete** | ❌ Not present | N/A | ✅ If created OR admin OR org owner |
| **Pro Dashboard - Edit** | N/A | ✅ If `canManageEvent` (client-side) | ✅ If created OR admin OR org owner |
| **Pro Dashboard - Delete** | N/A | ✅ If `canManageEvent` (client-side) | ✅ If created OR admin OR org owner |
| **Event Vault List - Edit** | ❌ Not present | ❌ Not present | ✅ If created OR admin OR org owner |
| **Event Vault List - Delete** | ❌ Not present | ❌ Not present | ✅ If created OR admin OR org owner |
| **Event Vault Detail - Edit** | ❌ Not present | ❌ Not present | ✅ If created OR admin OR org owner (check exists but unused) |
| **Event Vault Detail - Delete** | ❌ Not present | ❌ Not present | ✅ If created OR admin OR org owner (check exists but unused) |

**Legend:**
- ✅ = Present/Allowed
- ❌ = Not Present/Not Allowed
- N/A = Not Applicable

---

## 8. Conclusion

The audit reveals that **Edit/Delete controls are inconsistently implemented** across the application:

- **Pro Planner dashboard** has the most complete implementation with conditional Edit/Delete buttons
- **DIY Planner dashboard** shows Edit button but without permission checks
- **Event Vault pages** (both list and detail) have no Edit/Delete controls despite backend permission checks existing

The backend permission system (`canManageEvent`, `canEditEvent`, `canDeleteEvent`) is well-defined and consistently enforced in API routes, but the frontend UI does not fully leverage these checks to show/hide Edit/Delete controls.

**Primary recommendation:** Add Edit/Delete buttons to Event Vault detail page using the existing server-side `canManageEvent` check, and add permission checks to DIY Planner Edit button.

