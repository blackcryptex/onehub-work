# OneHub Gate 5 Phase 5A — Gate 5B Implementation Recommendation

Status: READ-ONLY PLANNING EVIDENCE
Generated: 2026-06-02T17:58:16Z
Scope: recommendation only. No implementation, no DB/schema mutation, no Stripe setup, no webhook activation, no credential/config changes, no billing changes, no live/test payment execution, no infrastructure changes, no public exposure, no Oracle.

## Executive recommendation

Gate 5B should proceed only after Marlon explicitly approves a test-mode-only payment implementation lane.

Recommended Gate 5B shape:
1. Manual-status-first remains the default product boundary.
2. If approved, implement a test-mode-only canonical money-state reducer before any new payment UI or Stripe exercise.
3. Prove one low-risk one-milestone payment schedule in local/test mode before multi-milestone schedules.
4. Keep live payments, payouts, refunds, holdbacks, transfers, billing changes, production exposure, and public webhook activation blocked unless Marlon separately approves each category.

## Evidence produced by Gate 5A

- `reports/production/gate5/phase5a/money-state-diagram.md`
- `reports/production/gate5/phase5a/webhook-to-state-mapping.md`
- `reports/production/gate5/phase5a/milestone-examples.md`
- `reports/production/gate5/phase5a/gate5b-recommendation.md`

## Gate 5B prerequisites

### Required product/authority approvals

Before any implementation:
- Marlon approval that Gate 5B may perform test-mode Stripe implementation work.
- Confirmation that no live payment, live payout, live refund, live transfer, live Stripe Connect onboarding, or production billing action is approved.
- Confirmation whether existing `Deposit` should remain separate from contract `PaymentMilestone` or be unified under the milestone lane.
- Confirmation of first pilot schedule: recommended one-milestone small vendor schedule first.

Before any live or production payment action:
- Separate explicit Marlon approval for live payments.
- Separate explicit Marlon approval for production/staging DB migrations or mutations.
- Separate explicit Marlon approval for secrets/config changes, webhook endpoint activation, Stripe dashboard configuration, Connect onboarding, billing settings, transfers, refunds, payouts, and public exposure.
- Legal/product approval of contract terms, cancellation/refund policy, dispute policy, and fee treatment.

### Required technical prerequisites

1. Canonical money-state reducer.
   - One internal reducer should own payment success/failure/release/refund/dispute transitions.
   - Webhook and local confirm paths must call the same reducer.

2. Idempotency and concurrency proof.
   - Prove local confirm and webhook race does not double-increment escrow, double-create transactions, double-evaluate holdbacks, or double-record release.

3. Amount/currency/metadata validation.
   - Stripe amount/currency and local contract/milestone amount/currency must match before success is applied.

4. Escrow status correction.
   - Funding a second milestone must not mark escrow `PARTIALLY_RELEASED`.
   - `PARTIALLY_RELEASED` should mean release/decrement happened, not additional funding happened.

5. Holdback/refund/dispute release blockers.
   - Release path must check every blocker source consistently.
   - `MilestoneStatus.HELD` and `PaymentHoldback.state` must be rationalized.

6. Deposit lane decision.
   - Current deposit route creates a Stripe PaymentIntent with metadata `type: deposit`, but current webhook route does not map deposit PaymentIntent events to `Deposit.status`.
   - Gate 5B should either implement deposit webhook mapping in test mode or keep deposits disabled/manual.

7. Test-mode data isolation.
   - Test Stripe ids, test contracts, and test payment records must be clearly distinguishable from real/live money.

## Recommended Gate 5B task breakdown

### Gate 5B-1 — Reducer design/spec

Assignee recommendation: Steward.

Scope:
- Specify `applyMoneyEvent` inputs/outputs.
- Define allowed transitions for `PaymentIntent`, `PaymentMilestone`, `EscrowAccount`, `Transaction`, `PaymentHoldback`, `Payout`, `RefundRequest`, and `Dispute`.
- Define idempotency keys and terminal-state non-regression rules.
- No implementation unless Marlon explicitly expands scope.

Exit evidence:
- Reducer spec.
- Transition table.
- Race/idempotency cases.

### Gate 5B-2 — Test-mode reducer implementation

Assignee recommendation: Steward/backend, only after explicit approval.

Scope:
- Implement reducer in code.
- Make webhook and confirm paths use it.
- Add targeted unit/integration tests with mocked Stripe payloads.
- No live Stripe execution.
- No production/staging DB migration unless separately approved.

Exit evidence:
- Changed files list.
- Tests run/pass.
- Diff path/PR for review.
- Review-required block before acceptance.

### Gate 5B-3 — Sentinel verification

Assignee recommendation: Sentinel.

Scope:
- Verify no live/payment production exposure occurred.
- Verify reducer idempotency and state transitions with tests.
- Verify blocked actions remained blocked.

Exit evidence:
- PASS/PARTIAL/RISK verdict.
- Test evidence.
- Explicit remaining blockers.

### Gate 5B-4 — One-milestone test-mode pilot

Assignee recommendation: Scout + Steward + Sentinel sequence, only after reducer acceptance.

Scope:
- Use small vendor one-milestone schedule.
- Exercise local/test-mode only if approved.
- Verify UI wording remains test/manual-status-first and not live-money misleading.

Exit evidence:
- Happy-path log.
- Failure/retry log.
- Webhook/local-confirm race evidence.
- No live action evidence.

## Explicit non-approval list

Gate 5A does not approve:
- Live payment collection.
- Live Stripe PaymentIntent creation/capture.
- Stripe webhook dashboard setup or public endpoint activation.
- Stripe Connect onboarding or account link generation for real users.
- Transfers, payouts, refunds, holdbacks, escrow movement, billing automation, or fee collection.
- Production/staging database migrations or writes.
- Credential, secret, `.env`, config, billing, infrastructure, DNS, hosting, gateway, monitoring, or public exposure changes.
- Legal activation of real contracts/payment obligations.
- Oracle assignment or involvement.

## Current risk register for Gate 5B

| Risk | Severity | Why it matters | Gate 5B mitigation |
|---|---|---|---|
| Duplicate success paths | High | Webhook and confirm can apply different side effects. | Single reducer + idempotency tests. |
| Escrow status semantics | High | Funding can appear as partial release. | Correct funding/release state semantics before validation. |
| Webhook incomplete side effects | High | Webhook success lacks transaction/holdback/audit parity. | Route webhook success through reducer. |
| Deposit vs milestone ambiguity | Medium/High | Two deposit/payment concepts may diverge. | Decide separate vs unified lane before implementation. |
| Release path can call Stripe transfers | Critical if live | Could move money if credentials/config are live. | Keep release unexercised; add test-mode guards; explicit approval required. |
| Refund/dispute/holdback complexity | High | Funds may release despite unresolved exception. | Central blocker checks and tests before any release. |
| Dirty shared workspace | Medium | Current repo has broad pre-existing modifications. | Keep Gate 5B changes narrow and review-required. |
| No browser/DB E2E smoke from Gate 4 | Medium | Commerce spine not fully proven in browser/DB. | Add local/test-mode smoke after reducer tests. |

## Recommended first Gate 5B acceptance criteria

Gate 5B should not pass unless all of the following are true:

1. Marlon's explicit test-mode approval is recorded in the task context/comment thread.
2. No live/prod Stripe, billing, credential, infra, or public exposure action occurred.
3. A canonical reducer owns success/failure/release semantics.
4. Tests prove duplicate webhook/local confirm does not double-apply money state.
5. Tests prove failed/cancelled intents do not mark escrow funded.
6. Tests prove amount/currency mismatch blocks success application.
7. Tests prove release is blocked by open refund, frozen dispute, or active holdback.
8. One-milestone pilot schedule is used before multi-milestone schedules.
9. Steward review and Sentinel verification are both complete.

## Steward verdict

Verdict: PARTIAL/RISK.

Gate 5A has enough read-only mapping to recommend a narrow Gate 5B test-mode reducer lane, but not enough to approve implementation automatically. Gate 5B is blocked until Marlon explicitly approves test-mode payment implementation and confirms the deposit/milestone policy boundary.
