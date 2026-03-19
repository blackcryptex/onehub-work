# Event Vault Routing Fix

## Problem
User cannot access the Event Vault at all - getting 404, infinite redirects, or no navigation.

## Solution

### Canonical Routes

1. **Vault Overview (List of Events):**
   - Route: `/app/vault`
   - File: `apps/web/src/app/(app)/vault/page.tsx`
   - Purpose: Shows all user's events in a grid/list view
   - Links to individual event vaults: `/app/vault/[eventSlug]`

2. **Event Detail Vault:**
   - Route: `/app/vault/[eventSlug]`
   - File: `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
   - Purpose: Shows detailed view of a specific event with:
     - Event overview stats
     - Shortlisted vendors/venues
     - Proposals section
     - Quick actions

### Legacy Routes (Redirects)

- `/event-vault` → `/app/vault` (redirects)
- `/event-vault/[eventSlug]` → `/app/vault/[eventSlug]` (redirects)

### Navigation Points

1. **After Event Creation:**
   - Event Wizard (`/events/new`) redirects to `/app/vault/${slug}` after creating event
   - This is the primary entry point

2. **Sidebar Navigation:**
   - Sidebar has "Event Vault" link pointing to `/app/vault`
   - This shows the overview/list page

3. **From Overview to Detail:**
   - Clicking an event card on `/app/vault` navigates to `/app/vault/[eventSlug]`

### Route Structure

```
/app/(app)/vault/
  ├── page.tsx                    → /app/vault (overview/list)
  └── [eventSlug]/
      └── page.tsx                → /app/vault/[eventSlug] (detail)
```

### Layout

- Both routes use `(app)` route group layout
- Layout includes: Topbar, Sidebar, auth check
- Layout file: `apps/web/src/app/(app)/layout.tsx`

### Auth Flow

1. Unauthenticated users → Redirected to `/signin?redirect=/app/vault`
2. Authenticated users → Can access vault pages
3. Layout checks auth and redirects if needed

### Testing Checklist

- [x] `/app/vault` loads and shows event list
- [x] `/app/vault/[eventSlug]` loads and shows event details
- [x] Event creation redirects to `/app/vault/[eventSlug]`
- [x] Sidebar link works
- [x] Legacy routes redirect correctly
- [x] Auth redirects work correctly

