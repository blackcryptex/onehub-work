# AI-Powered Proposals & Contracts Implementation

## Overview

This implementation adds end-to-end AI-powered proposal and contract generation with e-signing capabilities to OneHub.

## What Was Implemented

### 1. AI Services (`src/lib/ai/`)

- **`client.ts`**: OpenAI client configuration and availability check
- **`generateProposal.ts`**: AI service to generate professional proposals from event + vendor/venue context
- **`generateContract.ts`**: AI service to generate formal contracts from approved proposals

### 2. API Routes (`src/app/api/`)

- **`POST /api/proposals/generate`**: Generate AI proposal for an event (optionally with vendor/venue)
- **`POST /api/contracts/from-proposal`**: Generate contract from an accepted proposal
- **`POST /api/contracts/sign`**: E-sign a contract (tracks planner and vendor signatures)

### 3. Frontend Components (`src/components/`)

- **`proposals/GenerateProposalButton.tsx`**: Button component to generate proposals
- **`contracts/GenerateContractButton.tsx`**: Button component to generate contracts from proposals
- **`contracts/SignContractButton.tsx`**: Button component for e-signing contracts

### 4. Updated Pages

- **`src/app/(app)/proposals/[id]/page.tsx`**: Added "Generate Contract" button for accepted proposals
- **`src/app/(app)/contracts/[id]/page.tsx`**: Added e-sign functionality with signature tracking
- **`src/app/(app)/vault/[eventSlug]/page.tsx`**: Added proposals section with "Generate AI Proposal" button

## Prisma Schema

No schema changes were needed. The existing models are used:
- `Proposal` model (with `lineItems`, `milestones`, `status`)
- `Contract` model (with `bodyMd`, `status`, `signatures`)
- `Signature` model (tracks who signed and when)

## Environment Variables Required

Add to your `.env` file:

```bash
OPENAI_API_KEY=sk-...  # Your OpenAI API key
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
```

## Installation

1. Install OpenAI SDK (if not already installed):
```bash
cd apps/web
pnpm add openai
```

2. Set environment variables (see above)

3. Run typecheck to verify:
```bash
pnpm typecheck
```

## How to Test

### 1. Generate a Proposal

1. Navigate to an event page: `/app/vault/[eventSlug]`
2. In the "Proposals" card, click **"Generate AI Proposal"**
3. The system will:
   - Load event details (date, location, guest count, budget)
   - Optionally use vendor/venue info if `listingId` is provided
   - Call OpenAI to generate a professional proposal
   - Save it to the database with line items and payment milestones
   - Redirect to the proposal page

### 2. Accept a Proposal

1. Navigate to `/proposals/[id]`
2. Review the AI-generated proposal
3. Click **"Accept"** (or update status to `ACCEPTED` via API/database)

### 3. Generate a Contract

1. On an accepted proposal page (`/proposals/[id]`)
2. Click **"Generate Contract"**
3. The system will:
   - Load the proposal details
   - Call OpenAI to transform it into a formal contract
   - Include legal terms, payment schedules, liability clauses
   - Save as a `Contract` record
   - Redirect to the contract page

### 4. E-Sign a Contract

1. Navigate to `/contracts/[id]`
2. Review the contract text
3. Click **"Sign Contract"** (if you're the planner or vendor)
4. The system will:
   - Record your signature with timestamp
   - Update contract status (`PARTIALLY_SIGNED` → `FULLY_SIGNED`)
   - Show signature confirmation

### 5. Full Flow Test

1. Create an event (or use existing)
2. Generate proposal → Review → Accept
3. Generate contract → Review → Sign as planner
4. Sign as vendor (or have vendor sign)
5. Verify contract shows `FULLY_SIGNED` status

## API Endpoints

### POST `/api/proposals/generate`

**Request:**
```json
{
  "eventId": "clx...",
  "listingId": "clx..." // optional
}
```

**Response:**
```json
{
  "id": "clx...",
  "title": "AI Generated Proposal",
  "summary": "...",
  "status": "DRAFT",
  "lineItems": [...],
  "milestones": [...],
  "totalCents": 50000
}
```

### POST `/api/contracts/from-proposal`

**Request:**
```json
{
  "proposalId": "clx..."
}
```

**Response:**
```json
{
  "id": "clx...",
  "title": "Service Agreement",
  "bodyMd": "# Contract\n\n...",
  "status": "DRAFT"
}
```

### POST `/api/contracts/sign`

**Request:**
```json
{
  "contractId": "clx..."
}
```

**Response:**
```json
{
  "success": true,
  "contract": {
    "id": "clx...",
    "status": "PARTIALLY_SIGNED" | "FULLY_SIGNED",
    "signatures": [...]
  },
  "message": "Contract signed successfully"
}
```

## Contract Status Flow

1. `DRAFT` - Contract created, not yet sent
2. `OUT_FOR_SIGNATURE` - Sent to parties for signing
3. `PARTIALLY_SIGNED` - One party has signed
4. `FULLY_SIGNED` - Both parties have signed (legally binding)

## Notes

- **AI Model**: Uses `gpt-4o-mini` by default (configurable via `OPENAI_MODEL`)
- **Proposal Generation**: Works without `listingId` (generates generic proposal)
- **Contract Generation**: Requires proposal status to be `ACCEPTED` or `CONVERTED`
- **E-Signing**: Simple one-click signing (no external e-sign service required for MVP)
- **Permissions**: Uses existing RBAC (`canManageEvent`) for authorization

## Future Enhancements

- Add proposal editing before sending
- Add contract versioning and change orders
- Integrate with DocuSign/HelloSign for advanced e-signing
- Add email notifications when proposals/contracts are generated
- Add contract template customization
- Add proposal approval workflow

