# OneHub Stabilization P2 — Canonical Proposal -> Contract -> Signature -> Payment Lifecycle

Generated: 2026-06-06T13:51:17Z
Worker: Steward
Task: t_7d0e2c23
Scope: backend correctness design only. No implementation changes made. This report artifact is the only intentional write.

## 1. Backend scope under review

Design one canonical OneHub path from proposal approval through contract generation, dual-party signature, payment-intent creation, Stripe/test-mode success handling, and held-funds state update.

Guardrails respected:
- No credential changes.
- No billing/live-payment activation.
- No public exposure or infra changes.
- No destructive DB/schema/migration commands.
- No source-code implementation beyond this report artifact.

## 2. Evidence examined

Primary repo: `/root/.hermes/workspaces/onehub/repo`
HEAD: `4526f64`
Git state before this report: `main...origin/main [ahead 2]` with broad existing dirty tree.

Files inspected:
- `apps/web/prisma/schema.prisma`
- `apps/web/src/server/routers/proposal.ts`
- `apps/web/src/server/routers/contract.ts`
- `apps/web/src/app/api/proposals/[id]/approve/route.ts`
- `apps/web/src/app/api/proposals/[id]/route.ts`
- `apps/web/src/app/api/contracts/from-proposal/route.ts`
- `apps/web/src/app/api/contracts/[id]/route.ts`
- `apps/web/src/app/api/contracts/[id]/sign/route.ts`
- `apps/web/src/app/api/contracts/sign/route.ts`
- `apps/web/src/app/api/payments/create-intent/route.ts`
- `apps/web/src/app/api/payments/confirm/route.ts`
- `apps/web/src/app/api/stripe/webhook/route.ts`
- `apps/web/src/app/api/payments/auto-build/route.ts`
- `apps/web/src/app/api/payments/deposits/auto/route.ts`
- `apps/web/src/app/api/payments/plan/from-accepted-proposals/route.ts`
- `apps/web/src/lib/payments/money-state.ts`
- `apps/web/src/lib/transaction-loop.ts`
- UI callers under `apps/web/src/components/proposals`, `apps/web/src/components/contracts`, and `apps/web/src/components/payments`
- Relevant tests under `apps/web/tests/gate4b-transaction-loop.test.ts`, `apps/web/tests/gate5b-payment-state.test.ts`, `apps/web/tests/gate5c-payment-monitoring.test.ts`

Validation executed:
- `pnpm -C apps/web typecheck` -> PASS
- `pnpm exec vitest run apps/web/tests/gate4b-transaction-loop.test.ts apps/web/tests/gate5b-payment-state.test.ts apps/web/tests/gate5c-payment-monitoring.test.ts` -> PASS, 3 files / 22 tests

## 3. Correctness verdict

Verdict: PARTIAL / RISK.

The current backend contains enough pieces to support a safe canonical lifecycle, but the pieces are split across duplicate REST and tRPC flows with incompatible semantics. Forge should not add another flow. Forge should consolidate around one App Router REST lifecycle and block/redirect the older duplicate surfaces.

Primary risks:
1. Proposal acceptance is duplicated.
   - `apps/web/src/app/api/proposals/[id]/approve/route.ts` records legal acceptance and transaction-loop audit, then sets `Proposal.status = ACCEPTED`.
   - `apps/web/src/server/routers/proposal.ts` `accept` creates a placeholder contract and escrow account directly, then sets `Proposal.status = ACCEPTED` without legal acceptance proof.
2. Contract generation is duplicated / inconsistent.
   - Canonical-looking route `apps/web/src/app/api/contracts/from-proposal/route.ts` generates a real contract from accepted proposal context, sets `buyerId`/`sellerId`, and moves proposal to `CONVERTED`.
   - tRPC `proposal.accept` creates a placeholder contract with `bodyMd: "Contract template content"`, no buyer/seller identity, and no conversion state.
3. Signature is duplicated.
   - `apps/web/src/app/api/contracts/[id]/sign/route.ts` requires contract acceptance proof and signer email matching authenticated user; it records acceptance and transaction-loop activity when both parties sign.
   - `apps/web/src/app/api/contracts/sign/route.ts` signs by `contractId`, lacks acceptance proof, uses a different request contract, and is called by `SignContractButton.tsx`.
   - tRPC `contract.sign` signs by `signatureId`; useful as a lower-level primitive but not aligned with the user-facing App Router flow.
4. Payment plan/deposit routes are separate legacy/planner-plan surfaces and should not be confused with canonical buyer checkout.
   - Canonical money movement should be `PaymentIntent` through `/api/payments/create-intent`, `/api/payments/confirm`, and `/api/stripe/webhook`.
   - `/api/payments/auto-build`, `/api/payments/deposits/auto`, and `/api/payments/plan/from-accepted-proposals` create payout/deposit planning records and should not transition contract/payment states for the canonical lifecycle.
5. Identity model is ambiguous.
   - `Contract.buyerId` and `Contract.sellerId` currently store organization ids in `from-proposal`.
   - Some code treats them as org ids (`create-intent`, REST sign route), while `contractRouter.approveChangeOrder` compares them to `user.id`, which is unsafe if change orders become active in the canonical flow.

## 4. Canonical lifecycle to implement

### Canonical endpoint sequence

1. Buyer accepts proposal:
   - `POST /api/proposals/[id]/approve`
   - Survives as canonical.
   - Requires authenticated user with buyer-side event-management authority.
   - Requires proposal acceptance proof using `CURRENT_ACCEPTANCE_VERSIONS.proposal`.
   - Allowed only from `Proposal.status = SENT`.
   - Sets `Proposal.status = ACCEPTED`.
   - Does not create a contract.

2. Buyer-side authorized user generates contract from accepted proposal:
   - `POST /api/contracts/from-proposal`
   - Survives as canonical, but should be tightened.
   - Requires `Proposal.status = ACCEPTED` only. Treat `CONVERTED` as idempotent return of existing contract, not a fresh generation state.
   - Requires `listingId` and seller org context.
   - Creates one `Contract` per proposal (`proposalId @unique`).
   - Sets `Contract.status = DRAFT`.
   - Sets `Proposal.status = CONVERTED` after successful contract create in the same transaction.
   - Does not create escrow/payment state yet.

3. Buyer-side authorized user sends/finalizes contract for signature:
   - Preferred minimal implementation: keep contract generation as `DRAFT`, allow edits through `PATCH /api/contracts/[id]`, then add or reuse an explicit finalization/send endpoint before signature.
   - Existing candidate: tRPC `contract.sendForSignature`, but it is not App Router aligned and creates arbitrary signer rows.
   - Required canonical behavior: only buyer-side event manager can move `Contract.status DRAFT -> OUT_FOR_SIGNATURE`; signer roster must include one buyer-side signer and one seller-side signer, both anchored to authenticated users/org memberships where possible.
   - If Forge does not implement this step in P2, then `POST /api/contracts/[id]/sign` must allow signing from `DRAFT` only in demo mode or must be blocked until status is `OUT_FOR_SIGNATURE`. Production-safe design prefers explicit `OUT_FOR_SIGNATURE`.

4. Buyer/seller sign contract:
   - `POST /api/contracts/[id]/sign`
   - Survives as canonical.
   - Requires authenticated user.
   - Requires signer email to match authenticated user email.
   - Requires contract acceptance proof using `CURRENT_ACCEPTANCE_VERSIONS.contract`.
   - Authorized signer must be either:
     - buyer side: `canManageEvent(user, contract.proposal.event)`, or
     - seller side: owner/member of `contract.proposal.listing.org`.
   - Creates/updates `Signature` for the authenticated user/email.
   - Status transition:
     - first valid side signs: `OUT_FOR_SIGNATURE -> PARTIALLY_SIGNED`
     - both buyer and seller sides signed: `PARTIALLY_SIGNED -> FULLY_SIGNED`
   - On `FULLY_SIGNED`, record transaction-loop audit `ACCEPTED -> AGREEMENT_SIGNED` when booking request id exists.

5. Buyer creates payment intent:
   - `POST /api/payments/create-intent`
   - Survives as canonical.
   - Requires authenticated buyer-side user.
   - Requires payment acceptance proof using `CURRENT_ACCEPTANCE_VERSIONS.payment`.
   - Allowed only when `Contract.status in (FULLY_SIGNED, IN_PAYMENT)`.
   - Requires `contract.sellerId` and seller payee owner.
   - Creates one local `PaymentIntent` in `REQUIRES_PAYMENT`, creates Stripe test-mode intent, stores `stripeIntentId`.
   - Uses idempotency key per contract/milestone/amount/currency.
   - Must not create deposit-target payment intents; `money-state.ts` correctly blocks `target: "deposit"`.

6. Payment success confirmation:
   - Primary source: `POST /api/stripe/webhook` for `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`.
   - Secondary local UX confirmation: `POST /api/payments/confirm`, payer-only, retrieves Stripe intent and applies same reducer if succeeded.
   - Both call `applyPaymentSuccessStateTransition` / failure transition in `apps/web/src/lib/payments/money-state.ts`.
   - Success transition:
     - `PaymentIntent.status -> SUCCEEDED`
     - target milestone `PENDING/OVERDUE -> IN_ESCROW` when milestone payment
     - escrow balance increments by paid amount, escrow status `FUNDED`
     - `Contract.status FULLY_SIGNED -> IN_PAYMENT`
     - creates `Transaction`
     - evaluates holdback
   - Refund/dispute/payout/transfer webhooks remain manual-admin-only; no live payout/refund activation in this sprint.

## 5. Endpoint disposition table

Survive as canonical:
- `POST /api/proposals/[id]/approve`
- `PATCH /api/proposals/[id]` only for `DRAFT`/`SENT` edits before acceptance
- `POST /api/contracts/from-proposal`
- `PATCH /api/contracts/[id]` only for `DRAFT` contract edits before signatures
- `POST /api/contracts/[id]/sign`
- `POST /api/payments/create-intent`
- `POST /api/payments/confirm`
- `POST /api/stripe/webhook`

Survive but explicitly out of canonical checkout path:
- `POST /api/payments/plan/from-accepted-proposals` — planner payout-plan construction only; no contract/payment state transitions.
- `POST /api/payments/deposits/auto` — planner deposit-schedule UI only; no buyer checkout / no Stripe intent.
- `POST /api/payments/auto-build` — duplicate/older payout-plan builder; should be deprecated in favor of `/api/payments/plan/from-accepted-proposals` or blocked if not used.
- milestone release/completion/receipt routes — later fulfillment/release lanes, not canonical initial booking checkout.

Redirect/block/deprecate:
- `POST /api/contracts/sign` should be removed from UI and return `410 Gone` or `308`/client migration guidance to `/api/contracts/[id]/sign`. Current UI caller `apps/web/src/components/contracts/SignContractButton.tsx` must be migrated or removed.
- tRPC `proposal.accept` must not create contracts or escrow. Either remove, block with `410`, or internally call the canonical acceptance service after legal acceptance is supplied. Current behavior is unsafe because it bypasses acceptance proof and creates placeholder contract/escrow.
- tRPC `contract.sign` should not be used by product UI for canonical signing. Either keep only as an internal service after alignment with acceptance proof and identity rules, or block product access.
- tRPC `contract.sendForSignature` can survive only if converted into the canonical finalization/send step and given the same buyer/seller signer invariants; otherwise block/deprecate.
- tRPC `contract.approveChangeOrder` must be fixed before change orders are exposed because it compares `contract.buyerId/sellerId` to `user.id` while current contract generation stores org ids.

## 6. Required DB state transitions

Proposal:
- `DRAFT -> SENT`: provider/seller sends proposal. Existing tRPC `proposal.send` can remain if permissioned and no payment state is created.
- `SENT -> ACCEPTED`: only via `POST /api/proposals/[id]/approve` with proposal legal acceptance proof.
- `ACCEPTED -> CONVERTED`: only after successful contract creation from proposal.
- `REJECTED` / `EXPIRED`: terminal for this lifecycle; cannot generate contract or payment.
- Do not allow `ACCEPTED` proposal to be edited; current `PATCH /api/proposals/[id]` already blocks non-`DRAFT`/`SENT`.

Contract:
- Create as `DRAFT` from accepted proposal.
- `DRAFT -> OUT_FOR_SIGNATURE`: explicit finalization/send step after edits. Required before payment path.
- `OUT_FOR_SIGNATURE -> PARTIALLY_SIGNED`: one valid side signs.
- `PARTIALLY_SIGNED -> FULLY_SIGNED`: both buyer and seller sides signed.
- `FULLY_SIGNED -> IN_PAYMENT`: first successful payment applied by canonical money reducer.
- `IN_PAYMENT -> ACTIVE/COMPLETED`: later fulfillment/release lane, not this P2 path.
- `CANCELED`: allowed before payment; must block payment intent creation.

Signature:
- One signature row per `(contractId, signerEmail normalized)` or per `(contractId, signerId)`; current schema has no uniqueness constraint, so route-level idempotency must enforce duplicate prevention until schema is changed.
- Signing writes `signerId`, normalized `signerEmail`, `signerName`, `signedAt`, `method`, and audit context where available.
- Buyer-signed and seller-signed must be computed from org ownership/membership, not from arbitrary signer labels.

PaymentIntent:
- `REQUIRES_PAYMENT`: local intent created before Stripe client confirmation.
- `PROCESSING`: Stripe/local confirm sees not-yet-succeeded in-flight payment.
- `SUCCEEDED`: only after Stripe success match validates amount, currency, metadata paymentIntentId, contractId, and milestoneId if present.
- `FAILED` / `CANCELLED`: only non-terminal failure/cancel events; must not regress `SUCCEEDED`.

PaymentMilestone:
- Payable statuses: `PENDING`, `OVERDUE`.
- Successful milestone payment moves target milestone to `IN_ESCROW`.
- `HELD`, `PARTIALLY_PAID`, `PAID`, `REFUNDED` should not accept a new initial payment intent until a later release/refund design says so.

EscrowAccount:
- Create lazily in `/api/payments/create-intent` if missing.
- On successful payment, increment `balanceCents` and set `FUNDED`.
- Do not release/refund/payout automatically in this canonical initial path.

Transaction:
- Create only during success reducer after Stripe/local success proof.
- Amounts must derive from local `PaymentIntent` and fee profile, not client-submitted totals.

## 7. Buyer/seller identity rules

Canonical buyer side:
- Buyer organization is the event organization: `proposal.event.orgId`.
- Buyer-side authorized signer/user is event org owner/member with `canManageEvent(user, proposal.event)`.
- `Contract.buyerId` currently stores buyer org id. Rename later to `buyerOrgId` or document it as org id; do not compare it to `user.id`.

Canonical seller side:
- Seller organization is `proposal.listing.orgId`.
- Seller-side authorized signer/user is listing org owner/member.
- Seller payee for the current implementation is listing org owner user id (`proposal.listing.org.ownerId`) because `PaymentIntent.payeeId` references `User`.
- `Contract.sellerId` currently stores seller org id. Rename later to `sellerOrgId` or document it as org id; do not compare it to `user.id`.

Required invariant before contract generation:
- `proposal.listingId` must exist.
- `proposal.listing.orgId` must exist.
- `proposal.event.orgId !== proposal.listing.orgId` unless OneHub explicitly supports self-procurement; if not supported, block self-contracting.
- The authenticated actor generating contract must be buyer-side authorized; provider-generated contracts are out of scope unless separately designed.

Required invariant before payment:
- Authenticated actor must be buyer-side authorized.
- Contract must be `FULLY_SIGNED` or already `IN_PAYMENT`.
- Seller payee user id must resolve from seller org owner.
- Client cannot submit arbitrary amount except full-contract total that equals server-derived milestone sum; milestone payment amount must be server-derived from target milestone.

## 8. Exact implementation guidance for Forge

Recommended implementation shape: create shared server-side lifecycle helpers, then make all surviving endpoints call them. Do not duplicate transition logic inside routes.

Create:
- `apps/web/src/server/lib/lifecycle/proposal-contract-payment.ts`

Move/centralize functions:
- `assertProposalCanBeAccepted(proposal, user)`
- `acceptProposalWithProof({ proposalId, user, acceptance, requestContextId })`
- `generateContractFromAcceptedProposal({ proposalId, user })`
- `assertContractSigner({ contract, user, signerEmail })`
- `signContractWithProof({ contractId, user, signerName, signerEmail, acceptance, requestContextId })`
- `computeContractSignatureStatus(contractId)`
- `assertBuyerCanCreatePaymentIntent({ contract, userId })`

Modify:
- `apps/web/src/app/api/proposals/[id]/approve/route.ts`
  - Enforce only `SENT -> ACCEPTED`; return 400 for `DRAFT`, `REJECTED`, `EXPIRED`, `CONVERTED`.
  - Use transaction for proposal update + acceptance + activity audit.
  - Return existing accepted proposal idempotently only if acceptance proof already exists for same user/context; otherwise require proof.

- `apps/web/src/app/api/contracts/from-proposal/route.ts`
  - Wrap contract create and proposal `CONVERTED` update in one Prisma transaction.
  - If contract already exists for proposal, return 200 with existing contract id, not 400, when proposal is already `CONVERTED`.
  - Block if proposal is not exactly `ACCEPTED` and no existing converted contract is present.
  - Ensure buyer/seller org ids are explicit in names or comments until schema rename is approved.

- `apps/web/src/app/api/contracts/[id]/sign/route.ts`
  - Make this the only product signing route.
  - Require `Contract.status` in `OUT_FOR_SIGNATURE` or `PARTIALLY_SIGNED`; decide separately whether demo can sign `DRAFT`.
  - Normalize signer email to lowercase for duplicate lookup.
  - Record IP/UA if needed; current route does not persist them, while legacy route does.
  - Use one status reducer for buyer/seller signature completion.

- `apps/web/src/app/api/contracts/sign/route.ts`
  - Return `410 Gone` JSON: `{ error: "Use /api/contracts/[id]/sign" }`, or remove after UI migration.

- `apps/web/src/components/contracts/SignContractButton.tsx`
  - Remove or migrate to `ContractSignatureForm` behavior and `/api/contracts/[id]/sign` with acceptance payload.

- `apps/web/src/server/routers/proposal.ts`
  - Remove/block `accept` path that creates placeholder contract and escrow.
  - Keep `send` only if it remains the canonical provider proposal send step.
  - Keep `reject` only with protected/authenticated behavior and explicit terminal state checks.

- `apps/web/src/server/routers/contract.ts`
  - Remove/block product access to `sign` unless it is refactored to use the same lifecycle helper and acceptance proof.
  - Fix or block `approveChangeOrder` until buyer/seller id semantics are corrected.
  - If `sendForSignature` survives, it must become the canonical `DRAFT -> OUT_FOR_SIGNATURE` endpoint with buyer/seller signer invariant checks.

- `apps/web/src/app/api/payments/create-intent/route.ts`
  - Keep as canonical payment intent creation route.
  - Consider replacing duplicate local `PAYABLE_*` sets with exports from `money-state.ts` to avoid drift.
  - Correct the early call to `validatePaymentIntentCreationPolicy` at lines 91-96 that uses `amountCents: 1`; validation should use the actual server-derived amount after target resolution.

- `apps/web/src/app/api/payments/confirm/route.ts` and `apps/web/src/app/api/stripe/webhook/route.ts`
  - Keep canonical; both already converge on money-state reducers.
  - Continue enforcing Stripe test-mode secret in this stabilization sprint.

## 9. Acceptance criteria for Forge

Forge work is acceptable only when all are true:

1. There is exactly one product proposal acceptance endpoint used by UI: `POST /api/proposals/[id]/approve`.
2. tRPC `proposal.accept` no longer creates contracts or escrow and cannot bypass legal acceptance proof.
3. There is exactly one product contract generation endpoint used by UI: `POST /api/contracts/from-proposal`.
4. Contract generation is transactional with proposal conversion.
5. There is exactly one product contract signing endpoint used by UI: `POST /api/contracts/[id]/sign`.
6. `/api/contracts/sign` no longer signs contracts.
7. Buyer/seller signing status is derived from event org and listing org membership/ownership.
8. `Contract.buyerId` and `Contract.sellerId` org-id semantics are documented or renamed in a schema-approved later step; no code compares them to `user.id`.
9. Payment intent creation is blocked until contract is `FULLY_SIGNED` or `IN_PAYMENT`.
10. Payment amount is server-derived from milestone or full milestone sum; client amount cannot override server amount.
11. Stripe success reducer remains the only path to `PaymentIntent.SUCCEEDED`, milestone `IN_ESCROW`, escrow balance increment, `Contract.IN_PAYMENT`, and `Transaction` creation.
12. Refund/dispute/payout/transfer automation remains blocked/manual-admin-only.
13. Legacy payment-plan/deposit routes are labeled non-canonical or blocked from canonical checkout UI.
14. Typecheck passes.
15. Targeted lifecycle tests pass.

## 10. Test matrix

Add or update tests under `apps/web/tests/` or route-level integration test harness as available.

Proposal acceptance:
- Unauthenticated `POST /api/proposals/[id]/approve` -> 401.
- Non-buyer/non-manager user -> 403.
- Missing/wrong proposal legal version -> 400.
- `DRAFT` proposal approval -> 400.
- `SENT` proposal approval -> `ACCEPTED`, acceptance row recorded, activity recorded.
- Re-approval of already `ACCEPTED` proposal is idempotent only with existing proof; otherwise safe 400/409.
- `REJECTED`/`EXPIRED` proposal cannot approve.

Contract generation:
- Unauthenticated -> 401.
- Seller/non-buyer actor -> 403.
- Missing `proposalId` -> 400.
- Proposal not found -> 404.
- Proposal not `ACCEPTED` -> 400.
- Accepted proposal with no listing -> 400.
- Accepted proposal with listing -> creates one `DRAFT` contract and moves proposal to `CONVERTED` in same transaction.
- Repeated call after conversion returns existing contract id and does not create duplicate.
- Failure between contract create and proposal update rolls back both.

Contract edit/finalize/signature:
- `PATCH /api/contracts/[id]` allowed only in `DRAFT` by buyer manager.
- Non-buyer cannot edit draft contract.
- Signing blocked before `OUT_FOR_SIGNATURE` unless explicitly allowed in demo mode.
- Signer email mismatch authenticated user -> 403.
- Non-buyer/non-seller signer -> 403.
- Buyer first signature -> `PARTIALLY_SIGNED`.
- Seller first signature -> `PARTIALLY_SIGNED`.
- Duplicate same signer -> 400 or idempotent no-op; must not create duplicate row.
- Buyer + seller signatures -> `FULLY_SIGNED` and transaction-loop audit for booking request when present.
- `/api/contracts/sign` returns blocked/gone and does not modify DB.
- tRPC `contract.sign` and `proposal.accept` cannot mutate canonical state unless routed through shared helpers with acceptance proof.

Payment intent creation:
- Unauthenticated -> 401.
- Seller/non-buyer -> 403.
- Contract not found -> 404.
- Contract `DRAFT`, `OUT_FOR_SIGNATURE`, `PARTIALLY_SIGNED`, `CANCELED` -> 400.
- Contract `FULLY_SIGNED`, valid milestone `PENDING` -> creates local `PaymentIntent.REQUIRES_PAYMENT` and Stripe test-mode intent.
- Milestone `HELD`, `IN_ESCROW`, `PAID`, `REFUNDED` -> 400.
- Full-contract payment amount not equal server-derived milestone total -> 400.
- Missing seller/payee -> 400.
- Wrong payment legal version -> 400.
- Existing active local/Stripe intent returns reusable client secret only when redirect policy is `allow_redirects: never`; otherwise cancels old local/Stripe safely.

Payment confirmation/webhook:
- Non-payer confirm -> 403.
- Missing acceptance proof -> failure.
- Stripe success with mismatched amount -> no success transition.
- Stripe success with mismatched currency -> no success transition.
- Stripe success with mismatched metadata paymentIntentId/contractId/milestoneId -> no success transition.
- Valid success -> `PaymentIntent.SUCCEEDED`, milestone `IN_ESCROW`, escrow `FUNDED`, contract `IN_PAYMENT`, transaction created.
- Duplicate success webhook -> idempotent no duplicate transaction.
- Failure/cancel after success -> ignored terminal success.
- Refund/dispute/payout/transfer webhook -> marked manual-admin-only; no payout/refund state mutation.

Legacy/non-canonical route tests:
- `/api/payments/auto-build` cannot create payment intents or alter contract status.
- `/api/payments/deposits/auto` cannot create payment intents or alter contract status.
- `/api/payments/plan/from-accepted-proposals` cannot create payment intents or alter contract status.

## 11. Narrow next action

Forge should implement the consolidation behind shared lifecycle helpers, starting with blocking/removing the unsafe duplicate mutation surfaces before adding new behavior. Sentinel should then verify route-level auth, acceptance proof, state transitions, and money-state invariants before Atlas treats the lifecycle as accepted.
