# Pro Planner Create Event Audit

**Date:** 2025-01-27  
**Type:** Read-Only Analysis  
**Issue:** Pro Planner unable to create events, gets "try again" message

---

## Entry Points

### 1. Pro Planner Dashboard
- **File:** `apps/web/src/components/pro-planner/Dashboard.tsx`
- **Lines:** 116, 125
- **Component:** "Create Event" button links to `/events/new`
- **Route:** `/events/new` (shared event wizard)

### 2. Event Wizard Page
- **File:** `apps/web/src/app/events/new/page.tsx`
- **Route:** `/events/new`
- **Component:** `EventWizardPage` (client component)
- **Submit Handler:** `handleCreateEvent` (line 98)

### 3. Landing Header (Public)
- **File:** `apps/web/src/components/layout/LandingHeader.tsx`
- **Line:** 73
- **Link:** "Event Wizard" → `/events/new`

---

## Create Pipeline

### UI Component
- **File:** `apps/web/src/app/events/new/page.tsx`
- **Handler:** `handleCreateEvent` (line 98-148)
- **Validation:** Client-side validation via `validateForm()` (line 30-96)
- **Submit:** POST to `/api/events/create` (line 116)

### API Route
- **File:** `apps/web/src/app/api/events/create/route.ts`
- **Method:** POST
- **Handler:** `POST` function (line 181-524)
- **Validation:** Zod schema `createEventSchema` (line 15-27)

### DB Mutation
- **File:** `apps/web/src/app/api/events/create/route.ts`
- **Line:** 271-295
- **Method:** `prisma.event.create()`
- **Retry Logic:** Slug conflict retry (lines 264-308, max 5 attempts)

---

## Data Requirements vs Payload

### Required Fields (Prisma Schema)
- `orgId`: String (required)
- `createdById`: String (required)
- `name`: String (required)
- `slug`: String (required, unique)
- `type`: EventType enum (required, legacy)
- `startAt`: DateTime (required)
- `endAt`: DateTime (required)

### Provided Fields (Form)
- `name`: ✅ Required, validated
- `event_type_raw`: ✅ Required, validated
- `budget_raw`: ✅ Required, validated
- `date`: ✅ Required, validated (converted to `startAt`/`endAt`)
- `city`: Optional → `venueCity`
- `state`: Optional → `venueState`
- `zipCode`: Not used
- `headcount`: Optional → `guestTarget`
- `venue`: Not used
- `objective`: Optional → `objective`
- `style`: Optional → `description`

### Generated Fields (API)
- `slug`: ✅ Generated from name + random suffix (line 233-234)
- `orgId`: ✅ Retrieved or created (line 213-230)
- `createdById`: ✅ From session (line 198)
- `endAt`: ✅ Generated from `startAt` + 4 hours (line 241-242)
- `type`: ✅ Hardcoded to "OTHER" (line 277)
- `status`: ✅ Hardcoded to "PLANNING" (line 292)

### Suspected Missing Field(s)
**NONE** - All required fields are provided or generated.

---

## Role + Permission Notes

### Organization Lookup Issue ⚠️ **CRITICAL**

**File:** `apps/web/src/app/api/events/create/route.ts`  
**Line:** 213-215

```typescript
org = await prisma.organization.findFirst({
  where: { ownerId: userId, type: "PLANNER" },
});
```

**Problem:** The API only looks for organizations with `type: "PLANNER"`, but Pro Planners can have organizations with:
- `type: "PLANNER"` OR
- `type: "CLIENT_AGENCY"`

**Evidence:** Pro Planner dashboard page (`apps/web/src/app/pro/planner/page.tsx`, line 19-24) searches for:
```typescript
{ type: { in: ["PLANNER", "CLIENT_AGENCY"] } }
```

**Impact:** If a Pro Planner has a `CLIENT_AGENCY` organization (which is common for professional planners), the API won't find it and will try to create a new `PLANNER` org. This could:
1. Fail if user already has max orgs
2. Create duplicate orgs
3. Create events in wrong org

### Insert Permission Check
- **Location:** Line 191-194 (auth check only)
- **Missing:** No explicit RBAC check for Pro Planner role
- **Current:** Only checks if user is authenticated
- **Issue:** Doesn't verify user has permission to create events in the found/created org

### Ownership Field Requirements
- `createdById`: ✅ Set to `userId` (line 274)
- `orgId`: ✅ Set to found/created org (line 273)
- **Issue:** If org lookup fails and new org is created, the org might not match Pro Planner's actual org setup

---

## Routing + Redirect Notes

### Success Redirect Target
**File:** `apps/web/src/app/events/new/page.tsx`  
**Line:** 131-141

```typescript
const { slug } = await response.json();
router.push(`/app/vault/${slug}` as any);
```

**Problem:** Redirects to legacy route `/app/vault/${slug}`

### Legacy Route Protection
**File:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`  
**Lines:** 36-42

```typescript
if (canAccessDashboard(user, "DIY_PLANNER") || canAccessDashboard(user, "PRO_PLANNER")) {
  const roleSpecificVaultDetail = vaultDetail(user.role, params.eventSlug);
  redirect(roleSpecificVaultDetail);
}
```

**Impact:** Pro Planner gets double redirect:
1. Event wizard redirects to `/app/vault/${slug}`
2. Legacy route protection redirects to `/pro/planner/vault/${slug}`

**Potential Issue:** The redirect happens server-side, but the client-side router.push might not handle the server redirect gracefully, causing a flash or error.

### Error Redirect Target
- **Location:** Line 126
- **Action:** `alert()` with error message
- **No redirect:** User stays on `/events/new` page

### "Try Again" Source
- **File:** `apps/web/src/app/events/new/page.tsx`
- **Line:** 126
- **Message:** `"Failed to create event. Please try again."`
- **Trigger:** When API returns `!response.ok`

---

## Top 3 Root-Cause Hypotheses

### 1. **Organization Type Mismatch** (HIGHEST LIKELIHOOD) ⚠️

**Issue:** API route only searches for `type: "PLANNER"` but Pro Planners can have `type: "CLIENT_AGENCY"` organizations.

**Evidence:**
- Pro Planner dashboard searches for both `["PLANNER", "CLIENT_AGENCY"]`
- Event create API only searches for `"PLANNER"`
- If Pro Planner has `CLIENT_AGENCY` org, API won't find it

**Impact:**
- API tries to create new `PLANNER` org
- May fail due to constraints or create duplicate
- Event gets created in wrong org (or fails)

**Fix:** Update org lookup to match Pro Planner dashboard logic:
```typescript
org = await prisma.organization.findFirst({
  where: { 
    ownerId: userId, 
    type: { in: ["PLANNER", "CLIENT_AGENCY"] } 
  },
});
```

---

### 2. **Double Redirect Issue** (MEDIUM LIKELIHOOD)

**Issue:** Event wizard redirects to legacy route, which then redirects again to role-specific route.

**Evidence:**
- Event wizard redirects to `/app/vault/${slug}` (hardcoded)
- Legacy route protection redirects Pro Planners to `/pro/planner/vault/${slug}`
- Client-side `router.push()` might not handle server redirect well

**Impact:**
- User sees redirect loop or error
- Event might be created but user doesn't see it
- Browser might show "try again" due to redirect chain

**Fix:** Update event wizard to use route helper:
```typescript
import { vaultDetail } from "@/lib/routes";
import { useSession } from "next-auth/react";

const { data: session } = useSession();
const redirectPath = vaultDetail(session?.user?.role, slug);
router.push(redirectPath as any);
```

---

### 3. **Slug Generation Conflict** (LOW LIKELIHOOD)

**Issue:** Slug generation might fail after max retries (5 attempts).

**Evidence:**
- Slug generated from name + random suffix (line 233-234)
- Retry logic exists for slug conflicts (lines 264-308)
- If all 5 attempts fail, throws error (line 311)

**Impact:**
- Very rare (would need 5 consecutive slug collisions)
- Would throw error and return 500
- User sees "Failed to create event" message

**Fix:** Increase retry attempts or improve slug generation uniqueness.

---

## Recommended Fix Approach (No Code)

### Priority 1: Fix Organization Type Lookup

1. **Update `/api/events/create/route.ts` line 213-215:**
   - Change from `type: "PLANNER"` to `type: { in: ["PLANNER", "CLIENT_AGENCY"] }`
   - This matches the Pro Planner dashboard lookup logic
   - Ensures Pro Planners with `CLIENT_AGENCY` orgs can create events

2. **Also update org creation logic (line 224):**
   - Determine org type based on user role
   - If `PRO_PLANNER`, create `CLIENT_AGENCY` org (not `PLANNER`)
   - Or check user's role and create appropriate type

### Priority 2: Fix Redirect to Use Route Helper

1. **Update `/app/events/new/page.tsx` line 131-141:**
   - Import `vaultDetail` from `@/lib/routes`
   - Import `useSession` from `next-auth/react`
   - Get user role from session
   - Use `vaultDetail(role, slug)` instead of hardcoded `/app/vault/${slug}`
   - This prevents double redirect and ensures correct role-aware routing

### Priority 3: Add Better Error Handling

1. **Improve error messages:**
   - Check if error is org-related vs validation-related
   - Show specific message: "No organization found. Please set up your planner profile first."
   - Link to `/professional-planner/setup` if org missing

2. **Add logging:**
   - Log which org type was found/created
   - Log user role when creating event
   - This helps debug future issues

### Priority 4: Add RBAC Check

1. **Verify user can create events:**
   - Check if user is Pro Planner or has appropriate role
   - Verify org membership before creating event
   - Use `canAccessDashboard` or similar helper

---

## Sequence Diagram

```
User clicks "Create Event"
  ↓
Event Wizard Page (/events/new)
  ↓
handleCreateEvent() validates form
  ↓
POST /api/events/create
  ↓
API: auth() check → ✅
  ↓
API: Zod validation → ✅
  ↓
API: Find org (type: "PLANNER" only) → ❌ FAILS if Pro Planner has CLIENT_AGENCY org
  ↓
API: Try to create new PLANNER org → May fail or create wrong org
  ↓
API: Create event → May fail or create in wrong org
  ↓
Response: { slug } or { error }
  ↓
If success: router.push("/app/vault/${slug}") → Hardcoded legacy route
  ↓
Legacy route protection: Redirect to /pro/planner/vault/${slug}
  ↓
User sees redirect loop or error → "Try again" message
```

---

## Files Involved

1. **Entry Point:**
   - `apps/web/src/components/pro-planner/Dashboard.tsx` (lines 116, 125)

2. **Event Wizard:**
   - `apps/web/src/app/events/new/page.tsx` (lines 98-148)

3. **API Route:**
   - `apps/web/src/app/api/events/create/route.ts` (lines 181-524)

4. **Redirect Target:**
   - `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` (lines 36-42)

5. **Reference (Pro Planner Dashboard):**
   - `apps/web/src/app/pro/planner/page.tsx` (lines 19-24) - Shows correct org lookup

---

## Summary

**Most Likely Root Cause:** Organization type mismatch. The API only looks for `PLANNER` orgs, but Pro Planners commonly have `CLIENT_AGENCY` orgs. When the lookup fails, the API tries to create a new org or fails, causing the event creation to fail.

**Secondary Issue:** Hardcoded redirect to legacy route causes double redirect, which might confuse the client-side router and show error messages.

**Quick Fix:** Update org lookup in `/api/events/create/route.ts` to search for both `PLANNER` and `CLIENT_AGENCY` types, matching the Pro Planner dashboard logic.

