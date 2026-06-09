# Gate 4 Phase 4B — Route/API Matrix

Status: review-required
Scope: selected-event transaction loop integration, local repo only.

| Loop step | User route/surface | API/router/model | Gate 4B implementation/evidence |
|---|---|---|---|
| Selected event vault | `/pro/planner/vault/{eventSlug}`, `/diy-planner/vault/{eventSlug}`, legacy `/vault/{eventSlug}` | Existing event vault code and routes | Existing selected-event entrypoint retained. Marketplace links continue to carry `eventId`, `eventSlug`, `eventName`, and `returnTo`. |
| Marketplace discovery | `/marketplace?...selected-event params...` | `Listing`, `AvailSlot` via Prisma in `apps/web/src/app/marketplace/page.tsx`; existing `/api/vendors/search` remains available | Added visible filters on marketplace route: `q`, `category`, `city`, `availableStart`, `availableEnd`, and `sort=newest|rating|price`. Listing links preserve selected-event and filter query params. |
| Listing detail | `/marketplace/{listingSlug}?eventId=...` | Existing listing detail, shortlist, booking request components | Existing selected-event listing detail path remains canonical for shortlist and booking request action. |
| Booking request creation | Listing detail request modal | Existing `POST /api/bookings/request`, `BookingRequest` | Existing safe request creation path retained. Phase 4B adds provider-side response path after request creation. |
| Provider request inbox | `/requests` | `BookingRequest` with listing/event/org includes | Request list now loads listing org owner/admin membership, displays quote/status/notes, and renders provider response controls only for authorized provider org owner/admin users. |
| Provider response | `/requests` response form | `POST /api/bookings/respond`; helper `canProviderRespondToBookingRequest`; `BookingRequest.status`, `quoteCents`, `notes` | Provider can set `HOLD`, `DECLINED`, or `QUOTED`. Quoted responses require positive quote amount. Non-provider/planner/member users receive `403` at API permission gate. |
| Provider proposal from request | `/requests` response form optional checkbox | `POST /api/bookings/respond`; `Proposal`, `ProposalLineItem`, `PaymentMilestone` | Quoted response can create a `SENT` manual-status-first proposal with `eventId`, `listingId`, line item, pending manual milestone, terms stating no live payments, and summary naming the booking request id. Existing proposal for the same event/listing/request summary is reused to avoid duplicate response proposals. |
| Planner proposal review | `/proposals/{proposalId}` | Existing proposal page/API | Proposal has event/listing context, `SENT` status, quote-backed line item, and pending manual milestone visibility. |
| Proposal approval | `/proposals/{proposalId}` | Existing `POST /api/proposals/[id]/approve` | Existing approval path remains canonical: records acceptance and sets `ACCEPTED`; no live payment action introduced. |
| Agreement/contract generation | `/proposals/{proposalId}` -> generate contract | Existing `POST /api/contracts/from-proposal` | Existing contract-from-accepted-proposal route remains canonical for MVP. Requires accepted/converted proposal and listing context, creates `DRAFT` contract, sets proposal `CONVERTED`, and does not create live payment actions. |
| Signatures | `/contracts/{contractId}` | Existing `POST /api/contracts/[id]/sign`, `Signature`, `Contract.status` | Existing authenticated buyer/seller signing path retained; moves toward `PARTIALLY_SIGNED` then `FULLY_SIGNED` based on real buyer/seller-side signatures. |
| Milestone/payment visibility | Proposal detail and event vault payment cards | `PaymentMilestone.status` | Proposal payload creates only a pending manual milestone. No Stripe, payment intent, payout, refund, holdback, live escrow, credential, billing, infra, production, or public exposure action was added. |

## Canonical MVP path selected

Selected event vault -> marketplace with selected-event filters -> listing detail -> booking request -> `/requests` provider response -> optional provider-created manual-status-first proposal -> proposal approval -> contract from proposal -> buyer/seller signatures.

## Duplicate path handling

Gate 4B does not remove legacy or tRPC proposal/contract paths. For this MVP slice, the canonical route evidence is the REST/UI path above, especially `POST /api/bookings/respond`, existing `POST /api/proposals/[id]/approve`, and existing `POST /api/contracts/from-proposal`.
