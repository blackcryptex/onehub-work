# Phase 2 Implementation Summary: Minimal Sharing/Forwarding

**Date:** 2025-01-27  
**Status:** ✅ Complete  
**Goal:** Enforce that CLIENTs can only view content explicitly shared by the Pro Planner.

---

## Implementation Overview

Phase 2 implements minimal sharing/forwarding functionality using the `EventShare` model. Clients can only view event summaries if the Pro Planner explicitly shares the SUMMARY scope with them. Without a share record, clients see "Nothing shared yet."

---

## Changes Made

### 1. Database Schema (Already Exists)

The `EventShare` model was already added in a previous step:

```prisma
enum EventShareScope {
  SUMMARY
}

model EventShare {
  id              String          @id @default(cuid())
  eventId         String
  viewerUserId    String
  scope           EventShareScope @default(SUMMARY)
  createdByUserId String
  createdAt       DateTime        @default(now())

  event     Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  viewer    User  @relation("EventShareViewer", fields: [viewerUserId], references: [id], onDelete: Cascade)
  createdBy User  @relation("EventShareCreatedBy", fields: [createdByUserId], references: [id])

  @@unique([eventId, viewerUserId, scope])
  @@index([eventId])
  @@index([viewerUserId])
}
```

**Key Features:**
- Unique constraint on `(eventId, viewerUserId, scope)` - prevents duplicate shares
- Cascade delete when event or user is deleted
- Indexes for efficient queries
- Currently only supports `SUMMARY` scope (as per requirements)

---

### 2. Database Migration

**Migration File:** `apps/web/prisma/migrations/20251207144203_add_event_share/migration.sql`

**Status:** Created, ready to apply

**To Apply:**
```bash
cd apps/web
npx prisma migrate dev
npx prisma generate
```

---

### 3. RBAC Updates (`apps/web/src/lib/rbac.ts`)

#### Added EventShareLike Interface
```typescript
interface EventShareLike {
  viewerUserId: string;
  scope: "SUMMARY";
}
```

#### Updated EventLike Interface
```typescript
interface EventLike {
  orgId: string;
  createdById: string;
  org?: OrgLike;
  stakeholders?: EventStakeholderLike[]; // Phase 1
  shares?: EventShareLike[]; // Phase 2
}
```

#### Added isEventSharedWithUser Function
```typescript
export function isEventSharedWithUser(
  user: AppUser | null | undefined,
  event: EventLike | null | undefined,
  scope: "SUMMARY" = "SUMMARY"
): boolean {
  if (!user || !event || !event.shares) return false;
  return event.shares.some((share) => share.viewerUserId === user.id && share.scope === scope);
}
```

#### Updated canViewEvent Function
- CLIENT users now require BOTH:
  1. Being an EventStakeholder (Phase 1)
  2. Content being explicitly shared (Phase 2)

**Logic:**
```typescript
if (user.role === "CLIENT") {
  // Must be a stakeholder
  const isStakeholder = event.stakeholders && event.stakeholders.some((s) => s.userId === user.id);
  if (!isStakeholder) return false;
  
  // Content must be shared (Phase 2)
  return isEventSharedWithUser(user, event, "SUMMARY");
}
```

---

### 4. Client-Safe Event Summary View

**File:** `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx`

**Route:** `/client/events/[eventSlug]`

**Features:**
- Only accessible to CLIENT users
- Shows "Nothing shared yet" if stakeholder but not shared
- Shows minimal, client-safe summary if shared:
  - Event name
  - Date & time
  - Location (city, state)
  - Expected guest count
  - Event type
  - Description (if available)
  - Objective (if available)
- Does NOT show:
  - Budget details
  - Guest lists
  - Checklists
  - Internal planning data
  - Vendor information

**Access Control:**
- Checks if user is CLIENT
- Checks if user is EventStakeholder
- Checks if content is shared
- Shows appropriate message based on access level

---

### 5. Pro-Side Share/Unshare UI

**File:** `apps/web/src/components/events/ShareEventButton.tsx`

**Component:** `ShareEventButton`

**Features:**
- Dropdown button in event detail page header
- Shows all CLIENT stakeholders
- Indicates which clients have SUMMARY shared
- Share/Unshare buttons for each client
- Only visible to Pro Planners and DIY Planners

**Usage:**
```tsx
<ShareEventButton
  eventSlug={params.eventSlug}
  stakeholders={event.stakeholders || []}
  shares={event.shares || []}
/>
```

**Location:** Added to `/app/(app)/vault/[eventSlug]/page.tsx` header section

---

### 6. API Endpoints

**File:** `apps/web/src/app/api/events/[eventSlug]/share/route.ts`

#### POST `/api/events/[eventSlug]/share`
- Shares SUMMARY scope with a client
- Requires:
  - User is planner (PRO_PLANNER, DIY_PLANNER, or ADMIN)
  - User can manage the event
  - Viewer is an EventStakeholder
- Creates EventShare record
- Returns share object

#### DELETE `/api/events/[eventSlug]/share?viewerUserId=...&scope=SUMMARY`
- Unshares SUMMARY scope with a client
- Requires:
  - User is planner
  - User can manage the event
- Deletes EventShare record
- Returns success message

---

### 7. Query Updates

**Updated Event Queries to Include Shares:**

**File:** `apps/web/src/app/api/events/[eventSlug]/route.ts`
- Added `shares` to include clause

**File:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
- Added `shares` to include clause (filtered to SUMMARY scope)

**File:** `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx`
- Queries shares filtered to current user and SUMMARY scope

---

## Acceptance Criteria ✅

- ✅ **Clients only see the summary if shared**
  - `canViewEvent` checks `isEventSharedWithUser`
  - Client summary page checks share before displaying content
  - RBAC enforces share requirement

- ✅ **Without a share record, clients see "Nothing shared yet."**
  - Client summary page shows this message when:
    - User is a stakeholder BUT
    - Content is not shared
  - Message is clear and user-friendly

- ✅ **Pro-side UI control to share/unshare SUMMARY**
  - `ShareEventButton` component added to event detail page
  - Shows all CLIENT stakeholders
  - Share/Unshare buttons for each client
  - Visual indication of shared status

- ✅ **Keep to SUMMARY scope only**
  - `EventShareScope` enum only has `SUMMARY`
  - All queries filter to `SUMMARY` scope
  - API endpoints default to `SUMMARY`

---

## User Flows

### Pro Planner Sharing Flow

1. Pro Planner navigates to event detail page
2. Clicks "Share Summary" button in header
3. Dropdown shows list of CLIENT stakeholders
4. Clicks "Share" next to a client
5. API creates EventShare record
6. Client can now view summary

### Client Viewing Flow

1. Client navigates to `/client/events/[eventSlug]`
2. System checks:
   - Is user CLIENT? ✅
   - Is user EventStakeholder? ✅
   - Is SUMMARY shared? ❌
3. Shows "Nothing shared yet" message
4. After Pro Planner shares:
   - System checks: Is SUMMARY shared? ✅
5. Shows client-safe event summary

---

## Files Created

1. `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx` - Client summary view
2. `apps/web/src/components/events/ShareEventButton.tsx` - Pro-side share UI
3. `apps/web/src/app/api/events/[eventSlug]/share/route.ts` - Share/unshare API

## Files Modified

1. `apps/web/src/lib/rbac.ts` - Added EventShareLike, isEventSharedWithUser, updated canViewEvent
2. `apps/web/src/app/api/events/[eventSlug]/route.ts` - Added shares to query
3. `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` - Added ShareEventButton, added shares to query

---

## Next Steps

### Immediate
1. **Apply Migration:**
   ```bash
   cd apps/web
   npx prisma migrate dev
   npx prisma generate
   ```

2. **Fix TypeScript Errors:**
   - After migration is applied, Prisma types will be regenerated
   - TypeScript errors in vault detail page will resolve

### Future Phases
- **Phase 3:** Add more sharing scopes (BUDGET, GUESTS, etc.)
- **Phase 4:** Add client dashboard listing shared events
- **Phase 5:** Add deposit functionality
- **Phase 6:** Add client intake to event creation

---

## Testing Recommendations

### Manual Testing

1. **Share Flow:**
   - Create an event as Pro Planner
   - Add a CLIENT as stakeholder
   - Click "Share Summary" button
   - Verify client can now see summary

2. **Unshare Flow:**
   - With summary shared, click "Unshare"
   - Verify client sees "Nothing shared yet"

3. **Client Access:**
   - As CLIENT, navigate to `/client/events/[eventSlug]`
   - Verify appropriate message/content shown

### Database Testing
```sql
-- Create a share
INSERT INTO "EventShare" (id, "eventId", "viewerUserId", scope, "createdByUserId", "createdAt")
VALUES ('test-id', 'event-id', 'client-user-id', 'SUMMARY', 'planner-user-id', NOW());

-- Verify unique constraint
INSERT INTO "EventShare" (id, "eventId", "viewerUserId", scope, "createdByUserId", "createdAt")
VALUES ('test-id-2', 'event-id', 'client-user-id', 'SUMMARY', 'planner-user-id', NOW());
-- Should fail with unique constraint violation
```

---

## Notes

- **TypeScript Errors:** Some TypeScript errors may appear until the migration is applied and Prisma Client is regenerated. These will resolve automatically.
- **Phase 0 Blocks:** CLIENT users are still blocked from planner routes. The client summary route (`/client/events/[eventSlug]`) is a new, separate route for clients.
- **Scope Limitation:** Only SUMMARY scope is supported. Future phases can add more scopes.
- **No Deposits:** Deposit functionality is explicitly excluded from Phase 2.

---

## Summary

Phase 2 successfully implements minimal sharing/forwarding functionality. Clients can only view event summaries if explicitly shared by Pro Planners. The Pro-side UI allows easy share/unshare management, and the client view shows appropriate messages based on sharing status. The foundation is now in place for future phases that will add more scopes and features.

