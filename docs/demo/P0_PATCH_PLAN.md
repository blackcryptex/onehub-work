# P0 Patch Plan - Demo Blocking Fixes

**Date:** 2025-01-XX  
**Purpose:** Implement 4 P0 items to unblock investor demo

---

## P0-1: Booking Request UI Missing

### Routes/Screens:
- **Marketplace Listing Detail:** `/marketplace/[slug]` → Add "Request Booking" button
- **Booking Requests List:** `/app/requests` (already exists, needs improvement)
- **Booking Request Modal:** New component for form

### Files to Modify/Create:
1. **`apps/web/src/app/marketplace/[slug]/page.tsx`**
   - Change "Request Quote" button to "Request Booking"
   - Add click handler to open booking modal
   - Pass event context if available (from query param or session)

2. **`apps/web/src/components/bookings/BookingRequestModal.tsx`** (CREATE)
   - Form fields: Contact name, email, phone, event dates, guest count, message
   - Submit to `/api/bookings/request` endpoint
   - Show success/error states
   - Demo-safe: Pre-fill with demo data if in demo mode

3. **`apps/web/src/app/api/bookings/request/route.ts`** (CREATE)
   - Create BookingRequest record
   - Link to event if eventId provided
   - Demo mode: Skip email, log to console
   - Return success response

4. **`apps/web/src/app/(app)/requests/page.tsx`**
   - Improve empty state
   - Add loading state
   - Add "View Event" link
   - Add status badges

5. **`scripts/seed.ts`**
   - Pre-seed 1-2 booking requests for demo event
   - Link to demo listings

### Demo-Safe Implementation:
- Pre-seed booking requests in seed script
- Modal pre-fills with demo data when `ONEHUB_DEMO_MODE=true`
- Show "DEMO DATA" indicator on requests page

---

## P0-2: Notification UI Missing

### Routes/Screens:
- **All App Pages:** Add notification bell to Topbar
- **Notification Dropdown:** Show on bell click

### Files to Modify/Create:
1. **`apps/web/src/components/layout/Topbar.tsx`**
   - Add notification bell icon (Bell from lucide-react)
   - Add badge with unread count
   - Add click handler to toggle dropdown
   - Position dropdown relative to bell

2. **`apps/web/src/components/notifications/NotificationDropdown.tsx`** (CREATE)
   - Fetch notifications from `/api/notifications` (or tRPC)
   - Show list of notifications (title, body, link, timestamp)
   - Mark as read on click
   - Show "No notifications" empty state
   - Auto-refresh every 30 seconds

3. **`apps/web/src/app/api/notifications/route.ts`** (CREATE if needed)
   - Return user's unread notifications
   - Or use existing tRPC router: `apps/web/src/server/routers/notification.ts`

4. **`scripts/seed.ts`**
   - Pre-seed 3-5 notifications for demo event
   - Types: PROPOSAL_CREATED, DEPOSIT_FUNDED, PAYOUT_RELEASED, etc.

### Demo-Safe Implementation:
- Pre-seed notifications in seed script
- Show "DEMO DATA" indicator in dropdown
- Auto-mark as read in demo mode (optional)

---

## P0-3: Contract Signing UI Placeholder

### Routes/Screens:
- **Contract Detail:** `/app/contracts/[id]` → Add signature capture UI

### Files to Modify/Create:
1. **`apps/web/src/components/contracts/ContractPageClient.tsx`**
   - Add "Sign Contract" button for unsigned contracts
   - Show signature form (name input, email input, checkbox for agreement)
   - On submit, create Signature record via API
   - Update contract status to PARTIALLY_SIGNED or FULLY_SIGNED
   - Show signed signatures with timestamp
   - Demo mode: Mock signature (no real e-signature service)

2. **`apps/web/src/app/api/contracts/[id]/sign/route.ts`** (CREATE)
   - Create Signature record
   - Update Contract status
   - Demo mode: Skip e-signature validation
   - Return success response

3. **`apps/web/src/components/contracts/ContractSignatureForm.tsx`** (CREATE)
   - Form: Name, Email, Agreement checkbox
   - Submit button
   - Loading state
   - Success state

### Demo-Safe Implementation:
- Mock signature capture (text input, no drawing)
- Pre-sign one signature in seed script
- Show "DEMO DATA" indicator on signature form

---

## P0-4: Receipt Generation Missing

### Routes/Screens:
- **Payments Page:** `/app/events/[eventSlug]/milestones` → Add "Download Receipt" link for completed payouts

### Files to Modify/Create:
1. **`apps/web/src/components/payments/PaymentPlanPageClient.tsx`**
   - Add "Download Receipt" button/link for payouts with status SENT
   - Link to `/api/payments/receipts/[payoutId]`
   - Show receipt icon (FileText from lucide-react)

2. **`apps/web/src/app/api/payments/receipts/[id]/route.ts`** (CREATE)
   - Fetch payout data
   - Generate receipt HTML/PDF
   - Return as download (Content-Disposition: attachment)
   - Demo mode: Use pre-generated template

3. **`apps/web/src/server/lib/receipt.ts`** (CREATE)
   - Receipt template function
   - Format: Payout details, vendor info, amount, fees, date
   - Return HTML string (can be converted to PDF later)

### Demo-Safe Implementation:
- Pre-generate receipt HTML in demo mode
- Use simple HTML template (no PDF library needed for demo)
- Show "DEMO DATA" in receipt footer

---

## Implementation Order

1. **P0-2 (Notifications)** - Easiest, adds polish
2. **P0-1 (Booking Requests)** - Core flow, needs modal
3. **P0-3 (Contract Signing)** - Important for trust
4. **P0-4 (Receipts)** - Nice to have, completes payment flow

---

## Testing Checklist

After each P0 implementation:
- [ ] Feature works in demo mode
- [ ] Feature shows "DEMO DATA" indicator
- [ ] Empty states are handled
- [ ] Loading states are shown
- [ ] Error states are handled
- [ ] No broken links
- [ ] Role-based navigation works

---

## Notes

- **No DB migrations** unless absolutely necessary (use existing schema)
- **Minimal refactoring** - patch existing code, don't rewrite
- **Demo-safe first** - ensure demo works, production can be improved later
- **Clear indicators** - all demo data must be labeled

