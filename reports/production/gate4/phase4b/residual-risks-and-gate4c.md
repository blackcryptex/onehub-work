# Gate 4 Phase 4B — Residual Risks and Gate 4C Recommendation

Status: review-required
Scope: local implementation evidence. No production/live DB mutation, credentials, billing, infrastructure, public exposure, Oracle, or live payment action.

## Residual risks

1. Structural booking-request/proposal relation remains deferred.
   - Gate 4B avoided a Prisma migration and did not add `bookingRequestId` to `Proposal`.
   - Current continuity is event/listing linkage plus proposal summary/line-item copy naming the booking request id.
   - Risk: reporting and future automation cannot query `Proposal.bookingRequestId` directly.

2. Duplicate proposal/contract paths still exist.
   - Gate 4B picked the REST/UI MVP path: `/api/bookings/respond` -> `/api/proposals/[id]/approve` -> `/api/contracts/from-proposal`.
   - Existing tRPC proposal/contract paths were not removed or deeply refactored in this slice.
   - Risk: non-canonical routes may continue to create different side effects/statuses until Gate 4C rationalizes the state machine.

3. Provider proposal UI is intentionally narrow.
   - Provider response controls can create a quote-backed manual-status-first proposal, but not a full custom proposal editor with multiple services/terms.
   - Risk: pilot providers may need richer proposal editing after the MVP spine is verified.

4. Browser/DB E2E smoke was not run.
   - Evidence is static code inspection plus targeted Vitest helper tests and typecheck.
   - No live/staging DB was mutated, matching safety constraints.
   - Risk: browser wiring should still be verified by Sentinel or a test-mode smoke runner before counting Gate 4B release-ready.

5. Notifications remain in-app/router-level only.
   - Phase 4B notifies planner org members through the existing notification router in `POST /api/bookings/respond`.
   - Email delivery remains outside scope/stubbed.
   - Risk: provider/planner may need stronger notification evidence before launch.

6. Marketplace radius/distance sorting remains shallow.
   - Gate 4B adds visible category/city/availability/sort filters on `/marketplace`.
   - True radius/distance search was not implemented because that would require geocoding or location infrastructure beyond this narrow safe slice.

7. Payments remain intentionally manual-status-first.
   - Provider-created proposal creates only a pending manual milestone.
   - No live payment, Stripe, escrow, payout, refund, or holdback action was implemented.
   - Risk: money correctness remains a later Gate 5 responsibility and must not be inferred from Gate 4B.

## Gate 4C recommendation

Proceed to Sentinel verification of Gate 4B first. If Sentinel passes the narrow integration, Gate 4C should focus on business logic/state-machine hardening, not payment activation:

1. Decide whether to add a real `Proposal.bookingRequestId` relation and migration plan.
2. Define one authoritative transaction state machine across booking request, proposal, contract, signature, and manual milestone statuses.
3. Rationalize duplicate proposal/contract creation paths or explicitly gate non-canonical routes.
4. Add browser/test-mode E2E smoke for selected-event marketplace -> booking request -> provider quote/proposal -> planner approval -> contract generation -> buyer/seller signatures.
5. Keep all payment work manual-status-first until Marlon separately approves Gate 5/payment scope.
