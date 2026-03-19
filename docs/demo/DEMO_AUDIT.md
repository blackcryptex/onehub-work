# OneHub Investor Demo Readiness Audit

**Date:** 2025-01-XX  
**Auditor:** Lead Engineer + Demo Designer  
**Purpose:** Identify gaps and produce prioritized punch list for investor demo readiness

---

## A) REPO ARCHITECTURE MAP

### Stack Overview

**Framework & Routing:**
- **Next.js 14.2.6** with App Router (`apps/web/src/app/`)
- **TypeScript** with strict mode
- **Tailwind CSS** for styling
- Route groups: `(app)`, `(auth)` for layout organization

**Authentication:**
- **NextAuth 5.0.0-beta.25** (JWT strategy)
- Providers: Credentials (email/password), Google OAuth (optional)
- Session management: 12-hour max age, 1-hour update age
- File: `apps/web/src/lib/auth.ts`
- Route: `/api/auth/[...nextauth]/route.ts`

**Database & ORM:**
- **PostgreSQL** via Prisma 5.20.0
- Schema: `apps/web/prisma/schema.prisma`
- Migrations: `apps/web/prisma/migrations/`
- Client: `apps/web/src/lib/prisma.ts`

**Payments:**
- **Stripe 17.3.1** (Connect for vendors, PaymentIntents for escrow)
- Webhook handler: `apps/web/src/app/api/stripe/webhook/route.ts`
- Demo mode: `apps/web/src/lib/demo-mode.ts` (env: `ONEHUB_DEMO_MODE=true`)
- Payment routes: `apps/web/src/app/api/payments/**`

**AI/ML:**
- **OpenAI 6.9.1** for proposal/contract generation
- Fallback mode when API key missing (demo-safe)
- Router: `apps/web/src/server/routers/ai.ts`

**State Management:**
- **tRPC 10.45.2** for type-safe API calls
- **Zustand 4.5.2** for client state
- **React Query 5.51.1** for server state

### Key Paths Index

#### Authentication & Onboarding
- Sign in: `apps/web/src/app/(auth)/signin/page.tsx`
- Sign up: `apps/web/src/app/(auth)/signup/page.tsx`
- Role-based redirect: `apps/web/src/app/app/page.tsx` (lines 13-64)
- Pro Planner setup: `apps/web/src/app/professional-planner/setup/page.tsx`
- Vendor/Venue setup: `apps/web/src/app/vendor-venue/setup/page.tsx`

#### Role Dashboards
- Pro Planner: `apps/web/src/app/pro/planner/page.tsx`
- DIY Planner: `apps/web/src/app/diy-planner/page.tsx`
- Vendor: `apps/web/src/app/vendor/dashboard/page.tsx`
- Venue: `apps/web/src/app/venue/dashboard/page.tsx`
- Admin: `apps/web/src/app/(app)/admin/overview/page.tsx`
- Client: `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx`

#### Event Management
- Event creation: `apps/web/src/app/events/new/page.tsx`
- Event detail: `apps/web/src/app/(app)/events/[eventSlug]/page.tsx`
- Event Vault (Pro): `apps/web/src/app/pro/planner/vault/page.tsx`
- Event Vault (DIY): `apps/web/src/app/diy-planner/vault/page.tsx`
- Event Vault detail: `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`

#### Marketplace
- Marketplace browse: `apps/web/src/app/marketplace/page.tsx`
- Listing detail: `apps/web/src/app/marketplace/[slug]/page.tsx`
- Vendor search: `apps/web/src/app/explore/vendors/page.tsx`
- Search API: `apps/web/src/server/routers/search.ts`

#### Proposals & Contracts
- Proposal creation: `apps/web/src/app/(app)/events/[eventSlug]/proposals/new/page.tsx`
- Proposal detail: `apps/web/src/app/(app)/proposals/[id]/page.tsx`
- Contract detail: `apps/web/src/app/(app)/contracts/[id]/page.tsx`
- Proposal router: `apps/web/src/server/routers/proposal.ts`
- Contract router: `apps/web/src/server/routers/contract.ts`

#### Payments & Escrow
- Payment plan page: `apps/web/src/app/(app)/events/[eventSlug]/milestones/page.tsx`
- Payment plan client: `apps/web/src/components/payments/PaymentPlanPageClient.tsx`
- Deposit auto-create: `apps/web/src/app/api/payments/deposits/auto/route.ts`
- Payout auto-build: `apps/web/src/app/api/payments/plan/from-accepted-proposals/route.ts`
- Demo funding: `apps/web/src/app/api/demo/milestones/[id]/fund/route.ts`
- Demo release: `apps/web/src/app/api/demo/payouts/[id]/release/route.ts`

#### Admin & Audit
- Admin overview: `apps/web/src/app/(app)/admin/overview/page.tsx`
- Audit logs: `apps/web/src/server/routers/audit.ts`
- Abuse reports: `apps/web/src/app/(app)/admin/abuse/page.tsx`

#### Demo Infrastructure
- Demo launcher: `apps/web/src/app/demo/page.tsx`
- Demo start: `apps/web/src/app/demo/start/page.tsx`
- Demo preflight: `apps/web/src/app/api/demo/preflight/route.ts` (assumed)
- Seed script: `scripts/seed.ts`

---

## B) DEMO STORYLINE FIT

### Best Narrative (Current Code Supports)

**Primary Story: "Pro Planner orchestrates a wedding with escrow-protected payments"**

**Act 1: Event Setup (30 seconds)**
- Pro Planner logs in → Dashboard → Event Vault
- Views "Demo Wedding Event" (pre-seeded)
- Shows event details: Chicago, IL wedding, $50K budget, 150 guests

**Act 2: Vendor Discovery (60 seconds)**
- Clicks "AI Source Vendors & Venues"
- AI suggests vendors based on event type/location
- Adds verified vendor (e.g., "Elite Photography Studio") to shortlist
- Shows marketplace with filters (category, price tier, location)

**Act 3: Proposal & Contract (90 seconds)**
- Generates AI proposal from shortlist
- Proposal shows line items, milestones, total ($8,000)
- Accepts proposal → Auto-generates contract
- Contract shows terms, signatures (placeholder), status: OUT_FOR_SIGNATURE

**Act 4: Escrow & Payments (120 seconds)**
- Navigates to Payments & Escrow page
- Shows deposit schedule (30/40/30 split)
- Client funds deposit → Status: IN_ESCROW
- Planner allocates payout to vendor
- Releases payout → Status: SENT
- Shows OneHub revenue breakdown (3% platform fee)

**Act 5: Status Tracking (30 seconds)**
- Activity feed shows milestones completed
- Timeline shows payment releases
- Admin view: transaction log, audit trail

**Total: ~5 minutes**

### Backup "Safe Path" (2-3 minutes)

If AI/proposals fail:
1. Show pre-seeded proposal (already accepted)
2. Jump to Payments & Escrow page
3. Show escrow balance, funded deposits, released payouts
4. Demonstrate payout release (demo mode)
5. Show revenue breakdown

**Screen Order (Happy Path):**
1. `/demo` → Preflight check
2. `/demo/start?role=pro` → Auto-login as Pro Planner
3. `/pro/planner/vault/demo-wedding` → Event Vault detail
4. `/app/events/demo-wedding` → Event overview
5. `/app/events/demo-wedding/proposals/new` → Create proposal (or show existing)
6. `/app/proposals/[id]` → Proposal detail
7. `/app/contracts/[id]` → Contract detail
8. `/app/events/demo-wedding/milestones` → Payments & Escrow
9. `/app/admin/overview` → Admin dashboard (optional)

---

## C) PASS/FAIL MATRIX (Investor Demo Essentials)

### 1. Auth + Onboarding Per Role

| Role | Sign In | Sign Up | Dashboard Redirect | Onboarding Flow | Status |
|------|---------|---------|-------------------|-----------------|--------|
| **CLIENT** | ✅ PASS | ✅ PASS | ✅ PASS (`/app`) | ⚠️ PARTIAL (no dedicated onboarding) | **PARTIAL** |
| **DIY_PLANNER** | ✅ PASS | ✅ PASS | ✅ PASS (`/diy-planner`) | ✅ PASS | **PASS** |
| **PRO_PLANNER** | ✅ PASS | ✅ PASS | ✅ PASS (`/pro/planner`) | ✅ PASS (`/professional-planner/setup`) | **PASS** |
| **VENDOR** | ✅ PASS | ✅ PASS | ✅ PASS (`/vendor/dashboard`) | ✅ PASS (`/vendor-venue/setup`) | **PASS** |
| **VENUE** | ✅ PASS | ✅ PASS | ✅ PASS (`/venue/dashboard`) | ✅ PASS (`/vendor-venue/setup`) | **PASS** |
| **ADMIN** | ✅ PASS | ✅ PASS | ✅ PASS (`/app`) | ⚠️ PARTIAL (no onboarding) | **PARTIAL** |

**Files:**
- Auth: `apps/web/src/lib/auth.ts`
- Redirects: `apps/web/src/app/app/page.tsx` (lines 27-64)
- Onboarding: `apps/web/src/app/professional-planner/setup/page.tsx`, `apps/web/src/app/vendor-venue/setup/page.tsx`

**Gaps:**
- CLIENT role has no dedicated onboarding flow (they're added as stakeholders by planners)
- ADMIN has no onboarding (assumed manual creation)

---

### 2. Role-Based Routing + Dashboard Nav

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Sidebar navigation** | ✅ `apps/web/src/components/layout/Sidebar.tsx` (role-based items) | **PASS** |
| **Dashboard routing** | ✅ Role-specific redirects in `apps/web/src/app/app/page.tsx` | **PASS** |
| **Vault routing** | ⚠️ Multiple vault routes (`/pro/planner/vault`, `/diy-planner/vault`, `/app/vault`) | **PARTIAL** |
| **Event detail routing** | ✅ `/app/events/[eventSlug]` (unified) | **PASS** |

**Files:**
- Sidebar: `apps/web/src/components/layout/Sidebar.tsx`
- Routes: `apps/web/src/lib/routes.ts` (assumed)

**Gaps:**
- Vault routing is fragmented (role-specific vs unified `/app/vault`)
- Some vault detail pages may redirect (needs verification)

---

### 3. Event Creation + Event Detail

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Event creation wizard** | ✅ `apps/web/src/app/events/new/page.tsx` (multi-step) | **PASS** |
| **Event detail page** | ✅ `apps/web/src/app/(app)/events/[eventSlug]/page.tsx` | **PASS** |
| **Event Vault** | ✅ `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` | **PASS** |
| **Event slug uniqueness** | ✅ Prisma schema: `slug String @unique` | **PASS** |

**Files:**
- Creation: `apps/web/src/app/events/new/page.tsx`
- Detail: `apps/web/src/app/(app)/events/[eventSlug]/page.tsx`
- Vault: `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`

**Gaps:**
- None identified

---

### 4. Marketplace: Vendor/Venue Discovery

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Marketplace browse** | ✅ `apps/web/src/app/marketplace/page.tsx` | **PASS** |
| **Listing detail** | ✅ `apps/web/src/app/marketplace/[slug]/page.tsx` | **PASS** |
| **Search/filter** | ✅ `apps/web/src/server/routers/search.ts` (type, category, location, price) | **PASS** |
| **Profile pages** | ✅ Listing detail page shows org info, gallery, reviews | **PASS** |
| **AI vendor suggestions** | ⚠️ `apps/web/src/server/routers/ai.ts` (basic implementation, fallback exists) | **PARTIAL** |

**Files:**
- Browse: `apps/web/src/app/marketplace/page.tsx`
- Search: `apps/web/src/server/routers/search.ts`
- AI: `apps/web/src/server/routers/ai.ts`

**Gaps:**
- AI suggestions are basic (location/category filter, not ML-based)
- Fallback exists for demo mode (good)

---

### 5. Inquiry/Booking/Request Flow

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Booking request model** | ✅ `BookingRequest` in schema | **PASS** |
| **Booking request UI** | ⚠️ Not found in page routes | **FAIL** |
| **Inquiry form** | ⚠️ Not found | **FAIL** |
| **Request status tracking** | ✅ Schema supports status enum | **PARTIAL** |

**Files:**
- Schema: `apps/web/prisma/schema.prisma` (lines 631-652)
- Router: `apps/web/src/server/routers/bookingRequest.ts` (exists but no UI found)

**Gaps:**
- No UI for creating booking requests from marketplace
- No inquiry form on listing detail pages

---

### 6. Proposal Generation

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Proposal creation UI** | ✅ `apps/web/src/app/(app)/events/[eventSlug]/proposals/new/page.tsx` | **PASS** |
| **AI proposal generation** | ⚠️ Router exists, UI integration unclear | **PARTIAL** |
| **Proposal line items** | ✅ Schema: `ProposalLineItem` | **PASS** |
| **Proposal milestones** | ✅ Schema: `PaymentMilestone` | **PASS** |
| **Proposal status workflow** | ✅ DRAFT → SENT → ACCEPTED/REJECTED | **PASS** |

**Files:**
- Creation: `apps/web/src/app/(app)/events/[eventSlug]/proposals/new/page.tsx`
- Router: `apps/web/src/server/routers/proposal.ts`
- Schema: `apps/web/prisma/schema.prisma` (lines 680-707)

**Gaps:**
- AI proposal generation may not be fully integrated in UI
- Need to verify "generate from shortlist" button exists

---

### 7. Contract Generation/Signing

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Contract generation** | ✅ `apps/web/src/server/routers/contract.ts` (from proposal) | **PASS** |
| **Contract template** | ✅ `docs/contract-templates/base.md` | **PASS** |
| **Contract signing UI** | ⚠️ Schema has `Signature` model, UI unclear | **PARTIAL** |
| **Signature tracking** | ✅ Schema: `Signature` with IP, UA, signedAt | **PASS** |
| **Contract status** | ✅ OUT_FOR_SIGNATURE → PARTIALLY_SIGNED → FULLY_SIGNED | **PASS** |

**Files:**
- Router: `apps/web/src/server/routers/contract.ts`
- Template: `docs/contract-templates/base.md`
- Schema: `apps/web/prisma/schema.prisma` (lines 770-816)

**Gaps:**
- Contract signing UI may be placeholder (needs verification)
- No e-signature integration (DocuSign/HelloSign) mentioned

---

### 8. Escrow/Payment Flow

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Deposit creation** | ✅ `apps/web/src/app/api/payments/deposits/auto/route.ts` | **PASS** |
| **Deposit funding (Stripe)** | ⚠️ Webhook handler exists, demo mode works | **PARTIAL** |
| **Escrow account model** | ✅ `EscrowAccount` in schema | **PASS** |
| **Milestone tracking** | ✅ `PaymentMilestone` with status (PENDING → IN_ESCROW → PAID) | **PASS** |
| **Payout allocation** | ✅ `Payout` model, auto-build from proposals | **PASS** |
| **Payout release** | ⚠️ Demo mode works, Stripe Connect unclear | **PARTIAL** |
| **Receipt generation** | ⚠️ Not found | **FAIL** |

**Files:**
- Deposits: `apps/web/src/app/api/payments/deposits/auto/route.ts`
- Payouts: `apps/web/src/app/api/payments/plan/from-accepted-proposals/route.ts`
- Payments page: `apps/web/src/app/(app)/events/[eventSlug]/milestones/page.tsx`
- Demo: `apps/web/src/app/api/demo/milestones/[id]/fund/route.ts`, `apps/web/src/app/api/demo/payouts/[id]/release/route.ts`

**Gaps:**
- Stripe Connect integration may be incomplete (vendor onboarding)
- Receipt generation not implemented
- Real Stripe flow untested (demo mode works)

---

### 9. Status Tracking

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Timeline component** | ✅ `apps/web/src/components/ui/Timeline.tsx` (assumed) | **PASS** |
| **Activity feed** | ✅ `Activity` model, `ActivityList` component | **PASS** |
| **Status badges** | ✅ Payment plan page shows status badges | **PASS** |
| **Milestone progress** | ✅ `Milestone` model with `done` boolean | **PASS** |

**Files:**
- Activity: `apps/web/src/server/lib/activity.ts`
- Timeline: Used in event detail page

**Gaps:**
- None identified

---

### 10. Notifications

| Feature | Implementation | Status |
|---------|---------------|--------|
| **In-app notifications** | ✅ `Notification` model, router exists | **PASS** |
| **Notification UI** | ⚠️ Not found in components | **FAIL** |
| **Email notifications** | ⚠️ Not found | **FAIL** |
| **Notification bell/badge** | ⚠️ Not found | **FAIL** |

**Files:**
- Schema: `apps/web/prisma/schema.prisma` (lines 510-522)
- Router: `apps/web/src/server/routers/notification.ts`

**Gaps:**
- No UI component for displaying notifications
- No email service integration
- No notification bell in header

---

### 11. Admin Oversight

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Admin dashboard** | ✅ `apps/web/src/app/(app)/admin/overview/page.tsx` | **PASS** |
| **Audit log** | ✅ `AuditLog` model, router exists | **PASS** |
| **Transaction log** | ⚠️ `Transaction` model exists, UI unclear | **PARTIAL** |
| **Dispute placeholder** | ✅ `Dispute` model, router exists | **PASS** |
| **Abuse reports** | ✅ `AbuseReport` model, admin page exists | **PASS** |

**Files:**
- Admin: `apps/web/src/app/(app)/admin/overview/page.tsx`
- Audit: `apps/web/src/server/routers/audit.ts`
- Disputes: `apps/web/src/server/routers/dispute.ts`
- Abuse: `apps/web/src/app/(app)/admin/abuse/page.tsx`

**Gaps:**
- Transaction log UI may be missing
- Dispute resolution workflow unclear

---

### 12. Empty States/Loading/Error States

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Empty states** | ⚠️ Some pages have empty state text, not consistent | **PARTIAL** |
| **Loading states** | ⚠️ Some components use `Loader2`, not consistent | **PARTIAL** |
| **Error boundaries** | ⚠️ Not found | **FAIL** |
| **404 handling** | ✅ Next.js default + `notFound()` | **PASS** |

**Gaps:**
- Empty states are text-only, not designed components
- Loading states inconsistent
- No error boundary component

---

### 13. Mobile Responsiveness

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Tailwind responsive classes** | ✅ Used throughout (md:, lg: breakpoints) | **PASS** |
| **Mobile navigation** | ⚠️ Sidebar may not be mobile-optimized | **PARTIAL** |
| **Payment plan table** | ⚠️ Tables may overflow on mobile | **PARTIAL** |

**Gaps:**
- Sidebar may need mobile hamburger menu
- Payment plan tables need horizontal scroll or card layout on mobile

---

### 14. Performance (Demo-Critical)

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Database queries** | ⚠️ Some N+1 queries possible (needs profiling) | **PARTIAL** |
| **Image optimization** | ⚠️ Next.js Image component usage unclear | **PARTIAL** |
| **API response time** | ⚠️ Not measured | **UNKNOWN** |
| **Demo mode fallbacks** | ✅ Demo mode skips Stripe/OpenAI | **PASS** |

**Gaps:**
- Need to profile database queries
- Image optimization needs verification

---

## D) INVESTOR OBJECTION MAP

### Objection 1: "How do you handle escrow safely?"

**Demo Proof:**
- **Route:** `/app/events/demo-wedding/milestones`
- **UI Element:** Escrow Summary card showing:
  - Escrow Balance: $X (funded deposits)
  - Funded Total: $X
  - Released to Vendor: $X
- **Ledger Log:** Show `EscrowAccount` record with `status: FUNDED`, `balanceCents`
- **Stripe Event:** In production, show Stripe PaymentIntent status; in demo, show "Demo simulation active" banner

**What's Missing:**
- Real Stripe Connect escrow integration (demo mode only)
- Escrow account balance reconciliation UI
- Escrow release approval workflow (currently auto-release in demo)

**File:** `apps/web/src/components/payments/PaymentPlanPageClient.tsx` (lines 302-340)

---

### Objection 2: "What prevents fraud?"

**Demo Proof:**
- **Route:** `/app/admin/overview`
- **UI Element:** Audit Log showing:
  - Actor, action, target, timestamp
  - IP address, metadata
- **Route:** `/app/events/demo-wedding/milestones`
- **UI Element:** Payout lock indicator ("Locked to Proposal") showing payout amount synced to proposal total

**What's Missing:**
- Fraud detection rules/ML
- Suspicious activity alerts
- Identity verification (KYC) for vendors

**Files:**
- Audit: `apps/web/src/server/routers/audit.ts`
- Lock: `apps/web/src/lib/payments/payoutLock.ts`

---

### Objection 3: "What's the flywheel?"

**Demo Proof:**
- **Route:** `/marketplace` → `/app/events/demo-wedding` → `/app/events/demo-wedding/milestones`
- **Flow:**
  1. Marketplace discovery → Booking → Proposal → Contract → Escrow
  2. Show review system (schema exists, UI unclear)
  3. Show retention: Event Vault stores all event data for future reference

**What's Missing:**
- Review/rating UI (schema exists, no UI found)
- Referral system
- Retention metrics dashboard

**Files:**
- Marketplace: `apps/web/src/app/marketplace/page.tsx`
- Reviews: Schema has `Review` model (lines 663-676), no UI found

---

### Objection 4: "Does it work end-to-end?"

**Demo Proof:**
- **Route Sequence:**
  1. `/demo` → Preflight check
  2. `/pro/planner/vault/demo-wedding` → Event Vault
  3. `/app/events/demo-wedding/proposals/new` → Create proposal
  4. `/app/proposals/[id]` → Accept proposal
  5. `/app/contracts/[id]` → View contract
  6. `/app/events/demo-wedding/milestones` → Fund escrow → Release payout

**What's Missing:**
- Booking request UI (schema exists, no UI)
- Email notifications (no service integration)
- Real Stripe flow (demo mode only)

---

### Objection 5: "How do you make money?"

**Demo Proof:**
- **Route:** `/app/events/demo-wedding/milestones`
- **UI Element:** "OneHub Revenue" card showing:
  - Platform fee: 3% of gross
  - Processing fee: 2.9% + $0.30 (illustrative)
  - Vendor payout: Gross - fees
  - Totals across all released payouts

**What's Missing:**
- Revenue dashboard for admins
- Fee configuration UI
- Payout reconciliation

**File:** `apps/web/src/components/payments/PaymentPlanPageClient.tsx` (lines 606-701)

---

## E) P0 / P1 / P2 FIX PLAN

### P0 (Critical - Blocks Demo)

#### P0-1: Booking Request UI Missing
- **Why:** Investors expect to see inquiry/booking flow
- **What:** Create booking request form on listing detail page
- **Where:** 
  - `apps/web/src/app/marketplace/[slug]/page.tsx` (add "Request Booking" button)
  - `apps/web/src/app/(app)/requests/page.tsx` (create if missing)
- **Effort:** M (2-3 days)
- **Demo-Safe Illusion:** Pre-seed a booking request in demo event, show it in requests list

---

#### P0-2: Notification UI Missing
- **Why:** Investors expect in-app notifications
- **What:** Add notification bell to header, notification dropdown
- **Where:**
  - `apps/web/src/components/layout/Header.tsx` (add bell icon)
  - `apps/web/src/components/notifications/NotificationDropdown.tsx` (create)
- **Effort:** S (1 day)
- **Demo-Safe Illusion:** Pre-seed notifications for demo event

---

#### P0-3: Contract Signing UI Placeholder
- **Why:** Investors need to see contract signing flow
- **What:** Add signature capture UI (even if mocked in demo)
- **Where:** `apps/web/src/app/(app)/contracts/[id]/page.tsx`
- **Effort:** M (2 days)
- **Demo-Safe Illusion:** Mock signature capture (draw/type name), show "Signed" status

---

#### P0-4: Receipt Generation Missing
- **Why:** Investors expect payment receipts
- **What:** Generate PDF receipt for completed payouts
- **Where:** `apps/web/src/app/api/payments/receipts/[id]/route.ts` (create)
- **Effort:** M (2 days)
- **Demo-Safe Illusion:** Pre-generate receipt PDF, show download link

---

### P1 (High Priority - Weakens Demo)

#### P1-1: AI Proposal Generation UI Integration
- **Why:** AI is a key differentiator
- **What:** Verify "Generate from Shortlist" button works, add loading states
- **Where:** `apps/web/src/app/(app)/events/[eventSlug]/proposals/new/page.tsx`
- **Effort:** S (1 day)
- **Demo-Safe Illusion:** Pre-generate proposal, show it immediately

---

#### P1-2: Review/Rating UI Missing
- **Why:** Flywheel requires reviews
- **What:** Add review form on listing detail page, show reviews
- **Where:** `apps/web/src/app/marketplace/[slug]/page.tsx`
- **Effort:** M (2 days)
- **Demo-Safe Illusion:** Pre-seed reviews for demo listings

---

#### P1-3: Empty States Not Designed
- **Why:** Empty states show polish
- **What:** Create designed empty state components
- **Where:** `apps/web/src/components/ui/EmptyState.tsx` (create)
- **Effort:** S (1 day)

---

#### P1-4: Mobile Payment Plan Tables
- **Why:** Investors may view on mobile
- **What:** Convert tables to card layout on mobile
- **Where:** `apps/web/src/components/payments/PaymentPlanPageClient.tsx`
- **Effort:** S (1 day)

---

### P2 (Nice to Have - Polish)

#### P2-1: Error Boundary Component
- **Why:** Better error handling
- **What:** Add React error boundary
- **Where:** `apps/web/src/components/ErrorBoundary.tsx` (create)
- **Effort:** S (1 day)

---

#### P2-2: Loading States Consistent
- **Why:** Better UX
- **What:** Standardize loading spinner usage
- **Where:** All page components
- **Effort:** S (1 day)

---

#### P2-3: Transaction Log UI
- **Why:** Admin oversight
- **What:** Add transaction log page for admins
- **Where:** `apps/web/src/app/(app)/admin/transactions/page.tsx` (create)
- **Effort:** M (2 days)

---

#### P2-4: Email Notification Service
- **Why:** Real-world requirement
- **What:** Integrate SendGrid/Resend for email notifications
- **Where:** `apps/web/src/server/lib/email.ts` (create)
- **Effort:** M (2 days)
- **Demo-Safe Illusion:** Log emails to console in demo mode

---

## F) DEMO_MODE DESIGN SPEC (Plan Only)

### Requirements

1. **Deterministic Demo Data**
   - Seed script creates: `demo-wedding` event, 4 verified listings, 1 accepted proposal, 3 deposit lines, 3 payout lines
   - File: `scripts/seed.ts` (already exists, lines 91-709)

2. **Demo Mode Toggle**
   - Environment variable: `ONEHUB_DEMO_MODE=true`
   - File: `apps/web/src/lib/demo-mode.ts` (already exists)

3. **Demo-Safe Features**
   - Skip Stripe API calls (use demo endpoints)
   - Skip OpenAI API calls (use fallback templates)
   - Skip email sending (log to console)
   - Show "DEMO DATA" banner on all pages

4. **Reset Demo Data Action**
   - Admin-only endpoint: `POST /api/demo/reset`
   - Re-runs seed script for demo event only
   - File: `apps/web/src/app/api/demo/reset/route.ts` (create)

5. **Feature Flags**
   - Use `FeatureFlag` model for demo mode features
   - File: `apps/web/prisma/schema.prisma` (already exists, lines 222-248)

6. **Visible Demo Indicators**
   - Banner: "Demo simulation active — no real transactions"
   - File: `apps/web/src/components/payments/PaymentPlanPageClient.tsx` (lines 294-299)

### Implementation Plan

1. Create reset endpoint (P0)
2. Add demo banner to all payment-related pages (P0)
3. Add feature flag checks for demo mode features (P1)
4. Create demo data verification script (P1)

---

## G) FINAL DEMO READINESS SCORE

### Breakdown

| Category | Score | Notes |
|----------|-------|-------|
| **Story Coherence** | 85/100 | Flow is clear, but booking request UI missing breaks narrative |
| **End-to-End Completeness** | 70/100 | Core flow works, but notifications and receipts missing |
| **Escrow Believability** | 80/100 | Demo mode works, but real Stripe integration unclear |
| **Reliability** | 75/100 | Demo mode fallbacks exist, but error handling weak |
| **Polish (Loading/Empty/Error)** | 60/100 | Empty states are text-only, loading states inconsistent |
| **Backup Plan Quality** | 90/100 | Demo mode is robust, pre-seeded data exists |

### Overall Score: **76/100**

### Critical Path to 90+

1. **Fix P0 items** (Booking UI, Notifications, Contract Signing, Receipts) → +10 points
2. **Fix P1 items** (AI Integration, Reviews, Empty States) → +4 points

**Target: 90/100 (Investor-ready)**

---

## SUMMARY

**Strengths:**
- Core event/proposal/contract/payment flow is implemented
- Demo mode infrastructure exists
- Role-based routing works
- Escrow/payment tracking is visible

**Critical Gaps:**
- Booking request UI missing
- Notification UI missing
- Contract signing UI placeholder
- Receipt generation missing

**Recommendation:**
Fix P0 items (4 tasks, ~7 days) to reach investor-ready state. P1 items can be addressed post-demo if needed.

