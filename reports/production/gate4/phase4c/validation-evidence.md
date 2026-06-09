# Gate 4 Phase 4C — Validation Evidence

Scope: local-only Gate 4C transaction business-logic validation for the selected-event booking/proposal/agreement loop. No production exposure, credentials, billing, infrastructure, live payment actions, public exposure, or Oracle involvement.

## Files changed in this lane

- `apps/web/src/lib/transaction-loop.ts`
- `apps/web/src/app/api/bookings/respond/route.ts`
- `apps/web/src/app/api/proposals/[id]/approve/route.ts`
- `apps/web/src/app/api/contracts/[id]/sign/route.ts`
- `apps/web/tests/gate4b-transaction-loop.test.ts`
- `reports/production/gate4/phase4c/state-machine-notes.md`
- `reports/production/gate4/phase4c/validation-evidence.md`

Note: the working tree contains broader pre-existing uncommitted OneHub changes from earlier gates/tasks. The list above is the Gate 4C transaction-business-logic evidence set.

## Targeted tests

Command:

```bash
pnpm exec vitest run apps/web/tests/gate4b-transaction-loop.test.ts --config apps/web/vitest.config.ts
```

Result:

```text
RUN  v2.1.9 /root/.hermes/workspaces/onehub/repo

 ✓ apps/web/tests/gate4b-transaction-loop.test.ts (11 tests) 11ms

 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  17:43:15
   Duration  1.60s (transform 137ms, setup 149ms, collect 72ms, tests 11ms, environment 1.04s, prepare 97ms)
```

## Typecheck regression

Command:

```bash
pnpm -C apps/web typecheck
```

Result:

```text
> @onehub/web@0.1.0 typecheck /root/.hermes/workspaces/onehub/repo/apps/web
> tsc --noEmit
```

Exit code: 0.

## Invalid-transition evidence

Covered by `Gate 4C booking transaction state machine` tests in `apps/web/tests/gate4b-transaction-loop.test.ts`:

- Blocks requester jumping `PENDING -> ACCEPTED`.
- Blocks provider moving `PROPOSAL_SENT -> ACCEPTED`.
- Blocks system `ACCEPTED -> AGREEMENT_SIGNED` until both signatures are complete.
- Blocks provider regression `QUOTED -> HOLD` through the provider response transition planner.

## Business-rule evidence

Covered by `enforces proposal, booking-response, and agreement timing boxes without payment actions`:

- `PROPOSAL_SENT` with a proposal older than 7 days evaluates to `EXPIRED`.
- `PENDING` booking request older than 48 hours evaluates to `CANCELED`.
- `ACCEPTED` agreement older than 14 days without both signatures evaluates to `CANCELED`.

## Audit-trail evidence

Covered by:

- `builds audit metadata for every transition`
- `plans provider response audit transitions from legacy booking statuses`
- `plans requester acceptance and system agreement-signed audit transitions`

Route integration anchors:

- `/api/bookings/respond` records every provider response transition step through `recordActivity(...)` with `BOOKING_REQUEST_STATE_TRANSITION` metadata.
- `/api/proposals/[id]/approve` records requester `PROPOSAL_SENT -> ACCEPTED` when a Gate 4B proposal summary carries the booking request id.
- `/api/contracts/[id]/sign` records system `ACCEPTED -> AGREEMENT_SIGNED` when both buyer and seller signatures are present.

## End-to-end regression evidence

The targeted regression test exercises the complete safe business-logic sequence in-process:

1. Provider owner/admin authorization is required for booking response.
2. Provider quote response creates the state-machine plan `PENDING -> VENDOR_REVIEWING -> PROPOSAL_SENT`.
3. Manual-status-first provider proposal payload is generated without live payment fields.
4. Requester acceptance transition is planned as `PROPOSAL_SENT -> ACCEPTED`.
5. System agreement transition is planned as `ACCEPTED -> AGREEMENT_SIGNED` only after both signatures are present.
6. Audit metadata includes actor role, actor id where available, from/to state, reason, target booking request id, and timestamp.

Residual limitation: this is code-level regression evidence plus typecheck, not browser/DB smoke. Gate 4B Sentinel already identified browser/DB E2E as a weak point; this lane adds state-machine hardening but does not claim production/live-payment readiness.
