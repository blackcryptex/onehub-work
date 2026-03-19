# Pro Planner → Client Intake, Stakeholders, Sharing, Payments Audit

**Date:** 2025-01-27  
**Type:** Read-Only Analysis  
**Scope:** Pro Planner → Client relationship model across permissions, intake, stakeholders, sharing, messaging, and payments

---

## Business Rules Evaluated

| Rule | Status | Notes |
|------|--------|-------|
| Client read-only + messaging | **PARTIAL** | CLIENT role exists, but no dedicated client dashboard or routes found |
| Client sees only shared/forwarded info | **MISSING** | No sharing/forwarding mechanism identified |
| Client can pay Pro Planner in-app | **PARTIAL** | Payment infrastructure exists, but buyerId/sellerId logic unclear for client-to-pro |
| Client can make deposits in-app | **MISSING** | No deposit-specific flow found (only milestone-based payments) |
| Pro Planner client intake during create | **MISSING** | Event wizard has no client intake step |
| Pro Planner can assign stakeholders | **PARTIAL** | Membership system exists, but no explicit stakeholder assignment UI for events |
| Pro Planner can remove stakeholders | **PARTIAL** | Membership removal exists, but not event-specific |

---

## Findings (Present / Partial / Missing)

### 1. Client Read-Only Permissions

**Status:** **PARTIAL**

**Evidence:**
- **CLIENT role exists:** `apps/web/prisma/schema.prisma` line 44 (Role enum includes CLIENT)
- **Default role:** `apps/web/prisma/schema.prisma` line 18 (User.role defaults to CLIENT)
- **No CLIENT dashboard:** `apps/web/src/components/layout/Sidebar.tsx` lines 10-42 (no CLIENT case in `itemsForRole`)
- **No CLIENT routes:** `apps/web/src/app/app/page.tsx` (no CLIENT-specific redirect logic)
- **RBAC helpers:** `apps/web/src/lib/rbac.ts` lines 407-447 (has `canViewClient`, `canEditClient`, `canDeleteClient` but no client-specific event access checks)

**Analysis:**
- CLIENT role is defined in the schema but has no dedicated UI or navigation
- Clients default to `/app` page which shows generic dashboard
- No explicit read-only enforcement for clients viewing planner events
- RBAC has client-related helpers but they check org ownership, not event access

**Risk:** Clients may be able to access planner vault routes if they know the URLs, as there's no explicit CLIENT role check in vault pages.

---

### 2. Client "Forwarded Info Only" Mechanism

**Status:** **MISSING**

**Evidence:**
- **No share table:** `apps/web/prisma/schema.prisma` (no Share, Forward, or ClientAccess model)
- **No sharing flags:** Event model has no `sharedWith`, `clientAccess`, or similar fields
- **No forwarding UI:** No components found for "share with client" or "forward to client"
- **Thread model:** `apps/web/prisma/schema.prisma` lines 891-905 (Thread exists but tied to org/event/proposal, not client-specific)

**Analysis:**
- No data model for tracking what information is shared with clients
- No mechanism to mark events/budgets/checklists as "client-visible"
- Thread system exists but is org-scoped, not client-scoped

**Risk:** Clients may have access to all planner events if they're org members, or no access at all if they're not.

---

### 3. Client Intake Step in Pro Create Event Wizard

**Status:** **MISSING**

**Evidence:**
- **Event wizard:** `apps/web/src/app/events/new/page.tsx` lines 10-475
- **Form fields:** Lines 14-26 (name, event_type_raw, date, city, state, zipCode, headcount, budget_raw, venue, objective, style)
- **No client fields:** No fields for client name, client email, client organization, or stakeholder assignment
- **No intake step:** Wizard is single-page form, no multi-step flow with client intake

**Analysis:**
- Event creation wizard collects event details only
- No step for linking/assigning clients or stakeholders
- No UI for client intake during event setup

**Risk:** Pro Planners must manually assign clients after event creation, if at all.

---

### 4. Stakeholder Data Model

**Status:** **PARTIAL**

**Evidence:**
- **No Stakeholder model:** `apps/web/prisma/schema.prisma` (no explicit Stakeholder or EventStakeholder model)
- **Membership model:** `apps/web/prisma/schema.prisma` lines 162-176 (Membership links User ↔ Organization)
- **ThreadParticipant:** `apps/web/prisma/schema.prisma` lines 907-914 (ThreadParticipant links User/Email ↔ Thread)
- **Event model:** `apps/web/prisma/schema.prisma` (Event has `orgId`, `createdById`, but no `stakeholders` or `clientIds`)

**Analysis:**
- Stakeholders are represented via Organization Membership, not event-specific
- No direct Event ↔ Client relationship
- Thread participants exist but are conversation-scoped, not event-scoped

**Risk:** Cannot assign clients to specific events without making them org members (which may grant broader access).

---

### 5. Stakeholder Assign UI + Backend

**Status:** **PARTIAL**

**Evidence:**
- **Invite system:** `apps/web/src/server/routers/invite.ts` lines 10-26 (can invite users to org via email)
- **Membership router:** `apps/web/src/server/routers/membership.ts` (can add/remove org members)
- **No event-specific assign:** No UI or API for assigning stakeholders to events
- **No client assign UI:** No component found for "Add Client to Event" or "Assign Stakeholder"

**Analysis:**
- Can invite users to organization (which grants access to all org events)
- Cannot assign users/clients to specific events
- No UI for stakeholder assignment in event detail pages

**Risk:** Pro Planners must add clients as org members to give them event access, which may grant access to all events.

---

### 6. Stakeholder Remove UI + Backend

**Status:** **PARTIAL**

**Evidence:**
- **Remove member:** `apps/web/src/server/routers/membership.ts` lines 12-23 (`removeMember` mutation)
- **Remove guest:** `apps/web/src/server/routers/guest.ts` lines 93-103 (`remove` mutation for guest list)
- **No event-specific remove:** No API for removing stakeholders from specific events
- **No UI:** No component found for "Remove Stakeholder from Event"

**Analysis:**
- Can remove org members (removes access to all org events)
- Can remove guests from guest lists
- Cannot remove stakeholders from specific events without removing org membership

**Risk:** Removing a client from an event requires removing them from the entire organization.

---

### 7. Client Payment UI

**Status:** **PARTIAL**

**Evidence:**
- **Contract payment panel:** `apps/web/src/components/payments/ContractPaymentPanel.tsx` (full payment UI with milestone support)
- **Contract page:** `apps/web/src/app/(app)/contracts/[id]/page.tsx` lines 143-148 (renders `ContractPaymentPanel` if userId exists)
- **Payment intent API:** `apps/web/src/app/api/payments/create-intent/route.ts` lines 46-50 (checks `buyerId === userId`)
- **Buyer/seller logic:** `apps/web/src/app/(app)/contracts/[id]/page.tsx` lines 48-55 (determines if user can sign, but buyerId/sellerId logic unclear)

**Analysis:**
- Payment UI exists and is functional
- Contract page shows payment panel if user is authenticated
- Payment intent API verifies buyer, but `buyerId` field logic is unclear (line 48 checks `buyerId === contract.proposal.event.orgId` which seems wrong)
- No explicit check if user is CLIENT role

**Risk:** Payment access may be based on contract buyerId/sellerId, but these fields may not be set correctly for client-to-pro payments.

---

### 8. Deposit Flow (Event-Scoped or General)

**Status:** **MISSING**

**Evidence:**
- **No deposit model:** `apps/web/prisma/schema.prisma` (no Deposit model)
- **No deposit API:** No `/api/deposits/*` routes found
- **Payment milestones:** `apps/web/prisma/schema.prisma` lines 696-712 (PaymentMilestone exists but tied to proposals/contracts)
- **Escrow accounts:** `apps/web/prisma/schema.prisma` lines 781-802 (EscrowAccount exists but tied to proposals, not events)

**Analysis:**
- No deposit-specific data model
- Payments are milestone-based (tied to contracts/proposals)
- Escrow accounts are proposal-scoped, not event-scoped
- No "make deposit" UI or flow

**Risk:** Clients cannot make deposits toward events/budgets; only milestone payments via contracts.

---

### 9. Payment Records + Webhook Persistence

**Status:** **PRESENT**

**Evidence:**
- **PaymentIntent model:** `apps/web/prisma/schema.prisma` lines 846-864 (tracks payerId, payeeId, contractId, milestoneId)
- **Transaction model:** `apps/web/prisma/schema.prisma` lines 874-889 (tracks payerId, payeeId, amounts, stripeChargeId)
- **Webhook handler:** `apps/web/src/app/api/stripe/webhook/route.ts` (processes `payment_intent.succeeded`)
- **WebhookEvent model:** `apps/web/prisma/schema.prisma` lines 837-844 (tracks processed webhook events for idempotency)
- **Payment linkage:** PaymentIntent links to contract, milestone, payer (User), payee (User)

**Analysis:**
- Payment records are properly linked to:
  - ✅ `payerId` (client userId)
  - ✅ `payeeId` (pro planner userId)
  - ✅ `contractId` (contract)
  - ✅ `milestoneId` (payment milestone)
- Webhook processing is idempotent (checks WebhookEvent before processing)
- Transaction records track net amount, platform fee, total amount

**Risk:** Low - payment tracking is well-implemented, but unclear if buyerId/sellerId are set correctly for client-to-pro payments.

---

## UX Flow Maps

### Pro Planner Create Event Flow Steps

1. **Entry:** Pro Planner Dashboard → "Create Event" button → `/events/new`
2. **Form:** Single-page wizard with fields:
   - Event Basics (name, type)
   - Date & Location (date, city, state, zipCode, venue)
   - Scale & Budget (headcount, budget)
   - Objective (optional)
   - Style & Theme (required)
3. **Submit:** POST `/api/events/create`
4. **Redirect:** `/app/vault/${slug}` (legacy route, then redirects to role-specific route)

**Missing:** No client intake step, no stakeholder assignment step

---

### Where Client Intake Fits (or Missing)

**Current:** Client intake is **MISSING** from event creation flow.

**Should be:** After event basics, before submit:
- Step 2: "Client & Stakeholders"
  - Add client organization (or create new)
  - Add client contacts/stakeholders
  - Set client access permissions

---

### Stakeholder Lifecycle Post-Create

**Current:**
1. Event created (no stakeholders assigned)
2. Pro Planner must manually:
   - Invite client to organization (`/api/invites/create`)
   - Client accepts invite → becomes org member
   - Client now has access to ALL org events (not just this one)

**Missing:**
- Event-specific stakeholder assignment
- Event-specific stakeholder removal
- Client access scoped to specific events

---

### Client Payment/Deposit Journey

**Current (Partial):**
1. Pro Planner creates proposal → contract
2. Contract has `buyerId` and `sellerId` (logic unclear)
3. Client accesses contract page (`/app/contracts/[id]`)
4. If `contract.buyerId === userId`, client sees `ContractPaymentPanel`
5. Client can pay milestones or full amount
6. Payment goes to escrow → released to pro planner

**Missing:**
- Deposit flow (pay toward event/budget without contract)
- Event-scoped deposits
- Budget-scoped deposits

**Risk:** Payment only works if `buyerId` is set correctly, which may not happen for client-to-pro payments.

---

## Risk Notes

### Areas Where CLIENT Might Access Planner-Only Data

1. **Vault Routes:**
   - **Risk:** `apps/web/src/app/(app)/vault/page.tsx` and `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` have no CLIENT role check
   - **Impact:** CLIENT users may access planner vault if they know the URL
   - **Evidence:** Lines 31-35 in vault/page.tsx only redirect DIY_PLANNER and PRO_PLANNER, not CLIENT

2. **Event Detail Pages:**
   - **Risk:** Event detail pages check org membership, not CLIENT role
   - **Impact:** If CLIENT is org member, they may see all events
   - **Evidence:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` lines 53-62 (checks org membership, not role)

3. **Contract Access:**
   - **Risk:** Contract pages check buyerId/sellerId, but logic may be incorrect
   - **Impact:** Clients may access contracts they shouldn't, or be blocked from contracts they should access
   - **Evidence:** `apps/web/src/app/(app)/contracts/[id]/page.tsx` lines 48-55 (buyerId check seems incorrect)

### Missing RBAC Enforcement in Payments or Sharing

1. **Payment Intent Creation:**
   - **Risk:** `apps/web/src/app/api/payments/create-intent/route.ts` line 48 checks `buyerId === userId` but buyerId may not be set correctly
   - **Impact:** Wrong users may create payment intents, or correct users may be blocked

2. **Sharing Mechanism:**
   - **Risk:** No sharing mechanism exists, so clients either see everything (if org member) or nothing (if not)
   - **Impact:** Cannot selectively share event information with clients

---

## Conclusion

### Is This Full Capability Present Today?

**NO** - The Pro Planner → Client relationship model is **PARTIALLY IMPLEMENTED** with significant gaps.

**Present:**
- ✅ CLIENT role exists in schema
- ✅ Payment infrastructure (Stripe integration, webhooks, records)
- ✅ Contract payment UI
- ✅ Membership system (org-level)
- ✅ Thread/messaging system (org-scoped)

**Partial:**
- ⚠️ Client permissions (role exists but no dedicated UI/routes)
- ⚠️ Payment access (UI exists but buyerId/sellerId logic unclear)
- ⚠️ Stakeholder assignment (org-level only, not event-specific)

**Missing:**
- ❌ Client intake in event creation
- ❌ Event-specific stakeholder assignment/removal
- ❌ Sharing/forwarding mechanism
- ❌ Deposit flow (event-scoped or general)
- ❌ Client dashboard/portal
- ❌ Read-only enforcement for clients

---

### Minimal Modules Needed (No Code)

1. **Client Intake Module:**
   - Add "Client & Stakeholders" step to event wizard
   - Fields: client organization, client contacts, access permissions
   - Store client-event relationships

2. **Stakeholder Assignment Module:**
   - Create `EventStakeholder` model (Event ↔ User relationship)
   - UI: "Add Stakeholder" button in event detail page
   - UI: "Remove Stakeholder" button
   - API: assign/remove stakeholders to/from events

3. **Sharing/Forwarding Module:**
   - Create `EventShare` or `ClientEventAccess` model
   - Fields: eventId, clientId, sharedAt, sharedBy, accessLevel
   - UI: "Share with Client" button in event detail page
   - Filter: Only show shared events to clients

4. **Client Dashboard Module:**
   - Create `/client/dashboard` route
   - Show only events shared with client
   - Show contracts where client is buyer
   - Show payment history
   - Show messages/threads

5. **Deposit Module:**
   - Create `Deposit` model (eventId, clientId, amountCents, status)
   - UI: "Make Deposit" button in client event view
   - API: create deposit payment intent
   - Link deposits to events/budgets

6. **RBAC Enforcement:**
   - Add CLIENT role checks to vault routes
   - Add `canClientViewEvent(user, event)` helper
   - Filter events by sharing status for clients
   - Enforce read-only for clients (hide Edit/Delete buttons)

---

## File References

### Key Files Examined

1. **Schema:**
   - `apps/web/prisma/schema.prisma` (Role enum, Event, Contract, PaymentIntent, Membership, Thread)

2. **Event Creation:**
   - `apps/web/src/app/events/new/page.tsx` (Event wizard)
   - `apps/web/src/app/api/events/create/route.ts` (Event creation API)

3. **RBAC:**
   - `apps/web/src/lib/rbac.ts` (Permission helpers)
   - `apps/web/src/components/layout/Sidebar.tsx` (Role-based navigation)

4. **Payments:**
   - `apps/web/src/components/payments/ContractPaymentPanel.tsx` (Payment UI)
   - `apps/web/src/app/api/payments/create-intent/route.ts` (Payment intent API)
   - `apps/web/src/app/(app)/contracts/[id]/page.tsx` (Contract page)

5. **Membership:**
   - `apps/web/src/server/routers/membership.ts` (Add/remove members)
   - `apps/web/src/server/routers/invite.ts` (Invite system)

6. **Vault Routes:**
   - `apps/web/src/app/(app)/vault/page.tsx` (Vault list)
   - `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` (Event detail)

7. **Messaging:**
   - `apps/web/src/server/routers/thread.ts` (Thread system)
   - `apps/web/src/app/(app)/messages/[threadId]/page.tsx` (Message page)

---

## Summary

The application has **foundational infrastructure** (CLIENT role, payment system, membership system) but is **missing the Pro Planner → Client relationship layer**. Key gaps:

1. **No client intake** during event creation
2. **No event-specific stakeholder assignment** (only org-level)
3. **No sharing/forwarding mechanism** for selective client access
4. **No deposit flow** (only milestone payments)
5. **No client dashboard** or dedicated client routes
6. **Weak RBAC enforcement** for clients (may access planner routes)

**Priority fixes:**
1. Add client intake step to event wizard
2. Create EventStakeholder model for event-specific assignments
3. Add sharing mechanism (EventShare model)
4. Create client dashboard with read-only access
5. Add RBAC checks to vault routes to prevent client access

