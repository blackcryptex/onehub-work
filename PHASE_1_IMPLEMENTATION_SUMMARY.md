# Phase 1 Implementation Summary: Event-Scoped Client Relationship Model

**Date:** 2025-01-27  
**Status:** ✅ Complete  
**Approach:** Option A - Clients are NOT org members by default. They are event-scoped stakeholders only.

---

## Implementation Overview

Phase 1 introduces an event-level relationship model that allows Pro Planners to associate clients with specific events without granting org-wide access. Clients are linked to events via the `EventStakeholder` model, not through organization membership.

---

## Changes Made

### 1. Database Schema (`apps/web/prisma/schema.prisma`)

#### Added EventStakeholder Model
```prisma
enum EventStakeholderRole {
  CLIENT
  STAKEHOLDER
}

model EventStakeholder {
  id            String                @id @default(cuid())
  eventId       String
  userId        String
  role          EventStakeholderRole
  addedByUserId String
  createdAt     DateTime              @default(now())

  event       Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user        User  @relation("EventStakeholderUser", fields: [userId], references: [id], onDelete: Cascade)
  addedBy     User  @relation("EventStakeholderAddedBy", fields: [addedByUserId], references: [id])

  @@unique([eventId, userId])
  @@index([eventId])
  @@index([userId])
}
```

**Key Features:**
- Unique constraint on `(eventId, userId)` - prevents duplicate stakeholder assignments
- Cascade delete when event is deleted
- Cascade delete when user is deleted
- Indexes on `eventId` and `userId` for efficient queries
- Tracks who added the stakeholder (`addedByUserId`)

#### Updated Event Model
- Added `stakeholders EventStakeholder[]` relation

#### Updated User Model
- Added `eventStakeholders EventStakeholder[]` relation (as stakeholder)
- Added `addedEventStakeholders EventStakeholder[]` relation (as adder)

---

### 2. Database Migration

**Migration File:** `apps/web/prisma/migrations/20251207143637_add_event_stakeholder/migration.sql`

**Status:** Created, ready to apply

**To Apply:**
```bash
cd apps/web
npx prisma migrate dev
```

**Migration Includes:**
- Creates `EventStakeholderRole` enum
- Creates `EventStakeholder` table
- Adds foreign key constraints
- Creates indexes for performance
- Creates unique constraint on `(eventId, userId)`

---

### 3. Type System Updates (`apps/web/src/lib/rbac.ts`)

#### Added EventStakeholderLike Interface
```typescript
interface EventStakeholderLike {
  userId: string;
  role: "CLIENT" | "STAKEHOLDER";
}
```

#### Updated EventLike Interface
```typescript
interface EventLike {
  orgId: string;
  createdById: string;
  org?: OrgLike;
  stakeholders?: EventStakeholderLike[]; // Phase 1: Event-scoped stakeholders
}
```

#### Updated canViewEvent Function
- Added CLIENT user support via EventStakeholder check
- CLIENT users can now view events where they are an EventStakeholder
- Clients are NOT checked via org membership - only via EventStakeholder

**Logic:**
```typescript
// Phase 1: CLIENT users can view events where they are an EventStakeholder
// Clients are NOT org members by default - they are event-scoped stakeholders only
if (user.role === "CLIENT") {
  if (event.stakeholders && event.stakeholders.some((s) => s.userId === user.id)) {
    return true;
  }
  return false;
}
```

---

### 4. Query Updates

#### Updated Event Queries to Include Stakeholders

**File:** `apps/web/src/app/api/events/[eventSlug]/route.ts`
- Added `stakeholders` to include clause
- Selects `userId` and `role` for RBAC checks

**File:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
- Added `stakeholders` to include clause
- Selects `userId` and `role` for RBAC checks

**Example Query:**
```typescript
const event = await prisma.event.findFirst({
  where: { slug: params.eventSlug },
  include: {
    // ... other includes
    stakeholders: {
      select: { userId: true, role: true },
    },
    // ... other includes
  },
});
```

---

## Key Design Decisions

### 1. Event-Scoped Only
- Clients are linked to **specific events**, not organizations
- Removing a stakeholder from an event removes their access to that event only
- No org-wide permissions granted

### 2. Unique Constraint
- `@@unique([eventId, userId])` prevents duplicate assignments
- Ensures a user can only be a stakeholder once per event

### 3. Cascade Deletes
- When an event is deleted, all stakeholders are automatically removed
- When a user is deleted, all their stakeholder relationships are removed
- Prevents orphaned records

### 4. Role Tracking
- Tracks who added the stakeholder (`addedByUserId`)
- Useful for audit trails and permission checks

---

## Acceptance Criteria ✅

- ✅ **A client can be linked to a single event without becoming an org member**
  - EventStakeholder model allows linking clients to events
  - No org membership required

- ✅ **Removing the link removes event access**
  - Cascade delete ensures stakeholders are removed when event is deleted
  - Unique constraint prevents duplicate links
  - RBAC checks rely on EventStakeholder, not org membership

- ✅ **Queries for client access rely on EventStakeholder, not org membership**
  - `canViewEvent` checks `event.stakeholders` for CLIENT users
  - Event queries include `stakeholders` relation
  - No org membership checks for CLIENT event access

---

## What's NOT Included (Future Phases)

As per requirements, the following are **NOT** included in Phase 1:

- ❌ Sharing scopes (future phase)
- ❌ Deposits (future phase)
- ❌ Client dashboard (future phase)
- ❌ UI for adding/removing stakeholders (future phase)
- ❌ API endpoints for stakeholder management (future phase)

---

## Next Steps

### Immediate
1. **Apply Migration:**
   ```bash
   cd apps/web
   npx prisma migrate dev
   ```

2. **Verify Schema:**
   - Check that Prisma Client was regenerated
   - Verify types are available in codebase

### Future Phases
- **Phase 2:** Add UI for assigning/removing stakeholders
- **Phase 3:** Add API endpoints for stakeholder management
- **Phase 4:** Add client dashboard with event access
- **Phase 5:** Add sharing scopes and permissions
- **Phase 6:** Add deposit functionality

---

## Testing Recommendations

### Manual Testing
1. Create an EventStakeholder record linking a CLIENT user to an event
2. Verify `canViewEvent` returns `true` for that CLIENT user
3. Delete the EventStakeholder record
4. Verify `canViewEvent` returns `false` for that CLIENT user

### Database Testing
```sql
-- Create a stakeholder relationship
INSERT INTO "EventStakeholder" (id, "eventId", "userId", role, "addedByUserId", "createdAt")
VALUES ('test-id', 'event-id', 'client-user-id', 'CLIENT', 'planner-user-id', NOW());

-- Verify unique constraint
INSERT INTO "EventStakeholder" (id, "eventId", "userId", role, "addedByUserId", "createdAt")
VALUES ('test-id-2', 'event-id', 'client-user-id', 'CLIENT', 'planner-user-id', NOW());
-- Should fail with unique constraint violation
```

---

## Files Modified

1. `apps/web/prisma/schema.prisma` - Added EventStakeholder model and relations
2. `apps/web/prisma/migrations/20251207143637_add_event_stakeholder/migration.sql` - Migration file
3. `apps/web/src/lib/rbac.ts` - Updated types and canViewEvent function
4. `apps/web/src/app/api/events/[eventSlug]/route.ts` - Added stakeholders to query
5. `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` - Added stakeholders to query

---

## Notes

- **Phase 0 blocks remain in place:** CLIENT users are still blocked from accessing planner routes in Phase 0. These blocks will be removed in a future phase when client-specific routes are added.
- **RBAC is ready:** The `canViewEvent` function now properly checks EventStakeholder for CLIENT users, but the route-level blocks prevent access until client routes are implemented.
- **No breaking changes:** Existing functionality remains unchanged. This is an additive change only.

---

## Summary

Phase 1 successfully implements the event-scoped client relationship model. Clients can now be linked to specific events via the `EventStakeholder` model without requiring org membership. The RBAC system is updated to check stakeholders for CLIENT access, and all event queries include stakeholder data. The foundation is now in place for future phases that will add UI, APIs, and client-specific features.

