# OneHub Private Pilot Slice 2 — Proposal/Contract/Fund Read Guards

Timestamp: 2026-08-04T13:56:36Z
Task: t_230d6717
Owner lane: Forge implementation, ready for Sentinel verification

## Scope

Verified and fixed resource-level read guards for direct-ID detail reads on:

- `apps/web/src/app/(app)/proposals/[id]/page.tsx`
- `apps/web/src/app/(app)/contracts/[id]/page.tsx`
- `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx`

## Implementation

Added explicit RBAC helpers in `apps/web/src/lib/rbac.ts`:

- `canViewProposalResource(user, proposal)`
- `canViewContractResource(user, contract)`

The proposal resource guard allows:

- event-side managers via existing `canManageEvent`
- event viewers via existing `canViewEvent`
- seller-side org owner/member access through the proposal/listing org
- admins through the existing event-side admin paths

The contract resource guard inherits proposal resource visibility.

The three target pages now:

- load the current user before rendering sensitive detail data
- call the explicit resource-level read guard after the record lookup and before downstream sensitive fetch/render work
- return `notFound()` for unauthorized direct-ID reads, preserving fail-closed existence hiding
- load the minimal org/listing ownership fields needed by the guard

No schema, migration, credential, billing, infrastructure, production setting, payment, or public exposure changes were made.

## TDD evidence

RED captured with new regression test before product-code guard implementation:

Command:

`pnpm exec vitest run --config apps/web/vitest.config.ts apps/web/tests/proposal-contract-read-guards.test.tsx`

Expected RED result:

- 4 failed tests
- proposal detail direct-ID negative test resolved instead of throwing `notFound`
- contract detail direct-ID negative test resolved instead of throwing `notFound`
- funding detail direct-ID negative test resolved instead of throwing `notFound`
- authorized proposal test showed guard helper was not called

GREEN captured after implementation:

Command:

`pnpm exec vitest run --config apps/web/vitest.config.ts apps/web/tests/proposal-contract-read-guards.test.tsx apps/web/tests/event-rbac-helper.test.ts`

Result:

- 2 test files passed
- 15 tests passed

## Validation performed

- `pnpm exec vitest run --config apps/web/vitest.config.ts apps/web/tests/proposal-contract-read-guards.test.tsx apps/web/tests/event-rbac-helper.test.ts` — passed, 15/15 tests
- `pnpm run typecheck` — passed
- `git diff --check` — passed
- `pnpm run lint` — passed with existing repository warnings; no errors
- `NODE_OPTIONS=--max-old-space-size=3072 pnpm run build` — passed

Build note:

- A first build attempt run concurrently with lint OOMed during Next build (`JavaScript heap out of memory`). Retried build alone with `NODE_OPTIONS=--max-old-space-size=3072`; it completed successfully.

## Files changed

- `apps/web/src/lib/rbac.ts`
- `apps/web/src/app/(app)/proposals/[id]/page.tsx`
- `apps/web/src/app/(app)/contracts/[id]/page.tsx`
- `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx`
- `apps/web/tests/event-rbac-helper.test.ts`
- `apps/web/tests/proposal-contract-read-guards.test.tsx`
- `reports/stabilization/private-pilot/ONEHUB_PRIVATE_PILOT_SLICE2_PROPOSAL_CONTRACT_FUND_READ_GUARDS_2026-08-04.md`

## Residual risks / notes for Sentinel

- Unauthorized direct-ID reads now fail closed at the page level for proposal, contract, and proposal funding detail surfaces.
- Seller-side read access is implemented through listing/proposal org ownership or membership.
- Funding detail uses proposal read visibility because this slice is read-guard scoped; no payment action semantics were changed.
- Lint/build still surface pre-existing warning noise across unrelated files; commands exit successfully.

## Recommended next action for Atlas

Route this task to Sentinel for verification of the new read-guard behavior and test/build evidence.
