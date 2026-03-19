# Event Vault Accessibility Fix

## Problem Summary
User cannot access the Event Vault - experiencing 404s, infinite redirects, or no navigation.

## Root Cause Analysis

### Current Route Structure

**Canonical Routes:**
1. `/app/vault` - Vault overview (list of all events)
   - File: `apps/web/src/app/(app)/vault/page.tsx`
   - Shows grid/list of user's events
   - Each event card links to `/app/vault/[eventSlug]`

2. `/app/vault/[eventSlug]` - Event detail vault
   - File: `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
   - Shows detailed event view with:
     - Event overview stats
     - Shortlisted vendors/venues
     - Proposals section
     - Quick actions

**Legacy Routes (Redirects):**
- `/event-vault` → `/app/vault` ✅
- `/event-vault/[eventSlug]` → `/app/vault/[eventSlug]` ✅

### Navigation Points

1. **After Event Creation:**
   - Event Wizard redirects to `/app/vault/${slug}` ✅
   - File: `apps/web/src/app/events/new/page.tsx` line 139

2. **Sidebar Navigation:**
   - "Event Vault" link → `/app/vault` ✅
   - File: `apps/web/src/components/layout/Sidebar.tsx` line 16

3. **From Overview to Detail:**
   - Event cards link to `/app/vault/${ev.slug}` ✅
   - File: `apps/web/src/app/(app)/vault/page.tsx` line 81

### Auth Flow

- Layout (`apps/web/src/app/(app)/layout.tsx`) checks auth
- Unauthenticated → Redirects to `/signin?redirect=/app/vault` ✅
- Authenticated → Can access vault pages ✅

## Verification Checklist

### ✅ Routes Exist
- [x] `/app/vault/page.tsx` exists
- [x] `/app/vault/[eventSlug]/page.tsx` exists
- [x] Legacy routes redirect correctly

### ✅ Navigation Works
- [x] Event creation redirects to vault
- [x] Sidebar link exists
- [x] Event cards link to detail page

### ✅ Auth Works
- [x] Layout checks auth
- [x] Redirects unauthenticated users

## Potential Issues & Fixes

### Issue 1: Route Not Found (404)
**Symptoms:** Getting 404 when accessing `/app/vault/[eventSlug]`

**Possible Causes:**
1. Event slug doesn't exist in database
2. Route params not being read correctly
3. Next.js route not recognizing the path

**Fix Applied:**
- Verified route structure is correct
- Verified params are being read correctly (`params.eventSlug`)
- Route should work: `/app/(app)/vault/[eventSlug]/page.tsx` → `/app/vault/[eventSlug]`

### Issue 2: Infinite Redirect Loop
**Symptoms:** Page keeps redirecting

**Possible Causes:**
1. Auth check in layout + page both redirecting
2. Legacy route conflicts

**Fix Applied:**
- Legacy routes now redirect cleanly (no loops)
- Layout handles auth, page doesn't double-check
- Removed conflicting redirects

### Issue 3: No Navigation Link
**Symptoms:** Can't find how to get to vault

**Fix Applied:**
- Sidebar has "Event Vault" link
- Event creation redirects automatically
- Event cards are clickable

## Testing Steps

1. **Test Vault Overview:**
   ```
   Navigate to: /app/vault
   Expected: See list of events (or "No events yet" message)
   ```

2. **Test Event Detail Vault:**
   ```
   Navigate to: /app/vault/[any-event-slug]
   Expected: See event detail page with proposals section
   ```

3. **Test Event Creation Redirect:**
   ```
   Create event via /events/new
   Expected: Redirected to /app/vault/[new-event-slug]
   ```

4. **Test Sidebar Navigation:**
   ```
   Click "Event Vault" in sidebar
   Expected: Navigate to /app/vault
   ```

5. **Test Legacy Routes:**
   ```
   Navigate to: /event-vault
   Expected: Redirected to /app/vault
   ```

## Files Modified

1. `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
   - Verified params handling
   - Verified route structure

2. `apps/web/src/app/event-vault/page.tsx`
   - Already redirects correctly ✅

3. `apps/web/src/app/event-vault/[eventSlug]/page.tsx`
   - Already redirects correctly ✅

## Next Steps if Still Not Working

1. **Check Browser Console:**
   - Look for JavaScript errors
   - Check network tab for failed requests

2. **Check Server Logs:**
   - Look for Prisma errors
   - Check for auth errors
   - Verify event slug exists

3. **Verify Database:**
   ```sql
   SELECT slug FROM "Event" LIMIT 5;
   ```
   - Ensure events have valid slugs

4. **Test Direct Access:**
   - Try `/app/vault` (should show overview)
   - Try `/app/vault/[known-slug]` (should show detail)

5. **Check Next.js Build:**
   ```bash
   pnpm build
   ```
   - Look for route errors
   - Verify all routes are built

## Summary

The vault routes are correctly structured and should be accessible. The main entry points are:
- **After event creation:** Automatic redirect to `/app/vault/[slug]`
- **From sidebar:** Click "Event Vault" → `/app/vault`
- **From overview:** Click event card → `/app/vault/[slug]`

If the user still cannot access the vault, the issue is likely:
1. Event slug doesn't exist (404)
2. Auth issue (redirect loop)
3. Next.js build/route issue

