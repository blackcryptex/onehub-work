# Gate 4 Phase 4B — Happy Path Log

Status: review-required
Scenario: `selected-event-catering-transaction-loop`
Scope: local code/test evidence only; no production/live DB mutation; no payment/Stripe/payout/refund/holdback action.

## Happy path evidence

1. Planner starts from selected event vault.
   - Route: `/pro/planner/vault/{eventSlug}` or `/diy-planner/vault/{eventSlug}`.
   - Evidence: Existing Gate 4A selected-event vault path retained. Marketplace route keeps `eventId`, `eventSlug`, `eventName`, and `returnTo` hidden inputs during filtering.

2. Planner browses marketplace with selected-event context and filters.
   - Route: `/marketplace?eventId={eventId}&eventSlug={eventSlug}&eventName=Summer%20Wedding&returnTo=...&q=catering&category=CATERING&city=Los%20Angeles&sort=rating`.
   - Evidence: `apps/web/src/app/marketplace/page.tsx` builds a Prisma `ListingWhereInput` for keyword/category/city/availability and `orderBy` for newest/rating/price. Listing detail links preserve selected-event and filter query params.

3. Planner opens selected listing, shortlists and/or sends booking request.
   - Route/API: existing `/marketplace/{listingSlug}?eventId=...`; existing `POST /api/bookings/request`.
   - Expected persisted state: `BookingRequest(status=PENDING, eventId, listingId, contact fields, startAt/endAt, guests, message)`.

4. Provider sees request and responds.
   - Route/API: `/requests`; `POST /api/bookings/respond`.
   - Evidence: `/requests` renders `ProviderBookingResponseControls` only when `canProviderRespondToBookingRequest` returns true for listing org owner/admin. API repeats the same permission gate before mutation.
   - Supported actions: `HOLD`, `DECLINED`, `QUOTED`.
   - Quote evidence: `buildBookingResponseUpdate({ action: "QUOTED", quoteDollars: "1250.50", note: "Includes staff" })` returns `{ status: "QUOTED", quoteCents: 125050, notes: "Includes staff" }`.

5. Provider creates proposal in response to quote.
   - Route/API: `/requests` response form with "Create and send a manual-status-first proposal from this quote" checked; `POST /api/bookings/respond`.
   - Evidence: `buildProviderProposalFromBookingRequest` creates `Proposal(status=SENT, eventId, listingId, totalCents=quoteCents)` with one line item, one `PENDING` manual milestone, and terms explicitly stating no live payment/escrow/payment intent/payout/refund/holdback automation.
   - Continuity: proposal summary includes `Response to booking request {bookingRequestId}` while preserving event/listing context. No schema migration was run.

6. Planner reviews and approves proposal.
   - Route/API: `/proposals/{proposalId}`; existing `POST /api/proposals/[id]/approve`.
   - Expected persisted state: proposal status becomes `ACCEPTED`; acceptance is recorded through existing acceptance path; no live payment is triggered.

7. Planner generates agreement/contract.
   - Route/API: existing `POST /api/contracts/from-proposal`.
   - Expected persisted state: accepted proposal with listing context creates `Contract(status=DRAFT)`, sets proposal `CONVERTED`, and returns contract id. Existing route remains the canonical MVP contract generation path.

8. Buyer and seller sign.
   - Route/API: existing `POST /api/contracts/{id}/sign`.
   - Expected persisted state: first valid buyer/seller signature moves contract to `PARTIALLY_SIGNED`; both sides signed moves contract to `FULLY_SIGNED`.

9. Manual milestone/payment visibility remains non-live.
   - Evidence: provider-created proposal has a `PENDING` milestone only. No code path added in Phase 4B creates live payment intents, payouts, refunds, holdbacks, public exposure, credential changes, billing changes, infrastructure changes, or production changes.

## Commands run

```bash
pnpm exec vitest run apps/web/tests/gate4b-transaction-loop.test.ts --config apps/web/vitest.config.ts
# exit code: 0
# result: 1 test file passed, 4 tests passed

pnpm -C apps/web typecheck
# exit code: 0
# result: tsc --noEmit completed successfully
```

## Targeted test coverage

- Provider owner can respond.
- Provider admin can respond.
- Planner/member who is not provider owner/admin cannot respond.
- HOLD and DECLINED updates normalize to booking status plus note only.
- QUOTED update requires a positive quote amount and stores cents.
- Provider proposal payload from booking request includes event/listing context, `SENT` status, quote-backed pricing, manual-status-first terms, line item, and pending milestone.
