# Route Helper Documentation

## Overview

The `routes.ts` module provides centralized, role-aware navigation helpers for all event and vault routes. This ensures consistent routing and prevents navigation drift across role boundaries.

## Why This Exists

Previously, hardcoded route strings like `/app/vault` and `/app/events/*` were scattered throughout the codebase. This caused:
- **Navigation drift**: Planners clicking links would be routed to wrong role areas
- **Inconsistency**: Different components used different route patterns
- **Maintenance burden**: Route changes required updates in many files

The route helper solves these problems by:
1. Centralizing all route logic in one place
2. Automatically determining the correct route based on user role
3. Making it impossible to accidentally use wrong routes

## Usage

### Import

```typescript
import { 
  vaultIndex, 
  vaultDetail, 
  eventBudget, 
  eventGuests, 
  eventChecklists,
  proposalDetail,
  contractDetail,
  dashboard
} from "@/lib/routes";
```

### Basic Functions

#### `vaultIndex(role: Role | undefined): string`
Returns the vault list route for a given role.

**Examples:**
- `vaultIndex("DIY_PLANNER")` → `"/diy-planner/vault"`
- `vaultIndex("PRO_PLANNER")` → `"/pro/planner/vault"`
- `vaultIndex("VENDOR")` → `"/app/vault"` (legacy route)

#### `vaultDetail(role: Role | undefined, eventSlug: string): string`
Returns the vault detail route for a given role and event.

**Examples:**
- `vaultDetail("DIY_PLANNER", "my-event")` → `"/diy-planner/vault/my-event"`
- `vaultDetail("PRO_PLANNER", "my-event")` → `"/pro/planner/vault/my-event"`
- `vaultDetail("VENDOR", "my-event")` → `"/app/vault/my-event"`

#### `eventBudget(role: Role | undefined, eventSlug: string): string`
Returns the budget route. For planners, uses vault routes. For others, uses legacy event routes.

**Examples:**
- `eventBudget("DIY_PLANNER", "my-event")` → `"/diy-planner/vault/my-event/budget"`
- `eventBudget("PRO_PLANNER", "my-event")` → `"/pro/planner/vault/my-event/budget"`
- `eventBudget("VENDOR", "my-event")` → `"/app/events/my-event/budget"`

#### `eventGuests(role: Role | undefined, eventSlug: string): string`
Returns the guests route. Role-aware like `eventBudget`.

#### `eventChecklists(role: Role | undefined, eventSlug: string): string`
Returns the checklists route. Role-aware like `eventBudget`.

#### `proposalDetail(proposalId: string): string`
Returns the proposal detail route. **Shared across all roles** (not role-specific).

**Example:**
- `proposalDetail("prop-123")` → `"/app/proposals/prop-123"`

#### `contractDetail(contractId: string): string`
Returns the contract detail route. **Shared across all roles** (not role-specific).

**Example:**
- `contractDetail("contract-123")` → `"/app/contracts/contract-123"`

#### `dashboard(role: Role | undefined): string`
Returns the dashboard route for a given role.

**Examples:**
- `dashboard("DIY_PLANNER")` → `"/diy-planner"`
- `dashboard("PRO_PLANNER")` → `"/pro/planner"`
- `dashboard("VENDOR")` → `"/vendor/dashboard"`

## Role-to-Path Mapping

| Role | Vault Base Path | Dashboard Path |
|------|----------------|----------------|
| `DIY_PLANNER` | `/diy-planner/vault` | `/diy-planner` |
| `PRO_PLANNER` | `/pro/planner/vault` | `/pro/planner` |
| `VENDOR` | `/app/vault` (legacy) | `/vendor/dashboard` |
| `VENUE` | `/app/vault` (legacy) | `/venue/dashboard` |
| `ADMIN` | `/app/vault` (legacy) | `/app` |
| Others | `/app/vault` (legacy) | `/app` |

## Shared Routes (Not Role-Specific)

These routes are intentionally shared across all roles:
- `/app/proposals/[id]` - Proposal detail
- `/app/contracts/[id]` - Contract detail

These routes handle role-based permissions internally, so they don't need role-specific paths.

## When to Use Route Helpers

### ✅ Always Use Route Helpers For:

1. **Vault navigation** - Any link to vault list or detail pages
2. **Event sub-pages** - Budget, guests, checklists links
3. **Dashboard links** - Links to role-specific dashboards
4. **Any navigation that depends on user role**

### ❌ Don't Use Route Helpers For:

1. **Shared routes** - Proposals and contracts (use direct paths)
2. **Public routes** - Sign-in, sign-up, landing pages
3. **API routes** - `/api/*` paths
4. **Static routes** - Routes that never change

## Examples

### In a Server Component

```typescript
import { getCurrentUser } from "@/lib/auth-helpers";
import { vaultDetail, eventBudget } from "@/lib/routes";

export default async function MyPage() {
  const user = await getCurrentUser();
  const eventSlug = "my-event";
  
  return (
    <Link href={vaultDetail(user?.role, eventSlug)}>
      View Event
    </Link>
  );
}
```

### In a Client Component

```typescript
"use client";
import { useSession } from "next-auth/react";
import { vaultDetail, eventBudget } from "@/lib/routes";
import Link from "next/link";

export function MyComponent() {
  const { data: session } = useSession();
  const eventSlug = "my-event";
  
  return (
    <Link href={vaultDetail(session?.user?.role, eventSlug)}>
      View Event
    </Link>
  );
}
```

### With Next.js Router

```typescript
"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { vaultDetail } from "@/lib/routes";

export function MyComponent() {
  const router = useRouter();
  const { data: session } = useSession();
  const eventSlug = "my-event";
  
  const handleClick = () => {
    router.push(vaultDetail(session?.user?.role, eventSlug) as any);
  };
  
  return <button onClick={handleClick}>Go to Event</button>;
}
```

## Migration Guide

### Before (Hardcoded Routes)

```typescript
// ❌ Bad: Hardcoded route
<Link href="/app/vault/my-event">View Event</Link>

// ❌ Bad: Conditional logic scattered
const href = user.role === "DIY_PLANNER" 
  ? `/diy-planner/vault/${slug}`
  : `/app/vault/${slug}`;
```

### After (Route Helpers)

```typescript
// ✅ Good: Centralized route helper
import { vaultDetail } from "@/lib/routes";
<Link href={vaultDetail(user.role, eventSlug)}>View Event</Link>
```

## Testing

When testing components that use route helpers:

1. **Test with different roles** - Verify routes are correct for each role
2. **Test undefined role** - Ensure graceful fallback to legacy routes
3. **Test navigation flow** - Verify users stay in their role context

## Maintenance

### Adding New Routes

1. Add the function to `routes.ts`
2. Document the function in this README
3. Update any components that need the new route
4. Add tests if applicable

### Changing Route Patterns

1. Update the function in `routes.ts`
2. All components using the helper will automatically use the new route
3. Update this documentation

## Related Files

- `apps/web/src/lib/routes.ts` - Route helper implementation
- `apps/web/src/lib/rbac.ts` - RBAC helpers (used for permission checks)
- `apps/web/src/components/events/EventActions.tsx` - Uses route helpers for Edit navigation

