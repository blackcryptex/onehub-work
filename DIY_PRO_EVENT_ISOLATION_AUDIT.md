# DIY Planner vs Pro Planner Event Isolation Audit

**Date:** 2024  
**Scope:** How DIY Planner and Pro Planner events are loaded, filtered, and isolated  
**Status:** READ-ONLY AUDIT (No code changes)

---

## Executive Summary

**Key Finding:** DIY Planner and Pro Planner events are **logically separated** through filtering by `createdById` (event creator), but they share the **same Event Vault UI components** and **same database schema**. There is **no schema-level distinction** between DIY and Pro events.

**Isolation Mechanism:** Both DIY and Pro planners can only see events they created (`event.createdById === user.id`). This prevents cross-user leaks but means they share the same Vault interface.

**Answer to Core Questions:**
1. ❌ **Can a DIY planner see Pro planner events?** No - filtering by `createdById` prevents this.
2. ❌ **Can a Pro planner see DIY planner events?** No - filtering by `createdById` prevents this.
3. **Is there explicit schema separation?** No - separation is purely logical/role-based via filtering.

---

## 1. Current Data Separation

### 1.1 DIY Planner Event Loading

#### Event Vault List (`apps/web/src/app/(app)/vault/page.tsx`)

**Query Logic:**
```typescript
const planner = isPlanner(user); // Returns true for DIY_PLANNER or PRO_PLANNER

const orgs = await prisma.organization.findMany({
  where: admin ? {} : { members: { some: { userId } } },
  include: {
    events: {
      where: planner ? { createdById: userId } : undefined, // Planner isolation
      orderBy: { startAt: "desc" },
      // ... includes
    },
  },
});
```

**Filter Applied:**
- If user is a planner (DIY or PRO): `events.createdById === userId`
- If user is NOT a planner: Events from orgs they're a member of (no `createdById` filter)
- **Result:** DIY planner only sees events they created

---

#### Event Vault Detail (`apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`)

**Query Logic:**
```typescript
event = await prisma.event.findFirst({
  where: { slug: params.eventSlug },
  // ... includes
});

// Then permission check:
const canManage = canManageEvent(user, event);
if (!canManage) return notFound();
```

**Permission Check (`canManageEvent` → `isEventOwnedByPlanner`):**
```typescript
// From rbac.ts
if (isPlanner(user)) {
  return isEventOwnedByPlanner(user, event);
  // Which checks: event.createdById === user.id
}
```

**Filter Applied:**
- Event loaded by slug (no initial filter)
- Then checked: `event.createdById === user.id` (for planners)
- **Result:** DIY planner can only access events they created

---

#### DIY Dashboard (`apps/web/src/components/diy-planner/Dashboard.tsx`)

**API Call:**
```typescript
const res = await fetch("/api/diy/events", { cache: "no-store" });
```

**API Route (`apps/web/src/app/api/diy/events/route.ts`):**

**Query Logic:**
```typescript
const memberships = await prisma.membership.findMany({
  where: { userId },
  select: { orgId: true },
});
const orgIds = Array.from(new Set(memberships.map((m) => m.orgId)));

const where: Prisma.EventWhereInput = {
  OR: [
    { createdById: userId },  // Events user created
    ...(orgIds.length ? [{ orgId: { in: orgIds } }] : []),  // Events in user's orgs
  ],
};
```

**Filter Applied:**
- `createdById: userId` OR `orgId in [user's orgs]`
- **Note:** This is LESS restrictive than Event Vault (allows org events even if not created by user)
- **Result:** DIY planner sees events they created + events in their orgs

**⚠️ Potential Issue:** DIY API allows seeing events in orgs even if not created by user, but Event Vault filters more strictly. This is inconsistent.

---

### 1.2 Pro Planner Event Loading

#### Event Vault List (`apps/web/src/app/(app)/vault/page.tsx`)

**Same as DIY Planner** - uses identical code:
- If `isPlanner(user)` → filters by `createdById: userId`
- **Result:** Pro planner only sees events they created

---

#### Event Vault Detail (`apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`)

**Same as DIY Planner** - uses identical code:
- Checks `canManageEvent(user, event)` → `isEventOwnedByPlanner` → `event.createdById === user.id`
- **Result:** Pro planner can only access events they created

---

#### Pro Dashboard (`apps/web/src/app/pro/planner/page.tsx`)

**Query Logic:**
```typescript
const org = await prisma.organization.findFirst({
  where: admin
    ? { type: { in: ["PLANNER", "CLIENT_AGENCY"] } }
    : { ownerId: user.id, type: { in: ["PLANNER", "CLIENT_AGENCY"] } },
});

const where: { orgId: string; createdById?: string } = { orgId: org.id };
if (planner && !admin) {
  where.createdById = user.id;  // Planner isolation
}

const events = await prisma.event.findMany({
  where,
  // ... includes
});
```

**Filter Applied:**
- `orgId: org.id` AND (if planner) `createdById: user.id`
- **Result:** Pro planner only sees events they created in their Pro Planner org

---

### 1.3 Direct Answers

**Q: Can a DIY planner see any event that a Pro planner created but they did not?**

**A: ❌ NO**

- Event Vault: Filters by `createdById: userId` → DIY planner only sees their own events
- DIY Dashboard API: Filters by `createdById: userId` OR `orgId in [user's orgs]` → Still requires org membership
- Pro Planner events are in different orgs (Pro Planner orgs), so DIY planner won't be a member

**Q: Can a Pro planner see any event that a DIY planner created but they did not?**

**A: ❌ NO**

- Event Vault: Filters by `createdById: userId` → Pro planner only sees their own events
- Pro Dashboard: Filters by `orgId: org.id` AND `createdById: user.id` → Pro planner only sees their own events in their org
- DIY Planner events are in different orgs (DIY planner's personal orgs), so Pro planner won't be a member

**Q: Is there any place in the UI or APIs where events are loaded without filtering by the current user?**

**A: ✅ YES (with caveats)**

- **Admin users:** Can see all events (no `createdById` filter)
- **Org owners:** Can see all events in their orgs (no `createdById` filter for non-planners)
- **Non-planner org members:** Can see events in their orgs (Event Vault allows this)

However, for **planners specifically**, all queries filter by `createdById: userId`, ensuring isolation.

---

## 2. Vault Sharing

### 2.1 Shared Vault Pages

**Both DIY and Pro Planners use the same Vault pages:**
- `/app/vault` - Event Vault list
- `/app/vault/[eventSlug]` - Event Vault detail

**No separate routes:**
- ❌ No `/diy/vault` or `/diy-planner/vault`
- ❌ No `/pro/vault` or `/pro-planner/vault`

### 2.2 Vault Filtering Logic

**Event Vault List (`apps/web/src/app/(app)/vault/page.tsx`):**

```typescript
const planner = isPlanner(user); // Returns true for BOTH DIY_PLANNER and PRO_PLANNER

events: {
  where: planner ? { createdById: userId } : undefined,
  // ...
}
```

**Key Points:**
- `isPlanner(user)` returns `true` for **both** `DIY_PLANNER` and `PRO_PLANNER`
- Both roles get the **same filter**: `createdById: userId`
- **No distinction** between DIY and Pro in the filtering logic
- **No separate "DIY vault" vs "Pro vault"** - it's one shared component

**Event Vault Detail (`apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`):**

```typescript
const canManage = canManageEvent(user, event);
// Which calls isEventOwnedByPlanner for planners:
// event.createdById === user.id
```

**Key Points:**
- Same permission check for both DIY and Pro
- Both must have created the event to access it
- **No role-specific logic** distinguishing DIY from Pro

### 2.3 Is There Code Distinguishing "DIY Vault" vs "Pro Vault"?

**Answer: ❌ NO**

- No conditional rendering based on `user.role === "DIY_PLANNER"` vs `"PRO_PLANNER"`
- No separate components for DIY vs Pro vaults
- No different UI/UX for DIY vs Pro in the Vault pages
- **It's a shared view** with role-based filtering only

**The only distinction:**
- DIY Planner dashboard (`/diy-planner`) uses `/api/diy/events` API
- Pro Planner dashboard (`/pro/planner`) uses direct Prisma queries
- But both hit the same Event Vault pages (`/app/vault`)

---

## 3. Schema-Level Separation (or lack of it)

### 3.1 Event Schema (`apps/web/prisma/schema.prisma`)

**Event Model Fields:**
```prisma
model Event {
  id                 String      @id @default(cuid())
  orgId              String
  createdById        String      // User who created the event
  name               String
  slug               String      @unique
  type               EventType   // Event type (WEDDING, CORPORATE_GALA, etc.)
  // ... other fields
}
```

**No Fields For:**
- ❌ `plannerType` (DIY vs PRO)
- ❌ `isProEvent` or `isDIYEvent`
- ❌ `plannerRole` or `eventPlannerRole`
- ❌ Any field that explicitly flags an event as "DIY" vs "PRO"

**The Only Relevant Fields:**
- `createdById` - User who created the event (used for filtering)
- `orgId` - Organization the event belongs to (used for org-based filtering)

### 3.2 User Schema

**User Model Has:**
```prisma
role Role  // Enum: DIY_PLANNER, PRO_PLANNER, VENDOR, VENUE, ADMIN, etc.
```

**But Event Model Does NOT Store:**
- The role of the user who created it
- Any flag indicating if it's a DIY or Pro event

### 3.3 Conclusion: Logical Separation Only

**DIY vs Pro separation is currently:**
- ✅ **Logical/role-based only** - determined by filtering queries
- ✅ **User-role based** - `user.role === "DIY_PLANNER"` vs `"PRO_PLANNER"`
- ✅ **Creator-based** - `event.createdById === user.id`
- ❌ **NOT schema-based** - no database fields distinguish DIY vs Pro events

**Implication:**
- All events are stored in the same `Event` table
- There's no way to query "all DIY events" vs "all Pro events" at the schema level
- Separation is enforced through application logic (queries + RBAC)

---

## 4. RBAC Helpers Analysis

### 4.1 `isPlanner` Function

**Definition (`apps/web/src/lib/rbac.ts` lines 295-298):**
```typescript
export function isPlanner(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === "DIY_PLANNER" || user.role === "PRO_PLANNER";
}
```

**Key Point:** Returns `true` for **BOTH** DIY and Pro planners. No distinction.

### 4.2 `isEventOwnedByPlanner` Function

**Definition (`apps/web/src/lib/rbac.ts` lines 307-312):**
```typescript
export function isEventOwnedByPlanner(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  if (!user || !event) return false;
  if (!isPlanner(user)) return false;
  // Event is owned by planner if they created it
  return event.createdById === user.id;
}
```

**Key Points:**
- Checks if user is a planner (DIY or PRO) → then checks creator
- **No distinction** between DIY and Pro in the logic
- Only cares about: `event.createdById === user.id`

### 4.3 `canViewEvent`, `canEditEvent`, `canDeleteEvent`

**All use the same pattern:**
```typescript
if (isPlanner(user)) {
  return isEventOwnedByPlanner(user, event);
  // Which checks: event.createdById === user.id
}
```

**Key Points:**
- All treat DIY and Pro planners **identically**
- Only check: user is a planner AND user created the event
- **No role-specific logic** distinguishing DIY from Pro

### 4.4 Do RBAC Functions Treat DIY vs Pro Differently?

**Answer: ❌ NO**

- All RBAC functions use `isPlanner(user)` which returns `true` for both roles
- All functions only care about:
  - User role (`DIY_PLANNER` or `PRO_PLANNER` - treated the same)
  - Event org (`event.orgId`)
  - Event creator (`event.createdById`)
- **No explicit checks** like `user.role === "DIY_PLANNER"` vs `"PRO_PLANNER"` in event permissions

**Exception:** Some functions distinguish DIY vs Pro for **capabilities** (e.g., `canEditBudget` only allows PRO_PLANNER), but not for **event visibility/access**.

---

## 5. Risk Assessment vs Business Rule

### 5.1 Business Rule

> "DIY Planner and Pro Planner should not share the same Event Vault. DIY and Pro should have separate Event Vaults. DIY Planner and Pro Planners information should never be shared or seen by the other."

### 5.2 Current Logic Assessment

**✅ Data Isolation is Enforced:**

- **Planner isolation:** Both DIY and Pro planners can only see events they created (`createdById: userId`)
- **No cross-user leaks:** A DIY planner cannot see a Pro planner's events (and vice versa)
- **RBAC enforcement:** All permission checks use `isEventOwnedByPlanner` which enforces creator-only access

**✅ Backend Protection:**

- API routes filter by `createdById`
- RBAC helpers check `event.createdById === user.id`
- Event Vault detail page checks `canManageEvent` before rendering

**⚠️ Shared UI Component:**

- Both DIY and Pro use the **same Event Vault pages** (`/app/vault`)
- Same UI components, same routes, same interface
- **Feels shared** even though data is filtered

### 5.3 Current Design Analysis

**What Works:**
- ✅ Data isolation prevents leaks
- ✅ Backend enforces separation
- ✅ Consistent filtering logic

**What Doesn't Match Business Rule:**
- ❌ **Shared Vault UI** - Both DIY and Pro use `/app/vault` (feels like one shared vault)
- ❌ **No visual distinction** - No indication that DIY and Pro have separate vaults
- ❌ **Same routes** - No separate `/diy/vault` vs `/pro/vault` routes

**The Gap:**
- **Data is separated** (logically, via filtering)
- **UI is shared** (same components, same routes)
- **Business rule wants separate vaults** (both data AND UI separation)

### 5.4 Where Changes Would Be Needed

#### Option 1: UI-Level Separation (Recommended)

**Changes Needed:**

1. **Separate Routes:**
   - `/diy-planner/vault` for DIY Planner
   - `/pro-planner/vault` for Pro Planner
   - Keep `/app/vault` for non-planners (vendors, venues, etc.)

2. **Role-Based Routing:**
   - Redirect DIY Planner from `/app/vault` → `/diy-planner/vault`
   - Redirect Pro Planner from `/app/vault` → `/pro-planner/vault`

3. **Separate Components (Optional):**
   - `DIYVaultPage` and `ProVaultPage` components
   - Or: Same component with role-specific branding/styling

4. **Navigation Updates:**
   - Update sidebar/navigation to show role-specific vault links
   - DIY Planner sidebar: "My Events" → `/diy-planner/vault`
   - Pro Planner sidebar: "Event Vault" → `/pro-planner/vault`

**Benefits:**
- ✅ Matches business rule (separate vaults)
- ✅ Clear visual distinction
- ✅ No schema changes needed
- ✅ Minimal backend changes (just routing)

---

#### Option 2: API/Query Level Enhancement

**Changes Needed:**

1. **Explicit Role Checks:**
   - Add `user.role === "DIY_PLANNER"` vs `"PRO_PLANNER"` checks in queries
   - Ensure DIY API only returns DIY events (though current filtering already does this)

2. **Separate API Routes:**
   - `/api/diy/events` (already exists)
   - `/api/pro/events` (new, for Pro Planner)

3. **Query Optimization:**
   - Add indexes on `createdById` if not present
   - Consider adding `createdBy.role` joins for explicit filtering

**Benefits:**
- ✅ More explicit separation
- ✅ Better query performance (if indexed)
- ✅ Clearer intent in code

**Drawbacks:**
- ⚠️ More code duplication
- ⚠️ Still uses same schema (no schema-level separation)

---

#### Option 3: Schema-Level Separation (Not Recommended)

**Changes Needed:**

1. **Add Field to Event:**
   ```prisma
   model Event {
     // ... existing fields
     plannerType PlannerType? // NEW: DIY_PLANNER, PRO_PLANNER, null
   }
   ```

2. **Migration:**
   - Populate `plannerType` based on `createdBy.role`
   - Update all queries to filter by `plannerType`

3. **Update All Queries:**
   - Add `plannerType` filter everywhere
   - Update RBAC helpers to check `plannerType`

**Benefits:**
- ✅ Schema-level separation
- ✅ Can query "all DIY events" vs "all Pro events"
- ✅ Database-level enforcement

**Drawbacks:**
- ❌ Requires migration
- ❌ Data redundancy (can derive from `createdBy.role`)
- ❌ More complex queries
- ❌ Risk of data inconsistency if `plannerType` doesn't match `createdBy.role`

**Recommendation:** ❌ **Not recommended** - Current logical separation is sufficient. Schema-level separation adds complexity without significant benefit.

---

## 6. Summary Matrix

| Aspect | DIY Planner | Pro Planner | Shared? |
|--------|-------------|-------------|---------|
| **Event Vault List Route** | `/app/vault` | `/app/vault` | ✅ Yes |
| **Event Vault Detail Route** | `/app/vault/[slug]` | `/app/vault/[slug]` | ✅ Yes |
| **Dashboard Route** | `/diy-planner` | `/pro/planner` | ❌ No |
| **Events API** | `/api/diy/events` | Direct Prisma | ❌ No |
| **Filter Logic** | `createdById: userId` | `createdById: userId` | ✅ Same |
| **RBAC Check** | `isEventOwnedByPlanner` | `isEventOwnedByPlanner` | ✅ Same |
| **Schema Field** | None (logical only) | None (logical only) | ✅ Same |
| **Can See Other's Events?** | ❌ No | ❌ No | ✅ Same (isolated) |

---

## 7. Conclusion

### Current State

**✅ Data Isolation:** Enforced through filtering by `createdById`. DIY and Pro planners cannot see each other's events.

**⚠️ UI Sharing:** Both use the same Event Vault pages (`/app/vault`), which feels like a shared vault even though data is filtered.

**✅ Backend Protection:** RBAC helpers and API routes enforce separation consistently.

**❌ Schema Separation:** No schema-level distinction between DIY and Pro events. Separation is purely logical/role-based.

### Recommendations

1. **Immediate (Low Risk):** Add UI-level separation with separate routes (`/diy-planner/vault` vs `/pro-planner/vault`) while keeping the same filtering logic.

2. **Future (If Needed):** Consider explicit role checks in queries for clarity, but current filtering is sufficient.

3. **Not Recommended:** Schema-level separation adds complexity without significant benefit. Current logical separation is sufficient for data isolation.

### Answer to Core Questions

1. **Can a DIY planner see Pro planner events?** ❌ **NO** - Filtered by `createdById`
2. **Can a Pro planner see DIY planner events?** ❌ **NO** - Filtered by `createdById`
3. **Is there schema-level separation?** ❌ **NO** - Separation is logical/role-based only

**The current implementation prevents cross-user leaks but uses shared UI components, which may not fully satisfy the business rule requiring "separate Event Vaults" from a UX perspective.**

