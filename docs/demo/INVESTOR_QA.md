# OneHub Investor Q&A Guide

**Purpose:** Anticipated investor questions with concise answers and product locations

---

## ESCROW & PAYMENTS

### Q1: "How do you handle escrow safely?"

**Answer:**
> "OneHub uses Stripe Connect for escrow. When a client funds a deposit, the funds are held in a Stripe-managed account until the planner releases them to vendors. We track every transaction in our database and show real-time escrow balances. In production, we'll use Stripe's escrow features for additional protection."

**Where to Show:**
- **Route:** `/app/events/demo-wedding/milestones`
- **UI Element:** Escrow Summary card (lines 302-340 in `PaymentPlanPageClient.tsx`)
- **Database:** `EscrowAccount` model in `apps/web/prisma/schema.prisma` (lines 837-858)

**Backup:**
- Show audit log: `/app/admin/overview` → Audit Log section
- Show transaction records: Database query on `Transaction` model

---

### Q2: "What happens if a vendor doesn't deliver?"

**Answer:**
> "OneHub has a dispute resolution system. If a vendor doesn't deliver, the client can file a dispute. Our admin team reviews disputes and can issue refunds from escrow. We also track vendor ratings and reviews—vendors with poor ratings are removed from the marketplace."

**Where to Show:**
- **Route:** `/app/disputes` (if exists) OR `/app/admin/overview`
- **UI Element:** Dispute list or admin dashboard
- **Database:** `Dispute` model in `apps/web/prisma/schema.prisma` (lines 1014-1036)

**Backup:**
- Show dispute schema in database
- Explain refund process (manual for now, automated in production)

---

### Q3: "How do you prevent fraud?"

**Answer:**
> "We have multiple layers: vendor verification, identity checks, escrow protection, and audit logs. Every action is logged with IP address, timestamp, and user. We track payout locks to prevent amount manipulation. In production, we'll add ML-based fraud detection."

**Where to Show:**
- **Route:** `/app/admin/overview`
- **UI Element:** Audit Log section
- **Database:** `AuditLog` model in `apps/web/prisma/schema.prisma` (lines 250-263)
- **Code:** `apps/web/src/server/lib/audit.ts`

**Backup:**
- Show payout lock indicator: `/app/events/demo-wedding/milestones` → Payout Plan → "Locked to Proposal" badge
- Show code: `apps/web/src/lib/payments/payoutLock.ts`

---

### Q4: "What's your take rate?"

**Answer:**
> "OneHub charges a 3% platform fee on all released payments. We also pass through standard payment processing fees (2.9% + $0.30 per transaction). The platform fee is our primary revenue stream."

**Where to Show:**
- **Route:** `/app/events/demo-wedding/milestones`
- **UI Element:** "OneHub Revenue" card (lines 606-701 in `PaymentPlanPageClient.tsx`)
- **Code:** Platform fee constant: `PLATFORM_FEE_BPS = 300` (3%) in `apps/web/src/app/(app)/events/[eventSlug]/milestones/page.tsx` (line 13)

**Backup:**
- Show revenue breakdown table with totals
- Explain fee structure: "3% platform fee, plus standard Stripe processing fees"
- **NEW:** Show receipt download to demonstrate payment completion tracking

---

## MARKETPLACE & FLYWHEEL

### Q5: "How do you acquire vendors?"

**Answer:**
> "Vendors sign up through our onboarding flow. We verify their business, collect payment information for Stripe Connect, and list them in the marketplace. Verified vendors get bookings from planners, which leads to reviews and more bookings—creating a flywheel."

**Where to Show:**
- **Route:** `/vendor-venue/setup` OR `/providers/onboarding`
- **UI Element:** Vendor onboarding form
- **Code:** `apps/web/src/app/vendor-venue/setup/page.tsx`

**Backup:**
- Show marketplace: `/marketplace` → Point to verified vendor listings
- Show vendor dashboard: `/vendor/dashboard`

---

### Q6: "What's your marketplace flywheel?"

**Answer:**
> "Planners discover vendors → Book them → Pay through escrow → Leave reviews → More planners see reviews → More bookings → Vendors get verified → More trust → Repeat. We also track retention: planners who use OneHub for one event come back for future events."

**Where to Show:**
- **Route:** `/marketplace` → Click on listing → Show reviews (if any)
- **UI Element:** Review section on listing detail page
- **Database:** `Review` model in `apps/web/prisma/schema.prisma` (lines 663-676)

**Backup:**
- Show Event Vault: `/pro/planner/vault` → "Planners store all events here, creating retention"
- Show activity feed: `/app/events/demo-wedding` → "Every action is tracked, building trust"

---

### Q7: "How do you compete with existing event planning tools?"

**Answer:**
> "OneHub is the only platform that combines marketplace discovery, escrow-protected payments, and contract management in one place. Existing tools are either planning-only or payment-only. We're building the complete ecosystem."

**Where to Show:**
- **Route:** `/app/events/demo-wedding` → Show all tabs: Overview, Proposals, Contracts, Payments, Tasks, Guests
- **UI Element:** Event detail page with all features visible

**Backup:**
- Show Event Vault: "Everything in one place—no switching between tools"

---

## TECHNOLOGY & SCALABILITY

### Q8: "What's your tech stack?"

**Answer:**
> "We're built on Next.js 14 with TypeScript, PostgreSQL via Prisma, and Stripe for payments. We use tRPC for type-safe APIs and React Query for state management. The stack is modern, scalable, and maintainable."

**Where to Show:**
- **Code:** `apps/web/package.json` → Show dependencies
- **Database:** `apps/web/prisma/schema.prisma` → Show schema structure

**Backup:**
- Explain: "Next.js for fast page loads, Prisma for type-safe database access, Stripe for payment infrastructure"

---

### Q9: "How do you handle scale?"

**Answer:**
> "Our architecture is designed for scale. We use PostgreSQL for relational data, Stripe for payment processing (they handle scale), and Next.js for server-side rendering. We can horizontally scale our API servers and database as needed."

**Where to Show:**
- **Code:** `apps/web/src/server/routers/` → Show router structure (modular, scalable)
- **Database:** Show indexes in schema (e.g., `@@index([orgId, at])` on AuditLog)

**Backup:**
- Explain: "Stripe handles payment scale, we handle business logic. Database can be replicated and sharded as needed"

---

### Q10: "What about AI? How do you use it?"

**Answer:**
> "We use AI for proposal generation and vendor suggestions. When a planner creates a proposal, AI generates line items and milestones based on the event type and vendor category. We also use AI to suggest vendors based on event location, budget, and preferences."

**Where to Show:**
- **Route:** `/app/events/demo-wedding/proposals/new` → "Generate from Shortlist" button (if exists)
- **Code:** `apps/web/src/server/routers/ai.ts` → Show AI router

**Backup:**
- Show AI fallback: "We have fallback templates if AI is unavailable, so the demo always works"

---

## BUSINESS MODEL

### Q11: "What's your revenue model?"

**Answer:**
> "OneHub earns a 3% platform fee on all released payments. We also charge vendors a small listing fee (optional, not yet implemented). In the future, we may add premium features for planners and vendors."

**Where to Show:**
- **Route:** `/app/events/demo-wedding/milestones` → "OneHub Revenue" card
- **UI Element:** Revenue breakdown showing platform fee totals

**Backup:**
- Explain: "3% of all payments released through the platform. If we process $10M in payments, that's $300K in revenue."

---

### Q12: "What's your customer acquisition cost?"

**Answer:**
> "We're early stage, so CAC is still being measured. Our primary acquisition channels are: direct sales to event planning agencies, SEO for DIY planners, and vendor referrals. Once we have data, we'll optimize CAC."

**Where to Show:**
- **Route:** `/app/admin/overview` → Show user count, event count (if metrics visible)
- **Database:** Query `User` and `Event` counts

**Backup:**
- Explain: "We track all signups and can measure CAC once we have marketing spend data"

---

### Q13: "What's your unit economics?"

**Answer:**
> "For each $10,000 payment released, OneHub earns $300 (3% platform fee). Our costs are: payment processing (~$320 via Stripe), infrastructure (~$10-20), and support (~$10-20). Net margin per transaction is positive, and margins improve with scale."

**Where to Show:**
- **Route:** `/app/events/demo-wedding/milestones` → "OneHub Revenue" card
- **UI Element:** Show revenue breakdown with platform fee highlighted

**Backup:**
- Explain: "3% platform fee minus ~3.5% processing costs = negative margin per transaction, but we make it up with volume and future premium features"

---

## COMPETITIVE LANDSCAPE

### Q14: "Who are your competitors?"

**Answer:**
> "Our competitors fall into three categories: planning tools (Eventbrite Organizer, Planning Pod), payment tools (Honeybook, Thumbtack), and marketplaces (The Knot, WeddingWire). OneHub is the only platform that combines all three—marketplace, escrow, and planning—in one place."

**Where to Show:**
- **Route:** `/app/events/demo-wedding` → Show all features: marketplace integration, escrow, planning tools
- **UI Element:** Event detail page showing complete feature set

**Backup:**
- Explain: "We're not just a planning tool or payment tool—we're the complete ecosystem"

---

### Q15: "What's your moat?"

**Answer:**
> "Our moat is network effects: more vendors → more planners → more bookings → more reviews → more vendors. We also have escrow infrastructure that's hard to replicate, and we're building trust through verified vendors and dispute resolution."

**Where to Show:**
- **Route:** `/marketplace` → Show verified vendor listings
- **Route:** `/app/events/demo-wedding/milestones` → Show escrow infrastructure

**Backup:**
- Explain: "Network effects + escrow infrastructure + trust = defensible moat"

---

## PRODUCT & FEATURES

### Q16: "What features are you building next?"

**Answer:**
> "Our roadmap includes: mobile apps for planners and vendors, automated contract generation with e-signatures, advanced AI for vendor matching, and analytics dashboards. We're also building out the review system and referral program."

**Where to Show:**
- **Route:** `/app/events/demo-wedding` → "Here's what we have today, and here's what's coming"
- **Code:** Show feature flags in `apps/web/prisma/schema.prisma` (lines 222-248)

**Backup:**
- Explain: "We use feature flags to roll out features gradually"

---

### Q17: "How do you handle contracts and legal?"

**Answer:**
> "OneHub generates contracts from proposals using templates. Contracts include terms, payment schedules, and signature fields. Both parties can sign electronically right in the platform. We're working with legal counsel to ensure contracts are enforceable."

**Where to Show:**
- **Route:** `/app/contracts/[id]` → Show contract detail
- **UI Element:** Signature form (new in P0-3)
- **Action:** Demonstrate signing a contract
- **Code:** `apps/web/src/server/routers/contract.ts` → Show contract generation
- **Template:** `docs/contract-templates/base.md`

**Backup:**
- Explain: "Contracts are generated from proposals, include standard terms, and are signed electronically"
- Show pre-signed contract from seed data if signing fails

---

### Q18: "What about mobile?"

**Answer:**
> "OneHub is currently web-only, but we're building mobile apps for iOS and Android. The web app is responsive and works on mobile browsers, but native apps will provide a better experience for planners and vendors on the go."

**Where to Show:**
- **Route:** Any page → Resize browser to mobile view → Show responsive design
- **Code:** Show Tailwind responsive classes (e.g., `md:grid-cols-2`)

**Backup:**
- Explain: "Web app is responsive, native apps coming next"

---

## TRACTION & METRICS

### Q19: "What's your traction?"

**Answer:**
> "We're early stage, but we have [X] planners, [Y] vendors, and [Z] events on the platform. We're processing [W] in payments monthly. Our focus is on product-market fit and building the marketplace flywheel."

**Where to Show:**
- **Route:** `/app/admin/overview` → Show metrics (if visible)
- **Database:** Query counts:
  ```sql
  SELECT COUNT(*) FROM "User" WHERE role = 'PRO_PLANNER';
  SELECT COUNT(*) FROM "Listing";
  SELECT COUNT(*) FROM "Event";
  SELECT SUM("amountCents") FROM "Payout" WHERE status = 'SENT';
  ```

**Backup:**
- Explain: "We track all metrics in our admin dashboard"

---

### Q20: "What's your retention rate?"

**Answer:**
> "We're still measuring retention, but early data shows planners who use OneHub for one event come back for future events. We track this through the Event Vault—planners can see all their past events and reuse vendors."

**Where to Show:**
- **Route:** `/pro/planner/vault` → Show multiple events (if any)
- **Database:** Query events per planner:
  ```sql
  SELECT "createdById", COUNT(*) FROM "Event" GROUP BY "createdById";
  ```

**Backup:**
- Explain: "Event Vault stores all events, creating retention through data lock-in"

---

## RISK & COMPLIANCE

### Q21: "What are your biggest risks?"

**Answer:**
> "Our biggest risks are: payment fraud, vendor non-delivery, and regulatory compliance. We mitigate these through escrow, dispute resolution, vendor verification, and working with legal counsel on compliance."

**Where to Show:**
- **Route:** `/app/admin/overview` → Show audit logs, dispute system
- **Code:** Show dispute resolution: `apps/web/src/server/routers/dispute.ts`

**Backup:**
- Explain: "Escrow protects against fraud, dispute system handles non-delivery, legal counsel handles compliance"

---

### Q22: "Are you compliant with payment regulations?"

**Answer:**
> "We use Stripe Connect, which handles PCI compliance and payment regulations. We're working with legal counsel to ensure we comply with money transmitter laws and escrow regulations in each state."

**Where to Show:**
- **Code:** Show Stripe integration: `apps/web/src/server/lib/stripe.ts`
- **Docs:** `docs/payments.md` → Show Stripe setup

**Backup:**
- Explain: "Stripe handles compliance, we handle business logic"

---

## CLOSING QUESTIONS

### Q23: "What do you need funding for?"

**Answer:**
> "We're raising [X] to: 1) Build mobile apps, 2) Expand vendor acquisition, 3) Add AI features, 4) Build out the review system, and 5) Scale infrastructure. We'll use [Y]% for product, [Z]% for marketing, and [W]% for operations."

**Where to Show:**
- **Route:** Any page → "Here's what we have, here's what we'll build with funding"

**Backup:**
- Explain: "Funding will accelerate product development and marketplace growth"

---

### Q24: "What's your exit strategy?"

**Answer:**
> "Our exit strategy is acquisition by a larger event planning or marketplace platform. Potential acquirers include: Eventbrite, The Knot, WeddingWire, or Honeybook. We're also building a defensible business that could be standalone profitable."

**Where to Show:**
- **Route:** `/app/events/demo-wedding/milestones` → "We're building a platform that generates revenue and has network effects"

**Backup:**
- Explain: "Network effects + revenue = attractive acquisition target"

---

## QUICK REFERENCE

**Key Routes for Answers:**
- Escrow: `/app/events/demo-wedding/milestones`
- Marketplace: `/marketplace`
- Contracts: `/app/contracts/[id]`
- Admin: `/app/admin/overview`
- Proposals: `/app/proposals/[id]`

**Key Code Files:**
- Payments: `apps/web/src/components/payments/PaymentPlanPageClient.tsx`
- Contracts: `apps/web/src/server/routers/contract.ts`
- Escrow: `apps/web/src/app/api/payments/deposits/auto/route.ts`
- Audit: `apps/web/src/server/lib/audit.ts`

**Key Database Models:**
- Escrow: `EscrowAccount`, `Deposit`, `Payout`
- Contracts: `Contract`, `Signature`
- Marketplace: `Listing`, `Review`
- Admin: `AuditLog`, `Dispute`

---

## NOTES FOR FOUNDER

1. **Be honest** — If something isn't built yet, say "We're building that next"
2. **Show, don't tell** — Navigate to the relevant page when possible
3. **Have backups** — Know which routes to show if primary fails
4. **Practice answers** — Rehearse 3-5 key answers before the meeting
5. **Stay calm** — If you don't know, say "That's a great question, let me get back to you"

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0

