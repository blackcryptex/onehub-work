# OneHub MVP TODO Checklist

## MVP Goal
OneHub is an event-planning platform that connects DIY planners, professional planners, vendors, and venues. The MVP should allow users to sign up, create events, discover vendors/venues, send/receive proposals, and manage basic event details (budget, guests, tasks, milestones).

---

## ✅ Core User Flows

### Authentication & Onboarding
- [x] User signup with email/password (`apps/web/src/app/(auth)/signup/page.tsx`)
- [x] User signin (`apps/web/src/app/(auth)/signin/page.tsx`)
- [x] Role-based routing after login (`apps/web/src/app/app/page.tsx`)
- [ ] **FIX**: Role selection during signup (currently defaults to DIY_PLANNER, should let user choose)
- [ ] **FIX**: Pro Planner org setup flow completion (`apps/web/src/app/professional-planner/setup/page.tsx` - has form but needs better error handling)
- [ ] **FIX**: Vendor/Venue onboarding completion (`apps/web/src/app/vendor-venue/setup/page.tsx` - form exists but needs validation)

### Event Creation
- [x] Event Wizard form (`apps/web/src/app/events/new/page.tsx`)
- [x] Event creation API (`apps/web/src/app/api/events/create/route.ts`)
- [x] Event Vault page showing all events (`apps/web/src/app/(app)/vault/page.tsx`)
- [ ] **FIX**: Event Wizard form validation (currently allows empty/invalid data)
- [ ] **FIX**: Event creation error handling (shows alert, should show inline errors)
- [ ] **FIX**: Event Dreamer flow completion (`apps/web/src/app/event-dreamer/create/page.tsx` - form exists but needs testing)

### Dashboards
- [x] DIY Planner dashboard (`apps/web/src/components/diy-planner/Dashboard.tsx`)
- [x] Pro Planner dashboard (`apps/web/src/app/app/page.tsx` - shows org setup or events)
- [x] Vendor dashboard (`apps/web/src/components/vendor/Dashboard.tsx`)
- [x] Venue dashboard (`apps/web/src/components/venue/Dashboard.tsx`)
- [x] Admin dashboard (`apps/web/src/app/(app)/admin/overview/page.tsx`)
- [ ] **FIX**: DIY Planner dashboard empty state (shows "No event selected" but should guide user to create event)
- [ ] **FIX**: Vendor/Venue dashboards need real data (currently shows placeholder stats)

### Event Management
- [x] Event detail page (`apps/web/src/app/(app)/events/[eventSlug]/page.tsx`)
- [x] Budget page (`apps/web/src/app/(app)/events/[eventSlug]/budget/page.tsx`)
- [x] Tasks page (`apps/web/src/app/(app)/events/[eventSlug]/tasks/page.tsx`)
- [x] Milestones page (`apps/web/src/app/(app)/events/[eventSlug]/milestones/page.tsx`)
- [x] Guests page (`apps/web/src/app/(app)/events/[eventSlug]/guests/page.tsx`)
- [x] Checklists page (`apps/web/src/app/(app)/events/[eventSlug]/checklists/page.tsx`)
- [x] Seating page (`apps/web/src/app/(app)/events/[eventSlug]/seating/page.tsx`)
- [ ] **FIX**: Event detail page needs better error handling (currently shows 404, should show permission denied)
- [ ] **FIX**: Budget editing (form exists but needs validation and save confirmation)

---

## ✅ Core Backend & Data

### Database Models
- [x] User, Organization, Event models (`apps/web/prisma/schema.prisma`)
- [x] Proposal, Contract, PaymentMilestone models
- [x] BookingRequest, Listing, Review models
- [x] Activity, AuditLog models for tracking
- [x] Guest, GuestList, SeatingPlan models
- [ ] **FIX**: Add missing fields (e.g., `Organization.stripeConnectAccountId` for payments)

### API Routes & tRPC Routers
- [x] Event creation API (`apps/web/src/app/api/events/create/route.ts`)
- [x] Event router (`apps/web/src/server/routers/event.ts`)
- [x] Proposal router (`apps/web/src/server/routers/proposal.ts`)
- [x] Contract router (`apps/web/src/server/routers/contract.ts`)
- [x] Budget router (`apps/web/src/server/routers/budget.ts`)
- [x] Payment routes (`apps/web/src/app/api/payments/**`)
- [x] Stripe webhook handler (`apps/web/src/app/api/stripe/webhook/route.ts`)
- [ ] **FIX**: Payment confirmation route error handling (`apps/web/src/app/api/payments/confirm/route.ts`)
- [ ] **FIX**: Milestone release route needs Stripe Connect integration (`apps/web/src/app/api/payments/release-milestone/route.ts` - has TODO)

### Permissions & Security
- [x] RBAC helpers (`apps/web/src/lib/rbac.ts`)
- [x] Planner isolation (planners only see their own events)
- [x] Org member checks
- [x] Admin impersonation feature
- [ ] **FIX**: Add permission checks to all event detail pages (currently some pages don't check `canViewEvent`)

### Data Validation
- [x] Zod schemas in some routers
- [x] Event creation validation (`apps/web/src/app/api/events/create/route.ts`)
- [ ] **FIX**: Add validation to all form submissions (many forms don't validate before submit)
- [ ] **FIX**: Add validation to tRPC inputs (some routers don't validate)

---

## ⚠️ Important Next Features

### Payments & Contracts
- [x] Stripe integration setup (`apps/web/src/server/lib/stripe.ts`)
- [x] Payment intent creation
- [x] Escrow account model
- [x] Webhook handler (idempotent)
- [ ] **FIX**: Stripe Connect onboarding completion (`apps/web/src/app/(app)/billing/connect/page.tsx` - placeholder)
- [ ] **FIX**: Payment modal needs Stripe Elements integration (`apps/web/src/components/payments/PaymentModal.tsx` - has TODO)
- [ ] **FIX**: Milestone release needs Stripe Transfer (`apps/web/src/server/routers/billing.ts` - has TODO)
- [ ] **FIX**: Contract signing flow (UI exists but needs testing)

### Vendor Marketplace
- [x] Marketplace page (`apps/web/src/app/marketplace/page.tsx`)
- [x] Listing model and router
- [x] Booking request model
- [x] Vendor search API (`apps/web/src/app/api/vendors/search/route.ts`)
- [ ] **FIX**: Marketplace filtering/search (currently shows all listings, no filters)
- [ ] **FIX**: Booking request flow (form exists but needs vendor response UI)
- [ ] **FIX**: Proposal creation from booking request (needs UI flow)

### Messaging & Notifications
- [x] Thread model (`apps/web/prisma/schema.prisma`)
- [x] Message model
- [x] Notification model
- [x] Message page (`apps/web/src/app/(app)/messages/[threadId]/page.tsx`)
- [ ] **FIX**: Thread creation when proposal sent (`apps/web/src/server/routers/proposal.ts` - has TODO)
- [ ] **FIX**: Notification system (model exists but no UI to show notifications)
- [ ] **FIX**: Real-time messaging (currently static, needs WebSocket or polling)

### AI Features
- [x] AI service setup (`apps/web/src/lib/ai.service.ts`)
- [x] AI assist in DIY dashboard
- [ ] **FIX**: AI budget allocation (placeholder in event creation)
- [ ] **FIX**: AI vendor recommendations (stub code exists)

### Observability & Health
- [x] Health check endpoint (`apps/web/src/app/api/health/route.ts`)
- [x] Error tracking setup (`apps/web/src/lib/errorTracker.ts`)
- [x] Structured logging (`apps/web/src/lib/logger.ts`)
- [x] Activity logging (`apps/web/src/server/lib/activity.ts`)
- [x] Audit logging (`apps/web/src/server/lib/audit.ts`)
- [ ] **FIX**: Sentry integration (errorTracker has TODOs)
- [ ] **FIX**: Health check needs better error messages

---

## 🔥 Top 3 "Must Do Now" Tasks

### Task 1: Fix Event Creation Form Validation
**Files**: `apps/web/src/app/events/new/page.tsx`, `apps/web/src/app/api/events/create/route.ts`

**Why**: Users can create events with invalid data (empty name, invalid date, etc.), which breaks the app.

**Steps**:
1. Open `apps/web/src/app/events/new/page.tsx`
2. Add client-side validation before form submit:
   - Check `name` is not empty
   - Check `date` is a valid future date
   - Check `budget_raw` is a valid number
3. Show inline error messages below each field if validation fails
4. Disable submit button if form is invalid
5. Test: Try to submit empty form → should show errors
6. Test: Submit valid form → should create event successfully

**Success**: Form shows clear errors for invalid inputs, and only valid events can be created.

---

### Task 2: Complete Stripe Payment Modal Integration
**Files**: `apps/web/src/components/payments/PaymentModal.tsx`, `apps/web/src/app/api/payments/create-intent/route.ts`

**Why**: Payment modal is a placeholder. Users can't actually pay for proposals/milestones.

**Steps**:
1. Install Stripe Elements: `pnpm add @stripe/react-stripe-js @stripe/stripe-js`
2. Open `apps/web/src/components/payments/PaymentModal.tsx`
3. Replace placeholder form with Stripe Elements:
   - Import `CardElement` from `@stripe/react-stripe-js`
   - Wrap form in `Elements` provider (need to pass Stripe instance)
   - Replace manual card inputs with `<CardElement />`
4. Update submit handler to use Stripe's `confirmCardPayment` instead of placeholder
5. Get `clientSecret` from `/api/payments/create-intent` (already exists)
6. Test: Create a proposal, click "Pay" → should show Stripe card form
7. Test: Enter test card `4242 4242 4242 4242` → should process payment

**Success**: Users can enter card details and complete payments through Stripe.

---

### Task 3: Fix DIY Planner Dashboard Empty State
**Files**: `apps/web/src/components/diy-planner/Dashboard.tsx`, `apps/web/src/app/diy-planner/page.tsx`

**Why**: When DIY planner has no events, dashboard shows "No event selected" but doesn't guide them to create one.

**Steps**:
1. Open `apps/web/src/components/diy-planner/Dashboard.tsx`
2. Find the empty state check (around line 89-96)
3. Add a check: if `events.length === 0`, show a welcome card instead of "No event selected"
4. Welcome card should:
   - Say "Welcome! Create your first event"
   - Have a button linking to `/events/new`
   - Show a brief explanation of what events are
5. Test: Sign in as DIY planner with no events → should see welcome card
6. Test: Click "Create Event" → should go to event wizard

**Success**: New DIY planners see a helpful welcome screen that guides them to create their first event.

---

## 📋 Additional Priority Tasks

### High Priority
- [ ] Add role selection dropdown in signup form (`apps/web/src/app/(auth)/signup/page.tsx`)
- [ ] Add permission checks to event detail pages (`apps/web/src/app/(app)/events/[eventSlug]/**`)
- [ ] Complete Stripe Connect onboarding (`apps/web/src/app/(app)/billing/connect/page.tsx`)
- [ ] Add marketplace search/filter UI (`apps/web/src/app/marketplace/page.tsx`)
- [ ] Fix proposal → thread creation (`apps/web/src/server/routers/proposal.ts` line 83)

### Medium Priority
- [ ] Add notification bell/panel UI (`apps/web/src/components/layout/Header.tsx`)
- [ ] Complete AI budget allocation (`apps/web/src/app/api/events/create/route.ts` line 320)
- [ ] Add form validation to all event management pages
- [ ] Add loading states to all async operations
- [ ] Add error boundaries to catch React errors

### Low Priority (Nice to Have)
- [ ] Add demo mode for dashboards (show sample data)
- [ ] Add email notifications for proposals/contracts
- [ ] Add calendar sync (Google Calendar integration exists but needs UI)
- [ ] Add export functionality (export event as PDF)
- [ ] Add mobile-responsive improvements

---

## 🧪 Testing Checklist

Before calling MVP "done", verify:
- [ ] User can sign up and choose role
- [ ] User can create an event
- [ ] User can view their events in Event Vault
- [ ] User can edit event details
- [ ] Vendor can create a listing
- [ ] Planner can discover vendors in marketplace
- [ ] Planner can send booking request
- [ ] Vendor can respond with proposal
- [ ] Planner can accept proposal
- [ ] Planner can pay for milestone
- [ ] Vendor can receive payment
- [ ] All dashboards load without errors
- [ ] All forms validate input
- [ ] All API routes handle errors gracefully

---

## 📝 Notes

- **Seed Data**: Run `pnpm db:seed` to create test users (diy@example.com, pro@example.com, vendor@example.com, venue@example.com, all password: "password")
- **Environment**: Make sure `.env` has `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Development**: Run `pnpm dev` to start dev server on `http://localhost:3000`
- **Database**: Run `pnpm db:migrate` to apply migrations

---

*Last updated: [Current Date]*
*Next review: After completing top 3 tasks*

