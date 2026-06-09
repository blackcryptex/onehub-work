# Gate 6B — Atlas recovery handoff

## Scope
Recovered the blocked Forge Gate 6B card after repeated worker crashes. Scope stayed local/test-mode/read-only where applicable:

- local in-app notification history surface
- safer notification mark-read scoping
- admin route normalization from stale `/app/admin/*` links to canonical `/admin/*`
- read-only admin transaction/payment-monitoring visibility
- read-only admin audit visibility with metadata redaction
- no live provider calls, no real email/SMS delivery, no refunds, no payouts, no billing changes, no infrastructure, no public launch, no destructive database actions

## Files touched for Gate 6B

- `apps/web/src/lib/admin-oversight.ts`
- `apps/web/tests/gate6b-admin-notifications-foundation.test.ts`
- `apps/web/src/server/routers/notification.ts`
- `apps/web/src/app/(app)/admin/overview/page.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/lib/routes.ts`
- `scripts/reminders.ts`
- `apps/web/src/app/(app)/admin/transactions/page.tsx`
- `apps/web/src/app/(app)/admin/audit/page.tsx`
- `apps/web/src/app/(app)/notifications/page.tsx`
- `apps/web/src/components/notifications/NotificationDropdown.tsx`

Supporting evidence files:

- `reports/production/acceleration/gate6b-local-notifications-admin-foundation/gate6b-relevant.diff`
- `reports/production/acceleration/gate6b-local-notifications-admin-foundation/gate6b-relevant-status.txt`

## Recovery fixes applied by Atlas

- Replaced the invalid `prisma.transaction.findMany` usage in the Gate 6B admin transactions page with the existing `prisma.moneyTx.findMany` model.
- Updated transaction row rendering to match `MoneyTx` fields: `type`, `amountCents`, `currency`, `proposalId`, `milestoneId`, and `stripeId`.
- Adjusted the notifications dropdown link typing for the newly added `/notifications` route.

## Verification run

Commands executed from `/root/.hermes/workspaces/onehub/repo`:

```bash
pnpm -C apps/web exec vitest run tests/gate6b-admin-notifications-foundation.test.ts
```

Result:

- Exit code: 0
- Test files: 1 passed
- Tests: 3 passed

```bash
pnpm -C apps/web typecheck
```

Result:

- Exit code: 0
- `tsc --noEmit` passed

```bash
pnpm -C apps/web build
```

Result:

- Exit code: 0
- Next.js production build compiled successfully
- Static page generation completed: 95/95
- Build produced route entries for `/admin/audit`, `/admin/transactions`, and `/notifications`
- Build emitted lint warnings, including existing broad `no-explicit-any` / unused-var warnings. Gate 6B-introduced warnings remain in the new admin/read-only surfaces but did not fail build.

## Acceptance posture

Atlas recovery is complete enough for Sentinel review.

Not accepted as final until Sentinel verifies:

- scope stayed within Gate 6B
- no live payment/provider/billing/public/infrastructure/destructive actions occurred
- notification ownership scoping is correct
- admin surfaces are read-only and do not expose unsafe raw provider metadata
- evidence files match the diff and test/build results

## Current caveat

The repository still has a broad pre-existing dirty tree from prior OneHub gate work. This handoff isolates the Gate 6B-relevant files and evidence, but Sentinel should account for the broader dirty tree during verification.
