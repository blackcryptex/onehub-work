# Gate 6A Steward backend/admin/payment safety review

Task: t_c94b28f1
Scope: read-only/local backend review of OneHub workspace `/root/.hermes/workspaces/onehub/repo`.
Constraints honored: no Oracle, no live DB, no migrations, no credential/API key access, no real email/provider calls, no production/infrastructure/billing/destructive actions. Secrets intentionally not inspected.
Parent handoff: Gate 5C local/test-mode payment monitoring and reconciliation passed, but was not live-payment-release-safe.
Verdict: PARTIAL / RISK for Gate 6A implementation readiness; SOUND for planning narrow implementation slices only.

## Evidence examined

- Repo state: `/root/.hermes/workspaces/onehub/repo`, branch `main`, ahead of origin by 2 commits; existing dirty tree was present before this report work.
- Scout Gate 6A UX map:
  - `reports/production/acceleration/gate6a-scout-notification-admin-gap-map/gap-map.md`
  - `reports/production/acceleration/gate6a-scout-notification-admin-gap-map/route-inventory.md`
- Prisma schema:
  - `apps/web/prisma/schema.prisma:216-229` AuditLog
  - `apps/web/prisma/schema.prisma:231-265` AdminOverride
  - `apps/web/prisma/schema.prisma:476-488` Notification
  - `apps/web/prisma/schema.prisma:768-840` Payout, MoneyTx, WebhookEvent, PaymentIntent, Transaction
  - `apps/web/prisma/schema.prisma:842-877` PaymentHoldback
  - `apps/web/prisma/schema.prisma:951-1025` Dispute and RefundRequest
- Notification APIs/router:
  - `apps/web/src/app/api/notifications/route.ts:7-20`
  - `apps/web/src/app/api/notifications/[id]/read/route.ts:5-21`
  - `apps/web/src/server/routers/notification.ts:6-24`
- Admin/admin-payment APIs and actions:
  - `apps/web/src/app/(app)/admin/verification/page.tsx:24-148`
  - `apps/web/src/app/(app)/admin/verification/actions.ts:10-77`
  - `apps/web/src/app/api/admin/holdbacks/route.ts:14-64`
  - `apps/web/src/app/api/admin/holdbacks/verification/route.ts:5-22`
  - `apps/web/src/app/api/admin/override-history/route.ts:5-32`
  - `apps/web/src/app/api/admin/impersonate/route.ts:17-93`
  - `apps/web/src/app/api/admin/stop-impersonate/route.ts:14-39`
- Payment/refund/dispute/monitoring logic:
  - `apps/web/src/lib/payments/money-state.ts:35-42`, `224-244`, `284-382`, `438-626`
  - `apps/web/src/app/api/stripe/webhook/route.ts:80-163`
  - `apps/web/src/app/api/payments/create-intent/route.ts:23-301`
  - `apps/web/src/app/api/payments/confirm/route.ts:16-129`
  - `apps/web/src/app/api/payments/release-milestone/route.ts:27-494`
  - `apps/web/src/lib/refund-request.ts:72-228`
  - `apps/web/src/lib/dispute-case.ts:72-260`
- Validation run:
  - Command: `pnpm vitest run apps/web/tests/gate5c-payment-monitoring.test.ts apps/web/tests/gate5b-payment-state.test.ts`
  - Result: PASS, 2 files / 11 tests passed.

## Model/API gap map

| Area | Existing model/API | Sound backend properties | Gap/risk for Gate 6A | Verdict |
|---|---|---|---|---|
| In-app notifications | `Notification` model has `userId`, `orgId`, `type`, `title`, `body`, `read`, `link`, `createdAt`; REST GET scopes by `userId`; REST mark-read scopes by `id` + `userId`; tRPC `notify`, `listMy`, `markRead` also exist. | Basic per-user notification storage and read state exist. REST list/read are user-scoped. | tRPC `markRead` updates `where: { id }` only after auth, not `userId`; any exposed tRPC caller with another notification id could mark another user’s notification read. Producer coverage is sparse and not tied to most payment/contract/refund/dispute/admin state changes. No delivery-status model for email/SMS. | PARTIAL / RISK |
| Admin transaction viewer | `PaymentIntent`, `Transaction`, `Payout`, `MoneyTx`, `WebhookEvent`, `MetricDaily` exist; admin verification page includes refunds/disputes/holdbacks/payouts/overrides but not a dedicated transaction ledger viewer. | Payment state records and transaction records have stable IDs and Stripe/test-mode IDs for reconciliation. Gate 5C monitoring functions detect state anomalies. | No admin API/page currently provides a read-only joined transaction ledger across payment intent, transaction, payout, MoneyTx, webhook processing status, and reconciliation anomalies. Current admin overview is aggregate counts only. | PARTIAL |
| Admin audit log | `AuditLog` and `AdminOverride` exist. `recordAdminOverride` creates both in one transaction and links override to audit via `auditLogId`. Refund/dispute/holdback/payout decisions record audit evidence. | Important admin overrides are preserved with actor, target, authority path, decision, reason, and linked money/trust record IDs. | No visible admin audit-log viewer route was found. Generic audit metadata is JSON and record mutability is DB-level ordinary updateable data; no append-only guard/checksum/export boundary exists. Some admin server actions revalidate stale `/app/admin/...` paths even though real routes are `/admin/...`. | PARTIAL |
| Dispute visibility | `Dispute` model has proposal/payment/milestone/refund links, freeze state, resolution fields, audit trail. Admin verification list/detail pages show disputes; review action records AuditLog/AdminOverride. | Disputes are explicitly modeled and default to frozen; open disputes block milestone release via `getBlockingDisputeCase` in release API. | Admin list is globally visible to any dashboard ADMIN, while mutating review requires guarded platform admin. That may be acceptable for platform-only admins, but it is broader than the stricter action authority. Detail pages render raw JSON snapshots; no redaction/PII minimization boundary. Dispute `REFUND` action creates a 0-cent refund request if none exists, which is safe against automatic payment movement but can confuse operators unless labeled as a manual review placeholder. | PARTIAL / RISK |
| Refund visibility | `RefundRequest` model has proposal/payment/milestone links, fee treatment, status, admin decision, audit trail. API creates open requests; admin review records AuditLog/AdminOverride. | Refund approval/denial changes local review state only; off-ledger goodwill refund approval is blocked; platform fee override is blocked in guarded MVP. Open refunds block milestone release. | No Stripe refund call is present in reviewed refund approval path, which is good for manual-only safety, but status `APPROVED` can look like money has moved when it has not. Needs explicit manual-only labeling/status separation before admin rollout. Request creation API allows any event-org member or ADMIN to create a refund request for a proposal; amount upper-bound against paid amount was not enforced in the create route. | PARTIAL / RISK |
| Holdback visibility | `PaymentHoldback` model and `/api/admin/holdbacks*` exist. Holdback decisions require `canManageHoldbacks`, backed by guarded platform admin IDs. Active holdbacks block milestone release. | Holdback decisions require guarded platform admin authority, reason, audit log, and AdminOverride. Amount rewrite is explicitly disallowed in guarded MVP. | Holdback verification API can reveal refund/dispute context to platform admins only; acceptable if guarded admin ID env is correct. No admin queue severity/age/SLA. | SOUND for authority / PARTIAL for operator UX |
| Payout visibility/release | `Payout` model and admin verification payout list/detail exist. Release API requires platform admin, acceptance proof, no open refund/dispute/holdback, seller org/payee checks, and audit/AdminOverride. | Payout release path has strong precondition checks and blocks demo-mode release. | This is not manual-only: if a Stripe Connect account and Stripe client are configured, `release-milestone` creates a Stripe transfer. Gate 6A admin viewer work must not call this release path unless explicitly approved as a separate payment-release action. If Stripe transfer fails inside the transaction callback, code continues with local payout/milestone/escrow state updates, creating a risk of local `PAID`/released state without external transfer evidence. | RISK |
| Payment monitoring handoff | `classifyWebhookProcessingState`, `classifyStripeWebhookEventType`, and `buildPaymentReconciliationReport` exist and tests pass. Webhook route marks refund/dispute/payout/transfer event types manual-admin-only. | Gate 5C monitoring logic remains test-covered: manual-only event classification, webhook retry/duplicate handling, reconciliation anomalies. | Monitoring is library/test-level; no admin read-only endpoint/page maps reconciliation anomalies into the verification dashboard. Webhook manual-only classification marks manual-only events completed, so no operator queue is automatically created for those events. | PARTIAL |
| Email/SMS notifications | User/org settings and onboarding preferences exist; Scout found guest/contract/invite stubs. | No real provider calls in reviewed Gate 6A scope. | No delivery attempt model, delivery status, retry queue, provider abstraction, or admin handoff. UI must not imply live email/SMS delivery until this exists. | RISK if marketed as live |

## Manual-only boundaries for refunds, payouts, disputes

1. Refunds
   - Current safe boundary: refund request creation/review is local DB state and audit evidence only; no Stripe refund provider call was found in `reviewRefundRequest`.
   - Must remain manual-only for Gate 6A: do not add automatic `stripe.refunds.create` or payout reversal in notification/admin viewer slices.
   - Required labeling: distinguish `APPROVED_FOR_MANUAL_PROCESSING` from “refund paid” or add UI copy that approval is internal/manual until separate payment-release approval.
   - Data guard needed: cap `amountRequestedCents` to eligible paid/escrow amount and reject zero/overpaid values except explicitly labeled admin-created placeholder records.

2. Disputes
   - Current safe boundary: dispute creation freezes state locally; admin review changes local dispute/freeze status and audit evidence; release API blocks open dispute statuses.
   - Must remain manual-only for Gate 6A: dispute webhook events (`charge.dispute.*`) are classified manual-admin-only and should create/read operator visibility, not auto-resolve or move money.
   - Required labeling: `REFUND` dispute action currently creates/links a refund request but does not move funds. Admin/detail UI should state that it opens a manual refund path.

3. Payouts
   - Current boundary is mixed: payout records and visibility are local, but `/api/payments/release-milestone` can create a Stripe transfer when configured.
   - Gate 6A admin transaction viewer/payment monitoring must be read-only and must not wire list/detail/notification controls to payout release.
   - Release remains a separate guarded payment action requiring explicit acceptance/version/reason and platform admin authority. It should not be treated as part of notification/admin viewer implementation.
   - Safety issue to fix before any release acceptance: if Stripe transfer creation fails, local milestone/escrow/payout updates can still proceed. That can misrepresent money movement.

## Data-access risks

1. tRPC notification mark-read is under-scoped.
   - Evidence: `apps/web/src/server/routers/notification.ts:17-22` authenticates but updates by `id` only.
   - Risk: cross-user notification read-state tampering if this router is reachable.
   - Narrow fix: update with `where` constrained by both notification id and current `userId` or use `updateMany({ where: { id, userId } })` and check count.

2. Admin visibility and admin mutation authority are not aligned.
   - Evidence: admin verification page permits `canAccessDashboard(user, "ADMIN")`; server actions call `assertPlatformAdminForGuardedMvp`.
   - Risk: a broad ADMIN role can read all refund/dispute/holdback/payout/override rows even when not allowed to decide/release them.
   - Narrow decision needed: either define all ADMIN as platform operators allowed to view everything, or gate money/trust verification pages behind guarded platform admin authority too.

3. Raw JSON snapshots in admin detail pages can expose more data than needed.
   - Evidence: refund/dispute detail pages render `feeProfileSnapshot`, acceptance proof, linked records, holdback/payout state, and override history as raw JSON.
   - Risk: accidental exposure of metadata fields, internal IDs, request context, or future provider payload fragments.
   - Narrow fix: create explicit DTOs/serializers for admin verification detail records and redact provider payloads by default.

4. Refund request amount validation is incomplete.
   - Evidence: request schema requires positive amount, but reviewed create path does not cap against payment/milestone/proposal paid amount.
   - Risk: nonsensical/over-limit refund requests enter the admin queue and may mislead operators.
   - Narrow fix: compare requested amount to eligible paid/escrow amount from server-derived payment/milestone context.

5. Payout release local-state divergence risk.
   - Evidence: release API catches Stripe transfer error and continues local payout/milestone/escrow/MoneyTx updates.
   - Risk: local system can mark payout/milestone as released without external transfer evidence.
   - Narrow fix: for non-manual release, fail transaction or persist `TRANSFER_FAILED` without decrementing escrow/marking milestone paid unless external transfer succeeded or payout is explicitly manual/offline with a separate evidence field.

6. Audit evidence is present but not operator-readable or append-only.
   - Evidence: `AuditLog`/`AdminOverride` models and recorders exist; no admin audit viewer route was found; audit trails also live as updateable JSON on domain records.
   - Risk: Sentinel/Admin cannot quickly verify who did what, and mutable JSON fields weaken evidence semantics.
   - Narrow fix: build read-only audit log viewer over `AuditLog` + `AdminOverride`, and treat JSON auditTrail fields as derived/secondary context rather than canonical audit evidence.

7. Webhook manual-only events do not produce operator work items.
   - Evidence: webhook route classifies dispute/refund/payout/transfer events manual-admin-only and marks webhook completed with metadata.
   - Risk: Stripe/test-mode manual-only events are accepted but may not surface to admins unless someone inspects webhook records.
   - Narrow fix: add read-only monitoring surface for manual-only webhook events; do not auto-act on them.

## Recommended narrow Forge implementation slices

1. Notification read-scope hardening only
   - Change tRPC `notification.markRead` to scope by current `userId`.
   - Add a regression test proving user A cannot mark user B's notification read.
   - No new delivery provider, no email/SMS calls.

2. Read-only admin transaction ledger API/page
   - Create a platform-admin-gated read-only surface joining `PaymentIntent`, `Transaction`, `Payout`, `MoneyTx`, and `WebhookEvent` by internal/Stripe IDs.
   - Include reconciliation anomaly badges from existing `buildPaymentReconciliationReport` shape where local/test evidence is supplied.
   - Explicitly omit release/refund/transfer buttons in this slice.

3. Manual-only webhook/operator queue
   - Surface `WebhookEvent` rows where metadata has `manualAdminOnly: true` with type, time, linked provider id, and reason.
   - Do not create refunds, disputes, payouts, transfers, or notifications with provider side effects.

4. Admin audit log viewer
   - Read-only `/admin/audit` or `/admin/verification/audit` over `AuditLog` + `AdminOverride`.
   - Filter by action, actor, org, target, proposal/payment/refund/dispute/payout ids.
   - Redact metadata keys that could hold provider payloads/secrets; display `[REDACTED]` for unsafe fields.

5. Refund/dispute language and amount guard
   - Rename/label refund approvals as manual-review outcomes, not money movement.
   - Add server-side amount cap against eligible paid/escrow amount.
   - Keep actual provider refund automation out of Gate 6A.

6. Payout release safety fix before any further acceptance
   - Make Stripe transfer failure block local release state, or introduce explicit manual/offline payout status that does not claim provider transfer success.
   - Add a test for failed transfer preserving escrow/milestone state.
   - Keep this separate from read-only admin viewer work.

7. Admin authorization alignment decision
   - Decide whether `ADMIN` means full platform operator visibility or whether money/trust verification pages require guarded platform admin ids.
   - Until decided, narrow money/trust admin pages to guarded platform admin authority to match mutation authority.

## Steward backend verdict

PARTIAL / RISK.

OneHub has real backend primitives for Gate 6A: notification storage, admin verification queues, audit/admin-override records, refund/dispute/holdback models, and Gate 5C payment monitoring helpers. The unsafe parts are not absence of primitives; they are boundary clarity and data-access correctness: under-scoped tRPC notification mutation, broad admin read visibility vs stricter mutation authority, no dedicated read-only transaction/audit/manual-webhook monitoring surface, incomplete refund amount validation, and a payout release path that can continue local release state after Stripe transfer failure.

Gate 6A should proceed only as narrow read-only/admin-safety slices first. Do not implement live email/SMS, real refund automation, payout automation expansion, live payment release, migrations against live/staging DB, or provider calls as part of this gate.
