# OneHub Gate 4 Exit Synthesis — Gate 5 Readiness

Status: GATE 4 EXIT APPROVED FOR READ-ONLY GATE 5A SETUP
Generated: 2026-06-02T17:53:28Z
Scope: documentation/synthesis only. No app source edits, no DB mutations, no credential changes, no billing changes, no infrastructure changes, no production exposure, no public exposure, no live payment actions, and no Oracle work.

## Executive decision

Gate 4 exits as PASS for the selected-event transaction loop evidence path.

This means OneHub has enough local, scoped evidence to begin Gate 5A as a read-only money-state setup lane. It does not mean OneHub is approved for production launch, live payments, real escrow, payouts, refunds, holdbacks, Stripe/webhooks, billing changes, migrations, public exposure, or legally binding real-user contract operations.

Gate 5A may start only as read-only mapping/planning of the money-state layer: manual-status-first milestone/payment visibility, payment-state vocabulary, risk boundaries, and evidence requirements for future test-mode-only validation.

## Accepted Gate 4 evidence path

Gate 4 followed the Directive V2 shape:

1. Gate 4A — map the selected-event transaction loop.
2. Sentinel verification of Gate 4A.
3. Gate 4B — integrate the selected-event booking request -> provider response -> proposal/contract spine.
4. Sentinel verification of Gate 4B.
5. Gate 4C — harden transaction business logic/state-machine evidence.
6. Sentinel verification of Gate 4C.

The accepted Sentinel path is:

- `t_6ea14563` — Gate 4A Sentinel PASS.
- `t_584e3e45` — Gate 4B Sentinel PASS.
- `t_2e766376` — Gate 4C Sentinel PASS.

## Gate 4A — transaction-loop map

Evidence artifact:

- `reports/production/gate4/phase4a/transaction-loop-map.md`

Decision:

- PASS as scoped read-only mapping evidence.

What it proved:

- The selected-event commerce spine exists and is stronger than a generic vendor directory:
  - selected event vault,
  - marketplace with selected-event context,
  - listing detail,
  - shortlist and booking request,
  - proposal review/approval,
  - contract/agreement creation,
  - buyer/seller signatures,
  - manual milestone/payment-status visibility.
- Gate 4A correctly identified weak continuity before implementation:
  - provider response UI was weak/read-only,
  - booking requests and proposals were not structurally linked,
  - proposal authorship was planner-driven rather than provider-responded,
  - duplicate proposal/contract paths remained,
  - notifications were partial/stubbed,
  - payments had to remain manual-status-first.

Sentinel summary:

- Sentinel confirmed the report correctly mapped the partial selected-event transaction spine and did not claim production/live-payment readiness.
- Sentinel marked Gate 4A not release-safe and directed Gate 4B to connect provider response controls and proposal/contract continuity.

## Gate 4B — selected-event transaction-loop integration

Evidence artifacts:

- `reports/production/gate4/phase4b/changed-files.md`
- `reports/production/gate4/phase4b/route-api-matrix.md`
- `reports/production/gate4/phase4b/happy-path-log.md`
- `reports/production/gate4/phase4b/residual-risks-and-gate4c.md`

Decision:

- PASS as narrow local integration evidence.

What it proved:

- Marketplace discovery now supports selected-event-safe filters and preserves event context into listing links.
- `/requests` exposes provider response controls only for authorized listing organization owner/admin users.
- `POST /api/bookings/respond` authenticates the user, enforces provider org owner/admin authorization, updates booking request status/quote/note, records activity, notifies planner org members, and can create or reuse a manual-status-first provider proposal.
- Provider-created proposal payload is `SENT`, quote-backed, event/listing-linked, has a pending manual milestone, and explicitly excludes live payment, payout, refund, holdback, and escrow automation.
- Existing proposal approval, contract-from-proposal, and signature routes support the documented MVP continuity path.

Validation evidence:

- `pnpm exec vitest run apps/web/tests/gate4b-transaction-loop.test.ts --config apps/web/vitest.config.ts` — PASS in Gate 4B evidence: 1 test file, 4 tests.
- `pnpm -C apps/web typecheck` — PASS in Gate 4B evidence.

Sentinel summary:

- Sentinel confirmed selected-event marketplace filtering/context preservation, provider booking response authorization/API/UI, optional manual-status-first proposal creation, and existing approval/contract/signature continuity.
- Sentinel constrained the pass: not release-ready for payment/live production; Gate 4C needed state-machine/schema hardening and stronger E2E evidence before broader release confidence.

## Gate 4C — transaction business logic and state-machine hardening

Evidence artifacts:

- `reports/production/gate4/phase4c/validation-evidence.md`
- `reports/production/gate4/phase4c/state-machine-notes.md`

Decision:

- PASS as local business-logic/state-machine evidence.

What it proved:

- The canonical transaction path is now documented and locally validated:
  - `PENDING -> VENDOR_REVIEWING -> PROPOSAL_SENT -> ACCEPTED -> AGREEMENT_SIGNED`.
- Invalid transitions are guarded:
  - requester cannot jump `PENDING -> ACCEPTED`,
  - provider cannot move `PROPOSAL_SENT -> ACCEPTED`,
  - system cannot move `ACCEPTED -> AGREEMENT_SIGNED` until both sides have signed,
  - provider response cannot regress `QUOTED -> HOLD` through the provider response planner.
- Business timing helpers exist for local evaluation:
  - proposal expiration after 7 days in `PROPOSAL_SENT`,
  - pending booking request auto-cancel after 48 hours without response,
  - accepted agreement cancellation after 14 days without both signatures.
- Audit metadata is generated for transition activity and route anchors record `BOOKING_REQUEST_STATE_TRANSITION` evidence.
- Scoped code inspection found no payment intents, payouts, refunds, holdbacks, escrow automation, production exposure, or billing actions in the reviewed lane.

Validation evidence:

- `pnpm exec vitest run apps/web/tests/gate4b-transaction-loop.test.ts --config apps/web/vitest.config.ts` — PASS in Gate 4C/Sentinel evidence: 11/11 tests.
- `pnpm -C apps/web typecheck` — PASS, exit code 0.

Sentinel summary:

- Sentinel confirmed transaction transition guards, route audit anchors, no live payment side effects, 11/11 targeted tests, and typecheck passing.
- Sentinel constrained the pass to manual-status-first/test-mode-only local evidence, not production/live-payment readiness.

## Residual risks

These do not block starting read-only Gate 5A setup, but they block production/live-payment/release confidence.

1. No browser/DB E2E smoke is complete.
   - Gate 4 evidence is code inspection, reports, targeted tests, and typecheck.
   - A selected-event browser/test-mode DB smoke should still prove: marketplace -> booking request -> provider quote/proposal -> planner approval -> contract generation -> buyer/seller signatures.

2. Booking-request-to-proposal linkage is still not structural.
   - Gate 4 avoided a Prisma migration.
   - Continuity depends on event/listing linkage plus summary text carrying the booking request id.
   - `Proposal.bookingRequestId` remains a Steward/schema hardening candidate before launch-grade confidence.

3. Duplicate proposal/contract paths remain.
   - Gate 4B selected the REST/UI MVP path as canonical.
   - Legacy/tRPC paths were not removed or deeply rationalized.
   - Non-canonical paths may still create different side effects/statuses until explicitly gated or refactored.

4. Notifications are not launch-grade.
   - In-app/router-level notification evidence exists.
   - Email delivery remains partial/stubbed and should not be treated as reliable provider/planner notification proof.

5. Shared workspace remains broadly dirty.
   - `git status --short` still shows many pre-existing modified and untracked OneHub files across prior gates and report trees.
   - Sentinel passes are scoped to Gate 4 evidence/files, not a clean merge/release verdict.

6. Payment correctness is not proven.
   - Gate 4 preserved manual-status-first visibility only.
   - No Stripe/webhook/live-payment/payout/refund/holdback/escrow action was approved or validated.
   - Gate 5 must start with read-only money-state mapping before any test-mode payment behavior is considered.

7. Production/legal readiness is not proven.
   - Contract/agreement paths were locally inspected for flow continuity and signature state progression.
   - This is not legal approval and does not authorize real-user binding obligations.

## Gate 5A readiness decision

Gate 5A may start as a read-only setup lane.

Allowed Gate 5A scope:

- Map current money-state models and routes.
- Define manual-status-first payment/milestone vocabulary.
- Identify Stripe/payment/escrow/payout/refund/holdback code that exists but must remain inactive.
- Define future test-mode-only evidence requirements.
- Identify required Steward/Sentinel guardrails before any implementation.
- Preserve the selected-event transaction spine from Gate 4.

Not allowed without separate explicit Marlon approval:

- Live payment actions.
- Stripe/webhook setup or activation.
- Payment intents, captures, payouts, refunds, holdbacks, escrow, or billing automation.
- Production/staging DB mutation or migration execution.
- Credential/secret/config changes.
- Infrastructure, DNS, hosting, monitoring, gateway, or production setting changes.
- Public exposure.
- Real legal/contract obligation activation.
- Oracle assignment or involvement.

## Recommended next card

Title: `Gate 5A: read-only money-state map for selected-event transaction loop`

Recommended assignee: `steward`, followed by `sentinel` verification.

Scope:

- Read-only repo inspection and evidence report.
- No app source edits.
- No DB mutations or migrations.
- No credential/billing/infra/production/public exposure changes.
- No live payment action.
- No Oracle.

Acceptance criteria:

- Produce a money-state map covering proposal milestones, payment-adjacent Prisma models, admin/payment routes, escrow/holdback/refund/payout primitives, and current manual-status-first UI surfaces.
- Separate safe MVP manual-status visibility from blocked live/payment automation.
- Name exact code paths that must remain inactive until approval.
- Define Gate 5B implementation boundaries and test-mode-only evidence requirements.
- Return to Sentinel for verification before implementation proceeds.

## Final Gate 4 decision

Gate 4 exits as PASS for read-only Gate 5A setup.

The transaction loop is now coherent enough for the next planning layer: selected event -> marketplace discovery -> booking request -> provider quote/proposal -> planner approval -> contract/agreement -> signatures -> manual milestone/payment-status visibility.

The pass is intentionally narrow. It authorizes only read-only Gate 5A money-state setup. It does not authorize production launch, live payments, migrations, billing, infrastructure, public exposure, real legal obligations, or Oracle involvement.
