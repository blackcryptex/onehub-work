# W5 Steward Map — Contracts + Payments + Trust Backend/Data/Security Workflow

Task: `t_aa249252`
Lane: Steward read-only backend/data/security/payment inspection
Date: 2026-08-28
Verdict: PARTIAL / RISK

## 1. Backend or structural scope reviewed

Workflow 5 business loop reviewed as a backend/data/security/payment chain:

`proposal -> provider evidence -> contract -> buyer/seller signatures -> payment readiness -> Stripe payment confirmation -> held-funds ledger state -> provider completion -> admin release -> refund/dispute/holdback/admin verification state`

Inspection was read-only except for this report file. No source implementation files, production state, credentials, billing settings, live Stripe state, domain settings, public exposure settings, or database records were changed.

## 2. Evidence examined

Primary source and test evidence inspected:

- `apps/web/prisma/schema.prisma`
  - `Proposal`, `PaymentMilestone`, `Contract`, `Signature`, `EscrowAccount`, `PaymentIntent`, `Transaction`, `Payout`, `MoneyTx`, `RefundRequest`, `Dispute`, `PaymentHoldback`, `AdminOverride`, `AcceptanceCapture`, and `WebhookEvent` models.
- Provider-backed proposal and contract chain:
  - `apps/web/src/lib/provider-backed-proposal.ts`
  - `apps/web/src/app/api/proposals/[id]/approve/route.ts`
  - `apps/web/src/app/api/contracts/from-proposal/route.ts`
  - `apps/web/tests/contract-from-provider-backed-proposal.test.ts`
- Contract/signature/payment readiness chain:
  - `apps/web/src/app/(app)/proposals/[id]/page.tsx`
  - `apps/web/src/app/(app)/contracts/[id]/page.tsx`
  - `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx`
  - `apps/web/src/app/api/contracts/[id]/sign/route.ts`
  - `apps/web/src/components/payments/ContractPaymentPanel.tsx`
- Payment create/confirm/webhook/release chain:
  - `apps/web/src/app/api/payments/create-intent/route.ts`
  - `apps/web/src/app/api/payments/confirm/route.ts`
  - `apps/web/src/lib/payments/confirm-payment.ts`
  - `apps/web/src/app/api/stripe/webhook/route.ts`
  - `apps/web/src/app/api/payments/release-milestone/route.ts`
  - `apps/web/src/app/api/payments/mark-milestone-complete/route.ts`
  - `apps/web/src/server/routers/billing.ts`
  - `apps/web/tests/payment-release-guardrails.test.ts`
  - `apps/web/tests/payment-refund-review-effects.test.ts`
  - `apps/web/tests/payment-e2e-route-safety.test.ts`
  - `apps/web/tests/w5-payment-route-continuity.test.ts`
  - `apps/web/tests/w5-mark-complete-copy.test.ts`
- Refund/dispute/holdback/admin trust chain:
  - `apps/web/src/app/api/refund-requests/route.ts`
  - `apps/web/src/lib/refund-request.ts`
  - `apps/web/src/server/routers/dispute.ts`
  - `apps/web/src/lib/dispute-case.ts`
  - `apps/web/src/lib/holdback.ts`
  - `apps/web/src/lib/admin-override.ts`
  - `apps/web/src/app/(app)/admin/verification/actions.ts`
  - `apps/web/src/app/(app)/disputes/page.tsx`
  - `apps/web/tests/w5-disputes-contextual-prefill.test.ts`
- Payment planning and Connect/payout support:
  - `apps/web/src/server/routers/billing.ts`
  - `apps/web/src/app/api/payments/auto-build/route.ts`
  - `apps/web/src/app/api/payments/plan/from-accepted-proposals/route.ts`
  - `apps/web/src/components/payments/PaymentPlanPageClient.tsx`
  - `apps/web/src/app/(app)/events/[eventSlug]/payments/page.tsx`
- Prior W5 and payment/legal reports:
  - `reports/seven-workflows/w5-scout-map.md`
  - `reports/strategy/ONEHUB_PAYMENT_LEGAL_READINESS_CONTROL_MAP_2026-08-27.md`

## 3. Correctness verdict

PARTIAL / RISK.

W5 has a credible guarded-MVP backend spine for provider-backed proposals, contract generation, dual-party signatures, guarded payment creation, canonical payment confirmation, Stripe webhook idempotency, held-funds ledger updates, refund/dispute/holdback blockers, and admin-only release controls.

It is not structurally safe to claim full workflow closure or public payment/trust readiness. The current system is stronger than a fake payment demo, but still has route continuity, data semantics, authority semantics, and public/payment claim constraints that can cause partial closure.

## 4. Sound backend/data/security findings

### A. Provider-backed proposal evidence is enforced before proposal acceptance and contract generation

Evidence:

- `hasProviderSubmittedEvidence` returns true only when a proposal has listing context and an `Activity` record with `action: "PROVIDER_PROPOSAL_SUBMITTED"`, target proposal id, and optional matching org/event fields.
- `POST /api/proposals/[id]/approve` requires auth, proposal legal-version acceptance, `canManageEvent`, proposal status `SENT`, and provider-submitted evidence before setting status `ACCEPTED`.
- `POST /api/contracts/from-proposal` requires auth, `canManageEvent`, proposal status `ACCEPTED` or `CONVERTED`, no existing contract, listing context, and provider-submitted evidence before generating a contract.
- `contract-from-provider-backed-proposal.test.ts` covers the no-provider-evidence block and buyer/seller org persistence.

Safe assumption:

- Accepted/contract-converted W5 proposals are intended to be provider-backed, not planner-only/AI-only drafts, when they pass the canonical approve and contract-generation routes.

Implementation constraint:

- Any new proposal acceptance, contract generation, bulk-conversion, seed, admin, or import path must call the same provider-evidence predicate or a stronger canonical predicate. Do not create accepted/converted commercial contracts from proposals without listing context and durable provider-submitted evidence.

### B. Commercial proposal/contract details fail closed for unrelated users

Evidence:

- `canViewCommercialProposal` grants access to admins, buyer/event org members, explicitly shared/client-stakeholder event viewers through `canViewEvent`, and seller-side listing org members.
- `canViewCommercialContract` delegates to proposal access and additionally allows intended/current signers by signer id/email.
- The legacy proposal fund page now calls `getCurrentUser`, checks `canViewCommercialProposal`, redirects to the contract detail page when a contract exists, and no longer renders amount or placeholder Stripe copy.
- `w5-payment-route-continuity.test.ts` asserts the fund route is locked, uses the commercial access predicate, redirects to contract detail, and does not contain the old fake Stripe/amount copy.

Safe assumption:

- Canonical proposal/contract detail pages and the legacy proposal fund page are no longer broad authenticated-user surfaces.

Implementation constraint:

- Do not add payment/refund/dispute/contract evidence routes that fetch commercial objects by id without `canViewCommercialProposal`, `canViewCommercialContract`, buyer/seller role-specific authority, or stricter guarded-MVP platform-admin authority.

### C. Dual-party signature state is meaningfully enforced before canonical payment entry

Evidence:

- `POST /api/contracts/[id]/sign` requires authenticated user, current contract legal acceptance version, signer email matching authenticated user email, buyer-side event management or seller-side listing org membership, and duplicate-signature prevention.
- Signature side is determined from buyer event org member ids and seller listing org member ids.
- Contract state moves to `PARTIALLY_SIGNED` only after one side signs, and `FULLY_SIGNED` only after both buyer and seller side signatures exist.
- Contract detail passes `canEnterPayment` only for buyer-side event org members/owner, and the payment panel renders only when the contract is in payment/payable state plus `canPay`.

Safe assumption:

- Canonical contract-page payment entry is designed to open only after dual-party execution and only to buyer-side users.

Implementation constraint:

- Any new payment entry point must consume the same server-side payable contract/proposal state, not client-side `canEnterPayment` or displayed signature counts alone.

### D. Canonical payment intent creation has strong guarded-MVP server predicates

Evidence:

- `POST /api/payments/create-intent` requires auth, current payment acceptance version, buyer-side authority, contract status `FULLY_SIGNED` or `IN_PAYMENT`, proposal status `ACCEPTED` or `CONVERTED`, listing org context, provider-submitted evidence, seller/payee identity, server-derived milestone/full payable amount, Stripe configured, and Stripe metadata binding to local contract/proposal/escrow/milestone/payer/payee/payment intent.
- It cancels/replaces stale active local/Stripe intents when redirect behavior or amount/currency does not match guarded expectations.

Safe assumption:

- Canonical payment collection is not client-amount-authoritative and is tied to accepted provider-backed proposal + signed contract + accepted payment terms.

Implementation constraint:

- Payment readiness must remain a named server-side predicate with these required facts: buyer authority, accepted provider-backed proposal, signed/current contract, payable milestone state, current legal acceptance, server-derived amount, Stripe configured, and Stripe intent metadata match. UI copy must not call payment ready unless the server predicate can pass.

### E. Confirmation/webhook paths share the canonical confirmation function

Evidence:

- `/api/payments/confirm` calls `applyConfirmedPaymentIntent` after verifying authenticated payer and Stripe reference.
- Stripe webhook `payment_intent.succeeded` finds the local payment intent and calls `applyConfirmedPaymentIntent`.
- `applyConfirmedPaymentIntent` validates confirmable local state, Stripe status, Stripe metadata match, amount/currency match, current acceptance proof, transaction creation, milestone `IN_ESCROW`, escrow balance increment, holdback evaluation, contract transition to `IN_PAYMENT`, and activity metadata.
- `WebhookEvent` reserves Stripe event ids with unique `eventId`, handles processed/in-progress states, and releases reservation on processing failure.

Safe assumption:

- Explicit confirmation and webhook success share the money-state transition function.

Implementation constraint:

- Keep all future succeeded-payment writers on `applyConfirmedPaymentIntent`. Webhooks may synchronize status, but must not create a second money-state path that bypasses acceptance, metadata/amount matching, transaction rows, held-funds state, holdback evaluation, and activity evidence.

### F. Release is admin/manual gated and blocks known trust conflicts before payout movement

Evidence:

- `/api/payments/release-milestone` requires current user, admin override acceptance version, `IN_ESCROW` milestone, contract/event presence, `canReleaseMilestonePayment`, no open refund, no open/frozen dispute, no active holdback, escrow account balance, canonical seller org, no payee swap, positive milestone amount, Stripe configured, seller Stripe Connect account present, atomic escrow debit reservation, Stripe transfer with idempotency key, local payout `SENT`, milestone `PAID`, `MoneyTx`, activity, audit, and admin override record.
- `canReleaseMilestonePayment` maps to guarded-MVP platform admin authority only.
- `escrowReleaseMilestone` in `billing.ts` is disabled and points to canonical `/api/payments/release-milestone`.
- `payment-release-guardrails.test.ts` covers refund/dispute/holdback blockers, missing Connect account block, insufficient escrow block, duplicate payout block, transfer failure without paid finalization, in-transaction status recheck, idempotency key, canonical amount/payout metadata, retry of pending payout, and already-paid idempotency.

Safe assumption:

- Provider payout/release is not self-serve by vendors, planners, or ordinary admins; it is platform-admin/manual-review gated in guarded MVP.

Implementation constraint:

- Do not mark milestone `PAID` or payout `SENT` without Stripe transfer evidence unless Atlas/Marlon explicitly approve a non-live/manual-offline exception model and that exception is persisted and excluded from public paid/payout claims.

### G. Refund approval performs local reservation before Stripe refund and records recoverable state

Evidence:

- Refund request creation creates a review record, not immediate money movement.
- `reviewRefundRequest` requires guarded-MVP platform admin authority, open request state, no platform-fee override, and no approved off-ledger goodwill refund when no payment intent exists.
- Approved refunds require Stripe configured, captured Stripe charge, escrow account, sufficient escrow balance, local refund reservation, `MoneyTx`, Stripe refund idempotency key, final refund effect metadata, milestone `REFUNDED` on full milestone refunds, audit, and admin override.
- `payment-refund-review-effects.test.ts` covers approval effects, denied no-op on Stripe/escrow, insufficient escrow block, changed-balance block, pending local reservation on Stripe failure, and recovery after local finalization failure.

Safe assumption:

- Refund flow is admin-review based and has meaningful recoverability controls.

Implementation constraint:

- UI/API copy must call submitted amounts `requested`, not `eligible` or `approved`, until approval-time Stripe/escrow/policy checks succeed and refund effect evidence is persisted.

### H. Dispute and holdback records block canonical release

Evidence:

- `disputeRouter.create` requires org membership/admin for the proposal event org and creates `status: OPEN`, `freezeState: FROZEN` with fee profile and acceptance context.
- `getBlockingDisputeCase` treats `OPEN`, `NEEDS_INFO`, `UNDER_ADMIN_REVIEW`, and `ESCALATED` as release blockers.
- `evaluateHoldbackForPaymentIntent` creates/upserts `PaymentHoldback` based on first seller transaction, seller verification gaps, high amount, dispute/refund history, or manual risk flag.
- `getBlockingHoldbackForMilestone` blocks active holdbacks.
- Release route checks refund, dispute, then holdback before escrow debit or transfer.

Safe assumption:

- Trust blockers are represented in the data model and can stop canonical release.

Implementation constraint:

- Any alternate release, payout, or paid-state writer must check the same refund/dispute/holdback blockers before escrow debit, payout creation, Stripe transfer, milestone `PAID`, or payout `SENT`.

## 5. Exact risks and blockers

### Risk 1 — Legacy tRPC `escrowCreatePaymentIntent` remains outside canonical payment readiness controls

Evidence:

- `apps/web/src/server/routers/billing.ts` still exposes `escrowCreatePaymentIntent` as a protected tRPC mutation.
- It accepts `proposalId` and client-provided `amountCents`, requires only `canManageEvent`, requires an existing escrow account, then creates a Stripe PaymentIntent and writes `EscrowAccount.stripeIntent`.
- It does not require provider-submitted evidence, accepted/converted proposal state, generated contract, dual signatures, current payment legal acceptance, buyer-side contract payment role, canonical payable milestone state, or canonical `PaymentIntent`/`Transaction`/held-funds ledger rows.

Correctness/security risk:

- This is the remaining route-continuity hole. It can create Stripe payment intent evidence outside the guarded W5 contract/payment spine and can confuse payment readiness or held-funds claims if any UI or caller still reaches the router.

Required constraint:

- Disable `escrowCreatePaymentIntent` like `escrowReleaseMilestone`, or make it delegate to `/api/payments/create-intent`/the same server predicate. No Stripe intent creation may remain proposal-id + client-amount authoritative.

### Risk 2 — Mark-complete copy is now guarded, but release readiness must remain a backend constraint

Evidence:

- `apps/web/tests/w5-mark-complete-copy.test.ts` expects `Provider completion evidence submitted for admin review`, expects `release remains blocked until refund, dispute, holdback, payout setup, Stripe, escrow, transfer, and guarded-admin checks pass`, and asserts the source does not contain `Payment can now be released`.
- `apps/web/src/app/api/payments/mark-milestone-complete/route.ts` now returns the guarded provider-completion/admin-review message and does not claim payment can now be released.

Correctness risk:

- The immediate unsafe copy is closed in the inspected workspace, but this endpoint still records provider completion evidence only. Any future status/copy change that treats mark-complete as release eligibility would reopen the trust flaw.

Required constraint:

- Keep mark-complete semantics as `provider completion evidence submitted for admin review`; do not imply release eligibility from provider/planner completion. Actual release must remain conditioned on refund/dispute/holdback, payout setup, Stripe, escrow, transfer, and guarded-admin checks.

### Risk 3 — Payment planning `Payout` rows still overload planning lines and executed payout records

Evidence:

- Prisma `Payout` has `proposalId`, optional unique `milestoneId`, optional `listingId`, `orgId`, `amountCents`, `stripeTransfer`, and `status`.
- `auto-build` and `plan/from-accepted-proposals` create `Payout` rows with `orgId: event.orgId` as planning rows from accepted provider-backed proposals.
- `release-milestone` creates executable payout rows with `orgId: canonicalRecipient.orgId` as seller org and `milestoneId` set.
- `PaymentPlanPageClient` now has guarded copy stating planning rows are not provider-paid evidence and `SENT` displays as `Transfer evidence recorded`, but the persisted schema still lacks an explicit row type.

Correctness/data-integrity risk:

- The UI copy is safer, but the same table still represents both buyer/event-owned payout plan rows and seller-recipient payout execution rows. If later code treats all non-canceled `Payout` records as executable provider payout evidence, it can confuse payer org, seller org, planned amount, net amount, and transfer state.

Required constraint:

- Before public/payment-ready claims, split or explicitly type `Payout` rows as `PLAN_LINE` vs `EXECUTED_RELEASE`/`RELEASE_ATTEMPT`, or add separate buyer/event org and seller/payee org fields. No UI/API may treat a planning row as payout-ready or provider-paid evidence unless `milestoneId`, seller org, Stripe transfer id, and release admin override are present.

### Risk 4 — Stripe Connect readiness is not persisted as reviewed payout readiness

Evidence:

- `Organization.stripeConnectAccountId` is persisted, but no Connect capability/readiness snapshot model exists in Prisma.
- `billing.connectStatus` reads `chargesEnabled`, `payoutsEnabled`, and `detailsSubmitted` live from Stripe and returns `connected` when charges and payouts are both enabled.
- Release route requires a Connect account id but does not persist current capability/requirements snapshot before transfer.

Correctness/payment risk:

- A stored account id is not payout readiness. Live Stripe flags are transient and not the same as OneHub-reviewed readiness, disabled reasons, requirements, account ownership proof, or approval timestamp.

Required constraint:

- Persist Connect readiness snapshots before any public payout-readiness claim: account id, charges enabled, payouts enabled, details submitted, requirements/disabled reason summary, fetched-at timestamp, reviewed-by, reviewed-at, approval state, and mode/test/live boundary. Release should verify the current/recent snapshot or fetch-and-persist before transfer.

### Risk 5 — Guarded-MVP admin authority is structurally narrow but not named finance/legal role separation

Evidence:

- `isPlatformAdminForGuardedMvp` requires global `ADMIN` plus user id in `GUARDED_MVP_PLATFORM_ADMIN_USER_IDS`.
- `canReleaseMilestonePayment`, refund review, dispute review, holdback decision, and admin verification server actions depend on guarded-MVP platform admin authority.
- `AdminOverride.authorityPath` stores `guarded-mvp.PLATFORM_ADMIN`.

Correctness/governance risk:

- This is acceptable for guarded MVP but not enough to claim finance/legal/operations segregation or durable launch governance.

Required constraint:

- Keep public/internal copy clear that this is guarded-MVP platform admin review. Before launch claims, implement named authority roles or record explicit role-proxy semantics for each decision: finance admin, legal admin, operations admin, founder exception, or platform admin acting under a named approved policy.

### Risk 6 — Refund and dispute review evidence is still mostly free-text at decision time

Evidence:

- Admin verification actions pass `decisionReason`/`reason` strings to refund, dispute, and holdback review.
- `reviewDisputeCase` validates only non-empty rationale, then records status/freeze/resolution and admin override metadata.
- `reviewRefundRequest` records fee treatment and reason, but does not require evidence artifact ids, party positions, before/after ledger impact summary, or legal/policy citation fields.

Correctness/trust risk:

- The system can block/release/refund, but challenged decisions may not be reconstructible enough for payment/legal credibility.

Required constraint:

- Require structured decision evidence before launch claims: evidence artifact/link ids, policy/legal surface version, affected parties, requested vs approved amount, ledger before/after, party acceptance/refusal, named authority path, and irreversible side effects acknowledgement.

### Risk 7 — Dispute `REFUND` action can create a zero-amount refund request

Evidence:

- `reviewDisputeCase` creates a linked refund request when action is `REFUND` and none exists, using `amountRequestedCents: 0`.
- `createRefundRequest` persists `amountRequestedCents` without enforcing positive amount internally; positive validation exists in `/api/refund-requests`, but internal calls bypass that route schema.

Correctness/data risk:

- A dispute-resolved-refund can create a refund review record whose requested amount is zero. That may be useful as a placeholder, but it is unsafe if downstream code interprets a linked refund request as a concrete approved/eligible refund amount.

Required constraint:

- Make dispute-to-refund linkage explicit: either create a non-money placeholder type/status, require an actual requested/approved refund amount before linking, or ensure zero-amount refund requests cannot be approved/misread as money movement. Reports/UI must label this as refund review pending amount determination.

### Risk 8 — Provider evidence depends on mutable Activity semantics rather than a dedicated immutable acceptance/evidence table

Evidence:

- Provider-backed status is inferred from `Activity.action === "PROVIDER_PROPOSAL_SUBMITTED"` and target proposal id.
- There is no dedicated `ProviderProposalEvidence` model with actor/provider org, submission timestamp, source route, immutable payload hash, accepted proposal snapshot, or revoked/superseded state.

Correctness/data-integrity risk:

- Activity evidence is lightweight and useful, but it is weaker than a dedicated commercial evidence record for contract/payment eligibility.

Required constraint:

- Before stronger trust/payment claims, persist provider-submitted proposal evidence as a first-class immutable record or strengthen Activity immutability/metadata requirements. Payment and contract gates should verify provider org identity, listing org relation, submitted-at timestamp, and proposal version/snapshot.

## 6. Required implementation constraints to avoid partial closure

P0 constraints before Sentinel can call W5 structurally closed:

1. Disable or canonicalize `billing.escrowCreatePaymentIntent`.
   - It must not create Stripe intents from proposal id + client amount outside contract/signature/provider-evidence/legal-acceptance/payment-intent ledger controls.

2. Keep mark-complete backend copy/state guarded.
   - Mark-complete means provider completion evidence submitted for admin review, not payment releasable.

3. Keep one canonical confirmation writer.
   - `/api/payments/confirm` and Stripe webhooks must keep using `applyConfirmedPaymentIntent` for all succeeded-money state.

4. Keep one canonical release writer.
   - No route besides `/api/payments/release-milestone` may set `PaymentMilestone.PAID`, `Payout.SENT`, `MoneyTx.RELEASE_ESCROW`, or transfer evidence without the same refund/dispute/holdback/admin/Stripe/Connect/escrow checks.

5. Split planning vs execution payout semantics.
   - Planning payout rows must not be read as executed provider payment evidence.

6. Persist payout readiness beyond `stripeConnectAccountId`.
   - Account id presence alone is never enough for public payout-ready or provider-paid claims.

7. Tighten dispute-to-refund zero-amount placeholder semantics.
   - Zero-amount linked refund placeholders must be unable to become approved/money-like without an explicit positive approved amount and review evidence.

8. Require structured trust-review evidence.
   - Refund/dispute/holdback/release decisions need structured evidence fields, not only free-text reasons, before public/legal/payment credibility claims.

9. Preserve provider-backed proposal evidence as a durable contract/payment eligibility fact.
   - Provider evidence should be immutable or first-class before launch claims.

10. Align all backend response copy with guarded state.
   - Use `held pending review`, `admin review`, `provider completion submitted`, `release attempt`, and `transfer evidence recorded`; avoid `paid`, `released`, `ready`, or `escrow` claims unless backed by exact persisted state.

11. Add object-level W5 proof.
   - Tests cover many route guardrails, but full closure needs one seeded object walkthrough across roles and states: provider evidence, approval, contract creation, buyer/seller signatures, payment locked/ready, create intent, confirm/held funds, refund/dispute/holdback blockers, admin release, and verification visibility. No live payments required.

## 7. Safe assumptions vs unsafe assumptions

Safe assumptions:

- OneHub has guarded-MVP backend primitives for W5.
- Provider-backed evidence is required for proposal approval and contract generation on canonical routes.
- The legacy proposal fund page is now locked behind auth/commercial proposal access and redirects to contract detail when a contract exists.
- Canonical payment intent creation is server-amount-derived and gated by buyer authority, accepted provider-backed proposal, signed contract, payment acceptance version, and Stripe metadata binding.
- Payment confirmation and webhook success share a canonical function with metadata/amount/acceptance/ledger/holdback checks.
- Canonical release is platform-admin/manual-review gated and checks refund/dispute/holdback blockers before escrow debit/transfer.
- Refund approval reserves local escrow and records recoverable money state before Stripe refund finalization.

Unsafe assumptions:

- Do not claim W5 is closed as a user workflow until `billing.escrowCreatePaymentIntent`, payout semantics, Connect readiness persistence, zero-amount dispute refund semantics, and structured trust-review evidence constraints are addressed.
- Do not claim public payment readiness, payout readiness, provider-paid state, legal readiness, finance/legal segregation, or escrow/legal approval from current guarded-MVP primitives.
- Do not treat provider-submitted Activity evidence as legally robust provider acceptance without stronger immutability/versioning.
- Do not treat planning `Payout` rows as executed payout evidence.
- Do not treat zero-amount dispute-linked refund requests as concrete refund eligibility.

## 8. Verification status

Read-only report generation completed. Focused W5 route-continuity and mark-complete copy tests pass in the inspected workspace; full repo verification still needs to be considered separately because the combined full test run exceeded the tool timeout in this worker run.

Verification commands to run before downstream Sentinel handoff:

- `pnpm run test`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run build`
- `git diff --check`

## 9. Recommended next action for Atlas

Route Forge for a narrow backend/data safety cleanup before Sentinel full W5 proof:

1. disable or canonicalize `billing.escrowCreatePaymentIntent`;
2. keep `/api/payments/mark-milestone-complete` response semantics pinned to provider completion evidence/admin review, not release readiness;
3. add explicit planning-vs-executed payout semantics or separate buyer/event org and seller/payee org fields;
4. persist Stripe Connect readiness snapshots with OneHub review state;
5. tighten dispute-to-refund zero-amount placeholder semantics;
6. require structured evidence fields for refund/dispute/holdback/release review decisions.

Then route Sentinel to run an object-level W5 proof across roles and persisted states. FOUNDER ESCALATION REQUIRED before live Stripe movement, billing/Connect settings changes, public legal/payment claims, production data changes, public/domain exposure, or any irreversible payment/legal action.
