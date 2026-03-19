# Sign-In and Role-Based Access Logic - Audit Report

**Date:** Generated via code audit  
**Status:** READ-ONLY Analysis (No Code Changes Made)

---

## 1. Overview

### Summary

- **Role Storage**: Roles are stored in the database `User.role` field (Prisma enum: `DIY_PLANNER`, `PRO_PLANNER`, `VENDOR`, `VENUE`, `CLIENT`, `EVENT_DREAMER`, `ADMIN`). Roles are included in NextAuth JWT tokens and session objects via `session.user.role`.

- **Sign-In Redirect Logic**: The NextAuth `redirect` callback defaults to `/app` for all users. The `/app` page (`apps/web/src/app/app/page.tsx`) then performs role-based routing, redirecting users to their specific dashboards based on their role. The sign-in page itself defaults to `/app` as the callback URL.

- **Role-Based Routing**: Role-based routing happens **after** sign-in, in the `/app` page component, not in NextAuth callbacks or middleware. This creates a two-step redirect flow: sign-in → `/app` → role-specific dashboard.

- **Dashboard Access Rules**: Most dashboards check for authentication but **do not explicitly verify the user's role matches the dashboard**. Pro Planner dashboard uses `isPlanner(user)` which includes both DIY and PRO planners, potentially allowing DIY planners to access Pro Planner features.

- **Key Issues**: 
  - No explicit role checks in DIY Planner dashboard page
  - Pro Planner dashboard uses `isPlanner()` which includes DIY planners
  - Vendor/Venue dashboards don't check for specific roles
  - Admin dashboard correctly checks for ADMIN role
  - `/app` page serves as a generic dashboard for PRO_PLANNER and ADMIN roles if they don't get redirected

---

## 2. Role → Landing Page Mapping

### Role Enum Values

From `apps/web/prisma/schema.prisma`:
- `DIY_PLANNER`
- `PRO_PLANNER`
- `VENDOR`
- `VENUE`
- `CLIENT`
- `EVENT_DREAMER`
- `ADMIN`

### Intended Landing Pages After Sign-In

| Role | Intended Landing Page | Actual Behavior | Notes |
|------|----------------------|-----------------|-------|
| **DIY_PLANNER** | `/diy-planner` | ✅ Redirects to `/diy-planner` | Handled in `/app` page (line 48-49) |
| **PRO_PLANNER** | `/pro/planner` | ⚠️ Conditional | If org exists → `/pro/planner`, else stays on `/app` with setup prompt (lines 58-90) |
| **VENDOR** | `/vendor/dashboard` | ✅ Redirects to `/vendor/dashboard` | If org exists, else `/providers/onboarding?providerType=vendor` (lines 26-43) |
| **VENUE** | `/venue/dashboard` | ✅ Redirects to `/venue/dashboard` | If org exists, else `/providers/onboarding?providerType=venue` (lines 26-43) |
| **EVENT_DREAMER** | `/event-dreamer` | ✅ Redirects to `/event-dreamer` | Handled in `/app` page (line 54-55) |
| **ADMIN** | `/app` or `/app/admin/overview` | ⚠️ Stays on `/app` | No explicit redirect; can access admin pages via sidebar |
| **CLIENT** | `/app` | ⚠️ Stays on `/app` | No specific handling; falls through to generic dashboard |

### Sign-In Flow

1. **User signs in** → NextAuth processes credentials
2. **NextAuth redirect callback** (`apps/web/src/lib/auth.ts` lines 175-191):
   - Defaults to `/app` for all users (line 190)
   - No role-based logic in the redirect callback itself
3. **Sign-in page** (`apps/web/src/app/(auth)/signin/page.tsx`):
   - Default `callbackUrl` is `/app` (line 18)
   - Supports `callbackUrl` query param for custom redirects
   - After successful sign-in, redirects to `callbackUrl` or `/app`
4. **`/app` page** (`apps/web/src/app/app/page.tsx`):
   - Checks user role and redirects accordingly
   - **Order matters**: VENDOR/VENUE checked first, then DIY_PLANNER, EVENT_DREAMER, then PRO_PLANNER

---

## 3. Dashboard Access Rules

### DIY Planner Dashboard

**Page:** `apps/web/src/app/diy-planner/page.tsx`  
**Component:** `apps/web/src/components/diy-planner/Dashboard.tsx`

**Access Rules:**
- ✅ Checks for authentication: None (client component, relies on parent)
- ❌ **NO explicit role check** - Any authenticated user can access
- **Behavior if wrong role:** Dashboard renders normally, no blocking

**Issue:** DIY Planner dashboard has no role guard. A VENDOR, VENUE, or PRO_PLANNER user could directly navigate to `/diy-planner` and see the DIY planner interface.

---

### Pro Planner Dashboard

**Page:** `apps/web/src/app/pro/planner/page.tsx`  
**Component:** `apps/web/src/components/pro-planner/Dashboard.tsx`

**Access Rules:**
- ✅ Checks for authentication: Redirects to `/signin` if no user (line 10-12)
- ⚠️ **Role check:** Uses `isPlanner(user)` which returns `true` for **both** `DIY_PLANNER` and `PRO_PLANNER` (line 15)
- **Behavior if wrong role:** 
  - If user is DIY_PLANNER → Can access Pro Planner dashboard (because `isPlanner()` includes DIY)
  - If user is VENDOR/VENUE/CLIENT → Can access if they have a planner org (unlikely but possible)

**Issue:** The Pro Planner dashboard uses `isPlanner(user)` which is too broad. It should check specifically for `PRO_PLANNER` role. This allows DIY planners to access Pro Planner features.

**Code Reference:**
```typescript
// Line 15 in apps/web/src/app/pro/planner/page.tsx
const planner = isPlanner(user); // This includes DIY_PLANNER!

// isPlanner() definition in apps/web/src/lib/rbac.ts (lines 295-298)
export function isPlanner(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === "DIY_PLANNER" || user.role === "PRO_PLANNER";
}
```

---

### Vendor Dashboard

**Page:** `apps/web/src/app/vendor/dashboard/page.tsx`  
**Component:** `apps/web/src/components/vendor/Dashboard.tsx`

**Access Rules:**
- ✅ Checks for authentication: Redirects to `/signin` if no user (line 9-11)
- ❌ **NO explicit role check** - Any authenticated user can access
- **Behavior if wrong role:** Dashboard renders normally if user has a VENDOR org

**Issue:** Vendor dashboard doesn't check if the user's role is `VENDOR`. A PRO_PLANNER or DIY_PLANNER user could access the vendor dashboard if they somehow have a vendor organization.

---

### Venue Dashboard

**Page:** `apps/web/src/app/venue/dashboard/page.tsx`  
**Component:** `apps/web/src/components/venue/Dashboard.tsx`

**Access Rules:**
- ✅ Checks for authentication: Redirects to `/signin` if no user (line 8-10)
- ❌ **NO explicit role check** - Any authenticated user can access
- **Behavior if wrong role:** Dashboard renders normally if user has a VENUE org

**Issue:** Venue dashboard doesn't check if the user's role is `VENUE`. Similar to vendor dashboard, any user with a venue org can access it.

---

### Admin Dashboard

**Page:** `apps/web/src/app/(app)/admin/overview/page.tsx`

**Access Rules:**
- ✅ Checks for authentication: Uses `getCurrentUser()` (line 8)
- ✅ **Explicit role check:** Uses `canAccessDashboard(user, "ADMIN")` (line 10)
- **Behavior if wrong role:** Redirects to `/app` (line 11)

**Status:** ✅ **Correctly implemented** - Only admins can access admin dashboard.

---

### Generic `/app` Dashboard

**Page:** `apps/web/src/app/app/page.tsx`

**Access Rules:**
- ✅ Checks for authentication: Redirects to `/signin` if no user (line 14-16)
- ⚠️ **Role-based redirects:** Redirects most roles to their dashboards, but:
  - PRO_PLANNER without org → Shows setup prompt (stays on `/app`)
  - ADMIN → Stays on `/app` (no redirect)
  - CLIENT → Stays on `/app` (no redirect)
  - Any other role → Falls through to generic dashboard

**Behavior:** Serves as a fallback dashboard for PRO_PLANNER (without org), ADMIN, and CLIENT roles.

---

## 4. Inconsistencies / Potential Bugs

### Issue 1: DIY Planner Dashboard Has No Role Guard

**File:** `apps/web/src/app/diy-planner/page.tsx`

**Problem:**
- The DIY Planner dashboard page has no role check
- Any authenticated user can navigate directly to `/diy-planner` and see the DIY planner interface

**Impact:**
- VENDOR, VENUE, PRO_PLANNER, or ADMIN users could access DIY planner tools
- This breaks role isolation

**Fix Needed:**
- Add role check: `if (!canAccessDashboard(user, "DIY_PLANNER")) redirect("/app")`

---

### Issue 2: Pro Planner Dashboard Uses Overly Broad Role Check

**File:** `apps/web/src/app/pro/planner/page.tsx` (line 15)

**Problem:**
- Uses `isPlanner(user)` which returns `true` for both `DIY_PLANNER` and `PRO_PLANNER`
- This allows DIY planners to access Pro Planner dashboard

**Impact:**
- DIY planners can see Pro Planner features and manage Pro Planner organizations
- Breaks role isolation between DIY and Pro planners

**Fix Needed:**
- Change from `isPlanner(user)` to explicit check: `if (user.role !== "PRO_PLANNER" && !isAdmin(user)) redirect("/app")`
- Or use: `if (!canAccessDashboard(user, "PRO_PLANNER")) redirect("/app")`

---

### Issue 3: Vendor Dashboard Has No Role Check

**File:** `apps/web/src/app/vendor/dashboard/page.tsx`

**Problem:**
- No explicit check for `VENDOR` role
- Only checks if user has a vendor organization

**Impact:**
- Any user with a vendor org (even if their role is PRO_PLANNER or ADMIN) can access vendor dashboard
- While unlikely in practice, this is a security gap

**Fix Needed:**
- Add role check: `if (!canAccessDashboard(user, "VENDOR")) redirect("/app")`

---

### Issue 4: Venue Dashboard Has No Role Check

**File:** `apps/web/src/app/venue/dashboard/page.tsx`

**Problem:**
- No explicit check for `VENUE` role
- Only checks if user has a venue organization

**Impact:**
- Any user with a venue org can access venue dashboard
- Similar security gap as vendor dashboard

**Fix Needed:**
- Add role check: `if (!canAccessDashboard(user, "VENUE")) redirect("/app")`

---

### Issue 5: Sign-In Redirect Logic Doesn't Consider Role

**File:** `apps/web/src/lib/auth.ts` (lines 175-191)

**Problem:**
- NextAuth `redirect` callback always defaults to `/app`
- No role-based logic in the redirect callback itself
- Relies entirely on `/app` page to route correctly

**Impact:**
- All users land on `/app` first, then get redirected
- Creates unnecessary redirect chain: sign-in → `/app` → role-specific dashboard
- If `/app` page logic fails, users might see wrong dashboard

**Fix Needed:**
- Consider adding role-based redirect logic in NextAuth callback
- Or ensure `/app` page routing is bulletproof

---

### Issue 6: PRO_PLANNER Without Org Shows Generic Dashboard

**File:** `apps/web/src/app/app/page.tsx` (lines 58-90)

**Problem:**
- PRO_PLANNER users without an org stay on `/app` and see a generic dashboard with setup prompt
- This is intentional but inconsistent with other roles (DIY_PLANNER always redirects, VENDOR/VENUE redirect to onboarding)

**Impact:**
- PRO_PLANNER users see a different experience than other roles
- Could be confusing if they expect to be redirected to `/pro/planner`

**Status:** This may be intentional design, but worth noting for consistency.

---

### Issue 7: CLIENT Role Has No Specific Dashboard

**File:** `apps/web/src/app/app/page.tsx`

**Problem:**
- CLIENT role has no specific dashboard or redirect logic
- CLIENT users stay on `/app` and see generic dashboard

**Impact:**
- CLIENT users may not have a clear entry point
- Unclear what CLIENT role is meant to access

**Status:** May be intentional if CLIENT role is not fully implemented.

---

### Issue 8: ADMIN Role Has No Explicit Redirect

**File:** `apps/web/src/app/app/page.tsx`

**Problem:**
- ADMIN users stay on `/app` after sign-in
- No explicit redirect to `/app/admin/overview`

**Impact:**
- Admins see generic dashboard instead of admin dashboard
- Must navigate via sidebar to reach admin features

**Status:** May be intentional, but could be improved for better UX.

---

## 5. Recommended Next Fixes (DO NOT APPLY)

### Priority 1: Add Role Guards to All Dashboards

**Issue:** DIY, Vendor, and Venue dashboards lack role checks.

**Fix:**
1. **DIY Planner Dashboard** (`apps/web/src/app/diy-planner/page.tsx`):
   ```typescript
   import { getCurrentUser } from "@/lib/auth-helpers";
   import { canAccessDashboard } from "@/lib/rbac";
   import { redirect } from "next/navigation";
   
   export default async function DIYPlannerPage() {
     const user = await getCurrentUser();
     if (!user || !canAccessDashboard(user, "DIY_PLANNER")) {
       redirect("/app");
     }
     return (
       <Suspense fallback={...}>
         <DIYPlannerDashboard />
       </Suspense>
     );
   }
   ```

2. **Vendor Dashboard** (`apps/web/src/app/vendor/dashboard/page.tsx`):
   - Add after line 11: `if (!canAccessDashboard(user, "VENDOR")) redirect("/app");`

3. **Venue Dashboard** (`apps/web/src/app/venue/dashboard/page.tsx`):
   - Add after line 10: `if (!canAccessDashboard(user, "VENUE")) redirect("/app");`

---

### Priority 2: Fix Pro Planner Role Check

**Issue:** Pro Planner dashboard uses `isPlanner()` which includes DIY planners.

**Fix:**
In `apps/web/src/app/pro/planner/page.tsx`, replace line 15:
```typescript
// OLD:
const planner = isPlanner(user);

// NEW:
if (!canAccessDashboard(user, "PRO_PLANNER")) {
  redirect("/app");
}
```

Remove the `isPlanner` import if it's no longer used, and remove the `planner` variable usage (line 34).

---

### Priority 3: Consider Role-Based Redirect in NextAuth Callback

**Issue:** All users land on `/app` first, creating unnecessary redirect chain.

**Fix:**
Update `apps/web/src/lib/auth.ts` redirect callback (lines 175-191) to check role:
```typescript
async redirect({ url, baseUrl, token }) {
  // Allow relative URLs
  if (url.startsWith("/")) {
    return `${baseUrl}${url}`;
  }
  // Allow same-origin URLs
  try {
    const urlObj = new URL(url);
    if (urlObj.origin === baseUrl) {
      return url;
    }
  } catch {
    // Invalid URL, fallback to default
  }
  
  // Role-based redirect (if token has role)
  if (token?.role) {
    const role = token.role as string;
    if (role === "DIY_PLANNER") return `${baseUrl}/diy-planner`;
    if (role === "PRO_PLANNER") return `${baseUrl}/pro/planner`;
    if (role === "VENDOR") return `${baseUrl}/vendor/dashboard`;
    if (role === "VENUE") return `${baseUrl}/venue/dashboard`;
    if (role === "EVENT_DREAMER") return `${baseUrl}/event-dreamer`;
    if (role === "ADMIN") return `${baseUrl}/app/admin/overview`;
  }
  
  // Default redirect to app dashboard
  return `${baseUrl}/app`;
}
```

**Note:** This requires ensuring the `token` parameter is available in the redirect callback. May need to verify NextAuth API.

---

### Priority 4: Standardize PRO_PLANNER Redirect Behavior

**Issue:** PRO_PLANNER without org stays on `/app`, inconsistent with other roles.

**Fix:**
In `apps/web/src/app/app/page.tsx`, ensure PRO_PLANNER always redirects to `/pro/planner`:
```typescript
// Handle PRO_PLANNER: Always redirect to pro planner page
if (canAccessDashboard(user, "PRO_PLANNER")) {
  redirect("/pro/planner"); // Let pro planner page handle org check
}
```

Then in `apps/web/src/app/pro/planner/page.tsx`, handle the "no org" case with a redirect to setup instead of showing content.

---

### Priority 5: Add CLIENT Role Handling

**Issue:** CLIENT role has no specific dashboard or handling.

**Fix:**
- Determine what CLIENT role should access
- Add appropriate redirect or dashboard for CLIENT users
- Or document that CLIENT role is not yet implemented

---

### Priority 6: Improve ADMIN Redirect

**Issue:** ADMIN users land on generic `/app` dashboard.

**Fix:**
In `apps/web/src/app/app/page.tsx`, add explicit redirect for ADMIN:
```typescript
// Handle ADMIN: Redirect to admin dashboard
if (canAccessDashboard(user, "ADMIN")) {
  redirect("/app/admin/overview");
}
```

---

## Summary Table: Dashboard Access Rules

| Dashboard | Auth Check | Role Check | Wrong Role Behavior | Status |
|-----------|------------|------------|---------------------|--------|
| **DIY Planner** | ❌ None | ❌ None | ✅ Renders normally | 🔴 **BROKEN** |
| **Pro Planner** | ✅ Yes | ⚠️ `isPlanner()` (too broad) | ⚠️ Allows DIY planners | 🟡 **PARTIAL** |
| **Vendor** | ✅ Yes | ❌ None | ✅ Renders if has org | 🔴 **BROKEN** |
| **Venue** | ✅ Yes | ❌ None | ✅ Renders if has org | 🔴 **BROKEN** |
| **Admin** | ✅ Yes | ✅ `canAccessDashboard("ADMIN")` | ✅ Redirects to `/app` | ✅ **CORRECT** |
| **`/app` Generic** | ✅ Yes | ⚠️ Role-based redirects | ⚠️ Falls through for some roles | 🟡 **PARTIAL** |

---

## Conclusion

The sign-in and role-based access system has several gaps:

1. **Most dashboards lack explicit role guards**, allowing users with wrong roles to access them
2. **Pro Planner dashboard uses overly broad role check**, allowing DIY planners to access Pro features
3. **Sign-in redirect logic doesn't consider roles**, creating unnecessary redirect chains
4. **Some roles (CLIENT, ADMIN) have unclear or inconsistent landing behavior**

The recommended fixes prioritize adding role guards to all dashboards and fixing the Pro Planner role check, as these are security and isolation issues. The redirect optimization is a UX improvement but less critical.

