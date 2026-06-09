# Gate 6A Steward Backend/Admin/Payment Safety Requirements

Generated: 2026-06-03T16:30:59Z
Task: t_c210f3ad
Reviewer: Steward
Status: READ-ONLY BACKEND SAFETY MAP

## Approval boundary

No production DB access was used. No live/staging DB migration, schema mutation, destructive DB command, credential/API-key change, billing change, public launch, infrastructure change, Stripe live-mode call, real email-provider call, refund, payout, transfer, dispute automation, or Oracle routing was performed.

This report is a local repository inspection and implementation-slice recommendation only. Secrets, credentials, and live payment operations remain blocked unless Marlon separately approves them.

## Backend scope under review

Gate 6A backend/data safety for:

1. notifications
2. admin transaction/payment viewer
3. admin audit log / override history
4. dispute visibility
5. payment monitoring handoff from Gate 5C
6. manual-only boundaries for refunds, payouts, transfers, disputes, and payment holdbacks

## Evidence examined

Repository state:
- workspace: `/root/.hermes/workspaces/onehub/repo`
- `git status --short` shows a broad pre-existing dirty tree; this task only added this evidence report under `reports/production/acceleration/gate6a-steward-backend-admin-safety/`.

Primary files inspected:
- `apps/web/prisma/schema.prisma`
- `apps/web/src/server/routers/notification.ts`
- `apps/web/src/app/api/notifications/route.ts`
- `apps/web/src/app/api/notifications/[id]/read/route.ts`
- `apps/web/src/server/routers/audit.ts`
- `apps/web/src/server/routers/admin.ts`
- `apps/web/src/server/routers/dispute.ts`
- `apps/web/src/lib/dispute-case.ts`
- `apps/web/src/lib/refund-request.ts`
- `apps/web/src/lib/holdback.ts`
- `apps/web/src/lib/payments/money-state.ts`
- `apps/web/src/app/api/payments/create-intent/route.ts`
- `apps/web/src/app/api/payments/confirm/route.ts`
- `apps/web/src/app/api/payments/release-milestone/route.ts`
- `apps/web/src/app/api/stripe/webhook/route.ts`
- `apps/web/src/app/(app)/admin/verification/page.tsx`
- `apps/web/src/app/(app)/admin/verification/actions.ts`
- `apps/web/src/app/(app)/admin/verification/refunds/[id]/page.tsx`
- `apps/web/src/app/(app)/admin/verification/disputes/[id]/page.tsx`
- `apps/web/src/app/(app)/admin/verification/holdbacks/[id]/page.tsx`
- `apps/web/src/app/(app)/admin/verification/payouts/[id]/page.tsx`
- Gate 5 handoff: `reports/production/gate5/phase5c/payment-monitoring-reconciliation/evidence.md`
- Gate 5 planning: `reports/production/gate5/phase5a/webhook-to-state-mapping.md`

## Current model/API gap map

| Area | Current backend shape | Current safety strength | Gap / risk for Gate 6A |
|---|---|---|---|
| Notifications model | `Notification` has `userId`, `orgId`, `type`, `title`, `body`, `read`, `link`, `createdAt`. | Simple per-user rows exist. REST list route filters by current user. REST mark-read route updates by `{ id, userId }`. | tRPC `notification.markRead` updates by `id` only after auth and does not constrain `userId`; a user could mark another user's notification as read if they know the id. `listMy` filters by user but not org membership. No email/send-provider layer should be inferred. |
| Notification delivery | `notify()` only creates DB rows. Gate 4 already noted email was partial/stubbed. | In-app-only is safe if represented honestly. | No reliable external delivery evidence. Gate 6A should keep email/push/SMS out of scope or explicitly stubbed; do not call a real provider. |
| Admin audit model | `AuditLog` has actor, org, action, target, metadata, index `[orgId, at]`. `AdminOverride` links override records to refund/dispute/holdback/payout/payment/proposal/contract/milestone ids and to a unique `auditLogId`. | Strong primitives exist for append-style evidence. `recordAudit`/`recordAdminOverride` are used in refund review, dispute review, holdback decision, and payout release. | `auditRouter.list` is `publicProcedure` and has no auth/authorization check. Any caller able to hit the tRPC procedure can list all audit logs if `orgId` is omitted. This is a blocking data-access risk before admin audit viewer acceptance. |
| Admin verification page | `/admin/verification` server page checks `getCurrentUser()` and `canAccessDashboard(user, "ADMIN")`, then lists refunds, disputes, holdbacks, payouts, overrides. | Server-rendered page is admin-gated and useful as a combined review surface. | It is not a full transaction viewer: no direct `PaymentIntent`, `Transaction`, `MoneyTx`, `WebhookEvent`, `EscrowAccount`, or reconciliation anomaly listing. Filters are string statuses with no enum validation at page boundary. JSON detail cards may expose broad metadata; acceptable for admin-only local view, but must remain admin-only and should redact external IDs if needed. |
| Admin verification actions | Server actions require admin dashboard access, role `ADMIN`, and `assertPlatformAdminForGuardedMvp`. | Good authority boundary for manual refund/dispute/holdback decisions. | Detail pages only check `canAccessDashboard`; server actions are stricter. Keep action authority stricter than read authority, or explicitly document read-vs-action split. |
| Refund requests | `RefundRequest` model tracks proposal/contract/payment/milestone, fee treatments, admin decision fields, and `auditTrail`. Review path logs audit and admin override. | Manual/admin decision path exists; off-ledger approval is blocked when no `paymentIntentId`; platform-fee override is disallowed in guarded MVP. | Review approves/denies internal request only; it does not perform a Stripe refund. This is safe but must be labeled manual-only. Need admin viewer wording/fields to prevent users from thinking funds moved. |
| Disputes | `Dispute` model tracks proposal/payment/milestone, linked refund request, status, freeze state, resolution fields, and `auditTrail`. `create` freezes by default. | Dispute create/list are member/admin scoped by org. Admin review requires role `ADMIN`, then helper requires guarded platform authority. Release route blocks open/frozen disputes. | Admin review action `REFUND` creates a `RefundRequest` with `amountRequestedCents: 0`; safe for no live refund, but ambiguous as a real refund amount and must be treated as a request marker, not money movement. No Stripe dispute automation should be activated. |
| Holdbacks | `PaymentHoldback` model and helper evaluate high-risk triggers after payment success. Admin decisions write audit and override records. | Active holdbacks block release. Holdback API checks `canManageHoldbacks`; admin verification action requires guarded platform admin. | `recordAudit` for holdback uses `orgId: null`, weakening org-scoped audit browsing. Verification `GET` returns by id/milestone/proposal to platform admins only; acceptable for admin, not tenant/org scoped. |
| Payment intent creation | Buyer-side membership/owner check; contract/milestone payable-state checks; test-mode secret enforcement; acceptance capture. | Good local/test-mode guard. Server derives milestone amount and full contract total. | It still calls Stripe when configured; Gate 6A must not run it against live keys. Existing code cancels an existing Stripe intent in test-mode; do not exercise without explicit approval. |
| Payment success reducer | `applyPaymentSuccessStateTransition` validates amount/currency/metadata, idempotently updates `PaymentIntent`, increments escrow, creates `Transaction`, evaluates holdback, updates contract, records activity. | Better than Gate 5A; shared by confirm and webhook. | No `AuditLog` is recorded for payment success itself, only `Activity`. Admin transaction viewer should compensate with read-only visibility into `PaymentIntent`, `Transaction`, `WebhookEvent`, and reconciliation anomalies. |
| Webhook handling | Signature verified; test-mode secret enforced; processing-state marker handles retry/duplicate/stale processing; automatic events limited to payment-intent success/failure/cancel. | Gate 5C manual-only classifier is sound for blocking refund/dispute/payout/transfer automation. | Manual-only webhook events are marked completed with `handled: false`; no admin alert/viewer surface currently lists those manual-only receipts. Gate 6A payment monitoring should expose them read-only. |
| Payout release | Release route requires current user, `canReleaseMilestonePayment`, acceptance proof, blocks open refunds/disputes/holdbacks, validates escrow, records audit and admin override. | Strong guarded-MVP checks and blocking conditions. | If a seller org has `stripeConnectAccountId` and `stripe` is configured, route can call `stripe.transfers.create`. This must remain manual/test-mode-only and must not be invoked in Gate 6A. Admin transaction viewer can show payout state but should not add release/refund/payout buttons. |

## Manual-only boundaries that must remain explicit

1. Refunds
   - Current safe boundary: create/review `RefundRequest` only.
   - Do not create Stripe refunds, do not mark milestone refunded from webhook, and do not represent `APPROVED` as money returned.
   - Required label: `APPROVED means internal admin approval only; external refund execution remains manual/not performed`.

2. Payouts/transfers
   - Current risk: `/api/payments/release-milestone` can create a Stripe transfer if Stripe and Connect account are configured.
   - Gate 6A should not add or exercise payout release actions. Any admin transaction viewer must be read-only.
   - Required label: `PENDING/SENT reflect local/test-mode route state only unless separate live payout approval exists`.

3. Disputes
   - Current safe boundary: Stripe dispute/refund/payout/transfer webhook types are classified `manual-admin-only`.
   - Do not create disputes from Stripe webhooks in Gate 6A.
   - Required label: `manual dispute case visibility only; no Stripe dispute response/upload/evidence automation`.

4. Holdbacks
   - Current safe boundary: holdback decisions are admin/manual state gates; they block release.
   - Do not convert holdback release into payout release.
   - Required label: `release holdback means release administrative block, not release funds`.

5. Notifications
   - Current safe boundary: in-app DB notifications only.
   - Do not send real email/SMS/push/provider notifications.
   - Required label: `delivery provider not configured/used in Gate 6A`.

## Data-access risks

Severity HIGH:
- `apps/web/src/server/routers/audit.ts` exposes `audit.list` without auth. It should require platform admin for all audit reads, or at minimum org membership plus admin/operator role for scoped org reads. Until fixed, no admin audit viewer should rely on this procedure.
- `apps/web/src/server/routers/notification.ts` `markRead` updates a notification by id without `userId` in the write predicate. REST route is safer; tRPC route needs the same ownership predicate.

Severity MEDIUM:
- Admin verification page is admin-gated, but it reads broad JSON blobs (`feeProfileSnapshot`, `auditTrail`, `metadata`, acceptance proof) directly into `<pre>` cards. Keep this page admin-only and avoid placing raw provider payloads/secrets into these JSON fields.
- Admin verification list filters accept raw status strings from search params. Prisma enum validation will usually fail closed, but narrow enum parsing would improve predictable error behavior.
- `PaymentHoldback` audit writes `orgId: null`, making org-scoped audit evidence incomplete.
- Manual-only webhook receipts are persisted in `WebhookEvent.meta`, but no admin surface currently lists `manualAdminOnly` receipts.

Severity LOW/PARTIAL:
- Notification list returns latest 20 and no cursor/filter; safe enough for MVP but incomplete for audit-quality notification visibility.
- Payment monitoring remains JSON/script/report-driven from Gate 5C; there is no scheduled job or read-only DB extractor in Gate 6A scope.

## Recommended narrow Forge implementation slices

These are intentionally small and local/test-mode/read-only unless stated otherwise.

### Slice 6A-1: close obvious data-access holes

Files likely involved:
- `apps/web/src/server/routers/audit.ts`
- `apps/web/src/server/routers/notification.ts`
- targeted tests under `apps/web/tests/`

Acceptance criteria:
- `audit.list` requires guarded platform admin for unscoped/all-org reads.
- If org-scoped audit reads are allowed, caller must be admin/platform admin or an authorized org member under an explicit role policy.
- `notification.markRead` updates only `{ id, userId }`, matching REST route behavior.
- Add tests proving one user cannot mark another user's notification read and non-admin cannot list audit logs.

### Slice 6A-2: read-only admin transaction/payment viewer

Files likely involved:
- new admin route/page under `/app/admin/verification` or `/app/admin/payments`
- server-side read helper for `PaymentIntent`, `Transaction`, `MoneyTx`, `WebhookEvent`, `PaymentHoldback`, `RefundRequest`, `Dispute`, `Payout`

Acceptance criteria:
- Admin-gated server page only; no mutation buttons.
- Shows payment intent -> transaction -> milestone -> escrow -> holdback/refund/dispute/payout links.
- Shows manual-only webhook receipts with `handled=false/manualAdminOnly=true`.
- Redacts or avoids raw Stripe payloads; show ids/status/amount/currency/timestamps only.
- Does not call Stripe APIs and does not mutate DB.

### Slice 6A-3: manual-only labels and empty-state warnings

Files likely involved:
- admin verification list/detail pages
- payment/refund/dispute/holdback detail UI copy only

Acceptance criteria:
- Refund approval copy says no Stripe refund is performed.
- Holdback release copy says administrative block only, not payout release.
- Dispute refund resolution copy says it creates/links an internal refund request only.
- Payout view says read-only; no live payout approval implied.

### Slice 6A-4: payment monitoring handoff viewer, local/read-only

Files likely involved:
- existing Gate 5C reconciliation report reader or a new local report parser
- admin/Sentinel evidence page or generated report under `reports/production/acceleration/`

Acceptance criteria:
- Reads `reports/production/gate5/phase5c/payment-monitoring-reconciliation/reconciliation-report.json` or local test JSON only.
- Displays anomaly counts and kinds.
- No Stripe API call, cron setup, credential use, provider setup, or DB mutation.

### Slice 6A-5: audit completeness normalization

Files likely involved:
- `apps/web/src/lib/holdback.ts`
- payment success reducer if approved for local/test-mode audit evidence only

Acceptance criteria:
- Holdback decisions include `orgId` when derivable from holdback/proposal context.
- Payment success has an admin-readable audit/event record, without logging raw payment payloads or secrets.
- Tests prove audit/override records link to payment intent/proposal/milestone.

## Steward correctness verdict

Verdict: PARTIAL / RISK.

SOUND for planning and read-only Gate 6A evidence: the current backend has meaningful primitives for refund requests, disputes, holdbacks, payment intent state, transaction creation, webhook retry safety, admin override records, and admin-gated verification pages.

RISK for acceptance as an admin/payment safety implementation until the following are fixed or explicitly waived:

1. unauthenticated `auditRouter.list` data exposure risk;
2. tRPC notification `markRead` ownership bug;
3. admin transaction viewer gap: no direct read-only view of `PaymentIntent`, `Transaction`, `MoneyTx`, `WebhookEvent`, and reconciliation anomalies;
4. manual-only refund/payout/dispute labels are not strong enough to prevent operational misunderstanding;
5. payout release route can initiate Stripe transfers when configured and must not be exercised or exposed by Gate 6A.

## Sentinel verification focus

Sentinel should verify this report before Gate 6A acceptance by checking:

1. No production/live DB, live Stripe, credential, billing, migration, or provider action occurred.
2. Evidence exists at `reports/production/acceleration/gate6a-steward-backend-admin-safety/evidence.md`.
3. The two high-severity backend risks are real in code:
   - `auditRouter.list` lacks auth.
   - tRPC `notification.markRead` lacks `userId` predicate.
4. Recommended implementation slices are narrow, local/test-mode/read-only where required.
5. Refund/payout/dispute/holdback semantics remain manual/admin-only and do not imply live money movement.
