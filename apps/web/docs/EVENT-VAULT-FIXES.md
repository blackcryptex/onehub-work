# Event Vault & DIY/Pro Planner Event Loading Fixes

## Date: Current Session

## Root Causes Found

### 1. **Schema Mismatch in DIY Events API** ✅ FIXED
**Problem:** The `/api/diy/events` route was trying to access `shortlistItems.vendorId` and `shortlistItems.vendorName`, but the Prisma schema was updated to use `listingId` and link to a `Listing` model instead.

**Impact:** This would cause Prisma query errors when trying to load events with shortlist items, potentially crashing the DIY planner dashboard.

**Fix Applied:**
- Updated the Prisma query in `/api/diy/events/route.ts` to include the `listing` relation
- Changed `shortlistItems` select to use `listingId` and include `listing` with `title`, `category`, `type`
- Updated `mapVendor()` function to use `shortlistItem.listing.title` instead of `vendorName`

**Files Changed:**
- `apps/web/src/app/api/diy/events/route.ts`

### 2. **Missing Debug Logging** ✅ FIXED
**Problem:** No visibility into what was happening during event loading, making debugging difficult.

**Fix Applied:**
- Added comprehensive logging to `/api/diy/events` route:
  - Logs session/user info on request
  - Logs membership and org IDs
  - Logs query where clause
  - Logs event count and IDs found
  - Logs errors with full stack traces
- Added logging to Event Vault pages:
  - `/app/vault` page logs user info and event counts
  - `/app/vault/[eventSlug]` page logs access checks and event details
- Added logging to DIY Dashboard client component:
  - Logs fetch start, response status, and event data received

**Files Changed:**
- `apps/web/src/app/api/diy/events/route.ts`
- `apps/web/src/app/(app)/vault/page.tsx`
- `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
- `apps/web/src/components/diy-planner/Dashboard.tsx`

### 3. **Missing Imports in Event Vault Detail Page** ✅ FIXED
**Problem:** `isAdmin` and `isPlanner` were used but not imported, causing TypeScript errors.

**Fix Applied:**
- Added imports: `isAdmin` from `@/lib/auth-helpers` and `isPlanner` from `@/lib/rbac`

**Files Changed:**
- `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`

## Auth & Role Logic Verification

### Current Flow:
1. **Event Vault Pages (`/app/vault` and `/app/vault/[eventSlug]`):**
   - Use `getCurrentUser()` to get authenticated user
   - Redirect to `/signin?redirect=/app/vault` if no user
   - Use `isPlanner()` to check if user is DIY_PLANNER or PRO_PLANNER
   - For planners: Only show events they created (`createdById: userId`)
   - For non-planners: Show events from orgs they're members of

2. **DIY Events API (`/api/diy/events`):**
   - Uses NextAuth `auth()` to get session
   - Returns 401 if no session (except in development mode)
   - Queries events where:
     - `createdById: userId` OR
     - `orgId` in user's organization memberships
   - This matches the planner isolation logic

3. **RBAC Checks:**
   - `canManageEvent()` enforces planner isolation:
     - Planners can only manage events they created
     - Non-planners can manage events in their orgs
   - `isPlanner()` correctly identifies DIY_PLANNER and PRO_PLANNER roles

## Prisma Query Verification

### Event Vault Page Query:
```typescript
const orgs = await prisma.organization.findMany({
  where: admin ? {} : { members: { some: { userId } } },
  include: {
    events: {
      where: planner ? { createdById: userId } : undefined,
      // ... includes
    },
  },
});
```

**Status:** ✅ Correct
- Filters orgs by membership (unless admin)
- Filters events by `createdById` for planners
- Includes all necessary relations

### DIY Events API Query:
```typescript
const where: Prisma.EventWhereInput = {
  OR: [
    { createdById: userId },
    ...(orgIds.length ? [{ orgId: { in: orgIds } }] : []),
  ],
};
```

**Status:** ✅ Correct
- Finds events created by user OR in user's orgs
- Matches planner isolation logic

## Client/Server Boundaries

### Server Components:
- ✅ `/app/vault/page.tsx` - Server Component (async, uses Prisma)
- ✅ `/app/vault/[eventSlug]/page.tsx` - Server Component (async, uses Prisma)
- ✅ `/app/diy-planner/page.tsx` - Server Component (wraps client component)

### Client Components:
- ✅ `/components/diy-planner/Dashboard.tsx` - Client Component (`"use client"`)
- ✅ `/components/diy-planner/EventVault.tsx` - Client Component (`"use client"`)

**Status:** ✅ No issues found
- No refs passed from server to client components
- Client components properly marked with `"use client"`
- Data fetching happens in server components or API routes

## New Flow After Fixes

### Login → Dashboard → Event Vault → Events API

1. **User logs in:**
   - NextAuth creates session
   - `getCurrentUser()` returns user with role (DIY_PLANNER, PRO_PLANNER, etc.)

2. **User visits `/diy-planner`:**
   - Server component renders `DIYPlannerDashboard` client component
   - Client component fetches events from `/api/diy/events`
   - API route checks auth, queries Prisma, returns events
   - Events displayed in sidebar and main content

3. **User visits `/app/vault`:**
   - Server component checks auth with `getCurrentUser()`
   - Queries Prisma for user's events (with planner isolation)
   - Renders event cards with links to `/app/vault/[eventSlug]`

4. **User clicks event card:**
   - Navigates to `/app/vault/[eventSlug]`
   - Server component loads event by slug
   - Checks `canManageEvent()` for access
   - Renders event detail page

## Testing Steps

1. **Type check:**
   ```bash
   pnpm -w typecheck
   ```
   Should pass with no errors.

2. **Build:**
   ```bash
   pnpm -w build
   ```
   Should complete successfully.

3. **Run dev server and test:**
   ```bash
   pnpm dev
   ```
   
   Then:
   - Visit `http://localhost:3000/diy-planner`
   - Check browser console for `[DIY Dashboard]` logs
   - Check server terminal for `[DIY Events API]` logs
   - Verify events load in sidebar
   - Click "Event Vault" in sidebar or visit `/app/vault`
   - Check server terminal for `[Event Vault]` logs
   - Verify events display correctly
   - Click an event card to view details
   - Check server terminal for `[Event Vault Detail]` logs

## Debug Logging Output

When running the app, you should see logs like:

```
[DIY Events API] Request received { hasSession: true, userId: '...', userRole: 'DIY_PLANNER', ... }
[DIY Events API] Loading events for user: ...
[DIY Events API] User memberships: { userId: '...', orgIds: [...], ... }
[DIY Events API] Query where clause: { OR: [...] }
[DIY Events API] Found events: { count: 3, eventIds: [...] }
[DIY Events API] Mapped events: { count: 3, eventNames: [...] }

[Event Vault] Page load started { hasUser: true, userId: '...', ... }
[Event Vault] User details: { userId: '...', admin: false, planner: true, ... }
[Event Vault] Loaded events: { orgCount: 1, eventCount: 3, ... }
```

## Files Modified

1. `apps/web/src/app/api/diy/events/route.ts`
   - Fixed shortlistItems query to use listingId and listing relation
   - Updated mapVendor function
   - Added comprehensive debug logging

2. `apps/web/src/app/(app)/vault/page.tsx`
   - Added debug logging for user and event loading

3. `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
   - Added missing imports (isAdmin, isPlanner)
   - Added debug logging for access checks

4. `apps/web/src/components/diy-planner/Dashboard.tsx`
   - Added debug logging for event fetching

## Known Limitations

- Debug logging is verbose - can be reduced in production if needed
- The DIY Events API still uses a legacy event mapping format - this is intentional for backward compatibility
- Planner isolation is enforced at multiple levels (API, page queries, RBAC) - this is intentional for security

## Next Steps

1. Test the flow end-to-end as described above
2. Monitor logs to verify events are loading correctly
3. If issues persist, check logs for specific error messages
4. Consider reducing log verbosity in production builds

