# Navigation Logic Audit Report

**Date:** 2024  
**Scope:** Role-based navigation routing, focusing on PRO_PLANNER consistency  
**Status:** READ-ONLY AUDIT (No code changes)

---

## 1. Sign-In & Landing Summary

### Sign-In Redirect Flow

**Default Behavior:**
- Sign-in page (`apps/web/src/app/(auth)/signin/page.tsx`) defaults to `/app` if no `callbackUrl` or `redirect` parameter is provided (line 18)
- After successful sign-in, users are redirected to the `callbackUrl` (default: `/app`)
- The `/app` page then performs role-based routing

### Per-Role Landing Behavior

| Role | Sign-In Default | `/app` Routing | Final Landing |
|------|----------------|----------------|---------------|
| **DIY_PLANNER** | `/app` | Redirects to `/diy-planner` | `/diy-planner` ✅ |
| **PRO_PLANNER** | `/app` | **Stays on `/app`** if org exists | `/app` ⚠️ **INCONSISTENT** |
| **PRO_PLANNER** (no org) | `/app` | Shows setup page on `/app` | `/app` (setup UI) ⚠️ |
| **VENDOR** | `/app` | Redirects to `/vendor/dashboard` | `/vendor/dashboard` ✅ |
| **VENUE** | `/app` | Redirects to `/venue/dashboard` | `/venue/dashboard` ✅ |
| **EVENT_DREAMER** | `/app` | Redirects to `/event-dreamer` | `/event-dreamer` ✅ |
| **ADMIN** | `/app` | Stays on `/app` (generic dashboard) | `/app` ✅ |
| **CLIENT** | `/app` | Stays on `/app` (generic dashboard) | `/app` ✅ |

### Critical Finding: PRO_PLANNER Routing Issue

**Location:** `apps/web/src/app/app/page.tsx` lines 58-90

**Problem:**
- DIY_PLANNER, VENDOR, VENUE, and EVENT_DREAMER all get **redirected** to their dedicated dashboards
- **PRO_PLANNER does NOT get redirected** - if they have an org, they stay on `/app` and see a generic dashboard
- This means PRO_PLANNER users land on `/app` instead of `/pro/planner` after sign-in

**Code Evidence:**
```typescript
// Line 48-50: DIY_PLANNER redirects
if (canAccessDashboard(user, "DIY_PLANNER")) {
  redirect("/diy-planner");
}

// Line 58-90: PRO_PLANNER checks for org but DOES NOT redirect
if (canAccessDashboard(user, "PRO_PLANNER")) {
  // ... checks for org ...
  if (!existingOrg) {
    return (/* setup UI */); // Stays on /app
  }
  // If org exists, falls through to render generic /app dashboard
}
```

**Impact:** PRO_PLANNER users with an org will see the generic `/app` dashboard instead of their dedicated `/pro/planner` dashboard.

---

## 2. Expected Route Pattern

### DIY_PLANNER

- **Dashboard Home:** `/diy-planner`
- **Vault List:** `/diy-planner/vault`
- **Vault Detail:** `/diy-planner/vault/[eventSlug]`
- **Role Guards:** ✅ `canAccessDashboard(user, "DIY_PLANNER")` on all routes

### PRO_PLANNER

- **Dashboard Home:** `/pro/planner` (expected, but not consistently enforced)
- **Vault List:** `/pro/planner/vault`
- **Vault Detail:** `/pro/planner/vault/[eventSlug]`
- **Role Guards:** ✅ `canAccessDashboard(user, "PRO_PLANNER")` on all routes

### VENDOR

- **Dashboard Home:** `/vendor/dashboard`
- **Vault List:** `/app/vault` (shared)
- **Vault Detail:** `/app/vault/[eventSlug]` (shared)
- **Role Guards:** ✅ `canAccessDashboard(user, "VENDOR")` on dashboard

### VENUE

- **Dashboard Home:** `/venue/dashboard`
- **Vault List:** `/app/vault` (shared)
- **Vault Detail:** `/app/vault/[eventSlug]` (shared)
- **Role Guards:** ✅ `canAccessDashboard(user, "VENUE")` on dashboard

### ADMIN

- **Dashboard Home:** `/app` (generic) or `/app/admin/overview`
- **Vault List:** `/app/vault` (shared)
- **Vault Detail:** `/app/vault/[eventSlug]` (shared)
- **Role Guards:** ✅ `canAccessDashboard(user, "ADMIN")` on admin routes

### EVENT_DREAMER

- **Dashboard Home:** `/event-dreamer`
- **Vault List:** N/A (no vault for event dreamers)
- **Role Guards:** ✅ `canAccessDashboard(user, "EVENT_DREAMER")` on dashboard

### CLIENT

- **Dashboard Home:** `/app` (generic)
- **Vault List:** `/app/vault` (shared)
- **Vault Detail:** `/app/vault/[eventSlug]` (shared)
- **Role Guards:** None (uses generic `/app` routes)

---

## 3. Pro Planner Navigation Audit (Main Section)

### Pro Planner Links Found

| Label / Context | File | Line | Target Route | Assessment |
|----------------|------|------|--------------|------------|
| **Sidebar - Dashboard** | `apps/web/src/components/layout/Sidebar.tsx` | 19 | `/app` | ⚠️ **WRONG** - Should be `/pro/planner` |
| **Sidebar - Event Vault** | `apps/web/src/components/layout/Sidebar.tsx` | 20 | `/pro/planner/vault` | ✅ OK |
| **Pro Dashboard - Event Name Link** | `apps/web/src/components/pro-planner/Dashboard.tsx` | 161 | `/pro/planner/vault/${event.slug}` | ✅ OK |
| **Pro Dashboard - Edit Button** | `apps/web/src/components/pro-planner/Dashboard.tsx` | 190 | `/pro/planner/vault/${event.slug}` | ✅ OK |
| **Proposals Page - Event Link** | `apps/web/src/app/(app)/proposals/[id]/page.tsx` | 59 | `/app/vault/${event.slug}` | ⚠️ **WRONG** - Should be role-aware |
| **Vault Detail - Back Link** | `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` | 252 | Role-aware (`/pro/planner/vault` for PRO) | ✅ OK |
| **Vault List - Event Links** | `apps/web/src/app/(app)/vault/page.tsx` | 115 | Role-aware (`/pro/planner/vault/${slug}` for PRO) | ✅ OK |
| **QuickLinks - Dashboard** | `apps/web/src/components/layout/QuickLinks.tsx` | 10 | `/app` | ⚠️ **WRONG** - Generic, not role-aware |
| **app/page.tsx - View all Events** | `apps/web/src/app/app/page.tsx` | 186 | `/app/vault` | ⚠️ **WRONG** - Should be `/pro/planner/vault` for PRO |
| **app/page.tsx - View Event** | `apps/web/src/app/app/page.tsx` | 202 | `/app/events/${event.slug}` | ⚠️ **WRONG** - Should link to vault detail |

### Pro Planner Issues

#### Issue 1: Sidebar Dashboard Link Points to `/app` Instead of `/pro/planner`

**Location:** `apps/web/src/components/layout/Sidebar.tsx` line 19

**Current Code:**
```typescript
case "PRO_PLANNER":
  return [
    { href: "/app", label: "Dashboard" },  // ⚠️ WRONG
    { href: "/pro/planner/vault", label: "Event Vault" },
  ];
```

**Problem:** PRO_PLANNER sidebar "Dashboard" link goes to `/app` (generic dashboard) instead of `/pro/planner` (Pro Planner dashboard).

**Impact:** Pro Planner users clicking "Dashboard" in sidebar will see generic `/app` dashboard instead of their dedicated Pro Planner dashboard.

---

#### Issue 2: `/app` Page Does Not Redirect PRO_PLANNER to `/pro/planner`

**Location:** `apps/web/src/app/app/page.tsx` lines 58-90

**Problem:** When PRO_PLANNER visits `/app`:
- If they have an org → **stays on `/app`** and renders generic dashboard
- If they don't have an org → shows setup UI on `/app`

**Expected:** Should redirect to `/pro/planner` (like DIY_PLANNER redirects to `/diy-planner`).

**Impact:** 
- PRO_PLANNER users land on `/app` after sign-in instead of `/pro/planner`
- Inconsistent with DIY_PLANNER behavior
- Users may see generic dashboard instead of Pro Planner dashboard

---

#### Issue 3: Generic Dashboard Links to `/app/vault` Instead of Role-Specific Vault

**Location:** `apps/web/src/app/app/page.tsx` line 186

**Current Code:**
```typescript
<Link href="/app/vault">View all</Link>
```

**Problem:** This link appears on the generic `/app` dashboard, which PRO_PLANNER users may see. It should be role-aware and link to `/pro/planner/vault` for PRO_PLANNER.

**Impact:** PRO_PLANNER users clicking "View all" events will go to `/app/vault` instead of `/pro/planner/vault`.

---

#### Issue 4: Generic Dashboard Links to `/app/events/${slug}` Instead of Vault Detail

**Location:** `apps/web/src/app/app/page.tsx` line 202

**Current Code:**
```typescript
<Link href={`/app/events/${event.slug}` as any}>View</Link>
```

**Problem:** This links to `/app/events/${slug}` which may not exist or may be a different route than the vault detail page. Should link to role-specific vault detail.

**Impact:** PRO_PLANNER users clicking "View" on an event may go to wrong route or broken link.

---

#### Issue 5: Proposals Page Links to Generic `/app/vault` Instead of Role-Specific Vault

**Location:** `apps/web/src/app/(app)/proposals/[id]/page.tsx` line 59

**Current Code:**
```typescript
<Link href={`/app/vault/${proposal.event.slug}` as any}>
```

**Problem:** This is a hardcoded link to `/app/vault/...` instead of being role-aware. For PRO_PLANNER, it should link to `/pro/planner/vault/...`.

**Impact:** PRO_PLANNER users viewing a proposal and clicking the event link will go to `/app/vault/...` instead of `/pro/planner/vault/...`.

---

#### Issue 6: QuickLinks Component Uses Generic `/app` Link

**Location:** `apps/web/src/components/layout/QuickLinks.tsx` line 10

**Current Code:**
```typescript
<Link className="text-indigo-600 hover:underline" href="/app">
  Dashboard
</Link>
```

**Problem:** This component is used in the generic `/app` dashboard and always links to `/app`, regardless of user role.

**Impact:** PRO_PLANNER users seeing QuickLinks will have a link that keeps them on `/app` instead of going to `/pro/planner`.

---

## 4. DIY / Vendor / Venue / Admin Navigation Issues

### DIY_PLANNER

**Status:** ✅ **Mostly Correct**

- Dashboard link: `/diy-planner` ✅
- Vault link: `/diy-planner/vault` ✅
- Sidebar correctly uses role-specific routes ✅

**No issues found** - DIY navigation is consistent.

---

### VENDOR

**Status:** ✅ **Correct**

- Dashboard: `/vendor/dashboard` ✅
- Vault: `/app/vault` (shared, appropriate) ✅
- Sidebar correctly uses `/app/vault` ✅

**No issues found** - Vendor navigation is consistent.

---

### VENUE

**Status:** ✅ **Correct**

- Dashboard: `/venue/dashboard` ✅
- Vault: `/app/vault` (shared, appropriate) ✅
- Sidebar correctly uses `/app/vault` ✅

**No issues found** - Venue navigation is consistent.

---

### ADMIN

**Status:** ✅ **Correct**

- Dashboard: `/app` or `/app/admin/overview` ✅
- Vault: `/app/vault` (shared, appropriate) ✅
- Sidebar correctly uses `/app/admin/overview` ✅

**No issues found** - Admin navigation is consistent.

---

### EVENT_DREAMER

**Status:** ✅ **Correct**

- Dashboard: `/event-dreamer` ✅
- Redirects correctly from `/app` ✅

**No issues found** - Event Dreamer navigation is consistent.

---

## 5. Summary

### Most Critical Issues

1. **PRO_PLANNER Not Redirected from `/app` to `/pro/planner`**
   - **Location:** `apps/web/src/app/app/page.tsx` lines 58-90
   - **Impact:** PRO_PLANNER users land on generic `/app` dashboard instead of `/pro/planner` after sign-in
   - **Severity:** HIGH - This is the main inconsistency causing user confusion

2. **Sidebar Dashboard Link Points to `/app` for PRO_PLANNER**
   - **Location:** `apps/web/src/components/layout/Sidebar.tsx` line 19
   - **Impact:** PRO_PLANNER users clicking "Dashboard" in sidebar go to wrong page
   - **Severity:** HIGH - Direct navigation inconsistency

3. **Generic Dashboard Links Not Role-Aware**
   - **Locations:** 
     - `apps/web/src/app/app/page.tsx` line 186 (`/app/vault` link)
     - `apps/web/src/app/app/page.tsx` line 202 (`/app/events/${slug}` link)
   - **Impact:** PRO_PLANNER users on `/app` see links that take them to wrong routes
   - **Severity:** MEDIUM - Only affects users who end up on `/app` (which shouldn't happen, but Issue #1 causes it)

4. **Proposals Page Uses Generic Vault Link**
   - **Location:** `apps/web/src/app/(app)/proposals/[id]/page.tsx` line 59
   - **Impact:** PRO_PLANNER users clicking event link from proposal go to `/app/vault/...` instead of `/pro/planner/vault/...`
   - **Severity:** MEDIUM - Affects navigation from proposal detail page

5. **QuickLinks Component Not Role-Aware**
   - **Location:** `apps/web/src/components/layout/QuickLinks.tsx` line 10
   - **Impact:** PRO_PLANNER users see generic dashboard link
   - **Severity:** LOW - Only visible on `/app` page (which PRO_PLANNER shouldn't see if Issue #1 is fixed)

### Root Cause Analysis

The primary issue is that **PRO_PLANNER is treated differently from DIY_PLANNER in the `/app` routing logic**:

- DIY_PLANNER: Always redirected to `/diy-planner` ✅
- PRO_PLANNER: Stays on `/app` if org exists ❌

This inconsistency causes a cascade of navigation issues:
1. PRO_PLANNER users land on `/app` instead of `/pro/planner`
2. Sidebar "Dashboard" link points to `/app` (which they're already on)
3. Generic dashboard links on `/app` are not role-aware
4. Users get confused about where their "home" dashboard is

### Suggested Corrections (Plain English)

1. **Fix `/app` routing for PRO_PLANNER:** Add a redirect to `/pro/planner` when PRO_PLANNER has an org (mirror the DIY_PLANNER pattern).

2. **Fix Sidebar Dashboard link:** Change PRO_PLANNER sidebar "Dashboard" link from `/app` to `/pro/planner`.

3. **Make generic dashboard links role-aware:** Update links in `app/page.tsx` to use role-specific vault routes (similar to how vault pages already do this).

4. **Fix Proposals page link:** Make the event link in proposals page role-aware (check user role and use appropriate vault route).

5. **Make QuickLinks role-aware:** Update QuickLinks component to link to role-specific dashboards (or remove if not needed).

### Consistency Pattern

**Desired Pattern:**
- After sign-in → `/app` → role-based redirect → dedicated dashboard
- Sidebar "Dashboard" → role-specific dashboard (`/diy-planner` or `/pro/planner`)
- Sidebar "Event Vault" → role-specific vault (`/diy-planner/vault` or `/pro/planner/vault`)
- All event links → role-specific vault detail routes
- Shared resources (proposals, contracts, event detail pages) → stay under `/app/...` (OK)

**Current State:**
- DIY_PLANNER: ✅ Follows pattern
- PRO_PLANNER: ❌ Does not follow pattern (stays on `/app`, sidebar links to `/app`)
- Other roles: ✅ Follow pattern

---

## 6. Additional Observations

### Positive Findings

1. **Vault pages are role-aware:** The vault list and detail pages correctly detect user role and generate appropriate links (lines 31-32 in `vault/page.tsx` and 41-42 in `vault/[eventSlug]/page.tsx`).

2. **Role guards are consistent:** All role-specific routes use `canAccessDashboard` properly.

3. **Pro Planner Dashboard links are correct:** Event links within the Pro Planner dashboard correctly use `/pro/planner/vault/...`.

4. **DIY navigation is consistent:** DIY_PLANNER follows the expected pattern throughout.

### Edge Cases

1. **PRO_PLANNER without org:** Currently shows setup UI on `/app`. This is acceptable, but after setup, they should be redirected to `/pro/planner`.

2. **Admin users:** Can access all dashboards. This is intentional and correct.

3. **Shared routes:** Routes like `/app/events/...`, `/app/proposals/...`, `/app/contracts/...` are intentionally shared and should remain so.

---

## Conclusion

The main navigation inconsistency is that **PRO_PLANNER users are not consistently routed to `/pro/planner`** as their home dashboard. This causes:

1. Users landing on `/app` instead of `/pro/planner` after sign-in
2. Sidebar navigation pointing to wrong routes
3. Generic dashboard links not being role-aware

**Fix Priority:**
1. **HIGH:** Redirect PRO_PLANNER from `/app` to `/pro/planner` (mirror DIY_PLANNER behavior)
2. **HIGH:** Fix Sidebar Dashboard link for PRO_PLANNER
3. **MEDIUM:** Make generic dashboard links role-aware
4. **MEDIUM:** Fix Proposals page event link
5. **LOW:** Make QuickLinks role-aware

All other roles (DIY, Vendor, Venue, Admin, Event Dreamer) have consistent navigation patterns.

