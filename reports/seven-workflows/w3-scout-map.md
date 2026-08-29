# W3 Scout Map — Budget + Change Orders full user workflow

Date: 2026-08-28
Task: t_d5100147
Inspector: Scout
Verdict: BROKEN

## 1. Scope inspected

Read-only product/UX map for Workflow 3: Budget + Change Orders.

Required business loop:

budget -> planned/actual/committed/paid/owed -> proposal/change-order impact -> overrun warning -> risk visibility

Acceptance target:

Budget is not just a table; it explains financial state and overrun risk.

Guardrails honored:

- No production, env, credential, billing, infra, domain, public exposure, live payment, or destructive DB changes.
- No source-code edits were made.
- This report is the only deliverable file added for this task.

## 2. Evidence reviewed

Code/routes:

- `apps/web/src/app/(app)/events/[eventSlug]/budget/page.tsx`
- `packages/ui/src/components/BudgetTable.tsx`
- `apps/web/src/server/routers/budget.ts`
- `apps/web/prisma/schema.prisma`
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx`
- `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx`
- `apps/web/src/app/(app)/events/[eventSlug]/page.tsx`
- `apps/web/src/components/panes/BudgetPane.tsx`
- `apps/web/src/lib/budget.util.ts`
- `apps/web/src/components/panes/ProposalsPane.tsx`
- `apps/web/src/components/panes/ContractsPane.tsx`
- `apps/web/src/server/routers/proposal.ts`
- `apps/web/src/server/routers/contract.ts`
- `apps/web/src/components/proposals/ProposalPageClient.tsx`
- `apps/web/src/components/contracts/ContractPageClient.tsx`
- `apps/web/src/components/payments/ContractPaymentPanel.tsx`
- `apps/web/src/app/(app)/admin/overview/page.tsx`

Tests/evidence:

- `packages/ui/tests/BudgetTable.test.tsx`
- `packages/types/tests/budget.test.ts`
- `apps/web/src/lib/__tests__/budget-allocation.test.ts`
- `apps/web/tests/pro-planner-event-workspace-polish.test.tsx`
- `apps/web/tests/payment-readiness-copy.test.tsx`
- `apps/web/tests/contract-readiness-clarity.test.tsx`
- Existing Preview/runtime reports under `reports/stabilization/` and `reports/preview/`

## 3. Confirmed current workflow map

### A. Budget setup / display

Confirmed:

- Event records have `budgetCents`, `budgetRaw`, `budgetMin`, `budgetMax`, `budgetCurrency`, and `budgetLines` relations in Prisma (`apps/web/prisma/schema.prisma:291-339`, `445-455`).
- The canonical event budget route renders only persisted budget lines and shows planned/actual/variance via `BudgetTable` (`apps/web/src/app/(app)/events/[eventSlug]/budget/page.tsx:18-55`, `packages/ui/src/components/BudgetTable.tsx:5-41`).
- The empty budget route says budget lines will appear “once budget lines are added,” but gives no in-flow creation path (`apps/web/src/app/(app)/events/[eventSlug]/budget/page.tsx:45-49`).
- The server budget router can create/update/delete/list `BudgetLine` records with view/edit permission checks (`apps/web/src/server/routers/budget.ts:7-47`).

Missing user-flow evidence:

- I did not find a visible canonical UI path on `/events/[eventSlug]/budget` to create/edit/delete budget lines despite the router existing.
- The budget route does not show total event budget, remaining against `event.budgetCents`, committed, paid, owed, proposal impact, change-order impact, or overrun warnings.

### B. Planned / actual / committed / paid / owed state

Confirmed:

- Persisted `BudgetLine` stores only `plannedCents` and `actualCents` (`apps/web/prisma/schema.prisma:445-455`).
- `BudgetTable` renders planned, actual, and variance only (`packages/ui/src/components/BudgetTable.tsx:14-38`).
- Event overview and role-specific vault budget cards calculate budget used as `actual / planned` from budget lines (`apps/web/src/app/(app)/events/[eventSlug]/page.tsx:40-65`; `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:301-303`, `930-934`; `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx:201-203`, `286-297`).
- Pro Planner event workspace separately exposes payment counts: funded payment count, open payment intent count, and pending payment-plan milestone count (`apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1272-1295`).
- `ContractPaymentPanel` has local payment labels for payable now, held pending review, and paid (`apps/web/src/components/payments/ContractPaymentPanel.tsx:183-203`).

Gap:

- These money concepts are split across Budget, Payments, Proposal, Contract, and Admin surfaces. There is no single user-facing budget ledger that reconciles:
  - planned budget;
  - actual spend;
  - committed accepted/contracted amount;
  - paid amount;
  - held/escrow-like guarded amount;
  - still owed/payable amount.

User-facing result:

A planner can see a budget table and can separately see payment readiness, but cannot answer “what is committed, paid, still owed, and whether this change pushes us over budget” from the budget page.

### C. Proposal impact on budget

Confirmed:

- Canonical persisted proposals have `totalCents` and payment milestones (`apps/web/prisma/schema.prisma:626-682`).
- The proposal detail page shows pricing breakdown and payment schedule (`apps/web/src/components/proposals/ProposalPageClient.tsx:139-181`).
- The Pro Planner event workspace lists proposals and statuses in the commercial spine (`apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1192-1222`).
- `proposalRouter.accept` updates a provider-backed proposal to `ACCEPTED`, creates a contract, and creates an escrow account (`apps/web/src/server/routers/proposal.ts:167-196`).

Gap:

- Accepting a canonical provider-backed proposal does not update or create budget lines, a committed budget total, or a budget-impact record.
- The event budget page does not query proposals, accepted proposals, contracts, milestones, payment intents, payouts, or escrow accounts. It only includes `budgetLines` (`apps/web/src/app/(app)/events/[eventSlug]/budget/page.tsx:18-31`).
- The client-only `BudgetPane` can compute projected amounts from local in-memory `event.proposals`, but it belongs to the older pane/cockpit model and not the canonical persisted budget route (`apps/web/src/components/panes/BudgetPane.tsx:52-55`; `apps/web/src/lib/budget.util.ts:38-64`).

User-facing result:

After proposal acceptance, the commercial workflow can advance to contract/payment readiness, but the budget page will not visibly explain the newly committed proposal impact. Users must revisit proposal and budget pages manually and do the math themselves.

### D. Change order impact

Confirmed:

- Prisma has `ChangeOrder` with `deltaCents`, `status`, and `approvedAt` (`apps/web/prisma/schema.prisma:732-743`).
- `contractRouter.addChangeOrder` creates a change order and records activity (`apps/web/src/server/routers/contract.ts:295-357`).
- `contractRouter.approveChangeOrder` marks a change order approved and records activity (`apps/web/src/server/routers/contract.ts:359-420`).
- `contractRouter.get` includes `changeOrders` (`apps/web/src/server/routers/contract.ts:50-80`).

Gaps:

- I did not find a visible page/component that lists, adds, or approves change orders for a contract user.
- Contract detail UI does not render `changeOrders` or expose a change-order action (`apps/web/src/components/contracts/ContractPageClient.tsx:173-330`).
- Change-order approval does not update contract value, proposal total, payment milestones, payment intents, or any budget/committed/owed figure.
- Budget pages and role vault budget summaries do not include approved or pending change-order deltas.

User-facing result:

Change orders exist as backend mutations/model state, but the user-facing workflow is effectively absent. A planner cannot see “CO #2 adds $1,200, now projected over budget by $900” from Budget, Contract, or Admin.

### E. Overrun warning

Confirmed:

- The old client `BudgetPane` colors remaining red when `remaining < 0` (`apps/web/src/components/panes/BudgetPane.tsx:77-81`).
- Role vault cards color the budget amount amber/red when `actual / planned` exceeds 75%/90% (`apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:728-734`; `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx:286-297`).

Gaps:

- The canonical budget page has no explicit overrun warning copy or risk explanation.
- The role vault budget card treats >90% used as “Blocked” in Pro Planner workspace, but it is based only on actual/planned budget lines, not committed accepted proposals, payment schedule, owed balance, or change orders (`apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:728-734`).
- No inspected test proves a budget overrun warning appears after accepted proposal or approved change-order impact.

User-facing result:

OneHub can signal high actual-vs-planned usage in one role workspace, but not the required business-loop risk: planned + committed + change-order deltas exceeding budget before payment or event execution.

### F. Admin/planner risk visibility

Confirmed:

- Admin overview surfaces trust/risk, payments needing oversight, support operations, execution accountability, and crisis risk (`apps/web/src/app/(app)/admin/overview/page.tsx:147-184`, `206-218`).
- Pro Planner workspace has a commercial spine and risk/sidebar block list for blocked commerce-spine steps (`apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:399-451`, `551-553`, `1414-1423`).

Gaps:

- Admin overview has no budget-overrun metric, no event financial exposure list, and no change-order risk count.
- Planner risk list does not include budget-specific exposure except blocked commerce-spine steps and a `Budget overview` card based on actual/planned lines.
- There is no cross-role risk narrative that says a pending/approved change order or accepted proposal pushed an event over budget.

User-facing result:

Risk visibility exists for trust/payment/task/crisis queues, but not for W3 budget + change-order financial exposure. Atlas/Sentinel would likely revisit this because the risk is not visible where oversight happens.

## 4. Exact missing UX/user-flow gaps that would cause revisits

1. No closed budget creation/editing loop on the canonical budget route.
   - Evidence: `/events/[eventSlug]/budget` renders the table/empty state only; budget create/update/delete router exists separately.
   - Impact: users can land on an empty budget page and cannot start the budget workflow from that page.

2. Budget page is a planned/actual table, not a financial-state explanation.
   - Evidence: `BudgetTable` columns are Category, Label, Planned, Actual, Variance.
   - Impact: user cannot see committed, paid, owed, held, or payable state from the Budget surface.

3. Accepted proposals do not visibly affect budget.
   - Evidence: `proposalRouter.accept` creates contract + escrow and marks proposal accepted, but no budget update or budget-impact ledger is created.
   - Impact: after approval, users must manually reconcile proposal total against budget.

4. Change order UX is not user-facing.
   - Evidence: backend mutations/model exist, but `ContractPageClient` does not render change orders or action controls.
   - Impact: users cannot create, approve, review, or understand change-order deltas in the visible contract/budget flow.

5. Change order approval does not feed committed/owed/budget risk.
   - Evidence: approval updates only `ChangeOrder.status` and `approvedAt`; no budget, contract value, proposal total, payment milestone, or risk update is visible.
   - Impact: approved scope changes do not change the financial picture users rely on.

6. Overrun warning is incomplete and surface-fragmented.
   - Evidence: old `BudgetPane` red text and Pro Planner `Budget overview` status use only projected/actual or actual/planned; canonical budget page has no explicit warning.
   - Impact: a user may accept a proposal or change order that exceeds budget without a clear warning before/after the decision.

7. Payment state is separate from budget state.
   - Evidence: payment readiness lives in contract/payment components; budget page does not query payment milestones/intents/payouts.
   - Impact: users can see “Paid” inside payment schedule but not “paid/owed vs budget” where they expect financial planning.

8. Admin risk visibility excludes budget exposure.
   - Evidence: admin overview counts disputes/refunds/holdbacks/payouts/abuse/tasks/crisis, not budget overruns or change-order exposure.
   - Impact: oversight cannot catch event-level overrun risk without manual inspection.

9. Role parity is inconsistent.
   - Evidence: Pro Planner has a richer event workspace including Budget, Payments, and commercial spine; DIY/legacy routes have simpler budget/payment summaries and less closed-loop structure.
   - Impact: the same financial state may be understandable for one role but incomplete for another.

10. Test coverage proves components/guards, not the W3 business loop.
   - Evidence: budget tests cover table totals and variance; payment/contract tests cover payment-readiness copy; no inspected test ties budget -> proposal acceptance -> change order -> overrun warning -> admin/planner visibility.
   - Impact: regressions in the W3 full workflow would not be caught by current tests.

## 5. User-facing impact

Current OneHub can show pieces of the W3 workflow:

- budget lines with planned/actual variance;
- provider-backed proposal detail and acceptance gates;
- contract signature/payment readiness gates;
- backend change-order records;
- admin trust/payment/task/crisis queues;
- Pro Planner commercial-spine state.

But W3 is still broken as a full user workflow because the pieces do not reconcile into one financial story.

A planner/client/admin still cannot reliably answer:

- What is the total approved event budget?
- What was planned by category?
- What is committed by accepted proposal/contract?
- What has actually been paid or held?
- What remains owed?
- Which pending or approved change order changes the committed amount?
- Did this proposal/change order push the event over budget?
- Where does admin see that overrun risk?

That is exactly the revisit risk: users will keep jumping between Budget, Proposals, Contracts, Payments, and Admin trying to reconstruct one financial truth.

## 6. Verdict

BROKEN

Reason: W3 has useful component-level pieces, but the required business loop is not closed. Budget remains mostly a planned/actual table; change orders are not visible as a user-facing flow; proposal/change-order impacts do not reconcile into committed/paid/owed state; and overrun/admin risk visibility is incomplete.

## 7. Narrow next action for Atlas

Route Forge a narrow W3 implementation card to create a canonical event financial summary/ledger that feeds both Budget and role/admin risk surfaces.

Minimum acceptance for that Forge card:

1. `/events/[eventSlug]/budget` shows total budget, planned, actual, committed, paid/held, owed/payable, remaining, and overrun state.
2. Accepted provider-backed proposals contribute to committed amount without requiring manual math.
3. Contract change orders are visible on contract detail, can be added/approved only by allowed roles, and approved/pending deltas are visible in the budget summary.
4. Overrun warning appears when budget + committed + approved/pending change-order deltas exceed budget.
5. Planner event workspace and Admin overview expose budget/change-order risk in their risk cards/lists.
6. Tests cover the full W3 loop: budget -> accepted proposal -> contract/change order -> committed/owed/paid summary -> overrun risk -> admin/planner visibility.

FOUNDER ESCALATION REQUIRED only if Atlas wants live-payment behavior, production data mutation, billing/Stripe settings changes, public Preview/domain exposure changes, or legal/payment-readiness claims beyond the existing guarded MVP wording.
