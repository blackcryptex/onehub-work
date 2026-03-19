# OneHub Demo Manual QA Checklist

**Purpose:** Verify demo runs 3 times in a row without broken links, empty pages, or placeholders

---

## PRE-DEMO SETUP

### Environment
- [ ] `ONEHUB_DEMO_MODE=true` in `.env.local`
- [ ] Database seeded: `npx tsx scripts/seed.ts`
- [ ] Dev server running: `npm run dev`
- [ ] Preflight check passes: `/demo` shows all green

### Test Accounts
- [ ] Pro Planner: `pro@example.com` / `password` works
- [ ] Admin: `admin@example.com` / `password` works

---

## TEST RUN 1: Happy Path (5-6 minutes)

### Step 1: Demo Launcher
- [ ] Navigate to `/demo`
- [ ] All preflight checks are green
- [ ] Click "Start as Pro Planner"
- [ ] Auto-login works (or manual login works)
- [ ] Redirects to `/pro/planner/vault/demo-wedding`

### Step 2: Event Vault
- [ ] Event details visible (name, location, budget, guests)
- [ ] No 404 errors
- [ ] Navigation works

### Step 3: Marketplace
- [ ] Navigate to `/marketplace`
- [ ] Listings load
- [ ] Click on "Elite Photography Studio"
- [ ] Listing detail page loads
- [ ] "Request Booking" button visible
- [ ] Click "Request Booking" → Modal opens
- [ ] Form pre-filled with demo data (if demo mode)
- [ ] Submit booking request → Success message shows
- [ ] Modal closes, page refreshes

### Step 4: Booking Requests
- [ ] Navigate to `/app/requests`
- [ ] Booking requests list loads
- [ ] At least 2 requests visible (pre-seeded)
- [ ] Status badges show correctly
- [ ] "View Event" links work
- [ ] No empty state (should have data)

### Step 5: Notifications
- [ ] Notification bell in header shows badge (unread count)
- [ ] Click bell → Dropdown opens
- [ ] At least 4 notifications visible
- [ ] "DEMO DATA" banner visible
- [ ] Click notification → Marks as read, navigates to link
- [ ] Unread count decreases

### Step 6: Proposals
- [ ] Navigate to `/app/proposals/[id]` (use proposal from demo event)
- [ ] Proposal detail loads
- [ ] Line items visible
- [ ] Milestones visible
- [ ] Status shows correctly

### Step 7: Contracts
- [ ] Navigate to `/app/contracts/[id]` (use contract from demo event)
- [ ] Contract detail loads
- [ ] Contract body renders (markdown)
- [ ] Signatures section visible
- [ ] Signature form visible (if not fully signed)
- [ ] Fill signature form → Submit
- [ ] Success → Contract refreshes, signature appears
- [ ] Status updates (PARTIALLY_SIGNED or FULLY_SIGNED)

### Step 8: Payments & Escrow
- [ ] Navigate to `/app/events/demo-wedding/milestones`
- [ ] "DEMO DATA" banner visible
- [ ] Escrow Summary shows balances
- [ ] Client Funding section shows deposits
- [ ] Payout Plan section shows payouts
- [ ] Click "Fund Deposit" (demo mode) → Status changes to IN_ESCROW
- [ ] Click "Release Payout" (demo mode) → Status changes to SENT
- [ ] "Receipt" link appears for SENT payouts
- [ ] Click "Receipt" → Downloads HTML receipt
- [ ] Receipt opens, shows payment details, "DEMO DATA" banner

### Step 9: Status Tracking
- [ ] Navigate to `/app/events/demo-wedding`
- [ ] Activity feed shows recent actions
- [ ] Timeline shows milestones
- [ ] Status badges show correctly

---

## TEST RUN 2: Backup Safe Path (3-4 minutes)

### If Marketplace Fails:
- [ ] Skip marketplace, go directly to proposals
- [ ] Use pre-seeded proposal
- [ ] Continue with contract → payments flow

### If Proposal Creation Fails:
- [ ] Navigate directly to existing proposal
- [ ] Show proposal, accept it
- [ ] Continue with contract → payments

### If Contract Generation Fails:
- [ ] Skip contract, go directly to payments
- [ ] Show escrow and payout flow
- [ ] Demonstrate receipt download

---

## TEST RUN 3: Failure Recovery (2-3 minutes)

### Test Error States:
- [ ] Navigate to non-existent event → 404 handled gracefully
- [ ] Navigate to non-existent proposal → 404 handled gracefully
- [ ] Try to sign contract twice → Error message shows
- [ ] Try to download receipt for PENDING payout → Error handled

### Test Empty States:
- [ ] Create new event (no proposals) → Empty state shows
- [ ] Navigate to requests with no org → Empty state shows
- [ ] Navigate to notifications (all read) → "No notifications" shows

### Test Loading States:
- [ ] All API calls show loading indicators
- [ ] No blank screens during loading
- [ ] Errors show user-friendly messages

---

## MOBILE RESPONSIVENESS

### Test on Mobile Viewport:
- [ ] Notification dropdown works on mobile
- [ ] Booking request modal is scrollable
- [ ] Contract signature form fits screen
- [ ] Payment plan tables are scrollable (or use card layout)
- [ ] All buttons are tappable
- [ ] No horizontal scroll

---

## DEMO MODE VERIFICATION

### Demo Indicators:
- [ ] "DEMO DATA" banners visible on:
  - Payment plan page
  - Notification dropdown
  - Booking request modal
  - Contract signature form
  - Receipt

### Demo Behavior:
- [ ] No real Stripe calls (demo endpoints used)
- [ ] No real email sends (logged to console)
- [ ] Pre-seeded data visible
- [ ] Demo actions work (fund, release)

---

## CRITICAL PATH VERIFICATION

### End-to-End Flow:
1. [ ] Marketplace → Booking Request → Success
2. [ ] Proposal → Accept → Contract Generated
3. [ ] Contract → Sign → Status Updated
4. [ ] Payments → Fund Deposit → Status IN_ESCROW
5. [ ] Payments → Release Payout → Status SENT
6. [ ] Payments → Download Receipt → File Downloads

### All Links Work:
- [ ] No broken links
- [ ] No redirect loops
- [ ] All navigation works
- [ ] All "View Event" links work
- [ ] All notification links work

---

## PERFORMANCE

### Page Load Times:
- [ ] All pages load in < 2 seconds
- [ ] No long pauses
- [ ] Smooth transitions

### Database Queries:
- [ ] No N+1 query issues visible
- [ ] No timeout errors
- [ ] All data loads correctly

---

## FINAL VERIFICATION

### 3 Consecutive Runs:
- [ ] Run 1: Happy path completed without errors
- [ ] Run 2: Backup path completed without errors
- [ ] Run 3: Failure recovery tested, all handled gracefully

### Demo Readiness:
- [ ] All P0 features work
- [ ] All demo data visible
- [ ] All "DEMO DATA" indicators visible
- [ ] No broken links
- [ ] No empty pages (where data should exist)
- [ ] No placeholder text (except intentional empty states)

---

## ISSUES FOUND

Document any issues found during testing:

1. **Issue:** [Description]
   - **Location:** [Route/Component]
   - **Severity:** [P0/P1/P2]
   - **Fix:** [Solution or workaround]

---

## SIGN-OFF

- [ ] All critical paths verified
- [ ] All P0 features working
- [ ] Demo ready for investor presentation
- [ ] Backup plans tested
- [ ] Failure recovery tested

**Tester:** _________________  
**Date:** _________________  
**Status:** ✅ READY / ⚠️ ISSUES FOUND

