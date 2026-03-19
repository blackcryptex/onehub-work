# Vision Alignment Audit Report
**Date:** 2025-01-27  
**Type:** READ-ONLY Analysis  
**Scope:** Role Separation, Vault Separation, Navigation Consistency, Event Edit/Delete UX

---

## 1. Executive Vision Scorecard

| Requirement | Status | Notes |
|------------|--------|-------|
| **Role Isolation** | ⚠️ **PARTIAL** | Planners correctly redirected, but `/app` page still accessible to wrong roles with hardcoded legacy links |
| **DIY Vault Separation** | ✅ **PASS** | `/diy-planner/vault/*` routes exist and are role-guarded |
| **Pro Vault Separation** | ✅ **PASS** | `/pro/planner/vault/*` routes exist and are role-guarded |
| **Navigation Consistency** | ⚠️ **PARTIAL** | Sidebar correct, but vault detail pages and `/app` page have hardcoded `/app/*` links |
| **Edit/Delete UX Alignment** | ⚠️ **PARTIAL** | Pro Planner has Edit/Delete, DIY Planner has Edit only, vault detail pages lack visible Edit/Delete controls |

---

## 2. Role-by-Role UX Map

### DIY_PLANNER

**Expected Landing:** `/diy-planner`  
**Actual Landing:** ✅ `/diy-planner` (via `/app` redirect)

**Primary Navigation:**
- ✅ Sidebar: `/diy-planner` (Dashboard), `/diy-planner/vault` (Event Vault)
- ✅ Dashboard: Uses client-side routing with event list
- ⚠️ Vault Detail: Uses shared component that generates hardcoded `/app/events/*` links

**Event Flow:**
- List → Detail: ✅ `/diy-planner/vault/[eventSlug]`
- Detail → Proposals: ❌ Links to `/app/proposals/[id]` (should be role-aware)
- Detail → Contracts: ❌ Links to `/app/contracts/[id]` (should be role-aware)
- Detail → Budget/Guests/Checklists: ❌ Links to `/app/events/[slug]/*` (should be role-aware)

**Edit/Delete Controls:**
- Dashboard: ✅ Edit button exists (line 268 in Dashboard.tsx)
- Dashboard: ❌ Delete button missing
- Vault Detail: ❌ Edit/Delete buttons not visible in shared component

---

### PRO_PLANNER

**Expected Landing:** `/pro/planner`  
**Actual Landing:** ✅ `/pro/planner` (via `/app` redirect)

**Primary Navigation:**
- ✅ Sidebar: `/pro/planner` (Dashboard), `/pro/planner/vault` (Event Vault)
- ✅ Dashboard: Shows event list with Edit/Delete buttons
- ⚠️ Vault Detail: Uses shared component that generates hardcoded `/app/events/*` links

**Event Flow:**
- List → Detail: ✅ `/pro/planner/vault/[eventSlug]`
- Detail → Proposals: ❌ Links to `/app/proposals/[id]` (should be role-aware)
- Detail → Contracts: ❌ Links to `/app/contracts/[id]` (should be role-aware)
- Detail → Budget/Guests/Checklists: ❌ Links to `/app/events/[slug]/*` (should be role-aware)

**Edit/Delete Controls:**
- Dashboard: ✅ Edit button exists (line 185-195 in Dashboard.tsx)
- Dashboard: ✅ Delete button exists with permission check (line 196-205)
- Vault Detail: ❌ Edit/Delete buttons not visible in shared component

---

### VENDOR

**Expected Landing:** `/vendor/dashboard`  
**Actual Landing:** ✅ `/vendor/dashboard` (via `/app` redirect)

**Primary Navigation:**
- ✅ Sidebar: `/app` (Dashboard), `/app/vault` (Event Vault), `/app/marketplace/manage` (Listings)
- ⚠️ Uses legacy `/app/vault` route (acceptable per vision, but not ideal)

**Event Flow:**
- List → Detail: Uses `/app/vault/[eventSlug]`
- Detail → Proposals: ✅ Links to `/app/proposals/[id]` (correct for vendor context)
- Detail → Contracts: ✅ Links to `/app/contracts/[id]` (correct for vendor context)

**Edit/Delete Controls:**
- N/A (Vendors don't manage events, only proposals/contracts)

---

### VENUE

**Expected Landing:** `/venue/dashboard`  
**Actual Landing:** ✅ `/venue/dashboard` (via `/app` redirect)

**Primary Navigation:**
- ✅ Sidebar: `/app` (Dashboard), `/app/vault` (Event Vault), `/app/marketplace/manage` (Availability)
- ⚠️ Uses legacy `/app/vault` route (acceptable per vision, but not ideal)

**Event Flow:**
- Same as VENDOR

**Edit/Delete Controls:**
- N/A (Venues don't manage events, only proposals/contracts)

---

### ADMIN

**Expected Landing:** `/app` (generic dashboard)  
**Actual Landing:** ✅ `/app` (no redirect)

**Primary Navigation:**
- ✅ Sidebar: `/app` (Dashboard), `/app/admin/overview` (Admin)
- ⚠️ Can access all routes (by design)

**Event Flow:**
- Can access all vault routes (DIY, Pro, legacy `/app/vault`)

**Edit/Delete Controls:**
- ✅ Can manage all events (backend permission check works)

---

## 3. Link Inventory Table

### Critical Navigation Violations

| File | Component/Page | Link Text | Current Route | Expected Route | Status |
|------|----------------|-----------|---------------|-----------------|--------|
| `apps/web/src/app/app/page.tsx:159` | Recent Events "View all" | "View all" | `/app/vault` | Role-aware (DIY→`/diy-planner/vault`, Pro→`/pro/planner/vault`) | ❌ **INCORRECT** |
| `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:493` | Quick Actions | "Manage Guest List" | `/app/events/[slug]/guests` | Role-aware vault route | ❌ **INCORRECT** |
| `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:496` | Quick Actions | "View Budget" | `/app/events/[slug]/budget` | Role-aware vault route | ❌ **INCORRECT** |
| `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:499` | Quick Actions | "Checklists" | `/app/events/[slug]/checklists` | Role-aware vault route | ❌ **INCORRECT** |
| `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:551` | Proposals list | Proposal title link | `/app/proposals/[id]` | ✅ **CORRECT** (shared route) |
| `apps/web/src/app/(app)/proposals/[id]/page.tsx:55-61` | Event link | Event name | Role-aware vault route | ✅ **CORRECT** (already role-aware) |
| `apps/web/src/components/layout/LandingHeader.tsx:81` | More menu | "Event Vault" | `/app/vault` | ⚠️ **AMBIGUOUS** (public header, should be role-aware) |
| `apps/web/src/components/layout/Footer.tsx:13` | Footer link | "Event Vault" | `/app/vault` | ⚠️ **AMBIGUOUS** (public footer, should be role-aware) |

### Sidebar Navigation (Correct)

| Role | Route | Status |
|------|-------|--------|
| DIY_PLANNER | `/diy-planner`, `/diy-planner/vault` | ✅ **CORRECT** |
| PRO_PLANNER | `/pro/planner`, `/pro/planner/vault` | ✅ **CORRECT** |
| VENDOR | `/app`, `/app/vault`, `/app/marketplace/manage` | ✅ **CORRECT** (legacy route acceptable) |
| VENUE | `/app`, `/app/vault`, `/app/marketplace/manage` | ✅ **CORRECT** (legacy route acceptable) |
| ADMIN | `/app`, `/app/admin/overview` | ✅ **CORRECT** |

---

## 4. Redundancies and Risk Areas

### A) Shared Vault Components

**Issue:** DIY and Pro vault routes use the same underlying component (`EventVaultPage`, `EventVaultDetailPage`) which contains hardcoded `/app/*` links.

**Location:**
- `apps/web/src/app/(app)/vault/page.tsx` (shared)
- `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` (shared)
- Wrapped by role-specific pages:
  - `apps/web/src/app/diy-planner/vault/page.tsx`
  - `apps/web/src/app/pro/planner/vault/page.tsx`
  - `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx`
  - `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx`

**Risk:** Any new links added to the shared component will default to `/app/*` routes, breaking role isolation.

**Recommendation:** Extract vault base path logic into a helper function and use it consistently throughout the shared component.

---

### B) Legacy `/app/vault` Route Still Active

**Issue:** The legacy route `/app/vault` is still accessible and used by VENDOR/VENUE roles.

**Location:**
- `apps/web/src/app/(app)/vault/page.tsx`
- `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`

**Risk:** If a planner accidentally navigates to `/app/vault` (e.g., via bookmark or direct URL), they'll see events but may be confused by the route structure.

**Recommendation:** Add a redirect in the legacy vault pages that checks user role and redirects planners to their role-specific vault.

---

### C) Inconsistent Edit/Delete UI

**Issue:** 
- Pro Planner Dashboard has both Edit and Delete buttons
- DIY Planner Dashboard has only Edit button
- Vault detail pages have no visible Edit/Delete controls

**Location:**
- `apps/web/src/components/pro-planner/Dashboard.tsx` (has Edit/Delete)
- `apps/web/src/components/diy-planner/Dashboard.tsx` (has Edit only)
- `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` (no Edit/Delete visible)

**Risk:** Users may not know they can delete events, or may try to delete from the wrong location.

**Recommendation:** Add consistent Edit/Delete controls to vault detail pages, gated by `canEditEvent`/`canDeleteEvent` permissions.

---

### D) Hardcoded Quick Action Links

**Issue:** Vault detail page has hardcoded links to `/app/events/[slug]/*` for guest list, budget, and checklists.

**Location:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:493-499`

**Risk:** These links will route planners out of their role-specific vault context.

**Recommendation:** Make these links role-aware, similar to how the proposal page determines vault route (lines 55-61 of `proposals/[id]/page.tsx`).

---

### E) Role Guard Inconsistencies

**Issue:** Some pages use `canAccessDashboard`, others rely on org presence or implicit role checks.

**Location:**
- ✅ `apps/web/src/app/diy-planner/page.tsx` - Uses `canAccessDashboard`
- ✅ `apps/web/src/app/pro/planner/page.tsx` - Uses `canAccessDashboard`
- ✅ `apps/web/src/app/vendor/dashboard/page.tsx` - Uses `canAccessDashboard`
- ✅ `apps/web/src/app/venue/dashboard/page.tsx` - Uses `canAccessDashboard`
- ⚠️ `apps/web/src/app/app/page.tsx` - Uses `canAccessDashboard` but then renders content for any role

**Risk:** The `/app` page is accessible to all authenticated users, even though it redirects planners. If redirect logic fails, planners could see the generic dashboard.

**Recommendation:** Add explicit role guard to `/app` page that redirects planners before rendering any content.

---

## 5. Priority Fix Suggestions (NO CODE)

### Priority 1: Critical Navigation Fixes

1. **Make Vault Detail Quick Actions Role-Aware**
   - **File:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
   - **Lines:** 493-499
   - **Fix:** Use the same vault base path logic as proposal page (lines 55-61) to generate role-aware links for guest list, budget, and checklists.
   - **Impact:** Prevents planners from being routed to wrong role area.

2. **Fix `/app` Page "View all" Link**
   - **File:** `apps/web/src/app/app/page.tsx`
   - **Line:** 159
   - **Fix:** Determine user role and generate appropriate vault link (DIY→`/diy-planner/vault`, Pro→`/pro/planner/vault`, others→`/app/vault`).
   - **Impact:** Prevents planners from clicking into legacy vault route.

3. **Add Edit/Delete Controls to Vault Detail Pages**
   - **File:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
   - **Fix:** Add Edit and Delete buttons in the event header section, gated by `canEditEvent` and `canDeleteEvent` checks.
   - **Impact:** Provides consistent UX for event management across all vault routes.

---

### Priority 2: Consistency Improvements

4. **Extract Vault Base Path Helper**
   - **File:** Create new helper or add to existing RBAC helper
   - **Fix:** Create `getVaultBasePath(user: AppUser): string` function that returns the correct vault base path based on role.
   - **Usage:** Replace all hardcoded vault path logic with this helper.
   - **Impact:** Reduces risk of future hardcoded links breaking role isolation.

5. **Add Delete Button to DIY Dashboard**
   - **File:** `apps/web/src/components/diy-planner/Dashboard.tsx`
   - **Fix:** Add Delete button similar to Pro Planner Dashboard, with permission check.
   - **Impact:** Provides consistent event management UX.

6. **Redirect Legacy Vault Routes for Planners**
   - **File:** `apps/web/src/app/(app)/vault/page.tsx` and `[eventSlug]/page.tsx`
   - **Fix:** Add role check at the top of these pages. If user is DIY_PLANNER or PRO_PLANNER, redirect to their role-specific vault route.
   - **Impact:** Prevents planners from accidentally using legacy routes.

---

### Priority 3: Future-Proofing

7. **Make Landing Header and Footer Links Role-Aware**
   - **Files:** `apps/web/src/components/layout/LandingHeader.tsx`, `Footer.tsx`
   - **Fix:** Check if user is authenticated and has a role, then generate appropriate vault link. If not authenticated, link to signin.
   - **Impact:** Prevents public users or wrong-role users from clicking into incorrect vault routes.

8. **Add Role Guard to `/app` Page**
   - **File:** `apps/web/src/app/app/page.tsx`
   - **Fix:** Add explicit role check before rendering any content. Redirect planners immediately.
   - **Impact:** Prevents any possibility of planners seeing generic dashboard content.

9. **Document Shared Route Strategy**
   - **Fix:** Create documentation explaining which routes are intentionally shared (`/app/proposals/*`, `/app/contracts/*`) and which must be role-specific (vault routes).
   - **Impact:** Prevents future developers from accidentally breaking role isolation.

---

## 6. Backend Permission Alignment

### ✅ Well-Implemented

- `canEditEvent` - Correctly enforces planner isolation (only events they created)
- `canDeleteEvent` - Uses same logic as `canEditEvent`
- `canManageEvent` - Handles admin, org owner, and planner isolation correctly
- `canViewEvent` - Enforces planner isolation
- `isEventOwnedByPlanner` - Core isolation check works correctly

### ⚠️ Potential Issues

- **Vault Detail Page Permission Check:** The shared vault detail component (`EventVaultDetailPage`) doesn't explicitly check `canViewEvent` before rendering. It relies on the wrapper pages to enforce role access, but doesn't verify event ownership for planners.
  - **Location:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:20-35`
  - **Recommendation:** Add explicit `canViewEvent` check and return 403/notFound if user cannot view the event.

---

## 7. Summary of Findings

### ✅ What's Working Well

1. **Role-based redirects on sign-in** - All planners correctly redirected to their dashboards
2. **Sidebar navigation** - Role-aware links work correctly
3. **Backend permissions** - RBAC functions correctly enforce planner isolation
4. **Pro Planner Dashboard** - Has complete Edit/Delete UI with permission checks
5. **Proposal page event links** - Correctly determines role-aware vault route

### ⚠️ What Needs Attention

1. **Vault detail page links** - Hardcoded `/app/events/*` routes break role isolation
2. **Edit/Delete UI inconsistency** - DIY dashboard missing Delete, vault detail pages missing both
3. **Legacy route access** - Planners can still access `/app/vault` if they navigate directly
4. **Shared component risk** - Any new links in shared vault components will default to `/app/*`

### ❌ Critical Issues

1. **Navigation drift** - Clicking "View Budget" or "Manage Guest List" from a planner vault detail page routes user to `/app/events/*`, breaking role context
2. **Missing permission check** - Vault detail page doesn't verify `canViewEvent` before rendering
3. **Inconsistent UX** - Pro Planner has Delete button, DIY Planner doesn't, creating confusion

---

## 8. Testing Recommendations

1. **Manual Testing:**
   - Sign in as DIY_PLANNER, navigate to vault detail, click "View Budget" → verify it stays in DIY context
   - Sign in as PRO_PLANNER, navigate to vault detail, click "Manage Guest List" → verify it stays in Pro context
   - Sign in as DIY_PLANNER, manually navigate to `/app/vault` → verify redirect to `/diy-planner/vault`
   - Sign in as PRO_PLANNER, manually navigate to `/app/vault` → verify redirect to `/pro/planner/vault`

2. **Permission Testing:**
   - Create event as DIY_PLANNER, try to access via `/pro/planner/vault/[slug]` → should be blocked
   - Create event as PRO_PLANNER, try to access via `/diy-planner/vault/[slug]` → should be blocked
   - Verify Edit/Delete buttons only show when `canEditEvent`/`canDeleteEvent` return true

3. **Link Audit:**
   - Search codebase for all instances of `/app/vault`, `/app/events`, `/app/proposals`, `/app/contracts`
   - Verify each is either:
     - Intentionally shared (proposals/contracts)
     - Role-aware (determines route based on user role)
     - Legacy route for vendors/venues only

---

**End of Audit Report**

