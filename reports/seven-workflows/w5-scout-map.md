# W5 Scout Map — Contracts + Payments + Trust Full User Workflow

Task: `t_f071ffc3`
Lane: Scout read-only product/UX inspection
Date: 2026-08-28
Verdict: PARTIAL

## 1. Scope inspected

Workflow 5 business loop:

`provider-backed proposal -> accepted -> contract generated -> signatures complete -> payment readiness shown -> payment blocked/released only under guardrails -> refund/dispute/holdback/admin review states visible -> no fake live-money claims`

Inspection was read-only except for this report file. No production, environment, credential, billing, Stripe, domain, legal, public-launch, or database state was changed.

## 2. Evidence reviewed

### Planning / workflow requirement evidence

- `docs/plans/2026-08-28-seven-pain-points-full-workflow-completion-plan.md`
  - Lines 70-75 define W5 acceptance as a full commercial spine, not component proof.
  - Lines 13-28 define full-workflow completion requirements: start from correct role surface, complete action, related parties/admin visibility, persistence, permissions, tests, Preview smoke, Sentinel.

### Prior payment/legal/source evidence

- `reports/strategy/ONEHUB_PAYMENT_LEGAL_READINESS_CONTROL_MAP_2026-08-27.md`
  - Confirms guarded-MVP payment primitives, refund/dispute/holdback/admin review surfaces, and legal-copy limitations.
  - Important residual public-claim blockers include payment/payout readiness separation, persisted Connect readiness, evidence-backed dispute/refund decisions, named finance/legal authority, and avoiding public legal readiness claims.
- `reports/stabilization/ONEHUB_PHASE1_COMMERCIAL_TRUST_SPINE_PROOF_2026-08-27.md`
  - Confirms local/source proof for provider-backed evidence gates through request -> proposal -> contract -> payment-readiness.
  - Confirms targeted trust-spine tests, full tests, typecheck, lint, and build had passed in prior proof, with Preview then blocked by protected deployment access.

### Current code/routes inspected

- Provider/proposal route and UI:
  - `apps/web/src/app/(app)/proposals/[id]/page.tsx`
  - `apps/web/src/components/proposals/ProposalPageClient.tsx`
  - `apps/web/src/components/panes/ProposalsPane.tsx`
- Contract/signature/payment route and UI:
  - `apps/web/src/app/(app)/contracts/[id]/page.tsx`
  - `apps/web/src/components/contracts/ContractPageClient.tsx`
  - `apps/web/src/components/panes/ContractsPane.tsx`
  - `apps/web/src/components/payments/ContractPaymentPanel.tsx`
  - `apps/web/src/components/payments/PaymentModal.tsx`
- Payment planning / payout routes and UI:
  - `apps/web/src/app/(app)/events/[eventSlug]/milestones/page.tsx`
  - `apps/web/src/components/payments/PaymentPlanPageClient.tsx`
  - `apps/web/src/components/payments/PaymentPlanActions.tsx`
  - `apps/web/src/components/payments/ProPlannerPaymentPanel.tsx`
  - `apps/web/src/components/payments/VendorPaymentPanel.tsx`
  - `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx`
  - `apps/web/src/app/(app)/billing/payouts/page.tsx`
- Admin trust/review routes:
  - `apps/web/src/app/(app)/admin/verification/page.tsx`
  - `apps/web/src/app/(app)/admin/verification/refunds/[id]/page.tsx`
  - `apps/web/src/app/(app)/admin/verification/disputes/[id]/page.tsx`
  - `apps/web/src/app/(app)/admin/verification/holdbacks/[id]/page.tsx`
  - `apps/web/src/app/(app)/admin/verification/payouts/[id]/page.tsx`
  - `apps/web/src/app/(app)/disputes/page.tsx`
- Server/action guardrail routes:
  - `apps/web/src/app/api/payments/create-intent/route.ts`
  - `apps/web/src/app/api/payments/confirm/route.ts`
  - `apps/web/src/app/api/payments/release-milestone/route.ts`
  - `apps/web/src/app/api/refund-requests/route.ts`
  - `apps/web/src/server/routers/dispute.ts`

### Current tests inspected

- `apps/web/tests/contract-readiness-clarity.test.tsx`
- `apps/web/tests/payment-readiness-copy.test.tsx`
- `apps/web/tests/payment-e2e-route-safety.test.ts`
- `apps/web/tests/payment-release-guardrails.test.ts`
- `apps/web/tests/payment-refund-review-effects.test.ts`
- `apps/web/tests/payment-auto-build-provider-evidence.test.ts`
- `apps/web/tests/contract-from-provider-backed-proposal.test.ts`

### Preview evidence inspected

- `reports/preview/ONEHUB_PROTECTED_PREVIEW_RUNTIME_SMOKE_2026-08-28.md`
- `reports/preview/ONEHUB_PROTECTED_PREVIEW_RESMOKE_F0497A8_2026-08-28.json`
- `reports/preview/ONEHUB_PROTECTED_PREVIEW_FINAL_SMOKE_AA6694D_2026-08-28.json`

Final Preview smoke evidence shows protected Preview health/auth and core role dashboards loaded with no recorded route failures. It does not prove the full W5 transaction loop by itself because it did not walk a live seeded proposal -> contract -> signature -> payment -> refund/dispute/holdback/admin path.

## 3. Confirmed coherent surfaces

### A. Provider-backed proposal gating is visible and source-backed

Confirmed:

- Proposal detail computes `isProviderBacked` from listing context plus provider-submitted evidence and labels proposals as either `Provider-backed proposal — vendor-ready` or `Draft/generated/listing-backed proposal — not provider-backed` in `ProposalPageClient`.
- Approval is locked unless proposal status is `SENT` and provider-backed evidence exists.
- Contract generation is shown only for accepted/converted proposals; non-provider-backed proposals get locked explanatory copy.
- Pro Planner event workspace counts only provider-backed proposals as vendor-ready/confirmed and says planner/listing-backed drafts are not vendor-ready.

User-facing impact:

- This reduces false confidence. A planner is less likely to mistake an AI/planner-generated proposal for provider agreement.

### B. Contract signature/payment readiness copy is clear at the detail page

Confirmed:

- Contract detail shows a readiness card with current status, who signs next, and the payment gate.
- Payment entry appears only when `canEnterPayment`, payable contract state, and provider-backed accepted/converted proposal state are true.
- Tests confirm payment entry is hidden for partial signatures and for fully signed contracts lacking provider-backed accepted proposal state.

User-facing impact:

- The detail page gives users a clear reason payment is unavailable and avoids fake payment-readiness claims.

### C. Guarded payment collection copy is careful

Confirmed:

- `ContractPaymentPanel` uses `Guarded payment readiness`, not live-payment/payout-ready copy.
- It requires a payment acknowledgment checkbox before payment actions.
- It says funds are not marked paid until Stripe confirmation is persisted and release remains subject to manual review, holdbacks, refunds, disputes, and provider payout configuration.
- `PaymentModal` says release to provider remains gated and its submitted state says held-funds status was updated, not that public escrow or legal approval occurred.

User-facing impact:

- Buyer-side users are told what they are authorizing and what still remains manual/trust-gated.

### D. Server guardrails have meaningful coverage

Confirmed:

- `create-intent` requires buyer-side auth, payable contract state, accepted/converted provider-backed proposal state, provider-submitted evidence, current payment terms acceptance, and server-derived amount.
- `confirm` now routes through `applyConfirmedPaymentIntent`, closing the prior split-path concern noted in the Steward control map.
- `release-milestone` requires admin/manual authority, admin override acceptance, in-escrow state, no blocking refund/dispute/holdback, Stripe configured, seller Stripe Connect account present, and transfer evidence before local paid/SENT state finalization.
- Tests cover refund/dispute/holdback blockers, missing Connect account, escrow debit safety, transfer failure, idempotency, and canonical release metadata.

User-facing impact:

- The current implementation is materially safer than a fake checkout demo. It can explain blocked states instead of pretending money moved.

### E. Admin verification surface exists

Confirmed:

- Admin verification index lists refunds, disputes, holdbacks, payouts, and override history.
- Detail pages expose summary state plus JSON evidence blocks for fee profile, acceptance proof, refund/dispute/holdback/payout state, override history, and legal version references.

User-facing impact:

- Admins have a place to reconstruct trust state when a payment, refund, dispute, or holdback creates a revisit.

## 4. Missing UX / user-flow gaps that would cause revisits

### Gap 1 — Legacy `/proposals/[id]/fund` is a fake/dead-end payment route

Evidence:

- `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx` renders `Fund Held Funds` and text: `Stripe Elements payment form would be embedded here.`
- It loads the proposal directly and computes pending milestone amount, but it does not show the guarded payment acknowledgment, provider-backed evidence lock, signature gate, Stripe configuration error state, refund/dispute/holdback context, or role-aware return path used by `ContractPaymentPanel`.
- It does not call `canViewCommercialProposal`, `canViewCommercialContract`, or buyer-side payment readiness logic before presenting the funding surface.

User-facing impact:

- A user who lands on or bookmarks this route sees a placeholder/fake payment promise outside the canonical signed-contract payment flow. This is the clearest W5 revisit risk because it contradicts the otherwise careful guarded-payment UX.

Narrow correction:

- Remove or redirect `/proposals/[id]/fund` to the canonical contract detail payment entry when a contract exists; otherwise show an explicit locked state: provider-backed proposal accepted + contract generated + both signatures required. Do not leave a placeholder Stripe form route.

### Gap 2 — Payment plan UI is exposed through an event `milestones` route, not a clearly named payment route

Evidence:

- `apps/web/src/app/(app)/events/[eventSlug]/milestones/page.tsx` renders `PaymentPlanPageClient`.
- `PaymentPlanPageClient` labels the page `Payments & Held Funds`, but the route path is `/events/[eventSlug]/milestones`.
- Pro Planner selected-event workspace has a `Payments` anchor (`#workspace-payment-detail`) but no deep link to the full payment plan page from that card; the old route name makes the location hard to rediscover.

User-facing impact:

- Planners can see payment readiness counts in the event workspace but may not know where to manage the payment/deposit/payout plan later. The path name says milestones while the page says payments, creating route-memory friction.

Narrow correction:

- Add/alias a clear `/events/[eventSlug]/payments` route or add a direct `Open payment plan` action from the selected-event Payment card to the existing route while preserving backwards compatibility.

### Gap 3 — Payment planning copy still contains stronger-than-guarded claims

Evidence:

- `PaymentPlanPageClient` says `Clients fund held funds pending release. Planners allocate payouts to vendors. OneHub earns a fee on releases.`
- It shows `Released to Vendor` and `Payments completed` for SENT payouts.
- It also says `Stripe Connect held funds pending release coming next.`
- These statements are less careful than `ContractPaymentPanel`, which says release remains manual-review gated and avoids public escrow/legal approval claims.

User-facing impact:

- A planner/admin can leave the canonical contract page and see stronger payment language on the payment-plan page. That can trigger later copy/legal/payment revisits because users may interpret planning/release rows as actual provider payment guarantees.

Narrow correction:

- Align payment-plan copy with the guarded terminology: `Payment planning / held-funds review`, `Release recorded after admin review`, `Provider payout recorded only with transfer evidence`, and a persistent note that this is private-pilot/test-mode readiness unless Stripe transfer evidence exists.

### Gap 4 — Provider/vendor dashboards do not show why payout/payment is blocked

Evidence:

- `VendorPaymentPanel` shows Total, Funds Held, Paid, and a `Mark Complete` action when milestones are `IN_ESCROW`.
- Empty state says `No payments pending at this time.`
- It does not show whether Connect is missing, release is blocked by refund/dispute/holdback, admin review is pending, or what action the provider can safely take next.
- `ProPlannerPaymentPanel` includes `Release Payment` and `Copy Payment Link` actions, but the visible card copy does not surface refund/dispute/holdback/Connect blockers before the action.

User-facing impact:

- Providers will revisit or ask support why held funds are not released after marking work complete. Planners may try a release action without seeing the current trust blocker until an API error appears.

Narrow correction:

- Add provider/planner payment status explanations near each held milestone: `waiting on buyer payment`, `held for admin review`, `blocked by refund request`, `blocked by dispute`, `blocked by holdback`, `provider payout setup needed`, or `ready for admin release`.

### Gap 5 — Refund/dispute creation is ID-driven and detached from the contract/payment detail flow

Evidence:

- `/disputes` contains a refund form that asks users to manually enter `Proposal ID`, optional `Milestone ID`, amount in cents, and reason.
- The route lists refund requests and disputes but does not provide a contextual `Request refund` or `Open dispute` action from a paid/held contract milestone in `ContractPaymentPanel` or `PaymentModal`.
- `disputeRouter.create` exists, but the inspected user-facing `/disputes` page only shows refund submission; no comparable contextual dispute-start form was found in that route.

User-facing impact:

- A client/planner who sees a held or paid milestone must know/copy internal IDs to ask for review. That is a high-friction revisit source and increases wrong-proposal/wrong-milestone support risk.

Narrow correction:

- Add contextual `Request refund review` and `Open dispute` actions from contract/payment milestone rows, prefilled with proposal/milestone/payment IDs and human-readable labels. Keep copy explicit that these are review requests, not self-serve reversals.

### Gap 6 — Admin verification detail is evidence-rich but operator-hostile

Evidence:

- Admin detail pages primarily show JSON blocks for fee profile, acceptance proof, dispute/refund/holdback/payout state, override history, and legal version references.
- Refund/dispute/holdback review forms accept short free-text decision reasons; the UI does not require or guide structured evidence artifacts, party positions, before/after impact, or named approval authority.

User-facing impact:

- Admins can reconstruct data, but they must parse raw JSON and remember policy requirements. That causes repeated internal review and weakens trust evidence quality when a payout/refund/dispute decision is challenged.

Narrow correction:

- Add a human-first review summary above JSON: current blocker, affected parties, amount, proposed action, missing evidence, legal version, required authority, and irreversible side effects. Add fields/prompts for evidence links and party acceptance/refusal where applicable.

### Gap 7 — Event workspace payment card reports state but does not close the loop to admin review states

Evidence:

- Pro Planner event workspace has a `Payments / Held funds` section with funded/open-intent/pending-milestone counts and a locked-payment message.
- It does not surface counts for open refund requests, disputes, active holdbacks, or admin override/release review for the event.
- Admin verification has those records, but the planner event workspace does not point a user from payment risk to the relevant admin/manual-trust state.

User-facing impact:

- A planner can know payment is blocked without knowing whether the blocker is a refund, dispute, holdback, missing Connect setup, or admin queue item. That creates revisits between event workspace, admin verification, provider dashboard, and support.

Narrow correction:

- Add a read-only `Trust review state` row to the event payment card: refund requests, disputes, holdbacks, payout review, and provider payout setup status, with admin-only links to verification details.

### Gap 8 — Preview smoke proves route accessibility, not full W5 workflow completion

Evidence:

- Final Preview JSON confirms `/api/health`, auth providers, and core role routes loaded for Admin, Pro Planner, DIY Planner, Vendor, and Venue with `failures: []`.
- The Preview smoke did not inspect a concrete seeded W5 object through proposal acceptance, contract generation, buyer/seller signatures, guarded payment attempt/confirmation, refund/dispute/holdback, and admin verification review.

User-facing impact:

- Atlas/Sentinel can trust current Preview route health, but not full W5 workflow closure. Without object-level smoke, W5 can still regress in the handoffs where users revisit most.

Narrow correction:

- Add a protected Preview W5 smoke fixture/runbook that uses one seeded provider-backed proposal and walks exact read-only/guarded states across roles: planner proposal, provider evidence, contract, buyer signature, seller signature, payment locked/ready, refund/dispute/holdback/admin visibility. Do not move live money.

## 5. Assumptions / not proven in this inspection

- I did not use live Stripe or create payment/refund/dispute/payout records.
- I did not change source implementation files.
- I did not perform a browser-driven authenticated W5 object smoke because the task requested a map/report and Preview evidence already existed as redacted report artifacts.
- I did not verify production or public legal readiness; that remains out of scope and requires founder/legal/payment approval.

## 6. User-facing impact summary

The canonical proposal -> contract -> guarded payment detail path is substantially coherent and safer than prior placeholder/payment-demo flows. The main user revisit risk is not the core server guardrails; it is route and role continuity around the edges:

1. a fake legacy funding route still exists,
2. payment planning lives under a confusing `milestones` route,
3. payment-plan/provider dashboards use less precise blocked/review language,
4. refund/dispute starts require internal IDs instead of contextual actions,
5. admin review depends on raw JSON and free-text decisions,
6. Preview evidence is route-health proof, not W5 object-flow proof.

## 7. Verdict

PARTIAL

W5 has a credible guarded-MVP commercial spine in source and tests, but it is not yet a closed full user workflow. The user can understand many locked/ready states on the canonical proposal/contract/payment detail pages, but adjacent routes still create dead ends, terminology drift, and review-state gaps that would cause revisits.

## 8. Recommended next action for Atlas

Route Forge for a narrow UX/route-continuity W5 cleanup before Sentinel full workflow proof:

1. retire or redirect `/proposals/[id]/fund`,
2. add/alias a clear event payment-plan route or link,
3. align payment-plan/provider dashboard copy with guarded payment terminology,
4. add contextual refund/dispute entry points from contract/payment milestones,
5. add a concise admin trust-review summary above JSON evidence,
6. add planner-visible trust-review state to the event payment card.

Then route Sentinel to run a seeded protected Preview W5 object-flow smoke. FOUNDER ESCALATION REQUIRED before public legal/payment claims, live Stripe/payment movement, billing/Connect setting changes, production data changes, or public/domain exposure changes.
