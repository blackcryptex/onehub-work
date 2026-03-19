# FINAL VISION LOCK AUDIT — Pro Planner → Client (Option A)

**Date:** 2025-01-27  
**Type:** Read-Only Analysis  
**Scope:** End-to-end validation of Pro Planner → Client system per Option A rules

---

## Executive Verdict

**Overall status:** **PARTIAL**  
**Confidence level:** **High**

**Top 5 Risks (ranked):**

1. **MISSING: Client Dashboard** — No dedicated `/client/dashboard` route exists. CLIENT users fall through to generic `/app` page.
2. **MISSING: Deposit Model** — No `Deposit` model in schema. Client deposit functionality not implemented.
3. **PARTIAL: Client Payment Flows** — Payment infrastructure exists (PaymentIntent, Transaction) but client-specific payment entry points not clearly identified.
4. **RISK: Route Guards** — Middleware only handles headers. Route protection relies on page-level checks which could be bypassed.
5. **PARTIAL: Messaging** — Messaging system exists but client-to-Pro messaging flow not explicitly validated.

---

## Vision Rule Scorecard

### 1. Option A Enforced (Clients NOT Org Members)

**Status:** ✅ **PRESENT**

**Evidence:**
- `EventStakeholder` model exists in schema (lines 354-369, `apps/web/prisma/schema.prisma`)
- Schema comment explicitly states: "Clients are NOT org members by default. They are event-scoped stakeholders only."
- `EventStakeholder` has `@@unique([eventId, userId])` constraint ensuring event-scoped relationship
- No evidence of org membership being used as substitute for client event access

**Violations:** None found

**File References:**
- `apps/web/prisma/schema.prisma:352-369`
- `apps/web/src/lib/rbac.ts:367-396` (canViewEvent checks stakeholders + shares, not org membership)

---

### 2. Client Read-Only + Messaging

**Status:** ✅ **PRESENT**

**Evidence:**
- `canViewEvent()` in `rbac.ts` (lines 367-396) explicitly denies CLIENT edit access
- `canEditEvent()` (lines 399-423) returns false for CLIENT users
- `canDeleteEvent()` (lines 433-436) returns false for CLIENT users
- Client event view at `/client/events/[eventSlug]` is read-only summary page
- Messaging system exists via `Thread` and `Message` models

**Gaps:**
- Client-to-Pro messaging flow not explicitly validated in audit
- No explicit UI component found for client messaging interface

**File References:**
- `apps/web/src/lib/rbac.ts:399-436`
- `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx` (read-only view)

---

### 3. Client Sees Only Shared/Forwarded Info

**Status:** ✅ **PRESENT**

**Evidence:**
- `EventShare` model exists (lines 377-392, `apps/web/prisma/schema.prisma`)
- `canViewEvent()` requires both stakeholder relationship AND share (lines 385-391, `rbac.ts`)
- Client event page checks `isEventSharedWithUser()` before showing content
- Share API endpoint exists: `/api/events/[eventSlug]/share` (POST/DELETE)

**Gaps:**
- Only `SUMMARY` scope exists. No `BUDGET`, `CHECKLIST`, or `GUEST` scopes found.
- Client view shows basic event info even without explicit share (shows "Nothing shared yet" message)

**File References:**
- `apps/web/prisma/schema.prisma:371-392` (EventShare model)
- `apps/web/src/lib/rbac.ts:349-356` (isEventSharedWithUser)
- `apps/web/src/app/api/events/[eventSlug]/share/route.ts`

---

### 4. Client Intake in Pro Create Wizard

**Status:** ✅ **PRESENT**

**Evidence:**
- Event wizard has "clients" step (line 11, `apps/web/src/app/events/new/page.tsx`)
- Step only shown for PRO_PLANNER (line 174)
- `ClientIntakeStep` component imported and used (line 549)
- Event creation API accepts `clientIds` and `autoShareSummary` (lines 28-29, `apps/web/src/app/api/events/create/route.ts`)
- Creates `EventStakeholder` records (lines 323-354)
- Optionally creates `EventShare` SUMMARY records (lines 356-374)

**File References:**
- `apps/web/src/app/events/new/page.tsx:11, 174, 547-571`
- `apps/web/src/app/api/events/create/route.ts:323-387`

---

### 5. Pro Assign/Remove Stakeholders

**Status:** ✅ **PRESENT**

**Evidence:**
- Stakeholder management API exists: `/api/events/[eventSlug]/stakeholders`
- POST endpoint adds stakeholders (lines 18-116)
- DELETE endpoint removes stakeholders (lines 124-194)
- Both endpoints check `canManageEvent()` permission
- DELETE also cleans up EventShare records (lines 182-187)
- `ManageStakeholders` component imported in vault detail page (line 21)

**File References:**
- `apps/web/src/app/api/events/[eventSlug]/stakeholders/route.ts`
- `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:21`

---

### 6. Sharing Scopes (SUMMARY Minimum)

**Status:** ⚠️ **PARTIAL**

**Evidence:**
- `EventShareScope` enum only has `SUMMARY` (line 371, `schema.prisma`)
- Share API supports `SUMMARY` scope (line 9, `share/route.ts`)
- Client view checks for `SUMMARY` share (line 49, `client/events/[eventSlug]/page.tsx`)

**Gaps:**
- No `BUDGET`, `CHECKLIST`, or `GUEST` scopes exist
- Vision mentions "At minimum SUMMARY scope" — this is met, but no additional scopes implemented

**File References:**
- `apps/web/prisma/schema.prisma:371-373`
- `apps/web/src/app/api/events/[eventSlug]/share/route.ts:9`

---

### 7. Client Dashboard Present

**Status:** ❌ **MISSING**

**Evidence:**
- No `/client/dashboard` route found
- No `/client` directory structure found (only `/client/events/[eventSlug]`)
- Sidebar component (`apps/web/src/components/layout/Sidebar.tsx`) has no CLIENT case — defaults to generic `/app` dashboard
- `/app/page.tsx` handles CLIENT users but shows generic dashboard (no client-specific content)

**Gaps:**
- Client dashboard should show:
  - Messages
  - Shared-with-you events
  - Payment/deposit history
- None of these are present in current implementation

**File References:**
- `apps/web/src/components/layout/Sidebar.tsx:10-42` (no CLIENT case)
- `apps/web/src/app/app/page.tsx` (generic dashboard for CLIENT)

---

### 8. Client Can Pay Pro In-App

**Status:** ⚠️ **PARTIAL**

**Evidence:**
- Payment infrastructure exists: `PaymentIntent`, `Transaction` models
- Stripe integration exists (`apps/web/src/server/routers/billing.ts`)
- Escrow payment flow exists (`escrowCreatePaymentIntent`)
- Payment webhook handler exists (`apps/web/src/app/api/stripe/webhook/route.ts`)

**Gaps:**
- No explicit client payment entry point found
- Payment flows appear tied to proposals/contracts, not direct client-to-Pro payments
- No UI component found for client payment interface
- PaymentIntent model has `payerId` and `payeeId` but no explicit event-scoped validation for clients

**File References:**
- `apps/web/prisma/schema.prisma:899-917` (PaymentIntent)
- `apps/web/src/server/routers/billing.ts:27-61`

---

### 9. Client Can Make Event-Scoped Deposits

**Status:** ❌ **MISSING**

**Evidence:**
- No `Deposit` model found in schema
- No deposit-related API endpoints found
- No deposit UI components found
- PaymentIntent/Transaction models exist but are not explicitly tied to deposits

**Gaps:**
- Deposit model should have:
  - `eventId` (primary)
  - `clientUserId`
  - `proOrgId` / `proPlannerId`
  - `amountCents`
  - `status`
- None of these exist

**File References:**
- Schema search: No `Deposit` model in `apps/web/prisma/schema.prisma`

---

### 10. RBAC Hardening (No URL Leakage)

**Status:** ⚠️ **PARTIAL**

**Evidence:**
- `canViewEvent()` properly checks stakeholder + share (lines 367-396, `rbac.ts`)
- Client route `/client/events/[eventSlug]` checks role and permissions (lines 28-31, 60)
- Legacy vault route `/app/vault/[eventSlug]` blocks CLIENT users (lines 50-54)
- Pro Planner routes redirect planners away from legacy routes (lines 44-48, vault detail page)
- Route helpers in `lib/routes.ts` exist but CLIENT not explicitly handled

**Gaps:**
- Middleware (`apps/web/src/middleware.ts`) only handles headers, not route protection
- Route protection relies on page-level checks which could be bypassed with direct API calls
- No server-side middleware blocking CLIENT access to `/pro/planner/*` or `/diy-planner/*` routes
- Route helpers don't have CLIENT-specific paths

**File References:**
- `apps/web/src/middleware.ts` (minimal, only headers)
- `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:50-54` (CLIENT block)
- `apps/web/src/lib/routes.ts` (no CLIENT case)

---

## Architecture Alignment Map

### Data Models Involved

✅ **EventStakeholder** (`schema.prisma:354-369`)
- Fields: `eventId`, `userId`, `role`, `addedByUserId`
- Constraints: `@@unique([eventId, userId])`
- Status: **PRESENT**

✅ **EventShare** (`schema.prisma:377-392`)
- Fields: `eventId`, `viewerUserId`, `scope`, `createdByUserId`
- Constraints: `@@unique([eventId, viewerUserId, scope])`
- Status: **PRESENT**

❌ **Deposit** (Not found)
- Expected fields: `eventId`, `clientUserId`, `proOrgId`, `amountCents`, `status`
- Status: **MISSING**

✅ **PaymentIntent** (`schema.prisma:899-917`)
- Fields: `payerId`, `payeeId`, `amountCents`, `contractId`, `milestoneId`
- Status: **PRESENT** (but not explicitly event-scoped for client payments)

---

### Access Control Layers

1. **RBAC Utilities** (`apps/web/src/lib/rbac.ts`)
   - ✅ `canViewEvent()` — checks stakeholder + share
   - ✅ `canEditEvent()` — denies CLIENT
   - ✅ `canDeleteEvent()` — denies CLIENT
   - ✅ `canManageEvent()` — used for stakeholder management
   - ✅ `isEventSharedWithUser()` — checks share scope

2. **Route Guards**
   - ⚠️ Page-level checks (present but not middleware-level)
   - ❌ Middleware-level protection (missing)
   - ✅ API endpoint permission checks (present)

3. **Route Helpers** (`apps/web/src/lib/routes.ts`)
   - ⚠️ CLIENT not explicitly handled
   - ✅ Planner routes properly mapped

---

### Route Namespaces

✅ **Pro Planner Routes**
- `/pro/planner` — Dashboard
- `/pro/planner/vault` — Vault index
- `/pro/planner/vault/[eventSlug]` — Vault detail
- Status: **PRESENT** with role guards

✅ **Client Routes**
- `/client/events/[eventSlug]` — Event summary view
- Status: **PARTIAL** (only event detail, no dashboard)

❌ **Client Dashboard**
- `/client/dashboard` — Missing
- `/client` — Missing

⚠️ **Legacy Routes**
- `/app/vault/*` — Present, blocks CLIENT users
- `/app/events/*` — Present, access controlled by `canViewEvent()`

---

### UI Surfaces

✅ **Pro Planner UI**
- Event wizard with client intake step
- Vault detail page with stakeholder management
- Share event button component
- Status: **PRESENT**

⚠️ **Client UI**
- Event summary view (read-only)
- Status: **PARTIAL** (missing dashboard, payment UI, messaging UI)

---

## Edge Cases Checklist

### ✅ Removed Stakeholder Access Revocation

**Status:** **PRESENT**

**Evidence:**
- DELETE `/api/events/[eventSlug]/stakeholders` removes stakeholder (lines 170-175)
- Also deletes EventShare records (lines 182-187)
- Client would lose access immediately

**File:** `apps/web/src/app/api/events/[eventSlug]/stakeholders/route.ts:182-187`

---

### ✅ Unshared Content Access

**Status:** **PRESENT**

**Evidence:**
- Client event page checks `canViewEvent()` which requires share (line 60)
- If stakeholder but not shared, shows "Nothing shared yet" message (lines 67-81)
- Does not expose sensitive content

**File:** `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:60-86`

---

### ⚠️ Legacy URL Attempts

**Status:** **PARTIAL**

**Evidence:**
- Legacy `/app/vault/[eventSlug]` blocks CLIENT users (line 50-54, vault detail page)
- Pro Planner routes redirect planners away from legacy routes (lines 44-48)
- But no middleware-level protection — relies on page-level checks

**Risk:** Direct API calls could potentially bypass page-level checks

**File:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:44-54`

---

### ❌ Payment Without Share

**Status:** **MISSING**

**Evidence:**
- No deposit model or payment flow found
- PaymentIntent exists but not explicitly validated for client event access
- No RBAC check found that prevents payment without stakeholder relationship

**Gap:** Should validate client is stakeholder before allowing payment

---

### ⚠️ Message-Only Client with Zero Shares

**Status:** **PARTIAL**

**Evidence:**
- Messaging system exists (Thread, Message models)
- But no explicit validation that client can message Pro even without shares
- No UI component found for client messaging

**Gap:** Messaging flow not explicitly validated in audit

---

## "No Stone Unturned" Keyword Sweep

### ✅ "CLIENT" Usage

**Findings:**
- Role enum includes CLIENT (`packages/types/src/roles.ts:9`)
- RBAC functions check `user.role === "CLIENT"` appropriately
- Client routes exist but limited
- No violations found where CLIENT incorrectly granted planner access

**Status:** **CLEAN**

---

### ✅ "stakeholder" Usage

**Findings:**
- EventStakeholder model properly used
- Stakeholder management API exists
- `canViewEvent()` checks stakeholders
- No violations found

**Status:** **CLEAN**

---

### ✅ "member" Usage

**Findings:**
- `isOrgMember()` function exists but NOT used for client event access
- Client access uses EventStakeholder, not org membership
- No violations found

**Status:** **CLEAN** (Option A enforced)

---

### ⚠️ "organization" Usage

**Findings:**
- Organization model used for Pro Planner orgs
- No evidence of CLIENT being added as org members for event access
- But: Event creation looks up org by `ownerId` and `type: "PLANNER"` (line 223, create route)
- This is correct — Pro Planner's org, not client org

**Status:** **CLEAN**

---

### ✅ "share" Usage

**Findings:**
- EventShare model properly used
- Share API endpoints exist
- `isEventSharedWithUser()` function exists
- No violations found

**Status:** **CLEAN**

---

### ⚠️ "forward" Usage

**Findings:**
- No explicit "forward" functionality found
- Sharing is implemented but "forwarding" terminology not used
- May be semantic difference — sharing = forwarding in this context

**Status:** **PARTIAL** (functionality exists, terminology differs)

---

### ❌ "deposit" Usage

**Findings:**
- No Deposit model found
- No deposit-related code found
- Only found in documentation/audit files, not implementation

**Status:** **MISSING**

---

### ⚠️ "payment" Usage

**Findings:**
- PaymentIntent, Transaction models exist
- Payment flows exist but tied to proposals/contracts
- No explicit client-to-Pro payment flow found
- Payment webhook exists

**Status:** **PARTIAL**

---

### ✅ "vault" Usage

**Findings:**
- Vault routes properly role-guarded
- CLIENT users blocked from `/app/vault/*`
- Route helpers exist
- No violations found

**Status:** **CLEAN**

---

### ✅ Hardcoded Routes

**Findings:**
- `/app/vault` — Present, properly guarded
- `/app/events` — Present, access controlled
- Route helpers used in most places
- Some hardcoded routes but they're properly protected

**Status:** **ACCEPTABLE**

---

## Conclusion

### Is the Full Vision on Track?

**Status:** **PARTIAL** — Core architecture is solid, but key client-facing features are missing.

**Strengths:**
1. ✅ Option A properly enforced — clients are event-scoped stakeholders, not org members
2. ✅ RBAC utilities correctly implement stakeholder + share model
3. ✅ Pro Planner wizard includes client intake step
4. ✅ Stakeholder management (assign/remove) implemented
5. ✅ Sharing/forwarding infrastructure exists
6. ✅ Route-level protection blocks CLIENT from planner namespaces

**Gaps:**
1. ❌ Client dashboard missing — no `/client/dashboard` route
2. ❌ Deposit model missing — no event-scoped deposit functionality
3. ⚠️ Client payment flows unclear — payment infrastructure exists but client-specific entry points not found
4. ⚠️ Route guards rely on page-level checks — no middleware-level protection
5. ⚠️ Messaging flow not explicitly validated — system exists but client-to-Pro flow unclear

---

### What Remains (Minimal "Alignment Patches")

**Phase 7 Implementation Plan (No Code Changes — Analysis Only):**

1. **Client Dashboard** (`/client/dashboard`)
   - Show shared events (query events where user is stakeholder + has share)
   - Show messages/threads
   - Show payment/deposit history (once deposit model exists)
   - Add to Sidebar component for CLIENT role

2. **Deposit Model**
   - Create `Deposit` model in schema with:
     - `eventId` (required)
     - `clientUserId` (required)
     - `proOrgId` (required)
     - `amountCents` (required)
     - `status` (enum: PENDING, COMPLETED, REFUNDED)
     - `stripePaymentIntentId` (optional, for Stripe integration)
   - Create API endpoints: POST `/api/events/[eventSlug]/deposits`, GET `/api/events/[eventSlug]/deposits`
   - Add RBAC: Only linked clients can create deposits for their events

3. **Client Payment Entry Points**
   - Add payment UI to client event view
   - Validate client is stakeholder before allowing payment
   - Integrate with existing PaymentIntent/Transaction models
   - Add payment history view to client dashboard

4. **Middleware Route Protection**
   - Add middleware check for `/pro/planner/*` and `/diy-planner/*` routes
   - Block CLIENT users at middleware level (not just page level)
   - Add middleware check for `/app/vault/*` routes

5. **Client Messaging UI**
   - Add messaging component to client dashboard
   - Validate client can message Pro Planner for events where they're stakeholders
   - Add message thread list to client event view

6. **Route Helpers for CLIENT**
   - Add CLIENT case to `getVaultBasePath()` — should return `/client` or similar
   - Add `clientDashboard()` helper
   - Add `clientEventDetail(eventSlug)` helper

---

**Confidence:** High — Core architecture is sound. Missing pieces are clearly identifiable and implementable.

**Risk Level:** Medium — Missing client dashboard and deposits are significant gaps, but foundation is solid.
