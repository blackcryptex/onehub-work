# Unified Payment Flow Implementation Summary

## Overview

A unified contract-based payment flow has been implemented across all dashboards (DIY Planner, Professional Planner, Vendors & Venues, Event Dreamer). All payments flow through OneHub Payments using held funds and milestones.

## What Was Implemented

### 1. Database Schema Updates (`apps/web/prisma/schema.prisma`)

- **PaymentIntent Model**: Tracks individual payment attempts
  - Links to Contract and PaymentMilestone
  - Stores Stripe payment intent ID
  - Tracks payer/payee relationships
  - Status: `REQUIRES_PAYMENT`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELLED`

- **Transaction Model**: Records completed payments
  - Tracks net amount, platform fees, total amount
  - Links to PaymentIntent
  - Stores Stripe charge ID

- **Updated Contract Model**:
  - Added `buyerId`, `sellerId`, `platformFeePercent` fields
  - Added `paymentIntents` relation

- **Updated ContractStatus Enum**:
  - Added: `ACCEPTED`, `IN_PAYMENT`, `ACTIVE`, `COMPLETED`

- **Updated MilestoneStatus Enum**:
  - Added: `IN_ESCROW`, `OVERDUE`

### 2. Shared Payment Types (`apps/web/src/lib/types.payment.ts`)

Created TypeScript types and helper functions:
- `PaymentIntent`, `PaymentMilestone`, `Contract` types
- `getNextUnpaidMilestone()` - Finds next milestone to pay
- `calculateTotalDue()` - Sums unpaid milestones
- `calculateHeldFundsAmount()` - Sums milestones in held funds
- `calculatePaidAmount()` - Sums paid milestones
- `formatCurrency()` - Formats cents to currency string
- `canUserPay()`, `canUserReceive()` - Permission checks
- `isContractInPayment()` - Checks if contract is in payment state

### 3. Payment API Routes

#### `/api/payments/create-intent` (POST)
- Creates a Stripe Payment Intent for a milestone or full amount
- Verifies user is the buyer
- Creates PaymentIntent record
- Returns `clientSecret` for Stripe Elements

#### `/api/payments/confirm` (POST)
- Confirms payment after Stripe succeeds
- Updates milestone status to `IN_ESCROW`
- Updates escrow account balance
- Creates Transaction record
- Updates contract status

#### `/api/payments/release-milestone` (POST)
- Releases payment from escrow to vendor
- Creates Payout record
- Updates milestone status to `PAID`
- Decrements escrow balance
- Can be called by buyer, planner, or seller (with permissions)

#### `/api/payments/mark-milestone-complete` (POST)
- Marks milestone as complete (for vendor/planner)
- Prepares milestone for release

### 4. Payment UI Components

#### `PaymentModal` (`apps/web/src/components/payments/PaymentModal.tsx`)
- Card/ACH payment form (placeholder - needs Stripe Elements integration)
- Shows amount, milestone label
- Collects billing information
- Calls `/api/payments/confirm` on success

#### `ContractPaymentPanel` (`apps/web/src/components/payments/ContractPaymentPanel.tsx`)
- Shows payment summary (Total Due, Held Funds, Paid)
- Displays next unpaid milestone
- Shows full payment schedule
- "Pay Deposit Now" / "Pay Next Milestone" buttons
- "Pay Full Amount" option
- Integrated into contract detail page (`/contracts/[id]`)

#### `VendorPaymentPanel` (`apps/web/src/components/payments/VendorPaymentPanel.tsx`)
- Shows contracts with payments
- Displays milestone status (Pending, Held, Paid)
- "Mark Milestone Complete" button for milestones in escrow
- Links to contract details

#### `ProPlannerPaymentPanel` (`apps/web/src/components/payments/ProPlannerPaymentPanel.tsx`)
- **Receiving Payments Section**: Shows contracts where planner is seller
  - Displays what client owes
  - "Copy Payment Link" button
  - Shows held-funds status
- **Vendor Payments Section**: Shows contracts where planner is buyer
  - Lists milestones in held funds
  - "Release Payment to Vendor" button

### 5. Dashboard Integrations

#### DIY Planner Dashboard
- Payment panel added to contract detail page (`/contracts/[id]`)
- Shows payment options for accepted contracts
- Users can pay milestones or full amount

#### Vendor/Venue Dashboard
- Added "Payments" tab to sidebar
- Integrated `VendorPaymentPanel` component
- Shows contracts with payment status
- Vendors can mark milestones complete
- Dashboard page fetches contracts and passes to component

#### Professional Planner Dashboard
- `ProPlannerPaymentPanel` component created (ready to integrate)
- Can receive payments from clients
- Can pay vendors from client funds

#### Event Dreamer Dashboard
- Payment components ready (can be integrated when Event Dreamer dashboard is built)

## Payment Flow

### 1. DIY Planner Pays Vendor

1. DIY Planner views contract → sees `ContractPaymentPanel`
2. Clicks "Pay Deposit Now" → creates PaymentIntent
3. Enters card details in `PaymentModal`
4. Payment confirmed → milestone status → `IN_ESCROW`
5. Funds held in escrow until milestone completion

### 2. Vendor Receives Payment

1. Vendor views Payments tab → sees `VendorPaymentPanel`
2. Sees milestones with status "In Escrow"
3. Completes work → clicks "Mark Milestone Complete"
4. Buyer/Planner confirms → clicks "Release Payment"
5. Payment released → milestone status → `PAID`
6. Funds transferred to vendor's Stripe Connect account

### 3. Professional Planner Flow

**Receiving from Client:**
1. Planner sees contract where they're the seller
2. Client pays → funds go to escrow
3. Planner can copy payment link to send to client

**Paying Vendors:**
1. Planner sees contracts where they're the buyer
2. Client funds are in escrow
3. When vendor milestone is complete → Planner clicks "Release Payment"
4. Funds transferred to vendor

## Next Steps

1. **CRITICAL: Run Prisma Migration**: 
   ```bash
   cd apps/web
   npx prisma migrate dev --name add_payment_intent_and_transaction
   npx prisma generate
   ```
   
   **Note**: The code includes `as any` type assertions for new Prisma models/fields. These will be resolved after running the migration and regenerating the Prisma client.

2. **Integrate Stripe Elements**: 
   - Replace placeholder card form in `PaymentModal` with Stripe Elements
   - Use `clientSecret` from `/api/payments/create-intent`

3. **Add Pro Planner Dashboard Integration**:
   - Add `ProPlannerPaymentPanel` to Pro Planner dashboard
   - Fetch contracts where planner is buyer/seller

4. **Add Event Dreamer Payment UI**:
   - Create Event Dreamer dashboard if not exists
   - Add payment component for contributions/tickets

5. **Test Payment Flow**:
   - Create a proposal → accept → create contract
   - Test payment intent creation
   - Test payment confirmation
   - Test milestone release

## Files Created/Modified

### Created:
- `apps/web/src/lib/types.payment.ts`
- `apps/web/src/app/api/payments/create-intent/route.ts`
- `apps/web/src/app/api/payments/confirm/route.ts`
- `apps/web/src/app/api/payments/release-milestone/route.ts`
- `apps/web/src/app/api/payments/mark-milestone-complete/route.ts`
- `apps/web/src/components/payments/PaymentModal.tsx`
- `apps/web/src/components/payments/ContractPaymentPanel.tsx`
- `apps/web/src/components/payments/VendorPaymentPanel.tsx`
- `apps/web/src/components/payments/ProPlannerPaymentPanel.tsx`

### Modified:
- `apps/web/prisma/schema.prisma` - Added PaymentIntent, Transaction models, updated enums
- `apps/web/src/app/(app)/contracts/[id]/page.tsx` - Added ContractPaymentPanel
- `apps/web/src/components/vendor/Dashboard.tsx` - Added payments tab and VendorPaymentPanel
- `apps/web/src/components/vendor/Sidebar.tsx` - Added Payments navigation item
- `apps/web/src/app/vendor/dashboard/page.tsx` - Fetches contracts for payment panel

## Notes

- Payment modal currently uses a placeholder form - needs Stripe Elements integration
- Stripe Connect account lookup is placeholder - needs Organization.stripeConnectAccountId field
- Platform fee calculation is hardcoded to 5% - can be made configurable
- Webhook handling for Stripe events should be added for production
- Error handling and loading states are implemented but can be enhanced

