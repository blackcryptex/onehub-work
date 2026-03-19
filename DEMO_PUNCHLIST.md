# OneHub Demo Punch List

**Generated:** 2024-12-XX  
**Priority:** Critical → High → Medium → Low  
**Owner:** Engineer  
**Goal:** Fix demo-critical routing issues to achieve zero 404s

---

## 🔴 CRITICAL PRIORITY

### **Task #1: Remove Proposal Route Redirect (Blocks Proposal View)**
**Severity:** 🔴 **CRITICAL**  
**Owner:** Engineer  
**File:** `apps/web/src/app/app/proposals/[id]/page.tsx`  
**Current Issue:** File redirects `/app/proposals/[id]` → `/proposals/[id]` (invalid route), causing 404s  
**Root Cause:** Route conflict - `app/proposals/[id]/page.tsx` takes precedence over `(app)/proposals/[id]/page.tsx`  

**Fix Steps:**
1. Delete `apps/web/src/app/app/proposals/[id]/page.tsx`
2. Let `apps/web/src/app/(app)/proposals/[id]/page.tsx` handle the route
3. Verify `/app/proposals/[id]` loads correctly after fix

**Test Steps:**
1. Generate a proposal from event vault shortlist
2. Verify redirect to `/app/proposals/[id]` works
3. Verify proposal page loads without 404

**Estimated Time:** 5 minutes

---

### **Task #2: Fix Navigation Route Helpers (Blocks Guest/Budget/Checklists)**
**Severity:** 🔴 **CRITICAL**  
**Owner:** Engineer  
**Files:** 
- `apps/web/src/lib/routes.ts` (functions: `eventGuests`, `eventBudget`, `eventChecklists`)
- `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` (usage: lines 625, 628, 631)

**Current Issue:** Route helpers generate `/pro/planner/vault/[slug]/guests` etc., but these routes don't exist. Should use `/app/events/[slug]/guests` instead.

**Fix Steps:**
1. Open `apps/web/src/lib/routes.ts`
2. Modify `eventGuests` function (lines 76-85):
   - For planners, return `/app/events/${eventSlug}/guests` instead of `${base}/${eventSlug}/guests`
   - OR keep current logic if planner vault sub-routes will be created (not recommended for demo)
3. Modify `eventBudget` function (lines 61-70): Same change
4. Modify `eventChecklists` function (lines 91-100): Same change

**Recommended Fix (Quick):**
```typescript
export function eventGuests(role: Role | undefined, eventSlug: string): string {
  // Always use /app/events route (works for all roles)
  return `/app/events/${eventSlug}/guests`;
}

export function eventBudget(role: Role | undefined, eventSlug: string): string {
  return `/app/events/${eventSlug}/budget`;
}

export function eventChecklists(role: Role | undefined, eventSlug: string): string {
  return `/app/events/${eventSlug}/checklists`;
}
```

**Test Steps:**
1. Navigate to `/pro/planner/vault/demo-wedding`
2. Click "Manage Guest List" link
3. Verify redirects to `/app/events/demo-wedding/guests` (no 404)
4. Repeat for "View Budget" and "Checklists" links

**Estimated Time:** 10 minutes

---

## 🟠 HIGH PRIORITY

### **Task #3: Fix Contract Navigation Path (Blocks Contract View)**
**Severity:** 🟠 **HIGH**  
**Owner:** Engineer  
**File:** `apps/web/src/components/contracts/GenerateContractButton.tsx` (line 48)

**Current Issue:** Navigates to `/contracts/[id]` instead of `/app/contracts/[id]`

**Fix Steps:**
1. Open `apps/web/src/components/contracts/GenerateContractButton.tsx`
2. Change line 48:
   ```typescript
   // OLD:
   router.push(`/contracts/${contract.id}`);
   
   // NEW:
   router.push(`/app/contracts/${contract.id}` as any);
   ```
3. Verify route matches `contractDetail` helper in `routes.ts`

**Test Steps:**
1. Approve a proposal
2. Click "Generate Contract" button
3. Verify redirect to `/app/contracts/[id]` works
4. Verify contract page loads without 404

**Estimated Time:** 5 minutes

---

## 🟡 MEDIUM PRIORITY

### **Task #4: Fix DemoTour Vault Links (Polish)**
**Severity:** 🟡 **MEDIUM**  
**Owner:** Engineer  
**File:** `apps/web/src/components/vault/DemoTour.tsx` (lines 37, 100)

**Current Issue:** Uses hardcoded `/app/vault/${eventSlug}` which redirects for planners. Should use role-aware routing.

**Fix Steps:**
1. Open `apps/web/src/components/vault/DemoTour.tsx`
2. Add props: `vaultBasePath?: string` (or accept role and compute)
3. Update lines 37 and 100:
   ```typescript
   // OLD:
   <Link href={`/app/vault/${eventSlug}`}>
   
   // NEW:
   <Link href={`${vaultBasePath || '/app/vault'}/${eventSlug}`}>
   ```
4. Update usage in vault page to pass `vaultBasePath` prop

**Alternative (Simpler):** Use `vaultDetail` helper from routes.ts:
```typescript
import { vaultDetail } from "@/lib/routes";
// ... in component, get role from context/session
<Link href={vaultDetail(role, eventSlug)}>
```

**Test Steps:**
1. Navigate to event vault as PRO_PLANNER
2. Verify DemoTour panel links work without redirects
3. Repeat as DIY_PLANNER

**Estimated Time:** 15 minutes

---

## 🟢 LOW PRIORITY (Optional)

### **Task #5: Improve Invite Modal Textarea Readability**
**Severity:** 🟢 **LOW**  
**Owner:** Engineer  
**File:** `apps/web/src/components/invites/InviteVendorModal.tsx` (line 198)

**Current Issue:** Textarea has dark mode classes but readability could be improved for light mode.

**Fix Steps:**
1. Review textarea styling (line 198)
2. Ensure sufficient contrast in both light and dark modes
3. Consider increasing min-height or padding for better readability

**Test Steps:**
1. Open invite modal
2. Verify email body textarea is readable in light mode
3. Verify email body textarea is readable in dark mode (if applicable)

**Estimated Time:** 10 minutes

---

## VERIFICATION CHECKLIST

After applying fixes, verify:

- [ ] `/demo` loads and shows preflight status
- [ ] "Start as Pro" button works → `/pro/planner/vault/demo-wedding`
- [ ] Event vault loads without errors
- [ ] "AI Source Vendors & Venues" button works
- [ ] "Add to Shortlist" works for verified vendors
- [ ] "Generate AI Proposal" works → redirects to `/app/proposals/[id]` (no 404)
- [ ] Proposal page loads correctly
- [ ] "Approve Proposal" button works
- [ ] "Generate Contract" button works → redirects to `/app/contracts/[id]` (no 404)
- [ ] Contract page loads correctly
- [ ] "Manage Guest List" link works → `/app/events/[slug]/guests` (no 404)
- [ ] "View Budget" link works → `/app/events/[slug]/budget` (no 404)
- [ ] "Checklists" link works → `/app/events/[slug]/checklists` (no 404)
- [ ] "Invite to OneHub" modal opens
- [ ] Email preview is readable
- [ ] "Send Invite" works (demo-safe)
- [ ] "Copy Email" works
- [ ] Zero 404s in browser console
- [ ] Zero redirect loops

---

## ESTIMATED TOTAL TIME

- Critical: ~15 minutes
- High: ~5 minutes
- Medium: ~15 minutes
- Low: ~10 minutes
- **Total:** ~45 minutes

---

**End of Punch List**

