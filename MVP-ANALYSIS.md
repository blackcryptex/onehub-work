# OneHub MVP Analysis & Next Steps

## What's Already Built (The Good News!)

### ✅ Authentication & User Management
**What works:**
- Users can sign up with email and password
- Users can sign in
- The app knows what role each user has (DIY Planner, Pro Planner, Vendor, Venue, Admin)
- After login, users are sent to the right dashboard based on their role

**What needs fixing:**
- When signing up, users can't choose their role - it always defaults to "DIY Planner"
- Pro Planners need to set up an organization, but the setup form could be clearer

**Files involved:**
- Signup: `apps/web/src/app/(auth)/signup/page.tsx`
- Signin: `apps/web/src/app/(auth)/signin/page.tsx`
- Role routing: `apps/web/src/app/app/page.tsx`

---

### ✅ Event Creation (Event Wizard)
**What works:**
- There's a form where users can create events
- Users can enter event name, date, location, budget, guest count
- Events are saved to the database
- After creating an event, users are taken to the Event Vault

**What needs fixing:**
- The form doesn't check if the data is valid before submitting
- If you leave fields empty or put in bad data, it still tries to create the event
- Error messages aren't very helpful

**Files involved:**
- Event Wizard form: `apps/web/src/app/events/new/page.tsx`
- Event creation API: `apps/web/src/app/api/events/create/route.ts`

---

### ✅ Dashboards (For Each User Type)
**What works:**
- DIY Planner dashboard exists and shows events
- Pro Planner dashboard exists and shows organizations/events
- Vendor dashboard exists and shows booking requests
- Venue dashboard exists and shows availability
- Admin dashboard exists for managing users

**What needs fixing:**
- DIY Planner dashboard shows "No event selected" when empty, but doesn't guide users to create their first event
- Vendor/Venue dashboards show placeholder numbers instead of real data
- Some dashboards don't handle errors well

**Files involved:**
- DIY Dashboard: `apps/web/src/components/diy-planner/Dashboard.tsx`
- Pro Dashboard: `apps/web/src/app/app/page.tsx`
- Vendor Dashboard: `apps/web/src/components/vendor/Dashboard.tsx`
- Venue Dashboard: `apps/web/src/components/venue/Dashboard.tsx`

---

### ✅ Event Vault (Where All Events Live)
**What works:**
- Shows all events in a nice card layout
- Shows progress, budget, and upcoming milestones for each event
- Clicking an event takes you to the event detail page

**What needs fixing:**
- Empty state is okay but could be more helpful
- Some events might not show up if permissions aren't set correctly

**Files involved:**
- Event Vault: `apps/web/src/app/(app)/vault/page.tsx`

---

### ✅ Event Management Pages
**What works:**
- Event detail page shows overview
- Budget page exists
- Tasks page exists
- Milestones page exists
- Guests page exists
- Checklists page exists
- Seating chart page exists

**What needs fixing:**
- Some pages don't check if the user has permission to view them
- Forms on these pages need better validation

**Files involved:**
- Event pages: `apps/web/src/app/(app)/events/[eventSlug]/**`

---

### ✅ Vendor Marketplace
**What works:**
- Marketplace page shows all vendor/venue listings
- Vendors can create listings
- Listings show up on the marketplace

**What needs fixing:**
- No way to search or filter listings
- No way to sort by price, rating, location, etc.

**Files involved:**
- Marketplace: `apps/web/src/app/marketplace/page.tsx`

---

### ✅ Payments & Contracts (Partially Working)
**What works:**
- Stripe is set up and connected
- Payment models exist in the database
- Webhook handler exists (for Stripe to tell us when payments happen)
- Contract models exist

**What needs fixing:**
- Payment form is a placeholder - doesn't actually use Stripe's secure card input
- Can't actually complete a payment yet
- Stripe Connect (for vendors to receive money) isn't fully set up
- Contract signing flow needs testing

**Files involved:**
- Payment modal: `apps/web/src/components/payments/PaymentModal.tsx`
- Payment API: `apps/web/src/app/api/payments/create-intent/route.ts`
- Stripe webhook: `apps/web/src/app/api/stripe/webhook/route.ts`

---

### ✅ Proposals & Booking Requests
**What works:**
- Vendors can create proposals
- Planners can send booking requests
- Proposals can be accepted/rejected

**What needs fixing:**
- When a proposal is sent, it should create a message thread, but that's not happening yet
- The flow from booking request → proposal → contract needs better UI

**Files involved:**
- Proposal router: `apps/web/src/server/routers/proposal.ts`
- Booking request router: `apps/web/src/server/routers/bookingRequest.ts`

---

## What's Missing or Incomplete

### ❌ Form Validation
**Problem:** Most forms don't check if the data is valid before submitting.

**Impact:** Users can create events with empty names, invalid dates, etc. This breaks things.

**Fix needed:** Add validation to all forms (check required fields, check data types, show helpful error messages).

---

### ❌ Real Payment Processing
**Problem:** Payment form is a placeholder. Users can't actually pay.

**Impact:** The whole payment flow is broken. This is critical for an MVP.

**Fix needed:** Integrate Stripe Elements (Stripe's secure card input) into the payment modal.

---

### ❌ Better Empty States
**Problem:** When users have no data, dashboards show confusing messages.

**Impact:** New users don't know what to do next.

**Fix needed:** Add helpful welcome screens that guide users to create their first event/listing.

---

### ❌ Permission Checks
**Problem:** Some pages don't check if the user has permission to view them.

**Impact:** Users might see errors or see data they shouldn't see.

**Fix needed:** Add permission checks to all event detail pages.

---

### ❌ Search & Filtering
**Problem:** Marketplace has no search or filters.

**Impact:** Users can't find vendors/venues easily.

**Fix needed:** Add search bar and filter options to marketplace.

---

## Critical MVP Flows (What Needs to Work First)

### Flow 1: New User → Create Event
**Status:** ✅ Mostly works, needs validation fixes

**Steps:**
1. User signs up ✅
2. User lands on dashboard ✅
3. User clicks "Create Event" ✅
4. User fills out form ⚠️ (needs validation)
5. Event is created ✅
6. User sees event in Event Vault ✅

**What to fix:** Add form validation in step 4.

---

### Flow 2: Planner → Find Vendor → Get Proposal → Pay
**Status:** ⚠️ Partially works, payment is broken

**Steps:**
1. Planner browses marketplace ✅
2. Planner sends booking request ✅
3. Vendor creates proposal ✅
4. Planner accepts proposal ✅
5. Planner pays for milestone ❌ (payment form is placeholder)
6. Vendor receives payment ❌ (Stripe Connect not set up)

**What to fix:** Complete payment integration (steps 5-6).

---

### Flow 3: Vendor → Create Listing → Get Booking Request → Send Proposal
**Status:** ✅ Mostly works

**Steps:**
1. Vendor creates listing ✅
2. Listing shows on marketplace ✅
3. Vendor receives booking request ✅
4. Vendor creates proposal ✅
5. Vendor sends proposal ✅

**What to fix:** Add notification when booking request arrives.

---

## Top 3 Tasks to Do Right Now

### Task 1: Fix Event Creation Form Validation
**Why:** Users can create broken events, which breaks everything else.

**What to do:**
1. Open `apps/web/src/app/events/new/page.tsx`
2. Add checks before form submit:
   - Event name can't be empty
   - Date must be in the future
   - Budget must be a number
3. Show error messages below each field if it's invalid
4. Don't let the form submit if there are errors

**How to test:**
- Try submitting empty form → should show errors
- Try submitting valid form → should create event

**Files:** `apps/web/src/app/events/new/page.tsx`

---

### Task 2: Complete Payment Form Integration
**Why:** Without real payments, the whole platform doesn't work.

**What to do:**
1. Install Stripe Elements: `pnpm add @stripe/react-stripe-js @stripe/stripe-js`
2. Open `apps/web/src/components/payments/PaymentModal.tsx`
3. Replace the placeholder card form with Stripe's `<CardElement />`
4. Update the submit handler to use Stripe's payment confirmation
5. Get the payment secret from `/api/payments/create-intent` (already exists)

**How to test:**
- Create a proposal
- Click "Pay"
- Enter test card `4242 4242 4242 4242`
- Should process payment successfully

**Files:** `apps/web/src/components/payments/PaymentModal.tsx`

---

### Task 3: Fix DIY Planner Empty State
**Why:** New users don't know what to do when they first log in.

**What to do:**
1. Open `apps/web/src/components/diy-planner/Dashboard.tsx`
2. Find where it checks if there are no events
3. Instead of showing "No event selected", show a welcome card that says:
   - "Welcome! Create your first event"
   - Has a button that goes to `/events/new`
   - Explains what events are

**How to test:**
- Sign in as DIY planner with no events
- Should see welcome card
- Click "Create Event" → should go to event wizard

**Files:** `apps/web/src/components/diy-planner/Dashboard.tsx`

---

## How Complete Is Everything?

### Fully Working (80-100%)
- ✅ User authentication (signup, signin)
- ✅ Role-based routing
- ✅ Event creation (needs validation)
- ✅ Event Vault
- ✅ Event detail pages
- ✅ Database models
- ✅ API routes (most of them)
- ✅ Permissions system (RBAC)

### Partially Working (40-80%)
- ⚠️ Payment processing (form exists but doesn't work)
- ⚠️ Proposals (can create but flow is incomplete)
- ⚠️ Contracts (models exist but signing flow needs work)
- ⚠️ Vendor marketplace (listings work but no search)
- ⚠️ Dashboards (work but need better empty states)

### Not Started (0-40%)
- ❌ Real-time messaging
- ❌ Email notifications
- ❌ Advanced search/filtering
- ❌ Mobile app
- ❌ Analytics dashboard

---

## Summary in Simple Terms

**What you have:**
- A working app where users can sign up, create events, and see dashboards
- A database that stores everything
- Payment system set up but not fully working
- Vendor marketplace that shows listings but can't search them

**What you need to fix:**
1. Make forms check if data is valid before submitting
2. Make payments actually work (replace placeholder with real Stripe form)
3. Make empty dashboards more helpful (guide users to create their first event)

**What would be nice to have:**
- Search in marketplace
- Better notifications
- Real-time messaging
- Mobile-friendly design

---

## Next Steps (In Order)

1. **This week:** Fix the top 3 tasks (form validation, payment form, empty states)
2. **Next week:** Add search/filtering to marketplace, fix permission checks
3. **After that:** Complete Stripe Connect setup, add notifications, improve error handling

---

*For detailed task breakdowns, see `TODO-ONEHUB.md`*

