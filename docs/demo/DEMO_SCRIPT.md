# OneHub Investor Demo Script

**Duration:** 5-6 minutes  
**Audience:** Investors  
**Goal:** Demonstrate end-to-end event planning with escrow-protected payments

---

## PRE-DEMO SETUP (Before Investor Arrives)

**Action:** Open browser to `http://localhost:3000/demo`, verify preflight checks are green

**Say (if asked):** "I'm running a quick preflight check to ensure everything is ready."

---

## OPENING (30 seconds)

**Action:** Click "Start as Pro Planner" on demo launcher page

**Say:**
> "Welcome to OneHub. I'm going to show you how a professional event planner orchestrates a wedding with escrow-protected payments. Let's start with the Event Vault, where planners manage all their events."

**Click Path:**
1. `/demo` → Click "Start as Pro Planner"
2. Auto-login (or manual: `/signin` → `pro@example.com` / `password`)
3. Redirects to `/pro/planner/vault/demo-wedding`

---

## ACT 1: EVENT VAULT (30 seconds)

**Action:** Show Event Vault detail page, point to event details

**Say:**
> "Here's the Event Vault for a wedding in Chicago. You can see the event details: 150 guests, $50,000 budget, scheduled for next summer. The Vault is where planners keep everything organized—proposals, contracts, payments, timelines—all in one place."

**Click Path:**
- Already on `/pro/planner/vault/demo-wedding`

**Point Out:**
- Event name: "Demo Wedding Event"
- Location: Chicago, IL
- Budget: $50,000
- Guest count: 150
- Status: PLANNING

**Transition:**
> "Now let's see how planners discover and book vendors."

---

## ACT 2: MARKETPLACE DISCOVERY (60 seconds)

**Action:** Navigate to marketplace, show filters, click on a listing, create booking request

**Say:**
> "OneHub has a marketplace of verified vendors and venues. Planners can search by category, location, price tier, and capacity. Let me show you a photography vendor we've shortlisted."

**Click Path:**
1. Click "AI Source Vendors & Venues" (if button exists) OR navigate to `/marketplace`
2. Show filters: Category dropdown, Location, Price Tier
3. Click on "Elite Photography Studio" listing
4. Show listing detail page
5. **NEW:** Click "Request Booking" button → Modal opens
6. **NEW:** Show pre-filled form (demo mode), submit booking request
7. **NEW:** Navigate to `/app/requests` → Show booking requests list

**Point Out:**
- Gallery images
- Description
- Price tier: 4/5
- Location: Chicago, IL
- Category: PHOTO_VIDEO
- Reviews (if any)
- **NEW:** Booking request form, success message
- **NEW:** Booking requests list with status badges

**Say (while showing listing):**
> "This vendor has been verified by OneHub. We show ratings, pricing, and availability. Planners can request bookings directly from the marketplace. All requests are tracked in one place."

**Say (while showing requests):**
> "Here you can see all booking requests with their status—pending, quoted, or declined. This gives planners full visibility into vendor communications."

**Transition:**
> "Once a vendor responds, we move to proposals."

---

## ACT 3: PROPOSAL & CONTRACT (90 seconds)

**Action:** Navigate to proposal, show line items and milestones, accept it, show contract

**Say:**
> "Once a vendor is shortlisted, planners can generate AI-powered proposals. The proposal includes line items, payment milestones, and terms. Let me show you an existing proposal for photography services."

**Click Path:**
1. Navigate to `/app/events/demo-wedding/proposals/new` OR `/app/proposals/[id]`
2. Show proposal detail page

**Point Out:**
- Proposal title: "Elite Photography Proposal"
- Line items: Photography Package ($8,000)
- Milestones: Deposit ($2,400), Final ($5,600)
- Status: DRAFT or SENT

**Say (while showing proposal):**
> "The proposal breaks down the services, pricing, and payment schedule. When the client accepts, we automatically generate a contract."

**Action:** Accept proposal (change status to ACCEPTED if needed)

**Say:**
> "Once accepted, OneHub generates a contract with terms, payment schedule, and signature fields. Both parties can sign electronically."

**Click Path:**
1. Navigate to `/app/contracts/[id]` (contract should auto-generate)

**Point Out:**
- Contract title
- Terms and conditions
- Signatures (if any)
- Status: OUT_FOR_SIGNATURE or FULLY_SIGNED

**Say (while showing contract):**
> "The contract is legally binding and includes dispute resolution terms. Both parties can sign electronically right here in OneHub."

**Action:** Fill signature form, submit

**Say:**
> "I'll sign the contract now. [Submit form] Once both parties sign, the contract status updates to 'Fully Signed' and we move to escrow and payments."

**Transition:**
> "This is where OneHub's escrow system protects both parties."

---

## ACT 4: ESCROW & PAYMENTS (120 seconds)

**Action:** Navigate to Payments & Escrow page, show all sections, demonstrate funding and release

**Say:**
> "OneHub holds funds in escrow until milestones are completed. This protects clients from paying upfront and vendors from non-payment. Let me show you the payment plan."

**Click Path:**
1. Navigate to `/app/events/demo-wedding/milestones`

**Point Out (Escrow Summary):**
- Escrow Balance: $X (funded deposits)
- Funded Total: $X
- Released to Vendor: $X

**Say:**
> "The escrow summary shows how much is held, how much has been funded, and how much has been released to vendors."

**Point Out (Client Funding):**
- Deposit schedule: 30/40/30 split
- Status badges: PENDING, IN_ESCROW, SUCCEEDED

**Say:**
> "Clients fund deposits on a schedule—typically 30% upfront, 40% mid-way, and 30% final. Each deposit is held in escrow until the planner releases it to vendors."

**Action:** Click "Fund Deposit" button (demo mode)

**Say:**
> "When a client funds a deposit, the status changes to 'In Escrow'. The funds are held securely until the planner releases them."

**Point Out (Payout Plan):**
- Payout lines: Vendor name, amount, status
- Lock indicator: "Locked to Proposal" (if visible)

**Say:**
> "The payout plan shows which vendors get paid and how much. Payouts can be locked to proposals, so if a proposal changes, the payout automatically updates."

**Action:** Click "Release Payout" button (demo mode)

**Say:**
> "When a milestone is completed, the planner releases the payout. The vendor receives payment, and OneHub takes a platform fee."

**Point Out (OneHub Revenue):**
- Platform fee: 3% of gross
- Processing fee: 2.9% + $0.30 (illustrative)
- Vendor payout: Gross - fees
- Totals across all released payouts

**Say:**
> "OneHub earns a 3% platform fee on all released payments. This is our primary revenue stream. You can see the breakdown: gross payment, our fee, processing costs, and what the vendor receives."

**Action:** Click "Receipt" link for a SENT payout

**Say:**
> "For every completed payment, we generate a receipt that vendors can download. [Show receipt] The receipt shows all payment details, fees, and is an official record for accounting."

**Transition:**
> "Let's see how everything is tracked."

---

## ACT 5: STATUS TRACKING (30 seconds)

**Action:** Navigate to event detail page, show activity feed and timeline

**Say:**
> "Everything is tracked in real-time. The activity feed shows all actions—proposals created, deposits funded, payouts released. The timeline shows milestones and due dates."

**Click Path:**
1. Navigate to `/app/events/demo-wedding`

**Point Out:**
- Activity feed: Recent actions (proposal created, deposit funded, payout released)
- Timeline: Milestones with due dates
- Status badges: Event status, proposal status, contract status

**Say (while showing activity):**
> "This gives planners and clients full visibility into the event's progress. Everyone knows what's been done and what's next."

**Action:** Click notification bell in header

**Say:**
> "We also have in-app notifications that keep everyone informed. [Show dropdown] You can see notifications for proposals created, deposits funded, payouts released, and contracts signed. Everything is tracked in real-time."

**Transition:**
> "Let me show you the admin view."

---

## CLOSING (30 seconds)

**Action:** Navigate to admin dashboard (optional)

**Say:**
> "From an admin perspective, we have full oversight: user activity, transaction logs, audit trails, and dispute resolution. This ensures trust and safety on the platform."

**Click Path:**
1. Navigate to `/app/admin/overview` (optional)

**Point Out (if time permits):**
- User count, event count, organization count
- Recent activity
- Audit logs

**Say (closing):**
> "OneHub is a complete platform for event planning with built-in escrow, payments, and marketplace. We're protecting both planners and clients while creating a flywheel of reviews and retention. Thank you for your time. Any questions?"

---

## BACKUP SCRIPT (If Something Fails)

### If Marketplace Fails

**Say:**
> "Let me show you a proposal that's already been created for this event. [Navigate to proposal] This shows how planners work with vendors—line items, milestones, and terms are all structured."

**Skip:** Marketplace discovery  
**Time saved:** 60 seconds

---

### If Proposal Creation Fails

**Say:**
> "Here's an existing proposal for photography services. [Show proposal] Once accepted, we move to escrow and payments."

**Skip:** Proposal creation  
**Time saved:** 30 seconds

---

### If Contract Generation Fails

**Say:**
> "Once a proposal is accepted, we move directly to escrow and payments. [Navigate to payments] This is where OneHub's escrow system protects both parties."

**Skip:** Contract view  
**Time saved:** 60 seconds

---

### If Demo Actions Fail (Funding/Release)

**Say:**
> "In a real transaction, when a client funds a deposit, the status changes to 'In Escrow'. [Point to status badge] And when a milestone is completed, the planner releases the payout. [Point to payout status] You can see the escrow balance and revenue breakdown here."

**Skip:** Interactive demo actions  
**Time saved:** 30 seconds

---

## KEY TALKING POINTS (Weave Throughout)

1. **Escrow Protection:** "Funds are held in escrow until milestones are completed, protecting both parties."

2. **Platform Revenue:** "OneHub earns a 3% platform fee on all released payments—our primary revenue stream."

3. **Marketplace Flywheel:** "Verified vendors get bookings, clients get reviews, and planners get retention—creating a flywheel."

4. **End-to-End:** "From discovery to payment, everything happens in OneHub—no need to switch between tools."

5. **Trust & Safety:** "Audit logs, dispute resolution, and escrow ensure trust on the platform."

---

## TIMING BREAKDOWN

| Section | Target Time | Actual Time | Notes |
|---------|-------------|-------------|-------|
| Opening | 30s | | |
| Event Vault | 30s | | |
| Marketplace | 60s | | Can skip if needed |
| Proposal & Contract | 90s | | Can skip contract if needed |
| Escrow & Payments | 120s | | Core demo |
| Status Tracking | 30s | | |
| Closing | 30s | | |
| **Total** | **5-6 min** | | |

---

## PRACTICE CHECKLIST

- [ ] Practice opening (30s)
- [ ] Practice Event Vault (30s)
- [ ] Practice Marketplace (60s)
- [ ] Practice Proposal & Contract (90s)
- [ ] Practice Escrow & Payments (120s) — **Most important**
- [ ] Practice Status Tracking (30s)
- [ ] Practice closing (30s)
- [ ] Time entire flow (target: 5-6 min)
- [ ] Practice backup scripts
- [ ] Test on actual demo device

---

## NOTES FOR FOUNDER

1. **Speak confidently** — You built this, you know it works
2. **Emphasize escrow** — This is the key differentiator
3. **Show revenue** — Investors care about monetization
4. **Handle failures gracefully** — "Let me show you this instead..."
5. **Keep it under 6 minutes** — Leave time for questions
6. **Practice 3-5 times** — Muscle memory helps under pressure

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0

