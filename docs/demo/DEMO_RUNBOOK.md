# OneHub Investor Demo Runbook

**Purpose:** Step-by-step guide for founder to execute investor demo with backup plans

---

## PRE-DEMO CHECKLIST (15 minutes before)

### 1. Environment Setup

```bash
# Verify demo mode is enabled
echo $ONEHUB_DEMO_MODE
# Should output: true

# If not set, add to .env.local:
echo "ONEHUB_DEMO_MODE=true" >> apps/web/.env.local
```

**File:** `apps/web/.env.local`

**Backup:** If demo mode not set, demo will attempt real Stripe calls (will fail gracefully in test mode)

---

### 2. Database Seed Verification

```bash
# Run seed script to ensure demo data exists
cd /Users/marlon/OneHub
npx tsx scripts/seed.ts
```

**Expected Output:**
```
=== DEMO MODE SEED DATA ===
Demo Event Slug: demo-wedding
Demo Event Location: Chicago, IL
Demo Verified Listings:
  - Demo Grand Ballroom Chicago (VENUE_SPACE) - Chicago, IL
  - Premium Catering Co. (CATERING) - Chicago, IL
  - Elite Photography Studio (PHOTO_VIDEO) - Chicago, IL
  - Elegant Floral Design (DECOR_FLORAL) - Chicago, IL
```

**File:** `scripts/seed.ts`

**Backup:** If seed fails, manually verify:
```sql
SELECT slug FROM "Event" WHERE slug = 'demo-wedding';
SELECT slug FROM "Listing" WHERE slug LIKE 'demo-%';
```

---

### 3. Preflight Check

1. Navigate to: `http://localhost:3000/demo`
2. Verify all checks are green:
   - ✅ Demo Mode: OK
   - ✅ Seed Data: OK
   - ✅ AI / Fallback: OK

**File:** `apps/web/src/app/demo/page.tsx`

**Backup:** If preflight fails:
- Demo Mode: Set `ONEHUB_DEMO_MODE=true` in `.env.local`, restart dev server
- Seed Data: Run `npx tsx scripts/seed.ts`
- AI: Demo mode has fallback, so this is non-blocking

---

### 4. Test Login Credentials

**Pro Planner:**
- Email: `pro@example.com`
- Password: `password`

**Vendor:**
- Email: `vendor@example.com`
- Password: `password`

**Admin:**
- Email: `admin@example.com`
- Password: `password`

**File:** `scripts/seed.ts` (lines 6-14)

**Backup:** If login fails, create user manually:
```bash
# Or use signup page: http://localhost:3000/signup
```

---

## DEMO EXECUTION (5-6 minutes)

### Step 1: Launch Demo (30 seconds)

**Action:**
1. Open browser to: `http://localhost:3000/demo`
2. Click "Start as Pro Planner"
3. Auto-login as Pro Planner (or manually sign in)

**Expected:** Redirects to `/pro/planner/vault/demo-wedding`

**Backup if Step 1 Fails:**
- Manual login: Go to `/signin`, use `pro@example.com` / `password`
- Direct navigation: Go to `/pro/planner/vault/demo-wedding`

**Files:**
- Demo launcher: `apps/web/src/app/demo/page.tsx`
- Demo start: `apps/web/src/app/demo/start/page.tsx`

---

### Step 2: Show Event Vault (30 seconds)

**Action:**
1. On Event Vault detail page, point out:
   - Event name: "Demo Wedding Event"
   - Location: Chicago, IL
   - Budget: $50,000
   - Guest count: 150
   - Status: PLANNING

**Expected:** Event details visible, no 404 errors

**Backup if Step 2 Fails:**
- Navigate directly to: `/app/events/demo-wedding`
- If event not found, run seed script again

**File:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`

---

### Step 3: Marketplace Discovery (60 seconds)

**Action:**
1. Click "AI Source Vendors & Venues" (if button exists)
2. Or navigate to: `/marketplace`
3. Show filters: Category, Location, Price Tier
4. Click on "Elite Photography Studio" listing
5. Show listing detail: Gallery, Description, Reviews (if any)
6. Click "Request Booking" button → Modal opens
7. Show pre-filled form (demo mode), submit booking request
8. Show success message, navigate to `/app/requests` to see booking requests

**Expected:** Marketplace loads, listing detail shows, booking request modal works, requests page shows pre-seeded requests

**Backup if Step 3 Fails:**
- Skip AI sourcing, go directly to marketplace
- If booking request fails, navigate directly to `/app/requests` to show pre-seeded requests
- Navigate to: `/app/events/demo-wedding` → Show shortlist section

**Files:**
- Marketplace: `apps/web/src/app/marketplace/page.tsx`
- Listing detail: `apps/web/src/app/marketplace/[slug]/page.tsx`

---

### Step 4: Proposal & Contract (90 seconds)

**Action:**
1. Navigate to: `/app/events/demo-wedding/proposals/new`
2. If proposal exists, show existing proposal
3. Or create new proposal:
   - Title: "Elite Photography Proposal"
   - Line items: Photography Package ($8,000)
   - Milestones: Deposit ($2,400), Final ($5,600)
4. Accept proposal (change status to ACCEPTED)
5. Navigate to contract: `/app/contracts/[id]`
6. Show contract: Terms, Signatures (if any), Status
7. **NEW:** Show signature form, fill it out, submit
8. **NEW:** Show signature appears, contract status updates

**Expected:** Proposal shows, contract auto-generated, signature form works, signatures visible

**Backup if Step 4 Fails:**
- Use pre-seeded proposal (should exist from seed script)
- Navigate to: `/app/proposals/[id]` (find proposal ID from database)
- If contract not generated, manually create via admin
- If signature fails, show pre-signed contract from seed

**Files:**
- Proposal creation: `apps/web/src/app/(app)/events/[eventSlug]/proposals/new/page.tsx`
- Proposal detail: `apps/web/src/app/(app)/proposals/[id]/page.tsx`
- Contract detail: `apps/web/src/app/(app)/contracts/[id]/page.tsx`

---

### Step 5: Payments & Escrow (120 seconds)

**Action:**
1. Navigate to: `/app/events/demo-wedding/milestones`
2. Point out "DEMO DATA" banner (if visible)
3. Show Escrow Summary:
   - Escrow Balance: $X
   - Funded Total: $X
   - Released to Vendor: $X
4. Show Client Funding section:
   - Deposit schedule (30/40/30 split)
   - Status badges (PENDING, IN_ESCROW, SUCCEEDED)
5. Click "Fund Deposit" (demo mode) → Status changes to IN_ESCROW
6. Show Payout Plan section:
   - Payout lines (locked to proposals)
   - Status badges
7. Click "Release Payout" (demo mode) → Status changes to SENT
8. **NEW:** Click "Receipt" link for SENT payout → Receipt downloads
9. Show OneHub Revenue section:
   - Platform fee: 3%
   - Processing fee: 2.9% + $0.30
   - Vendor payout: Gross - fees

**Expected:** All sections visible, demo actions work, receipt downloads, revenue breakdown shows

**Backup if Step 5 Fails:**
- If deposits not visible, use "Auto-create deposit schedule" button
- If payouts not visible, use "Auto-build from proposals" button
- If demo actions fail, manually update database:
  ```sql
  UPDATE "PaymentMilestone" SET status = 'IN_ESCROW' WHERE id = '[deposit_id]';
  UPDATE "Payout" SET status = 'SENT' WHERE id = '[payout_id]';
  ```
- If receipt fails, show receipt HTML directly in browser

**Files:**
- Payments page: `apps/web/src/app/(app)/events/[eventSlug]/milestones/page.tsx`
- Payment client: `apps/web/src/components/payments/PaymentPlanPageClient.tsx`
- Demo endpoints: `apps/web/src/app/api/demo/milestones/[id]/fund/route.ts`, `apps/web/src/app/api/demo/payouts/[id]/release/route.ts`

---

### Step 6: Status Tracking (30 seconds)

**Action:**
1. Navigate to: `/app/events/demo-wedding`
2. Show Activity feed: Recent actions (proposal created, deposit funded, payout released)
3. Show Timeline: Milestones with due dates
4. Show Status badges: Event status, proposal status, contract status
5. **NEW:** Click notification bell in header → Show notification dropdown
6. **NEW:** Show notifications (4 pre-seeded), click one → Navigates to link

**Expected:** Activity feed shows recent actions, timeline visible, notifications work

**Backup if Step 6 Fails:**
- Navigate to: `/app/events/demo-wedding/tasks` (if exists)
- Or show admin dashboard: `/app/admin/overview`
- If notifications fail, skip notification demo

**File:** `apps/web/src/app/(app)/events/[eventSlug]/page.tsx`

---

## BACKUP PLANS (If Something Fails)

### Backup Plan A: Skip Marketplace, Use Pre-Seeded Data

**If marketplace fails:**
1. Skip Step 3 (Marketplace Discovery)
2. Go directly to Step 4 (Proposal)
3. Use pre-seeded proposal from seed script
4. Say: "We've already shortlisted vendors for this event"

**Time saved:** 60 seconds

---

### Backup Plan B: Skip Proposal Creation, Show Existing

**If proposal creation fails:**
1. Skip proposal creation UI
2. Navigate directly to: `/app/proposals/[id]`
3. Find proposal ID from database:
   ```sql
   SELECT id FROM "Proposal" WHERE "eventId" = (SELECT id FROM "Event" WHERE slug = 'demo-wedding');
   ```
4. Show existing proposal, accept it

**Time saved:** 30 seconds

---

### Backup Plan C: Skip Contract, Show Payments

**If contract generation fails:**
1. Skip Step 4 (Contract)
2. Go directly to Step 5 (Payments)
3. Say: "Once a proposal is accepted, we move to escrow and payments"

**Time saved:** 60 seconds

---

### Backup Plan D: Manual Database Updates

**If demo actions fail:**
1. Open database console (Prisma Studio or psql)
2. Update deposit status:
   ```sql
   UPDATE "PaymentMilestone" 
   SET status = 'IN_ESCROW' 
   WHERE "proposalId" = (SELECT id FROM "Proposal" WHERE "eventId" = (SELECT id FROM "Event" WHERE slug = 'demo-wedding') LIMIT 1)
   AND status = 'PENDING'
   LIMIT 1;
   ```
3. Update payout status:
   ```sql
   UPDATE "Payout" 
   SET status = 'SENT' 
   WHERE "proposalId" = (SELECT id FROM "Proposal" WHERE "eventId" = (SELECT id FROM "Event" WHERE slug = 'demo-wedding') LIMIT 1)
   AND status = 'PENDING'
   LIMIT 1;
   ```
4. Refresh page

**Time added:** 2 minutes

---

### Backup Plan E: Show Admin Dashboard

**If event flow fails:**
1. Navigate to: `/app/admin/overview`
2. Show:
   - User count, event count, organization count
   - Recent activity
   - Audit logs
3. Say: "Our admin dashboard provides full oversight of the platform"

**Time:** 60 seconds

---

## POST-DEMO RESET (Optional)

### Reset Demo Data

**If demo data was modified:**
```bash
# Re-run seed script
npx tsx scripts/seed.ts
```

**Or use reset endpoint (if created):**
```bash
curl -X POST http://localhost:3000/api/demo/reset \
  -H "Cookie: next-auth.session-token=[admin_session_token]"
```

**File:** `apps/web/src/app/api/demo/reset/route.ts` (to be created)

---

## TROUBLESHOOTING

### Issue: 404 on Event Vault

**Fix:**
1. Verify event exists: `SELECT slug FROM "Event" WHERE slug = 'demo-wedding';`
2. If missing, run seed script
3. If still 404, check route: `/pro/planner/vault/demo-wedding` vs `/app/vault/demo-wedding`

---

### Issue: Demo Mode Not Active

**Fix:**
1. Check `.env.local`: `ONEHUB_DEMO_MODE=true`
2. Restart dev server: `npm run dev`
3. Verify in browser console: `localStorage.getItem('demoMode')` (if stored)

---

### Issue: Stripe Errors in Demo

**Fix:**
1. Verify `ONEHUB_DEMO_MODE=true`
2. Check demo endpoints are being called (not real Stripe)
3. If real Stripe called, check `apps/web/src/lib/demo-mode.ts` is imported

---

### Issue: AI Proposal Generation Fails

**Fix:**
1. Demo mode has fallback, so this should not fail
2. If OpenAI key missing, fallback should activate
3. Check `apps/web/src/server/routers/ai.ts` for fallback logic

---

## QUICK REFERENCE

**Key URLs:**
- Demo launcher: `/demo`
- Event Vault: `/pro/planner/vault/demo-wedding`
- Event detail: `/app/events/demo-wedding`
- Payments: `/app/events/demo-wedding/milestones`
- Marketplace: `/marketplace`
- Admin: `/app/admin/overview`

**Key Credentials:**
- Pro Planner: `pro@example.com` / `password`
- Admin: `admin@example.com` / `password`

**Key Commands:**
- Seed: `npx tsx scripts/seed.ts`
- Dev server: `npm run dev`
- Database: `npx prisma studio`

---

## NOTES FOR FOUNDER

1. **Practice the flow 2-3 times** before investor meeting
2. **Have backup plans ready** (know which steps to skip)
3. **Keep database console open** for manual fixes if needed
4. **Test on the actual device** you'll use for demo (laptop/tablet)
5. **Have seed script ready** to reset demo data if needed
6. **Time yourself** - aim for 5 minutes, leave 1 minute buffer

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0

