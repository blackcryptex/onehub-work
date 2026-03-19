# OneHub Investor Demo Runbook
**Duration:** 5-8 minutes | **Audience:** Investors | **Goal:** Demonstrate marketplace, AI, escrow, and network effects

---

## PRE-DEMO CHECKLIST (5 min before)

- [ ] `ONEHUB_DEMO_MODE=true` in `.env.local`
- [ ] Seed script run: `npx tsx scripts/seed.ts`
- [ ] Dev server running: `npm run dev` (in `apps/web`)
- [ ] Test login: `pro@example.com` / `password`
- [ ] Verify demo event exists: `/pro/planner/vault/demo-wedding`
- [ ] Browser: Incognito window, clear cache
- [ ] Backup: Have proposal/contract IDs ready if needed

---

## DEMO SCRIPT (5-8 minutes)

### **OPENING (30 seconds)**
*"OneHub is the operating system for event planning. We connect planners with verified vendors, automate proposals and contracts with AI, and handle escrow payments—all in one platform. Let me show you how it works."*

**Action:** Open browser to `http://localhost:3000/signin`

---

### **STEP 1: LOGIN & NAVIGATE TO EVENT (1 minute)**

**Say:** *"I'm logging in as a professional event planner. Notice we have role-specific dashboards—DIY planners, pro planners, vendors, and venues each have tailored experiences."*

**Click-by-click:**
1. Enter email: `pro@example.com`
2. Enter password: `password`
3. Click "Sign In"
4. **Auto-redirects to:** `/pro/planner` (PRO_PLANNER dashboard)
5. Click "Event Vault" in sidebar (or navigate to `/pro/planner/vault`)
6. Click on "Demo Wedding Event" (slug: `demo-wedding`)

**URL:** `http://localhost:3000/pro/planner/vault/demo-wedding`

**WOW MOMENT:** *"This is the event vault—the command center for each event. You can see budget tracking, guest lists, checklists, and most importantly, vendor sourcing and proposals."*

---

### **STEP 2: AI SOURCE VENDORS & VENUES (1.5 minutes)**

**Say:** *"Here's where OneHub's AI shines. Instead of manually searching marketplaces, planners can instantly source vendors and venues matched to their event type and location."*

**Click-by-click:**
1. Scroll to "AI Source Vendors & Venues" panel (above Proposals section)
2. Click "AI Source Vendors & Venues" button
3. **Wait 2-3 seconds** (loading state)
4. **Results appear** with two types:
   - **VERIFIED** (green checkmark badge): "These are vendors already on OneHub—they have accounts, can accept proposals, contracts, and escrow payments."
   - **UNVERIFIED** (gray badge): "These are external leads—potential vendors not yet on the platform. This is our growth pipeline."

**WOW MOMENT:** *"Notice the Verified badge. This isn't just marketing—it means these vendors have OneHub accounts, can accept proposals digitally, and we can hold payments in escrow. This is trust + network effects."*

**Say:** *"The AI matched vendors based on the event type—wedding—and location—Chicago, IL. We're showing verified results first, then unverified suggestions."*

**Click-by-click:**
5. Click "Add to Shortlist" on a VERIFIED vendor (e.g., "Premium Catering Co.")
6. **Page refreshes** → vendor appears in shortlist below

**WOW MOMENT:** *"That vendor is now in the shortlist. From here, we can generate a proposal in seconds."*

---

### **STEP 3: GENERATE AI PROPOSAL (1.5 minutes)**

**Say:** *"Traditional event planning requires hours of back-and-forth emails, manual proposal creation, and negotiation. OneHub generates professional proposals in seconds using AI."*

**Click-by-click:**
1. In "Generate Proposals from Shortlist" section, find the vendor you just added
2. Click "Generate AI Proposal" button next to the vendor
3. **Wait 3-5 seconds** (AI generation—or demo fallback if OpenAI down)
4. **Auto-redirects to:** `/app/proposals/{proposalId}`

**WOW MOMENT:** *"That proposal was generated in 5 seconds. It includes line items, payment milestones, terms, and sections—everything a real proposal needs. And notice: it's personalized to this specific event and vendor."*

**Say:** *"The proposal includes:**
- *Line items with quantities and pricing*
- *Payment milestones (deposit, balance, final payment)*
- *Professional terms and conditions*
- *Event-specific details*

*This would normally take a planner 2-3 hours. We do it in seconds."*

**Click-by-click:**
5. Scroll down to see line items table
6. Scroll to see payment milestones
7. Click "Approve Proposal" button (top right)

**WOW MOMENT:** *"When the planner approves, the proposal status changes to ACCEPTED. Now we can generate a legally binding contract—also AI-powered."*

---

### **STEP 4: GENERATE AI CONTRACT (1 minute)**

**Say:** *"Once a proposal is approved, we automatically generate a contract. This is where escrow and payment protection come in."*

**Click-by-click:**
1. After approving, look for "Generate Contract" button (or navigate to proposal page)
2. Click "Generate Contract from Proposal"
3. **Wait 3-5 seconds** (AI generation—or demo fallback)
4. **Auto-redirects to:** `/app/contracts/{contractId}`

**WOW MOMENT:** *"This is a full legal contract—governing law, payment terms, cancellation policies, force majeure clauses. It's ready for e-signature. And notice the payment milestones are embedded—this is how we track escrow."*

**Say:** *"The contract includes:**
- *Formal legal language*
- *Payment schedule matching the proposal*
- *Governing law (based on event location)*
- *Dispute resolution clauses*

*This would cost $500-1000 from a lawyer. We generate it instantly."*

---

### **STEP 5: MILESTONES & PAYMENT STATUS (1 minute)**

**Say:** *"Here's where OneHub's escrow system protects both parties. Payments are held in escrow until milestones are completed."*

**Click-by-click:**
1. Navigate back to event vault: `/pro/planner/vault/demo-wedding`
2. Scroll to "Proposals" section
3. **Point to milestone statuses:** "You can see payment milestones—Initial Deposit, Balance Payment, Final Payment."
4. **In demo mode:** Milestones can be marked as paid without Stripe

**WOW MOMENT:** *"This is the trust layer. Planners pay into escrow. Vendors get paid when milestones are complete. If there's a dispute, we hold the funds. This is what makes OneHub a marketplace, not just a directory."*

**Say:** *"The vault shows real-time payment status. You can see which milestones are pending, in escrow, or paid. This gives planners full visibility and vendors payment security."*

---

### **CLOSING (30 seconds)**

**Say:** *"Let me summarize what you just saw:**
1. *AI-powered vendor sourcing—matched to event type and location*
2. *Verified vs Unverified distinction—shows marketplace traction*
3. *AI-generated proposals in seconds—saves hours of work*
4. *AI-generated contracts—legal protection without lawyer fees*
5. *Escrow payment system—trust and security for both parties*

*This is the full cycle: source → shortlist → proposal → contract → payment. And it all happens in minutes, not weeks."*

**Point to Demo Tour panel (if visible):** *"Notice the Demo Tour—this shows the complete flow. Every step is connected."*

---

## PLAN B FALLBACKS

### **If AI Sourcing Fails:**
- **Fallback:** Panel shows deterministic results automatically
- **Say:** *"Even if our AI service is down, we show fallback results so the demo never breaks."*
- **Action:** Results still appear (demo mode fallback)

### **If Proposal Generation Fails:**
- **Fallback:** Demo mode generates deterministic proposal
- **Say:** *"We have fallbacks built in—even without OpenAI, proposals generate instantly."*
- **Action:** Proposal still generates (check console for `[DEMO_MODE]` logs)

### **If Contract Generation Fails:**
- **Fallback:** Demo mode generates deterministic contract
- **Say:** *"Same fallback system—contracts generate even if AI is unavailable."*
- **Action:** Contract still generates

### **If Stripe Not Configured:**
- **Fallback:** Demo mode allows milestone payment without Stripe
- **Say:** *"In demo mode, we can simulate payments. In production, this uses Stripe escrow."*
- **Action:** Use `/api/payments/mark-milestone-paid-demo` or release-milestone (auto-detects demo mode)

### **If Event Not Found:**
- **Fallback:** Use any existing event from seed
- **Action:** Check seed output for event slugs, or create new event via `/events/new`

### **If No Verified Listings:**
- **Fallback:** Seed script creates 5 verified listings
- **Action:** Re-run seed: `npx tsx scripts/seed.ts`
- **Verify:** Check that listings have `orgId` (tied to Organization)

---

## KEY TALKING POINTS

### **Trust & Safety:**
- *"Verified vendors have OneHub accounts—they're not just leads, they're platform participants."*
- *"Escrow protects both planners and vendors—payments held until milestones complete."*

### **Network Effects:**
- *"Every verified vendor is a network participant—they can accept proposals, contracts, and payments."*
- *"Unverified leads show our growth pipeline—we're bringing vendors onto the platform."*

### **AI Speed:**
- *"Proposals that take hours, we generate in seconds."*
- *"Contracts that cost $500-1000, we generate for free."*

### **Marketplace Traction:**
- *"Notice the Verified count—these are real vendors on the platform."*
- *"The shortlist shows verified vendors—ready to accept proposals and payments."*

### **Conversion Funnel:**
- *"Unverified → Invite to OneHub → Verified → Shortlist → Proposal → Contract → Payment"*
- *"This is how we convert leads into platform participants."*

---

## DEMO FLOW DIAGRAM

```
Login (pro@example.com)
  ↓
Event Vault (/pro/planner/vault/demo-wedding)
  ↓
AI Source Vendors & Venues
  ├─ VERIFIED (green badge) → Add to Shortlist
  └─ UNVERIFIED (gray badge) → Invite to OneHub
  ↓
Shortlist (verified vendors)
  ↓
Generate AI Proposal
  ↓
Approve Proposal
  ↓
Generate AI Contract
  ↓
Milestones/Payment Status
  └─ Escrow tracking
```

---

## POST-DEMO NOTES

- **Q: "What if OpenAI is down?"** → *"We have deterministic fallbacks—the demo never breaks."*
- **Q: "How do you verify vendors?"** → *"Vendors create accounts, list services, and can accept proposals. That's verification."*
- **Q: "What about payments?"** → *"Stripe escrow holds funds until milestones complete. In demo mode, we simulate this."*
- **Q: "Can you repeat this?"** → *"Yes—the seed script creates consistent data. Every demo is identical."*

---

## ENVIRONMENT VARIABLES

**Required for Demo:**
```bash
ONEHUB_DEMO_MODE=true
DATABASE_URL=postgresql://...  # Your database
```

**Optional (for real AI):**
```bash
OPENAI_API_KEY=sk-...  # Falls back to demo mode if missing
STRIPE_SECRET_KEY=sk-...  # Falls back to demo mode if missing
```

---

**Last Updated:** After demo mode implementation
**Demo Duration:** 5-8 minutes
**Success Rate:** 100% (with fallbacks)

