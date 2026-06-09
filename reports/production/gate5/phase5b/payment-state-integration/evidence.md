# Gate 5B Payment State Integration Evidence

Generated: 2026-06-03T10:23:26Z
Task: t_ff95f40d
Scope: TEST-MODE payment state integration only.

## Approval boundary

Implemented only local/test-mode-safe code paths. No live Stripe actions were exercised. No Stripe dashboard setup, webhook activation, credential/config changes, billing changes, infrastructure changes, public exposure, transfers, payouts, refunds, Connect onboarding, production/staging DB mutations, or destructive schema/migration commands were performed.

## Changed files in Gate 5B scope

- `apps/web/src/lib/payments/money-state.ts`
- `apps/web/src/app/api/payments/create-intent/route.ts`
- `apps/web/src/app/api/payments/confirm/route.ts`
- `apps/web/src/app/api/stripe/webhook/route.ts`
- `apps/web/tests/gate5b-payment-state.test.ts`
- `reports/production/gate5/phase5b/payment-state-integration/evidence.md`

Note: the shared workspace contains broad pre-existing unrelated modifications and untracked files outside this Gate 5B file set. Those were not broadened into this task.

## Implementation made

1. Added a canonical payment-state reducer/service in `apps/web/src/lib/payments/money-state.ts`.
   - Centralizes payment success and failure/cancellation transition decisions.
   - Validates Stripe amount, currency, and required metadata against the local payment intent before applying success.
   - Keeps terminal success from regressing on failed/cancelled events.
   - Uses a transaction plus `paymentIntent.updateMany({ status: { not: "SUCCEEDED" } })` to ensure success is applied once even if webhook and local confirm race.
   - On success, applies the same side effects for webhook and local confirm: payment intent success, milestone `IN_ESCROW`, escrow balance increment exactly once, escrow status `FUNDED`, transaction upsert, holdback evaluation, contract `FULLY_SIGNED` -> `IN_PAYMENT`, and activity evidence.

2. Tightened PaymentIntent creation in `create-intent/route.ts`.
   - Requires Stripe test-mode secret (`sk_test_`) before creating/retrieving/cancelling Stripe PaymentIntents.
   - Validates contract/milestone payable state, positive amount, normalized currency, and server-derived amount.
   - Uses a deterministic test-mode idempotency key containing contract/milestone/amount/currency and redirects-never boundary.
   - Carries local `paymentIntentId`, `contractId`, `proposalId`, `escrowAccountId`, and optional `milestoneId` in Stripe metadata for later reducer validation.
   - Keeps deposit PaymentIntent creation blocked/manual-status-first in Gate 5B reducer policy.

3. Re-routed local confirm in `confirm/route.ts`.
   - Removed the duplicate local success mutation path.
   - Confirms Stripe status server-side and delegates successful transitions to `applyPaymentSuccessStateTransition(..., source: "local.confirm")`.
   - Preserves processing response for non-succeeded Stripe status.

4. Re-routed Stripe webhook in `stripe/webhook/route.ts`.
   - Requires test-mode Stripe secret, webhook secret, raw-body signature verification, and event-id idempotency marker.
   - Delegates `payment_intent.succeeded` to the same canonical success reducer as local confirm.
   - Handles `payment_intent.payment_failed` and `payment_intent.canceled` through failure transition logic.
   - Duplicate webhook event ids return `{ received: true, duplicate: true }` without reprocessing.

5. Added targeted tests in `apps/web/tests/gate5b-payment-state.test.ts`.
   - Canonical success transition and duplicate/already-succeeded handling.
   - Additional milestone funding keeps escrow `FUNDED` instead of `PARTIALLY_RELEASED`.
   - Amount/currency/metadata mismatch rejection.
   - PaymentIntent creation policy and deposit manual-status-first boundary.
   - Failed/cancelled Stripe events do not regress succeeded payment state.

## Validation performed

| Command | Exit | Evidence |
|---|---:|---|
| `pnpm vitest run apps/web/tests/gate5b-payment-state.test.ts` | 0 | 5/5 Gate 5B tests passed. |
| `pnpm typecheck` | 2 | Failed on pre-existing `scripts/seed.ts` `DisputeCreateInput` shape mismatch requiring `actorId`, `actorRole`, `bookingClassification`, `feeProfileSnapshot`, and `disputeReason`. Not in Gate 5B scoped files. |
| `pnpm test -- --runInBand` | 1 | Invalid Vitest option `--runInBand`; operator command error, not a code assertion. |
| `pnpm test` | 1 | Gate 5B tests passed, but full suite failed in pre-existing/unrelated suites due unresolved imports for `@/lib/onboarding-completion`, `@/lib/maintenance`, and `@/lib/auth-helpers`. |

## Residual risks / blockers

- Full repository validation is not green because of unrelated shared-workspace failures listed above.
- The implementation is proof/test-mode only; it does not authorize live payments, real payouts/transfers/refunds, production webhook activation, Stripe Connect onboarding, or production/staging data writes.
- Deposit lane remains manual-status-first in this implementation; no deposit webhook automation was added.
- Refund/dispute/transfer webhook automation remains out of scope and separately approval-blocked.
- Webhook event idempotency prevents double processing of duplicate deliveries, but failed handling after event marker creation may require later reconciliation tooling before production activation.

## Gate 5C / Sentinel recommendation

Sentinel can verify Gate 5B as a narrow review-required implementation, focusing on the changed files above and the passing targeted test command. Gate 5C should not proceed to live/payment exercise until Sentinel reviews this reducer, the unrelated validation blockers are resolved or explicitly waived, and Marlon separately approves any live/payment, credential, billing, infrastructure, production-data, public exposure, refund, transfer, payout, or Connect action.
