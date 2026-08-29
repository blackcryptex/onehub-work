# W3 Steward Map — Budget + Change Orders backend/data/security workflow

Date: 2026-08-28
Task: t_545e4499
Inspector: Steward
Verdict: RISK

## 1. Backend or structural scope reviewed

Read-only backend/data/security/payment map for Workflow 3: Budget + Change Orders.

Required business loop:

budget -> planned/actual/committed/paid/owed -> proposal/change-order impact -> overrun warning -> risk visibility

Acceptance target:

Budget is not just a table; it explains financial state and overrun risk.

Guardrails honored:

- No production, env, credential, billing, infra, domain, public exposure, live payment, or destructive DB action was performed.
- No application source code was edited.
- This report is the only deliverable file added for this task.
- Findings below are structural constraints for Atlas/Forge/Sentinel, not implementation approval.

## 2. Evidence examined

Primary data model:

- `apps/web/prisma/schema.prisma:291-339` — `Event` owns `budgetCents`, budget range/currency fields, `budgetLines`, `proposals`, `contracts`, `escrowAccounts`, `deposits`, and other event relations.
- `apps/web/prisma/schema.prisma:445-455` — `BudgetLine` stores only `plannedCents`, `actualCents`, optional `vendorName`, and `notes`; there is no committed/paid/owed/source ledger field.
- `apps/web/prisma/schema.prisma:626-682` — `Proposal`, `ProposalLineItem`, and `PaymentMilestone` carry proposal totals and payment schedule.
- `apps/web/prisma/schema.prisma:695-743` — `Contract` and `ChangeOrder` exist; `ChangeOrder` has `deltaCents`, `status`, and `approvedAt`, but no approver, reject timestamp, bidirectional approval state, or budget impact record.
- `apps/web/prisma/schema.prisma:745-830` — `EscrowAccount`, `Payout`, `MoneyTx`, `PaymentIntent`, and `Transaction` carry payment/held/release evidence.
- `apps/web/prisma/schema.prisma:833-868` — `PaymentHoldback` exists separately from the budget model.

Budget routes and display:

- `apps/web/src/app/(app)/events/[eventSlug]/budget/page.tsx:14-55` — canonical budget page authorizes event view, fetches only `budgetLines`, and renders `BudgetTable` or an empty state.
- `packages/ui/src/components/BudgetTable.tsx:3-43` — table exposes Category, Label, Planned, Actual, Variance, and totals only.
- `apps/web/src/server/routers/budget.ts:7-47` — tRPC budget create/update/delete/list exists with `canEditBudget`/`canViewBudget` checks; list returns planned/actual totals and variance only.
- `apps/web/src/lib/budget.util.ts:38-64` and `apps/web/src/components/panes/BudgetPane.tsx:52-81` — older/client pane can compute projected proposal/contract figures, but from in-memory `EventItem` data rather than canonical persisted budget route state.
- `apps/web/src/app/(app)/events/[eventSlug]/page.tsx:27-65` — event overview budget used card is only actual/planned from budget lines.

Proposal, contract, change-order, payment flow:

- `apps/web/src/server/routers/proposal.ts:131-208` — tRPC proposal accept requires event management and provider-submitted evidence, then creates a contract and escrow account and marks proposal accepted; it does not update budget lines or a financial summary.
- `apps/web/src/app/api/proposals/[id]/approve/route.ts:45-136` — App Router proposal approval validates acceptance/version/provider-backed evidence and updates `Proposal.status` to `ACCEPTED`; it records acceptance, but does not create a budget impact record.
- `apps/web/src/app/api/contracts/from-proposal/route.ts:37-241` — accepted provider-backed proposal can generate a contract, set `buyerId`/`sellerId`, and mark proposal `CONVERTED`; no budget or committed amount projection is updated.
- `apps/web/src/server/routers/contract.ts:295-420` — change orders can be added/approved with activity records; approval only changes `ChangeOrder.status`/`approvedAt` and does not update budget, contract value, proposal totals, milestones, payment intents, payout basis, or an overrun flag.
- `apps/web/src/components/contracts/ContractPageClient.tsx:173-330` — contract detail renders readiness/signatures/payment panel but not `changeOrders`.
- `apps/web/src/app/api/payments/plan/from-accepted-proposals/route.ts:38-160` — accepted provider-backed proposals can create/update payout rows for Pro Planner; this is a payout plan, not a budget ledger, and it is role-limited to `PRO_PLANNER` plus event management.
- `apps/web/src/app/api/payments/create-intent/route.ts:38-314` — buyer-side payment intent creation derives payable amount from milestones and records Stripe intent metadata; no budget summary/read model is updated.
- `apps/web/src/lib/payments/confirm-payment.ts:200-330` — confirmed Stripe payment transactionally sets `PaymentIntent.SUCCEEDED`, milestone `IN_ESCROW`, escrow balance, transaction row, holdback evaluation, contract status, and `PAYMENT_CONFIRMED` activity; no event budget paid/held/owed read model is updated.
- `apps/web/src/app/api/payments/release-milestone/route.ts:111-240` — release is correctly guarded to platform admin and checks refund/dispute/holdback blockers before release; this is separate from W3 budget exposure.

RBAC/security:

- `apps/web/src/lib/rbac.ts:228-269` — `canViewBudget` permits Admin/org owner/planner org member; `canEditBudget` permits Admin/org owner/PRO_PLANNER org member, not DIY planner.
- `apps/web/src/lib/rbac.ts:179-193` and `423-452` — event manage/view isolates planners to owned events and blocks vendors/venues from planner event access by default.
- `apps/web/src/lib/rbac.ts:607-645` — proposal/contract detail allows event-side, seller-side listing org, and intended signer access.
- `apps/web/tests/contract-router-access.test.ts:97-147` — tests cover contract get/render/sign access, including seller access and unrelated user denial, but not change-order mutation authorization or W3 budget impact.

Admin/risk surfaces and tests:

- `apps/web/src/app/(app)/admin/overview/page.tsx:106-163` — admin overview counts disputes, refunds, active holdbacks, pending payouts, abuse, failed payments, unprocessed webhooks, audit trail, and crisis; it does not query budget overrun or change-order exposure.
- `packages/ui/tests/BudgetTable.test.tsx:5-18` — budget table tests only planned/actual totals.
- `apps/web/tests/payment-readiness-copy.test.tsx:68-92` — payment readiness tests prove local contract-payment copy and held/paid labels, not budget reconciliation.
- `apps/web/tests/proposal-provider-handoff.test.tsx:116-169` — proposal approval tests prove provider-backed guard and acceptance recording, not budget impact.
- `apps/web/tests/contract-readiness-clarity.test.tsx:78-88` — contract readiness tests prove payment gate copy, not change-order or budget impact.
- `apps/web/tests/contract-router-access.test.ts:1-147` — contract access tests do not cover add/approve change order effects.
- `reports/seven-workflows/w3-scout-map.md:239-258` — Scout verdict is BROKEN from UX/product flow; Steward independently confirms backend/data constraints below.

## 3. Correctness verdict

RISK.

The current backend has component-level financial records, but it does not have a canonical W3 financial state contract. Budget, proposals, contracts, change orders, payment milestones, payment intents, escrow balances, transactions, payouts, and admin risk queues are separate structures. No inspected persisted read model or query reconciles them into planned/actual/committed/paid/held/owed/remaining/overrun state for an event.

The existing code is safer than a fake money claim because live release remains guarded, provider-backed proposal acceptance is constrained, and payment confirmation is transactionally checked. But W3 cannot be marked structurally closed because accepted proposals and approved/pending change orders do not have a durable budget-impact path, and payment state does not feed budget/risk visibility.

## 4. Exact risks and blockers

### R1 — No canonical event financial summary/read model

Risk: W3 requires one event-level financial truth, but the system only stores separate entities.

Evidence:

- Budget page fetches only `budgetLines` (`apps/web/src/app/(app)/events/[eventSlug]/budget/page.tsx:18-31`).
- Budget router returns only `lines`, planned/actual totals, and variance (`apps/web/src/server/routers/budget.ts:35-45`).
- Payment confirmation updates payment/escrow/transaction state, not any budget summary (`apps/web/src/lib/payments/confirm-payment.ts:250-330`).

Constraint:

Forge should not add another UI-only calculation. Implement a single server-derived event financial summary function/query that calculates, at minimum:

- `budgetTotalCents` from `Event.budgetCents` with currency from event/user/org settings;
- `plannedCents` from `BudgetLine.plannedCents`;
- `actualCents` from `BudgetLine.actualCents` plus any explicitly defined actual-spend source chosen by Atlas;
- `committedCents` from accepted/converted provider-backed proposals and/or signed contracts;
- `pendingChangeOrderDeltaCents` and `approvedChangeOrderDeltaCents`;
- `payableCents` from payable milestones not paid/held/refunded;
- `heldCents` from `PaymentMilestone.IN_ESCROW`, successful `PaymentIntent`, and/or `EscrowAccount.balanceCents` with one defined precedence rule;
- `paidCents` from released/paid milestones and/or payout/transaction state with one defined precedence rule;
- `owedCents = committed + approvedChangeOrderDelta - paid/held` using a documented formula;
- `remainingCents` and `overrunCents` against approved budget.

### R2 — BudgetLine is insufficient for committed/paid/owed integrity

Risk: Adding committed/paid/owed columns to `BudgetLine` would mix planned category budgeting with contractual/payment state and create denormalized drift.

Evidence:

- `BudgetLine` has only category/label/planned/actual/vendor/notes (`apps/web/prisma/schema.prisma:445-455`).
- Proposal, contract, payment, escrow, payout, and transaction models already carry the contractual/payment evidence (`apps/web/prisma/schema.prisma:626-830`).

Constraint:

Keep `BudgetLine` as the planned/actual category allocation source unless Atlas explicitly approves a schema redesign. Represent proposal/contract/change-order/payment impact as a derived ledger/read model or purpose-built `EventFinancialImpact`/`BudgetImpact` model keyed to source records, not as manually edited duplicate totals on budget lines.

### R3 — Accepted proposal does not become budget commitment

Risk: A proposal can be accepted/converted and payment-plan-ready without becoming visible as committed budget exposure.

Evidence:

- tRPC accept creates contract + escrow and marks proposal `ACCEPTED`, but no budget impact (`apps/web/src/server/routers/proposal.ts:176-196`).
- App Router approve marks proposal `ACCEPTED` and records acceptance only (`apps/web/src/app/api/proposals/[id]/approve/route.ts:99-129`).
- Contract generation marks proposal `CONVERTED`, but no budget impact (`apps/web/src/app/api/contracts/from-proposal/route.ts:214-235`).

Constraint:

The server summary must define commitment source status exactly. Recommended narrow rule:

- Count provider-backed `Proposal.status in (ACCEPTED, CONVERTED)` as committed if no contract exists yet.
- Prefer the linked `Contract` once created.
- Exclude draft/sent/rejected/expired proposals from committed, but optionally expose sent/provider-backed proposal totals as `pendingProposalExposureCents` if Atlas wants risk-before-acceptance.
- Use `Proposal.totalCents` as the base commitment until a contract amount model exists.

### R4 — Change-order approval has no financial side effect beyond the ChangeOrder row

Risk: Approved change orders can exist without changing any amount the user or admin sees. Pending change orders also cannot be surfaced as risk.

Evidence:

- `ChangeOrder` stores `deltaCents` and status only (`apps/web/prisma/schema.prisma:732-743`).
- Approval only updates `status` and `approvedAt` and records activity (`apps/web/src/server/routers/contract.ts:398-418`).
- Contract detail does not render change orders (`apps/web/src/components/contracts/ContractPageClient.tsx:173-330`).

Constraint:

Do not mutate existing proposal totals, milestone amounts, Stripe payment intents, payout records, or escrow balance automatically when approving a change order unless Atlas explicitly assigns payment workflow work. For W3 closure, first make approved and pending change-order deltas visible in the financial summary and contract detail, and block any payment/payment-plan assumptions that ignore approved deltas.

Minimum server rules:

- Pending change orders count as `pendingChangeOrderDeltaCents` risk/exposure, not committed owed.
- Approved change orders count as committed exposure.
- Rejected change orders are excluded but remain visible in contract history.
- Approval should be idempotent; approving an already approved row must not duplicate impact if a ledger model is introduced.

### R5 — Change-order authorization is structurally under-specified

Risk: Current approval allows buyer or seller by `contract.buyerId`/`sellerId` equality to `user.id`, but those fields are populated as organization ids in `contracts/from-proposal`.

Evidence:

- Contract generation sets `buyerId = proposal.event.orgId` and `sellerId = listing.orgId` (`apps/web/src/app/api/contracts/from-proposal/route.ts:209-225`).
- `approveChangeOrder` checks `(changeOrder.contract as any).buyerId === user.id` or `sellerId === user.id`, then `canManageEvent` (`apps/web/src/server/routers/contract.ts:388-392`).

Risk detail:

This mismatch means seller-side user approval likely fails unless a contract was created elsewhere with user ids. Buyer-side planner/admin may still approve via `canManageEvent`, but vendor/venue approval is not reliably available despite the comment claiming buyer/seller authorization.

Constraint:

Before exposing change-order approval in UI, normalize the contract party identity rule. Either:

- rename/use `buyerOrgId` and `sellerOrgId` semantics and check org membership, or
- change persistence to user ids and keep org ids separately.

Do not ship seller-side change-order approval until this identity mismatch is fixed and tested.

### R6 — ChangeOrder lacks approver/audit data needed for payment credibility

Risk: `approvedAt` alone is too thin for later disputes, admin review, and payment-impact justification.

Evidence:

- `ChangeOrder` has no `createdById`, `approvedById`, `rejectedAt`, `rejectedById`, `approvalSide`, or `currency` (`apps/web/prisma/schema.prisma:732-743`).
- Activity meta records approval actor/action separately (`apps/web/src/server/routers/contract.ts:403-418`), but the ChangeOrder row itself cannot answer who approved or from which side.

Constraint:

If W3 requires change-order impact to influence budget/payment risk, the implementation must keep an immutable activity/audit trail and expose the approving actor/side. If schema change is deferred, the read model must join Activity records and label approval provenance as partial, not authoritative.

### R7 — Paid/held/owed formula is currently ambiguous

Risk: Different surfaces could count the same money differently. `PaymentIntent.amountCents`, `Transaction.totalAmountCents`, `PaymentMilestone.amountCents`, `EscrowAccount.balanceCents`, and `Payout.amountCents` do not all mean the same thing.

Evidence:

- Payment intent stores buyer-paid milestone amount, status, and Stripe id (`apps/web/prisma/schema.prisma:794-814`).
- Confirmation sets milestone `IN_ESCROW`, increments escrow balance, creates `Transaction`, and may transition contract to `IN_PAYMENT` (`apps/web/src/lib/payments/confirm-payment.ts:250-330`).
- Release flow is platform-admin-gated and handles payout/refund/dispute/holdback risk separately (`apps/web/src/app/api/payments/release-milestone/route.ts:111-240`).
- Payment panel locally labels Payable/Held/Paid from milestones (`apps/web/src/components/payments/ContractPaymentPanel.tsx:49-54`, `183-203`, `231-270`).

Constraint:

Atlas/Forge must choose one canonical formula before adding W3 UI. Recommended guarded-MVP formula:

- `payableCents`: sum milestone amounts with status `PENDING` or `OVERDUE` on committed contracts.
- `heldCents`: sum milestone amounts with status `IN_ESCROW` plus active holdback context for explanation, not release.
- `paidCents`: sum milestone amounts with status `PAID` only after release/payout completion; do not equate `PaymentIntent.SUCCEEDED` with paid to provider.
- `owedCents`: committed approved obligation minus `heldCents` minus `paidCents`, with refund/dispute/holdback states surfaced as modifiers.
- `escrowAccount.balanceCents` should be a reconciliation check, not the only source of held funds.

### R8 — Admin/planner risk visibility does not query W3 exposure

Risk: Even if a budget page is improved, oversight remains incomplete unless planner/admin surfaces receive the same server-derived risk.

Evidence:

- Admin overview queries trust/payment/admin ops counts, not event-level budget exposure (`apps/web/src/app/(app)/admin/overview/page.tsx:106-163`).
- Pro planner vault budget metrics are actual/planned from budget lines and payment counts separately (`apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:301-303`, `339-440`, `728-730`).
- Event overview budget used card is only actual/planned (`apps/web/src/app/(app)/events/[eventSlug]/page.tsx:40-65`).

Constraint:

Financial risk must be server-derived once and consumed by:

- canonical budget page;
- event overview/vault budget cards;
- planner risk/blocked lists;
- admin overview/verification queue if overrun exceeds a defined threshold or pending change-order exposure exists.

Do not reimplement separate formulas per page.

### R9 — Currency and cents discipline must be explicit

Risk: Event budget currency, proposal currency, milestone currency, payment intent currency, and user/org settings could drift or render misleading summaries.

Evidence:

- Event has `budgetCurrency` nullable and default-like user/org settings exist (`apps/web/prisma/schema.prisma:159-182`, `291-315`).
- Proposal and payment records default to `USD` (`apps/web/prisma/schema.prisma:637`, `803`).
- Payment create-intent uses proposal currency for Stripe (`apps/web/src/app/api/payments/create-intent/route.ts:268-314`).

Constraint:

W3 summary must fail closed or clearly label partial if event/proposal/payment currencies differ. Do not add cross-currency arithmetic without an approved conversion source. Store/report integer cents only; format at the edge.

### R10 — Existing tests prove components/guards, not the W3 loop

Risk: A change could pass current tests while still leaving the W3 business loop broken.

Evidence:

- Budget table test only proves totals (`packages/ui/tests/BudgetTable.test.tsx:5-18`).
- Proposal/provider test proves approval guard and acceptance recording (`apps/web/tests/proposal-provider-handoff.test.tsx:116-169`).
- Payment readiness test proves local copy and disabled buttons (`apps/web/tests/payment-readiness-copy.test.tsx:68-92`).
- Contract router access test does not test add/approve change order mutations or budget impact (`apps/web/tests/contract-router-access.test.ts:1-147`).

Constraint:

W3 closure requires tests that build the full state graph and assert the server-derived summary:

1. event budget + budget lines;
2. accepted provider-backed proposal;
3. generated/signed contract;
4. pending and approved change orders;
5. pending/held/paid milestones;
6. overrun state;
7. admin/planner risk consumption;
8. forbidden access for unrelated users/vendors/clients where applicable.

## 5. Safe assumptions vs unsafe assumptions

Safe assumptions:

- It is safe to keep live payments/release outside W3 unless Atlas explicitly widens scope; current release/payment flows are guarded and belong more directly to Workflow 5.
- It is safe to treat BudgetLine as planned/actual allocation data for now.
- It is safe to derive W3 summary server-side from existing records before committing to a new table, as long as formula and source precedence are documented and tested.
- It is safe to expose pending change-order deltas as risk without changing actual payment obligations.

Unsafe assumptions:

- Unsafe to say W3 is closed because proposal, contract, payment, and budget components each exist.
- Unsafe to treat `PaymentIntent.SUCCEEDED` as provider paid; it currently means buyer payment confirmed/held, while release remains guarded.
- Unsafe to treat `Payout.PENDING` as owed or paid without a locked formula; payment-plan rows are not payment movement.
- Unsafe to mutate proposal totals, payment milestones, existing Stripe intents, or payout amounts automatically from change-order approval without a dedicated payment/legal/payment-readiness design.
- Unsafe to expose seller-side change-order approval using current `buyerId`/`sellerId` semantics without fixing org/user identity mismatch.
- Unsafe to aggregate across mixed currencies.

## 6. Narrow implementation constraints for Atlas/Forge

Recommended backend shape:

1. Add a server-only financial summary helper, e.g. `getEventFinancialSummary(eventId, actor)` or equivalent route/query, with one source-of-truth formula for W3.
2. Return a typed object with explicit fields: `budgetTotalCents`, `plannedCents`, `actualCents`, `committedCents`, `pendingProposalExposureCents`, `pendingChangeOrderDeltaCents`, `approvedChangeOrderDeltaCents`, `payableCents`, `heldCents`, `paidCents`, `owedCents`, `remainingCents`, `overrunCents`, `riskLevel`, `currency`, `warnings`, and `sourceBreakdown`.
3. Enforce event access with existing `canViewEvent`/`canViewBudget` for budget/planner surfaces; admin overview can aggregate only through admin-only route/server component code.
4. Keep seller/provider contract visibility via `canViewCommercialContract`, but do not give vendors/venues full event-budget access by default.
5. Fix change-order party authorization before UI exposure. Use organization membership if `buyerId`/`sellerId` remain organization ids.
6. Make change-order approval idempotent and never duplicate ledger impact.
7. Do not perform live Stripe, payout, billing, env, credential, production, or public exposure work for W3.
8. Do not claim legal escrow/paid status beyond existing guarded wording; use “held pending review” and “paid/released” only when the backing state is exact.
9. Add activity/audit evidence for any budget-impact event introduced by implementation.
10. Add focused unit/integration tests around the helper and permission matrix before browser/Preview proof.

Recommended minimum acceptance tests:

- `event-financial-summary.test.ts`: planned/actual from budget lines; accepted/converted proposal becomes committed; sent/draft/rejected excluded or listed as pending exposure by rule.
- `event-financial-summary-change-orders.test.ts`: pending CO appears as risk, approved CO changes committed exposure once, rejected CO excluded.
- `event-financial-summary-payments.test.ts`: payable/held/paid/owed derived from milestone statuses and does not confuse held funds with provider-paid funds.
- `event-financial-summary-permissions.test.ts`: planner/owner/admin can view appropriate summaries; unrelated user blocked; vendor/seller can see contract-specific change-order state without full event budget unless explicitly permitted.
- Admin/planner surface tests that consume the same helper and show overrun/change-order risk.

## 7. Partial closure warning

Atlas should not accept any W3 implementation that only:

- adds totals to `BudgetTable`;
- adds a red overrun label based only on actual/planned budget lines;
- displays change orders on contract detail without feeding the event financial summary;
- counts accepted proposal totals in one UI surface but not admin/planner risk;
- marks buyer-confirmed funds as paid to provider;
- relies on client-side/in-memory budget calculations for canonical state;
- skips RBAC tests for financial summary and change-order approval.

Those would be component proof, not workflow proof.

## 8. Recommended next action for Atlas

Route Forge a narrow W3 backend-first implementation card before UI polish:

Build and test a canonical event financial summary/read model plus change-order authorization cleanup. Then wire the summary into Budget, planner risk, and admin risk surfaces. Keep payment movement and live Stripe changes out of scope; only read existing guarded payment states.

No founder escalation is required for this read-only map or for a guarded read-model implementation. FOUNDER ESCALATION REQUIRED before live payments, production data mutation, billing/Stripe settings changes, public Preview/domain exposure, legal/escrow claims, cross-currency conversion policy, or any automatic change-order mutation of existing payment intents/payouts.
