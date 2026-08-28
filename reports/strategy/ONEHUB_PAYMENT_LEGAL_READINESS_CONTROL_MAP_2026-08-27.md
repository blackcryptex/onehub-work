# OneHub payment and legal readiness control map

Date: 2026-08-27
Owner lane: Steward
Scope: read-only backend/legal-control map for Stripe Connect, payment readiness definitions, refunds, holdbacks, payout/release review, dispute review, and public legal-page copy before any public launch claims.
Verdict: PARTIAL/RISK

## Scope reviewed

Assigned backend/data surfaces inspected:
- `apps/web/prisma/schema.prisma`
- `apps/web/src/server/lib/stripe.ts`
- `apps/web/src/server/routers/billing.ts`
- `apps/web/src/app/api/payments/create-intent/route.ts`
- `apps/web/src/app/api/payments/confirm/route.ts`
- `apps/web/src/app/api/payments/release-milestone/route.ts`
- `apps/web/src/app/api/stripe/webhook/route.ts`
- `apps/web/src/app/api/refund-requests/route.ts`
- `apps/web/src/lib/refund-request.ts`
- `apps/web/src/server/routers/dispute.ts`
- `apps/web/src/lib/dispute-case.ts`
- `apps/web/src/lib/holdback.ts`
- `apps/web/src/app/api/admin/holdbacks/route.ts`
- `apps/web/src/app/api/admin/holdbacks/verification/route.ts`
- `apps/web/src/app/(app)/admin/verification/actions.ts`
- `apps/web/src/app/api/payments/auto-build/route.ts`
- `apps/web/src/app/api/payments/plan/from-accepted-proposals/route.ts`
- `apps/web/src/app/api/payments/lines/route.ts`
- `apps/web/src/app/api/payments/lines/[id]/route.ts`
- `apps/web/src/lib/payments/payoutLock.ts`
- `apps/web/src/lib/payout-lock-helpers.ts`
- `apps/web/src/lib/payment-plan-helpers.ts`
- `apps/web/src/lib/paymentTerminology.ts`
- `apps/web/src/lib/legal-surface.ts`
- `docs/legal-exceptions-register.md`

Assigned UI/legal-copy surfaces inspected:
- `apps/web/src/app/(app)/billing/connect/page.tsx`
- `apps/web/src/components/payments/ContractPaymentPanel.tsx`
- `apps/web/src/components/payments/PaymentModal.tsx`
- `apps/web/src/app/(app)/admin/verification/page.tsx`
- `apps/web/src/app/(app)/admin/verification/refunds/[id]/page.tsx`
- `apps/web/src/app/(app)/admin/verification/payouts/[id]/page.tsx`
- `apps/web/src/app/legal/payments/page.tsx`
- `apps/web/src/app/legal/refunds/page.tsx`
- `apps/web/src/app/legal/disputes/page.tsx`
- `apps/web/src/app/legal/fees/page.tsx`
- `apps/web/src/app/terms/page.tsx`
- `apps/web/src/app/privacy/page.tsx`
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx`
- `apps/web/src/components/pro-planner/Dashboard.tsx`

No live Stripe, credentials, billing settings, legal claims, public-launch settings, or production state were touched. No source implementation files were changed by this task; this report is the intended artifact.

## Evidence examined

### Stripe Connect and seller payout readiness

`apps/web/prisma/schema.prisma` stores seller Stripe Connect identity as `Organization.stripeConnectAccountId String? @unique` and the migration `20260405123600_add_stripe_connect_account_id` enforces uniqueness. This is sufficient to remember which connected account belongs to an org, but it does not persist Stripe readiness snapshots, capability timestamps, disabled reasons, requirements, or onboarding refresh history.

`apps/web/src/server/routers/billing.ts` has protected Stripe Connect procedures:
- `connectOnboard` requires auth and `isOrgAdminOrOwner` before creating/reusing a Stripe Express account and saving `stripeConnectAccountId`.
- `connectStatus` requires auth and `isOrgAdminOrOwner`, then returns `chargesEnabled`, `payoutsEnabled`, and `detailsSubmitted` from Stripe.

`apps/web/src/app/(app)/billing/connect/page.tsx` restricts setup to users who are owner/admin members of `VENDOR` or `VENUE` organizations and labels the page as private-pilot readiness only. It says setup does not enable live charges, payouts, held-funds release, or payment movement without OneHub manual approval.

Risk/gap: payout readiness is currently read live from Stripe and displayed as `Ready` when `chargesEnabled && payoutsEnabled`. That is directionally safe for private pilot, but unsafe as a public-launch readiness claim unless the system also persists the Stripe account capability snapshot, reviewed-at timestamp, disabled/requirements state, and OneHub manual approval state. Public copy should not equate Connect capability flags alone with full OneHub payout readiness.

### Payment creation and payment readiness definition

`apps/web/src/app/api/payments/create-intent/route.ts` is the canonical payment-intent creation route. It requires an authenticated session, current payment legal-version acceptance, a buyer-side user, payable contract state (`FULLY_SIGNED` or `IN_PAYMENT`), accepted/converted provider-backed proposal state, provider listing context, provider-submitted evidence, and server-derived milestone amount. It creates a local `PaymentIntent`, records acceptance with `sourceSurface: "payment.checkout"`, then creates a Stripe PaymentIntent with metadata tying Stripe to local `contractId`, `proposalId`, `escrowAccountId`, `milestoneId`, payer/payee, `paymentIntentId`, booking classification, and fee profile.

`apps/web/src/components/payments/ContractPaymentPanel.tsx` correctly labels the user-visible state as `Guarded payment readiness`, requires a checkbox acknowledgment, links the payment legal page, and states that release remains subject to manual review, holdbacks, refunds, disputes, and provider payout configuration. It also states that held-funds status is internal readiness/review state, not a public escrow or legal approval promise.

Risk/gap: the route has a narrow buyer-side check: it requires `contract.buyerId === contract.event.orgId` plus event org owner/member. If contracts can represent buyer identity differently, valid buyer-side users can be blocked or an unsafe assumption can enter payment readiness. Before public claims, payment readiness should be defined as a named server predicate with explicit required facts: buyer authority, provider-submitted evidence, signed/current contract, accepted payment legal version, exact payable milestone amount, Stripe configured, Stripe intent created with matching metadata, and no public claim until confirmation is persisted.

### Payment confirmation and held-funds state

`apps/web/src/app/api/payments/confirm/route.ts` requires the authenticated payer, confirmable local payment state, Stripe reference, acceptance proof for `payment.<bookingClassification>`, Stripe configured, Stripe metadata matching the local payment record, Stripe amount/currency matching the fee profile total charge, and Stripe status `succeeded` before marking the local payment as `SUCCEEDED`. In one DB transaction it moves the milestone to `IN_ESCROW`, increments `EscrowAccount.balanceCents`, creates `Transaction`, evaluates holdback, may move contract to `IN_PAYMENT`, and records activity.

`apps/web/src/app/api/stripe/webhook/route.ts` verifies Stripe signature and webhook secret, reserves events in `WebhookEvent` for idempotency, and handles payment succeeded/failed events. It can also apply succeeded funding by updating payment intent, escrow account, milestone, and contract.

Risk/gap: payment confirmation has two success writers: `/api/payments/confirm` and the Stripe webhook. Both have idempotency checks, but the webhook path does not record acceptance checks, transaction rows, holdback evaluation, activity, fee profile, or Stripe metadata/amount matching at the same level as the explicit confirm route. Before public-launch payment claims, either the webhook succeeded handler should share the canonical confirmation function or be limited to status synchronization that cannot create a materially different money-state path.

### Refund controls

`apps/web/src/app/api/refund-requests/route.ts` and `billing.refundMilestone` create refund-review records, not immediate self-serve refunds. They require an authenticated user and event/org access before calling `createRefundRequest`.

`apps/web/src/lib/refund-request.ts` builds context from proposal, contract, milestone, payment intent, booking classification, fee profile, and latest acceptance proof. `reviewRefundRequest` requires guarded-MVP platform-admin authority, only reviews `OPEN` requests, disallows platform-fee override, disallows approved off-ledger goodwill refunds when `paymentIntentId` is null, reserves escrow balance before the Stripe refund call, uses a Stripe refund idempotency key, writes `MoneyTx`, updates the refund request, records audit, and records admin override.

`docs/legal-exceptions-register.md` allows full/partial refund deviations with finance/legal evidence and disallows off-ledger goodwill refunds. The implementation broadly matches this policy, with the current code using `PLATFORM_ADMIN` as the enforced authority until named role-splitting exists.

Risk/gap: refund request submission can request any positive `amountRequestedCents`; the actual balance check occurs at approval time. That is safe against immediate money movement, but public UI/copy should call it a request amount pending review, not an eligible refund amount. Refund approval also needs visible evidence fields beyond a free-text `decisionReason` if OneHub wants public/legal readiness rather than guarded internal review.

### Dispute controls

`apps/web/src/server/routers/dispute.ts` creates disputes only for authenticated org members/admins and records `DISPUTE_OPENED`. `apps/web/src/lib/dispute-case.ts` creates dispute records with booking classification, fee profile snapshot, optional acceptance capture, linked latest refund request, `status: "OPEN"`, and `freezeState: "FROZEN"`. `getBlockingDisputeCase` returns open dispute states that block release. `reviewDisputeCase` requires guarded-MVP platform-admin authority, requires rationale, records status/freeze transitions, can link/create a refund request for refund outcomes, records audit, and records admin override.

Risk/gap: dispute outcome evidence is still mostly a free-text rationale plus audit metadata. The legal-exceptions register requires supporting evidence artifacts/links and reconstructible audit evidence. Before public legal/dispute claims, dispute review should require structured evidence links or document refs and explicit affected-party acceptance/refusal status for negotiated settlement outcomes.

### Holdback controls

`apps/web/src/lib/holdback.ts` evaluates holdbacks after successful payment confirmation. It creates or updates `PaymentHoldback` based on first seller transaction, seller verification gaps, high amount, dispute/refund history, and manual risk flags. `applyHoldbackDecision` requires admin rationale and disallows holdback amount/percent rewrites on `APPLY`. It writes audit and admin override records.

`apps/web/src/app/api/admin/holdbacks/route.ts` and `apps/web/src/app/api/admin/holdbacks/verification/route.ts` require `canManageHoldbacks`, which maps to guarded-MVP platform-admin authority.

Risk/gap: holdback evaluation treats seller readiness as `stripeConnectAccountId && profileStatus === "PUBLISHED"`, but release logic only requires a canonical seller org and optionally a Stripe account. Public readiness should not imply seller verification or payout readiness from a profile status string alone. Holdback review also currently uses global/platform admin authority, not explicit `FINANCE_ADMIN`/`LEGAL_ADMIN` roles named in the policy register.

### Payout/release controls

`apps/web/src/app/api/payments/release-milestone/route.ts` is the canonical release route. It requires auth, current admin-override acceptance version, `IN_ESCROW` milestone, `canReleaseMilestonePayment`, no blocking open refund request, no blocking frozen dispute, no active holdback, escrow account balance, seller org identity, no payee swap, positive milestone amount, local escrow debit reservation before any Stripe transfer, Stripe transfer idempotency, payout status updates, milestone status `PAID`, possible contract completion, `MoneyTx`, activity, audit, and admin override.

`apps/web/src/lib/rbac.ts` defines `canReleaseMilestonePayment` as guarded-MVP `PLATFORM_ADMIN` only. `billing.escrowReleaseMilestone` is disabled and points callers to the canonical route, which is structurally sound.

Important gap: if `canonicalRecipient.stripeAccountId` is missing, the release route skips the Stripe transfer but still finalizes local payout/milestone state as paid. That may be useful for demo/private-pilot bookkeeping, but it is unsafe for any public payout or provider-paid claim. Before public launch, release readiness must require a Stripe Connect account with current payout capability unless an explicit non-live/demo mode or manual offline-payment exception is recorded and visibly excluded from public paid/payout claims.

### Payment plan and payout line building

`apps/web/src/app/api/payments/auto-build/route.ts` and `apps/web/src/app/api/payments/plan/from-accepted-proposals/route.ts` require authenticated `PRO_PLANNER`, `canManageEvent`, accepted proposals, provider listing context, and provider-submitted activity evidence before creating payout lines.

`apps/web/src/app/api/payments/lines/route.ts` and `[id]/route.ts` restrict manual payment schedule/payout line edits to `PRO_PLANNER` with `canManageEvent`, only allow deposit lines for payable contracts, and prevent edits to paid/held/escrowed/refunded or non-pending payout lines. `payoutLock.ts` stores lock state in `MoneyTx` with `type: "PAYOUT_LOCK"`.

Risk/gap: auto-build and manual payout lines create planning records, not release authority. UI/public copy must keep these as payment-plan readiness only. Also, `auto-build` creates payout lines with `orgId: event.orgId`, while release payout records use the seller org id. That difference is a structural risk if plan lines are later reused as canonical payout recipient evidence. A payout plan line should carry buyer/event owner context and seller/payee org context separately before it becomes public/payout-ready evidence.

### Admin verification/legal review surfaces

`apps/web/src/app/(app)/admin/verification/page.tsx` is admin-only and lists refund requests, dispute cases, holdbacks, payouts, and override history. Detail pages for refund and payout expose fee profile snapshot, acceptance proof, dispute status, holdback state, payout/release state, override history, and legal version references.

`apps/web/src/app/(app)/admin/verification/actions.ts` requires admin dashboard access, global `ADMIN`, and guarded-MVP platform-admin authority before refund/dispute/holdback decisions. This is safe for guarded MVP, but it is not the named finance/legal role model from the policy register.

Risk/gap: public launch readiness should not claim finance/legal separation until `FINANCE_ADMIN`, `LEGAL_ADMIN`, and `OPERATIONS_ADMIN` are represented as enforceable authorities or each override record explicitly records why `PLATFORM_ADMIN` is acting as that named role under guarded-MVP policy.

### Public legal pages and legal-surface copy

`apps/web/src/lib/legal-surface.ts` maps payment/holdback/adminOverride to `/legal/payments`, refund to `/legal/refunds`, dispute to `/legal/disputes`, and terms/contract/proposal to `/terms`. `apps/web/src/app/terms/page.tsx` links the guarded-MVP legal pages.

The legal pages are intentionally minimal:
- `/legal/payments` says payments are collected against approved proposal/contract terms and held pending milestone release/admin review.
- `/legal/refunds` says refund submissions are review requests, not self-serve reversals.
- `/legal/disputes` says disputes are tracked admin review cases and can freeze release.
- `/legal/fees` explains current fee treatment.

Risk/gap: these pages are safe as guarded-MVP explanatory copy, but they are not public-launch legal terms. They lack stable last-updated/version display, legal entity/operator identity, jurisdiction/governing law, refund timing windows, chargeback/dispute escalation details, payout timing, Stripe Connect account responsibilities, tax treatment, platform-vs-provider responsibility boundaries, data retention/evidence rules, and legal review signoff. `/privacy` also contains simplified payment terms and contact copy that may drift from the canonical legal pages.

## Current safe assumptions

1. It is safe to say OneHub has guarded-MVP payment primitives, not launch-ready payment operations.
2. It is safe to say payment creation is gated by authenticated buyer-side access, signed/accepted provider-backed proposal and contract state, current acceptance version, server-derived amount, and Stripe metadata binding.
3. It is safe to say release is admin/manual-review gated and blocked by open refund, dispute, and active holdback records.
4. It is safe to say refund/dispute/holdback records exist and are audit-linked for guarded internal review.
5. It is safe to say Stripe Connect onboarding/status exists for vendor/venue orgs.

## Unsafe assumptions / public-claim blockers

1. Do not claim public launch payment readiness. Payment success can be written by both explicit confirmation and webhook paths, and the webhook path lacks the canonical confirmation/audit/holdback/evidence behavior.
2. Do not claim payout readiness from `chargesEnabled && payoutsEnabled` alone. Current code does not persist a reviewed Connect capability snapshot or OneHub approval state.
3. Do not claim providers have been paid when release finalizes without a Stripe transfer because `stripeConnectAccountId` is missing.
4. Do not claim legal readiness. Public legal pages are guarded-MVP placeholders/explainers, not signed-off terms with full jurisdiction, responsibility, timing, Stripe Connect, tax, evidence, and versioning language.
5. Do not claim named finance/legal/admin role separation. Runtime enforcement still primarily uses global `ADMIN` plus guarded-MVP `PLATFORM_ADMIN` configuration.
6. Do not treat payout-plan lines as canonical payout recipient evidence until buyer/event org and seller/payee org semantics are separated.
7. Do not call requested refund amounts eligible refund amounts until approval-time evidence, balance, and policy checks have passed.

## Minimal control gates required before public launch claims

### P0: public-launch claim blockers

1. Canonicalize payment confirmation.
   - Extract a single server function used by both `/api/payments/confirm` and Stripe webhook success handling.
   - Required behavior: metadata match, amount/currency match, current acceptance proof, transaction row, escrow/held-funds update, holdback evaluation, activity/audit record, idempotent replay behavior.

2. Split payment readiness from payout readiness.
   - Payment readiness requires: buyer authority, signed/current contract, accepted provider-backed proposal, provider-submitted evidence, payable milestone state, current payment legal acceptance, server-derived amount, Stripe configured, Stripe intent metadata match.
   - Payout readiness requires: seller org resolved, Stripe Connect account present, latest Stripe capability snapshot shows payouts enabled and requirements clear, no active refund/dispute/holdback blocker, current admin-release acceptance, finance/manual approval recorded.

3. Prevent local paid/payout claim without transfer evidence.
   - If Stripe Connect account is missing or Stripe is not configured, release route should not set `Payout.status = SENT` or milestone `PAID` unless an explicit non-live/manual-offline exception exists and is excluded from public paid/payout copy.

4. Version and approve legal pages.
   - Add stable legal version/last-updated display tied to `CURRENT_ACCEPTANCE_VERSIONS` or a legal content registry.
   - Add legal signoff metadata before public launch copy references payment/refund/dispute terms as official.

### P1: guarded-MVP hardening

1. Persist Connect readiness snapshots.
   - Store account id, charges enabled, payouts enabled, details submitted, requirements/disabled reason summary, fetched-at timestamp, and OneHub reviewed/approved state.

2. Add structured evidence to refund/dispute/holdback decisions.
   - Require evidence links/artifact IDs, affected-party acceptance/refusal when applicable, before/after state, and named authority role in the admin override metadata.

3. Implement named approval roles or explicit role-proxy recording.
   - Either enforce `FINANCE_ADMIN`, `LEGAL_ADMIN`, `OPERATIONS_ADMIN`, or record that guarded-MVP `PLATFORM_ADMIN` is acting as the named approval role required by `docs/legal-exceptions-register.md`.

4. Separate payout-plan org semantics.
   - Payout plan line should include planner/event org, seller/payee org, listing, proposed amount, source proposal, locked status, and whether it is only a planning row or an executable release candidate.

5. Align public copy terminology.
   - Keep `held funds`, `readiness`, `review`, and `request` language until legal signoff and payment operations are production-approved.
   - Avoid `escrow`, `guaranteed`, `paid`, `released`, `ready`, or `automatic` in public copy unless backed by exact persisted evidence.

## Recommended narrow next action for Atlas

RISK verdict. Route Forge to implement a small backend-only public-launch claim blocker patch before any public payment/legal claims:
1. canonicalize payment confirmation so webhook and `/api/payments/confirm` share one audited path;
2. require persisted/current Stripe Connect payout readiness before any live release/payout-ready claim;
3. prevent local `PAID`/`SENT` finalization without Stripe transfer evidence unless an explicit non-live/manual-offline exception is recorded; and
4. add versioned/legal-signoff metadata to the public legal pages.

FOUNDER ESCALATION REQUIRED before changing public legal terms, enabling live Stripe money movement, changing billing/Stripe settings, or making public launch/payment readiness claims.
