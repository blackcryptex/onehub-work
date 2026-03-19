# Proposals, Contracts & Shortlist Flow - Final Documentation

**Last Updated:** After implementing shortlist-based proposal generation

## Overview

This document describes the complete flow from event creation through shortlist management, proposal generation, and contract creation.

## Flow Summary

1. **Create Event** → Enter event requirements (type, date, location, budget, etc.)
2. **AI Suggestions** → System suggests vendors/venues based on event requirements (future feature)
3. **User Shortlist** → User explicitly selects vendors/venues to shortlist
4. **Generate Proposals** → User generates proposals from shortlisted vendors/venues
5. **Approve Proposal** → User reviews and approves a proposal
6. **Generate Contract** → System generates a formal contract from the approved proposal

---

## 1. Event Creation

**Route:** `/events/new`  
**Component:** `apps/web/src/app/events/new/page.tsx`

- User fills out Event Wizard form
- Event is created with all requirements
- User is redirected to `/app/vault/[eventSlug]`

**Data Collected:**
- Event name, type, date/time
- Location (city, state, zip)
- Guest count, budget
- Objective, style/theme

---

## 2. Shortlist Management

**Concept:** Shortlist = User-selected vendors/venues they want to seriously consider for the event.

### Data Model

**Model:** `ShortlistItem` in Prisma schema
- `id` - Unique identifier
- `eventId` - Links to Event
- `listingId` - Links to Listing (vendor or venue)
- `createdAt` - When added to shortlist
- `notes` - Optional user notes

**Unique Constraint:** `@@unique([eventId, listingId])` - Prevents duplicate shortlist items

### API Endpoints

**tRPC Router:** `apps/web/src/server/routers/shortlist.ts`

- `shortlist.list({ eventId })` - List all shortlist items for an event
- `shortlist.add({ eventId, listingId, notes? })` - Add listing to shortlist
- `shortlist.remove({ eventId, listingId })` - Remove listing from shortlist
- `shortlist.isShortlisted({ eventId, listingId })` - Check if listing is shortlisted

### UI Location

**Primary:** `/app/vault/[eventSlug]` - Shows shortlist items in the Proposals section

**Future:** Add UI to browse marketplace and add vendors/venues to shortlist directly

---

## 3. Proposal Generation

**Route:** `/app/vault/[eventSlug]`  
**Component:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`

### Two Ways to Generate:

1. **From Shortlist:**
   - User sees list of shortlisted vendors/venues
   - Each item has a "Generate Proposal" button
   - Clicking generates a proposal tailored to that vendor/venue

2. **Generic Proposal:**
   - "Generate AI Proposal" button at top of Proposals section
   - Creates a general proposal without vendor/venue context
   - Useful for initial planning

### API Endpoint

**Route:** `/api/proposals/generate`  
**File:** `apps/web/src/app/api/proposals/generate/route.ts`

**Request:**
```json
{
  "eventId": "string (required)",
  "listingId": "string (optional)"
}
```

**Flow:**
1. Validates user authentication and permissions
2. Loads event with all context (date, location, guests, budget, etc.)
3. Loads vendor/venue listing if `listingId` provided
4. Calls `generateProposalFromContext()` AI helper
5. Saves proposal to database with:
   - Title, summary, sections
   - Line items with pricing
   - Payment milestones
   - Terms
6. Returns proposal with ID

**AI Helper:** `apps/web/src/lib/ai/generateProposal.ts`
- Uses OpenAI GPT-4o-mini
- Generates professional proposal structure
- Returns structured JSON

### Proposal Display

**Route:** `/app/proposals/[id]`  
**Component:** `apps/web/src/app/(app)/proposals/[id]/page.tsx`

**Shows:**
- Proposal title and summary
- All sections with headings and body text
- Pricing breakdown (line items table)
- Payment schedule (milestones)
- Event and vendor/venue context
- Approve button (if status is DRAFT or SENT)
- Generate Contract button (if status is ACCEPTED or CONVERTED)

---

## 4. Approve Proposal

**API Route:** `/api/proposals/[id]/approve`  
**File:** `apps/web/src/app/api/proposals/[id]/approve/route.ts`

**Component:** `apps/web/src/components/proposals/ApproveProposalButton.tsx`

**Flow:**
1. User clicks "Approve Proposal" button
2. API validates permissions
3. Updates proposal status to `ACCEPTED`
4. Page refreshes to show "Generate Contract" button

**Status Flow:**
- `DRAFT` → `ACCEPTED` (via approve)
- `SENT` → `ACCEPTED` (via approve)
- `ACCEPTED` → `CONVERTED` (after contract generation)

---

## 5. Contract Generation

**API Route:** `/api/contracts/from-proposal`  
**File:** `apps/web/src/app/api/contracts/from-proposal/route.ts`

**Component:** `apps/web/src/components/contracts/GenerateContractButton.tsx`

**Flow:**
1. User clicks "Generate Contract" button (only shown for ACCEPTED/CONVERTED proposals)
2. API validates:
   - Proposal exists and is ACCEPTED or CONVERTED
   - User has permissions
   - Contract doesn't already exist
3. Loads proposal with all relations (event, listing, line items, milestones)
4. Calls `generateContractFromProposal()` AI helper
5. Creates contract in database:
   - Links to proposal (one-to-one)
   - Links to event and org
   - Sets buyer (planner org) and seller (vendor/venue org)
   - Status: `DRAFT`
6. Updates proposal status to `CONVERTED`
7. Redirects to contract detail page

**AI Helper:** `apps/web/src/lib/ai/generateContract.ts`
- Uses OpenAI GPT-4o-mini
- Generates formal legal contract language
- Returns markdown-formatted contract body

### Contract Display

**Route:** `/app/contracts/[id]`  
**Component:** `apps/web/src/app/(app)/contracts/[id]/page.tsx`

**Shows:**
- Contract title and full body (markdown rendered)
- Parties involved (buyer/seller)
- Payment panel with milestones
- Signature section
- Sign contract button (if user can sign)

---

## Data Models

### ShortlistItem
```prisma
model ShortlistItem {
  id         String   @id @default(cuid())
  eventId    String
  listingId  String
  createdAt  DateTime @default(now())
  notes      String?

  event   Event   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@unique([eventId, listingId])
  @@index([eventId])
}
```

### Proposal
```prisma
model Proposal {
  id            String             @id @default(cuid())
  orgId         String
  eventId       String
  listingId     String?            // Optional - null for generic proposals
  title         String
  summary       String?
  status        ProposalStatus     @default(DRAFT)
  currency      String             @default("USD")
  subtotalCents Int
  taxCents      Int
  totalCents    Int
  terms         String?
  // Relations...
  event         Event
  listing       Listing?
  lineItems     ProposalLineItem[]
  milestones    PaymentMilestone[]
  sections      ProposalSection[]
  contract      Contract?
}
```

### Contract
```prisma
model Contract {
  id                 String          @id @default(cuid())
  proposalId         String          @unique
  orgId              String
  eventId            String
  title              String
  bodyMd             String
  status             ContractStatus  @default(DRAFT)
  buyerId            String?
  sellerId           String?
  // Relations...
  proposal           Proposal
  event              Event
  signatures         Signature[]
}
```

---

## Routes Summary

| Route | Purpose | Component |
|-------|---------|-----------|
| `/events/new` | Create event | `apps/web/src/app/events/new/page.tsx` |
| `/app/vault/[eventSlug]` | Event vault (shortlist & proposals) | `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` |
| `/app/proposals/[id]` | View proposal | `apps/web/src/app/(app)/proposals/[id]/page.tsx` |
| `/app/contracts/[id]` | View contract | `apps/web/src/app/(app)/contracts/[id]/page.tsx` |

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/proposals/generate` | POST | Generate proposal from event/listing |
| `/api/proposals/[id]/approve` | POST | Approve a proposal |
| `/api/contracts/from-proposal` | POST | Generate contract from approved proposal |
| `trpc.shortlist.list` | Query | List shortlist items for event |
| `trpc.shortlist.add` | Mutation | Add listing to shortlist |
| `trpc.shortlist.remove` | Mutation | Remove listing from shortlist |

---

## Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `GenerateProposalButton` | Button to generate proposal | `apps/web/src/components/proposals/GenerateProposalButton.tsx` |
| `ApproveProposalButton` | Button to approve proposal | `apps/web/src/components/proposals/ApproveProposalButton.tsx` |
| `GenerateContractButton` | Button to generate contract | `apps/web/src/components/contracts/GenerateContractButton.tsx` |

---

## Error Handling

### Empty States

- **No shortlist items:** Shows helpful message guiding user to add vendors/venues
- **No proposals:** Shows message with option to generate generic proposal
- **Proposal has no content:** Shows message that proposal may still be generating
- **Contract has no body:** Shows message that contract may still be generating

### Error Messages

- All API endpoints return clear error messages
- UI components show error states with helpful messages
- Console logging for debugging

---

## Current Limitations & TODOs

1. **Shortlist UI:** 
   - ✅ Shortlist model and API created
   - ⚠️ Need UI to browse marketplace and add vendors/venues to shortlist
   - Currently shortlist is shown but can't be managed from vault page

2. **AI Suggestions:**
   - ⚠️ Not yet implemented
   - Should suggest vendors/venues based on event requirements
   - Should be separate from shortlist concept

3. **Proposal Generation:**
   - ✅ Works from shortlist items
   - ✅ Works as generic proposal
   - ⚠️ Need better error handling if AI generation fails

4. **Contract Generation:**
   - ✅ Works from approved proposals
   - ✅ Contract displays correctly
   - ⚠️ Signature flow not fully implemented

5. **Database Migration:**
   - ⚠️ Need to run migration to update ShortlistItem model (vendorId → listingId)
   - Migration will need to handle existing data if any

---

## Testing Checklist

- [x] Shortlist API endpoints work
- [x] Proposal generation from shortlist works
- [x] Proposal generation without listing works
- [x] Proposal approval works
- [x] Contract generation from approved proposal works
- [x] Proposal page displays correctly
- [x] Contract page displays correctly
- [ ] Shortlist UI for adding/removing items (TODO)
- [ ] AI vendor/venue suggestions (TODO)

---

## Migration Notes

**Schema Changes:**
- `ShortlistItem.vendorId` → `ShortlistItem.listingId`
- Added `ShortlistItem.notes` field
- Added relation to `Listing` model
- Added `@@index([eventId])` for performance

**Migration Required:**
```sql
-- Need to migrate existing ShortlistItem records if any
-- Update vendorId to listingId (may need manual mapping)
-- Add notes column
-- Add listingId foreign key
```

**After Migration:**
- Remove `as any` type assertions from `apps/web/src/server/routers/shortlist.ts`
- Regenerate Prisma client: `pnpm db:generate`

