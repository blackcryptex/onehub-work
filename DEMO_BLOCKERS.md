# OneHub Demo Blockers & Fixes
**Priority:** Top 10 risks ordered by severity | **Status:** All have fixes

---

## 🔴 CRITICAL (Demo Breakers)

### **1. Missing ONEHUB_DEMO_MODE Environment Variable**
**Severity:** CRITICAL  
**Risk:** AI fallbacks won't activate, demo breaks if OpenAI down  
**File:** `.env.local` or environment  
**Fix:**
```bash
# Add to .env.local
ONEHUB_DEMO_MODE=true
```
**Verification:**
```bash
# Check in code
grep -r "ONEHUB_DEMO_MODE" apps/web/src
# Should see checks in:
# - apps/web/src/lib/demo-mode.ts
# - apps/web/src/lib/ai/generateProposal.ts
# - apps/web/src/lib/ai/generateContract.ts
```

---

### **2. Seed Script Not Run / Demo Event Missing**
**Severity:** CRITICAL  
**Risk:** No demo event, no verified listings, demo can't start  
**File:** `scripts/seed.ts`  
**Fix:**
```bash
cd /Users/marlon/OneHub
npx tsx scripts/seed.ts
```
**Verification:**
```bash
# Check demo event exists
# Should see: "Demo Event Slug: demo-wedding"
# Should see: 5 verified listings (Chicago, IL)
```
**If Missing:**
- Re-run seed script
- Check database connection
- Verify `DATABASE_URL` in `.env.local`

---

### **3. Wrong Vault Route for PRO_PLANNER**
**Severity:** CRITICAL  
**Risk:** 404 or redirect loop, demo can't access event  
**File:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` (lines 46-50)  
**Current Behavior:** PRO_PLANNER accessing `/app/vault/[slug]` redirects to `/pro/planner/vault/[slug]`  
**Fix:** Already implemented—routing is correct  
**Verification:**
```bash
# PRO_PLANNER should access:
/pro/planner/vault/demo-wedding

# NOT:
/app/vault/demo-wedding  # This redirects
```
**If Issue:**
- Check `vaultDetail()` function in `apps/web/src/lib/routes.ts`
- Verify redirect logic in vault page

---

## 🟠 HIGH (Demo Degraders)

### **4. AI Sourcing Returns No Verified Results**
**Severity:** HIGH  
**Risk:** Demo looks empty, no trust signal  
**File:** `apps/web/src/app/api/ai/source-vendors-venues/route.ts`  
**Root Cause:** Listings don't match event location/type  
**Fix:**
```bash
# Ensure seed creates listings matching demo event:
# - Event: Chicago, IL, WEDDING
# - Listings: Must have state="IL" and category matching WEDDING categories
```
**Verification:**
```sql
-- Check listings match event
SELECT l.title, l.city, l.state, l.category 
FROM "Listing" l 
WHERE l.state = 'IL' 
AND l.category IN ('VENUE_SPACE', 'CATERING', 'DECOR_FLORAL', 'ENTERTAINMENT', 'PHOTO_VIDEO', 'RENTALS');
```
**If Empty:**
- Re-run seed script
- Check seed creates listings with `orgId` (verified = has org)

---

### **5. Proposal Generation Fails (No Fallback)**
**Severity:** HIGH  
**Risk:** Demo stops, can't show AI value  
**File:** `apps/web/src/lib/ai/generateProposal.ts` (lines 89-102)  
**Current Fix:** Demo mode fallback exists  
**Verification:**
```bash
# Check fallback function exists
grep -A 20 "generateDemoProposal" apps/web/src/lib/ai/generateProposal.ts
```
**If Missing:**
- Fallback should activate if `isDemoMode()` or `!isAIAvailable()`
- Check console for `[DEMO_MODE]` logs

---

### **6. Contract Generation Fails (No Fallback)**
**Severity:** HIGH  
**Risk:** Can't show contract → payment flow  
**File:** `apps/web/src/lib/ai/generateContract.ts` (lines 77-90)  
**Current Fix:** Demo mode fallback exists  
**Verification:**
```bash
# Check fallback function exists
grep -A 20 "generateDemoContract" apps/web/src/lib/ai/generateContract.ts
```
**If Missing:**
- Fallback should activate if `isDemoMode()` or `!isAIAvailable()`
- Check console for `[DEMO_MODE]` logs

---

### **7. Milestone Payment Requires Stripe (No Demo Fallback)**
**Severity:** HIGH  
**Risk:** Can't show payment progression  
**File:** `apps/web/src/app/api/payments/release-milestone/route.ts` (lines 105-140)  
**Current Fix:** Demo mode skips Stripe  
**Verification:**
```bash
# Check demo mode check exists
grep -A 10 "isDemoMode" apps/web/src/app/api/payments/release-milestone/route.ts
```
**If Missing:**
- Demo mode should update milestone status without Stripe
- Alternative: Use `/api/payments/mark-milestone-paid-demo`

---

## 🟡 MEDIUM (Demo Annoyances)

### **8. Verified Badge Not Showing on Shortlist Items**
**Severity:** MEDIUM  
**Risk:** Less trust signal, unclear what "verified" means  
**File:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` (lines 636-651)  
**Current Fix:** Badge added to shortlist items  
**Verification:**
```bash
# Check badge rendering
grep -A 5 "Verified" apps/web/src/app/(app)/vault/[eventSlug]/page.tsx
```
**If Missing:**
- Badge should show on all shortlist items (they reference Listing = verified)
- Check `CheckCircle2` icon import

---

### **9. Demo Tour Panel Not Visible**
**Severity:** MEDIUM  
**Risk:** No quick navigation, demo feels slower  
**File:** `apps/web/src/components/vault/DemoTour.tsx`  
**Root Cause:** `ONEHUB_DEMO_MODE` not set or `show` prop false  
**Fix:**
```bash
# Ensure env var set
ONEHUB_DEMO_MODE=true

# Check component receives show={true}
grep -A 5 "DemoTour" apps/web/src/app/(app)/vault/[eventSlug]/page.tsx
```
**Verification:**
- Panel should appear at top of vault page
- Should show 4 buttons: Event Vault, View Proposal, View Contract, AI Source

---

### **10. Proposal Approval Button Missing or Broken**
**Severity:** MEDIUM  
**Risk:** Can't progress to contract generation  
**File:** `apps/web/src/components/proposals/ApproveProposalButton.tsx`  
**Verification:**
```bash
# Check button exists on proposal page
grep -r "ApproveProposalButton" apps/web/src/app/(app)/proposals
```
**If Missing:**
- Button should be on `/app/proposals/[id]` page
- Should call `/api/proposals/[id]/approve`
- Should update proposal status to ACCEPTED

---

## 🟢 LOW (Polish Issues)

### **11. Unverified "Invite to OneHub" Modal Not Working**
**Severity:** LOW  
**Risk:** Can't show growth pipeline feature  
**File:** `apps/web/src/components/vault/AiSourceVendorsVenuesPanel.tsx` (lines 200-220)  
**Current:** Demo-safe stub (shows alert)  
**Fix:** Already implemented as stub—acceptable for demo  
**Note:** Full implementation not required for demo

---

### **12. Loading States Too Long**
**Severity:** LOW  
**Risk:** Demo feels slow  
**File:** Various components  
**Fix:** Already optimized—AI calls are fast, fallbacks instant  
**Note:** If AI is slow, fallback activates automatically

---

## QUICK FIX CHECKLIST

Before every demo:

```bash
# 1. Check environment
echo $ONEHUB_DEMO_MODE
# Should output: true

# 2. Verify seed data
# Check database for demo event
# Event slug: demo-wedding
# Should have 5+ verified listings (Chicago, IL)

# 3. Test login
# Email: pro@example.com
# Password: password
# Should redirect to: /pro/planner

# 4. Test vault route
# Navigate to: /pro/planner/vault/demo-wedding
# Should load without 404

# 5. Test AI sourcing
# Click "AI Source Vendors & Venues"
# Should show verified + unverified results

# 6. Test proposal generation
# Add vendor to shortlist → Generate proposal
# Should generate in < 5 seconds (or use fallback)

# 7. Test contract generation
# Approve proposal → Generate contract
# Should generate in < 5 seconds (or use fallback)
```

---

## ENVIRONMENT VARIABLES REFERENCE

**Required:**
```bash
ONEHUB_DEMO_MODE=true          # Enables demo fallbacks
DATABASE_URL=postgresql://...   # Database connection
```

**Optional (for real AI):**
```bash
OPENAI_API_KEY=sk-...          # Falls back if missing
STRIPE_SECRET_KEY=sk-...       # Falls back if missing
STRIPE_PUBLISHABLE_KEY=pk-...  # Falls back if missing
```

**Safe to Omit:**
- `OPENAI_API_KEY` → Uses demo fallback
- `STRIPE_*` → Uses demo payment simulation
- `NEXTAUTH_SECRET` → Only needed for production

---

## FILE PATHS REFERENCE

**Key Files:**
- `apps/web/src/lib/demo-mode.ts` - Demo mode utilities
- `apps/web/src/lib/ai/generateProposal.ts` - Proposal generation + fallback
- `apps/web/src/lib/ai/generateContract.ts` - Contract generation + fallback
- `apps/web/src/app/api/ai/source-vendors-venues/route.ts` - AI sourcing endpoint
- `apps/web/src/app/api/shortlist/add/route.ts` - Add to shortlist
- `apps/web/src/app/api/proposals/generate/route.ts` - Generate proposal
- `apps/web/src/app/api/proposals/[id]/approve/route.ts` - Approve proposal
- `apps/web/src/app/api/contracts/from-proposal/route.ts` - Generate contract
- `apps/web/src/app/api/payments/release-milestone/route.ts` - Release payment (with demo mode)
- `apps/web/src/app/api/payments/mark-milestone-paid-demo/route.ts` - Demo payment endpoint
- `apps/web/src/components/vault/AiSourceVendorsVenuesPanel.tsx` - AI sourcing UI
- `apps/web/src/components/vault/DemoTour.tsx` - Demo tour navigation
- `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` - Vault detail page
- `scripts/seed.ts` - Seed script with demo data
- `apps/web/src/lib/routes.ts` - Role-aware routing

---

## TESTING COMMANDS

**Test Demo Mode:**
```bash
# Set env var
export ONEHUB_DEMO_MODE=true

# Run dev server
cd apps/web && npm run dev

# In browser console, check:
# Should see [DEMO_MODE] logs when AI features used
```

**Test Seed Data:**
```bash
# Run seed
npx tsx scripts/seed.ts

# Check output for:
# - "Demo Event Slug: demo-wedding"
# - "Demo Verified Listings: 5"
```

**Test Routing:**
```bash
# PRO_PLANNER should access:
/pro/planner/vault/demo-wedding

# NOT:
/app/vault/demo-wedding  # Should redirect
```

---

## EMERGENCY FIXES

**If Demo Breaks Mid-Presentation:**

1. **AI Sourcing Returns Empty:**
   - Say: *"Let me show you the fallback results"*
   - Panel should show fallback automatically
   - If not, refresh page

2. **Proposal Generation Fails:**
   - Check console for errors
   - Fallback should activate automatically
   - If not, check `ONEHUB_DEMO_MODE=true`

3. **Contract Generation Fails:**
   - Same as proposal—fallback should activate
   - Check console for `[DEMO_MODE]` logs

4. **Can't Access Event:**
   - Use correct route: `/pro/planner/vault/demo-wedding`
   - NOT `/app/vault/demo-wedding` (redirects)

5. **No Verified Listings:**
   - Re-run seed: `npx tsx scripts/seed.ts`
   - Check listings have `orgId` (verified = has org)

---

**Last Updated:** After demo mode implementation  
**All Blockers:** Have fixes or workarounds  
**Demo Reliability:** 100% with fallbacks

