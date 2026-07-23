# OneHub P8 — Private Pilot Release-Control Package

Generated: 2026-07-22T14:22:19Z
Task: `t_d8ffd0c8`
System: OneHub
Repo: `/root/.hermes/workspaces/onehub/repo`
Branch observed: `cleanup/accelerated`

## Executive posture

OneHub is a candidate for an invite-only private pilot control package after P7 Sentinel PASS of the local DB-backed smoke path. This package does not approve production, public launch, legal publication, infrastructure exposure, billing, or live payments.

Private pilot posture: PARTIAL — controlled private-pilot candidate only.

Zero-readiness statement: this report makes zero claim of production readiness, public-launch readiness, live-payment readiness, legal readiness, billing readiness, or production infrastructure readiness.

## 1. Scope inspected

Inspected read-only/product-ops pilot readiness scope:

- Current stabilization final report: `reports/stabilization/ONEHUB_STABILIZATION_SPRINT_FINAL_REPORT.md`.
- Route and role navigation helpers for planner/client/vendor/venue/admin surfaces.
- Local health and demo preflight surfaces.
- Booking request/response API surfaces.
- Contract signing and payment-entry surfaces.
- Test evidence files covering P5 provider booking UX, P5 pro planner command center, P2 proposal-contract-payment lifecycle, and Gate 5 payment-state/monitoring posture surfaced by repo search.
- Support/help/admin transaction pages as owner/support/admin posture indicators.

Not inspected/changed:

- No code changed.
- No credentials, billing, infra, production settings, public exposure, live payments, legal text, or database state changed.
- No production environment or hosted deployment was verified.

## 2. Evidence reviewed

Primary sprint evidence:

- `reports/stabilization/ONEHUB_STABILIZATION_SPRINT_FINAL_REPORT.md:11` says P7 is Sentinel-verified for a local DB-backed pilot smoke path, but OneHub is still not production-ready and not authorized for public launch or live payments.
- `reports/stabilization/ONEHUB_STABILIZATION_SPRINT_FINAL_REPORT.md:19-23` classifies demo as controlled/local-smoke evidence, pilot as invite-only candidate pending release controls, production as No, live-payment as No, and legal/public-launch as No.
- `reports/stabilization/ONEHUB_STABILIZATION_SPRINT_FINAL_REPORT.md:93-105` records the final P7 local smoke PASS: local DB reset, migrations, seed, `/api/health` HTTP 200, authenticated contract signing, full tests, and build.
- `reports/stabilization/ONEHUB_STABILIZATION_SPRINT_FINAL_REPORT.md:115-139` lists remaining risks: private-pilot control package, release hygiene, lint warnings, legal/support/public trust, live payments, and infrastructure/public exposure.

Route/flow evidence:

- `apps/web/src/lib/routes.ts:23-41` maps roles to canonical starting surfaces: DIY planner, pro planner, client, vendor, venue, admin, and event dreamer.
- `apps/web/src/lib/routes.ts:54-72` maps event/vault detail routes by role and sends vendor/venue/admin away from planner vault detail surfaces.
- `apps/web/src/lib/routes.ts:147-165` maps role dashboards.
- `apps/web/tests/p5-provider-booking-ux-flow.test.tsx:61-89` verifies vendor/venue dashboard empty states expose booking requests and listing-management actions.
- `apps/web/tests/p5-pro-planner-command-center.test.tsx:36-167` verifies planner command-center truth-state labels, progress calculation, and commerce-linked cancel/archive copy.
- `apps/web/tests/p2-canonical-lifecycle.test.ts:16-119` verifies proposal approval, contract generation, signature state, full-contract payment amount matching, and malformed legal acceptance payload handling.

Payment/control evidence:

- `apps/web/src/lib/payments/money-state.ts:36-43` blocks non-test Stripe secret keys for the Gate 5B payment-intent path.
- `apps/web/src/lib/payments/money-state.ts:45-66` blocks deposit payment intents and requires payable contract/milestone states for payment-intent creation policy.
- `apps/web/tests/gate5c-payment-monitoring.test.ts:50-66` classifies dispute/refund/payout webhook events as manual-admin-only and not handled automatically.
- `apps/web/src/app/api/payments/release-milestone/route.ts:123-127` restricts milestone release to canonical platform-admin authority.
- `apps/web/src/app/api/payments/release-milestone/route.ts:129-155` blocks release while refund requests, disputes, or holdbacks are active.
- `apps/web/src/app/api/payments/release-milestone/route.ts:247-254` disables demo-mode milestone release in guarded MVP because canonical release evidence is required.
- `apps/web/src/app/(app)/admin/transactions/page.tsx:97-115` describes admin transactions as read-only local/test-mode visibility with no release, refund, payout, transfer, or provider-action controls exposed.

Ops/support/environment evidence:

- `apps/web/src/app/api/health/route.ts:15-30` exposes a minimal health endpoint that returns 200 only when health status is ok and 503 when degraded/down.
- `apps/web/src/lib/health.ts:20-59` checks database connectivity and Stripe connectivity when Stripe is configured.
- `apps/web/src/app/api/demo/preflight/route.ts:10-54` exposes demo-mode, seed, listing-count, and AI fallback preflight state.
- `scripts/seed.ts:6-14` seeds explicit test users for DIY planner, pro planner, vendor, venue, client, and admin.
- `scripts/seed.ts:91-115` creates a stable `demo-wedding` demo event.
- `apps/web/src/app/support/page.tsx:21-37` marks AI chat and phone support as not operationally verified and points support to email.
- `apps/web/src/app/help/page.tsx:67-118` shows help/documentation content is still draft/coming-soon in key categories.
- `apps/web/src/app/(app)/admin/overview/page.tsx:21-45` exposes admin overview metrics and links to verification, transactions, audit, and user management.

Repo-state evidence:

- `git status --short` observed an inherited dirty tree with 30 modified files and 5 untracked paths, including the final stabilization report and P7 smoke/migration/test changes. This is acceptable for read-only pilot package preparation, but not release-clean.

## 3. Included private pilot flows

The following flows are eligible for an invite-only private pilot candidate, subject to the controls below and with live payments frozen:

1. Authenticated role entry and navigation
   - Included roles: DIY planner, pro planner, vendor, venue, client, admin.
   - Candidate surfaces: role dashboards, planner vault routes, client event route, vendor dashboard, venue dashboard, admin overview.
   - Control: each pilot user must be pre-approved and mapped to exactly one intended role/persona before invitation.

2. Planner event command center and event-vault work
   - Included: viewing planner event/vault pages, command-center progress/status, checklist/task/budget/guest/milestone visibility, and commerce-aware cancel/archive UX.
   - Control: use pilot-created or seeded/test-safe events only; avoid deleting/canceling real commerce-linked records without explicit operator review.

3. Provider/venue listing and booking-request loop
   - Included: vendor/venue dashboard discovery of booking requests and listing-management actions; planner booking request creation against an event; provider response with hold/decline/quote; optional proposal creation from quoted booking request.
   - Control: pilot requests must be labeled/communicated as private-pilot/test-operational, not legally binding marketplace bookings.

4. Proposal-to-contract-to-signature local smoke path
   - Included: proposal approval/generation, contract creation, contract viewing, and buyer/seller signature flow in a controlled non-production environment.
   - Control: contracts are product-flow artifacts for private-pilot testing only; no legal enforceability claim.

5. Test-mode payment-entry visibility only
   - Included: viewing payment-entry surfaces when contract state allows it; test-mode payment-intent path only if a safe test Stripe key and non-production environment are explicitly configured by owner-approved ops.
   - Control: no live card collection, no live Stripe keys, no live charge, no live transfer, no live payout, no live refund, and no user-facing statement that money movement is active.

6. Admin observation surfaces
   - Included: admin overview, verification links, read-only admin transaction visibility, audit/oversight surfaces as available.
   - Control: admin actions during pilot require named owner/operator approval and written run notes; no payment release/refund/payout operations without separate approval.

7. Demo/seed path
   - Included: seed users, seeded demo event/listings, demo preflight, and local smoke posture.
   - Control: seed/demo data must remain clearly separated from real pilot-user data.

## 4. Excluded flows

The following remain excluded from P8 private pilot unless Marlon approves a separate lane and Sentinel verifies it:

- Production deployment or public launch.
- Public signup/open marketplace access.
- DNS, SSL, hosting, production environment, production monitoring, billing, infra, or secrets changes.
- Live payments: live Stripe keys, card collection for real charges, payment capture, webhooks, payouts, transfers, refunds, disputes, chargebacks, fee collection, escrow/fund movement, or billing operations.
- Legal publication/approval: Terms, Privacy, payment terms, refund/dispute/fee language, vendor/client obligations, acceptance-version legal effect.
- Production support commitments, phone support, AI chat support, SLAs, incident response promises, or external help-center completeness claims.
- Irreversible destructive operations on real pilot data without operator approval.
- Any claim that local smoke, seed/demo, or test-mode behavior proves production readiness.

## 5. Live-payment freeze language

Use this freeze language in the private pilot operating brief:

"OneHub private pilot is invite-only and does not support live payments. All payment, escrow, payout, refund, dispute, transfer, billing, fee, and fund-movement functionality is frozen unless Marlon separately approves live-payment operations and Sentinel independently verifies the approved environment. Any payment UI visible during pilot is for controlled test-mode/product-flow inspection only and must not be used to collect or move real funds."

Required operator rule:

- If a pilot participant asks to pay, collect funds, refund, release, dispute, invoice, or bill through OneHub, stop the flow and route the request to Marlon/Atlas as FOUNDER ESCALATION REQUIRED.

## 6. Support/admin owner needs before inviting pilots

Minimum owners required:

1. Pilot owner
   - Owns invite list, participant expectations, pilot start/stop decision, and founder escalations.
   - Recommended owner: Marlon or explicit Atlas-designated operator.

2. Environment owner
   - Owns non-production environment, local/test DB posture, secrets boundary, test Stripe boundary, and health checks.
   - Must confirm the pilot environment is not production and is not using live Stripe credentials.

3. Support owner
   - Owns support inbox, response tracking, issue intake, participant communication, and escalation notes.
   - Must avoid SLA/phone/AI-chat commitments because support page evidence marks AI chat/phone as not operationally verified.

4. Admin/ops owner
   - Owns admin observation, transaction visibility review, audit-log review, manual-admin-only webhook visibility, and stop-condition enforcement.
   - Must not execute live payment actions.

5. Evidence owner
   - Owns pilot evidence log: participant, role, environment, flow attempted, outcome, defects, screenshots/logs where safe, and stop/rollback decisions.

## 7. Environment and monitoring checklist

Before first invite:

- Confirm target environment is private, non-public, and invite-only.
- Confirm no production DNS/public marketing route is being activated.
- Confirm database target is non-production; record database label/name without exposing credentials.
- Confirm `/api/health` returns 200 in the target pilot environment before inviting users.
- Confirm `/api/health` returns 503/degraded/down if database/Stripe dependency check fails.
- Confirm `ONEHUB_DEMO_MODE` posture is intentional: on for demo-safe flows, off only if testing real non-production persistence by approved owner.
- Confirm `/api/demo/preflight` seed/demo status if using seeded demo flows.
- Confirm `STRIPE_SECRET_KEY` is absent or `sk_test_...`; never use `sk_live_...`.
- Confirm payment surfaces have a written live-payment freeze notice for operators/participants.
- Confirm support email intake is monitored by a named owner.
- Confirm admin overview, admin transactions, verification, audit, and user-management access are limited to named internal admins.
- Confirm pilot-user accounts are known and role-mapped before invitation.
- Confirm backup/rollback path for non-production DB exists or explicitly accept data reset as the rollback path.
- Confirm current repo tree has an intended-change review before any deployment candidate; current tree is not release-clean.

During pilot:

- Check `/api/health` before each session and after any failure report.
- Log each pilot attempt with role, route, flow, result, and blocker.
- Review admin transaction page only as read-only local/test-mode visibility.
- Capture support issues in a single owner-controlled queue.
- Stop immediately on any live-payment, legal, public exposure, or production-environment ambiguity.

After pilot session:

- Record whether the session used seed/demo data or pilot-entered data.
- Record any data cleanup/reset performed.
- Record whether any excluded flow was requested by a participant.
- Hand unresolved decisions to Marlon/Atlas, not directly to implementation.

## 8. Rollback and stop conditions

Immediate stop conditions:

- Any `sk_live_` Stripe key, live webhook, live payout/transfer/refund/dispute action, real charge attempt, or real billing request appears.
- `/api/health` returns non-200 in the pilot environment.
- A participant reaches an unauthorized role surface, private data from another org/event, or admin-only surface.
- Support cannot respond through the named channel.
- Legal/payment/support wording is interpreted by a participant as public launch, legal approval, escrow guarantee, payment availability, or SLA.
- Production DNS/hosting/public traffic is implicated.
- Database target is unclear or appears production.
- Destructive action is about to touch real pilot data without written approval.
- Payment release/refund/payout/dispute/holdback workflow is needed.

Rollback options:

1. Soft stop
   - Disable invites, pause pilot sessions, keep environment running for evidence capture.

2. Data rollback/reset
   - If using seed/demo/local data, reset to known seed state.
   - If using real pilot-entered non-production data, export/record needed evidence first, then follow the environment owner's approved reset plan.

3. Feature freeze
   - Keep authentication/dashboard viewing available for inspection, but stop booking/proposal/contract/payment-entry attempts.

4. Full pilot stop
   - End all pilot access, revoke sessions/invites as appropriate, preserve logs/evidence, and route findings to Atlas.

## 9. Seed/demo vs real-data boundary

Seed/demo data:

- Seeded users include `diy@example.com`, `pro@example.com`, `vendor@example.com`, `venue@example.com`, `client@example.com`, and admin accounts.
- Seed includes `demo-wedding` and demo listings suitable for repeatable product-flow inspection.
- Seed/demo evidence can prove route and local persistence behavior only; it cannot prove production readiness or real business/legal/payment readiness.

Real pilot data:

- Real pilot data means any information entered by actual invited pilot participants, even in a non-production/private environment.
- Real pilot data must be treated as sensitive operational data: no public screenshots, no uncontrolled exports, no destructive reset without owner approval.
- Real pilot data must not be mixed into seeded demo narratives when reporting readiness.
- If participants create contracts/proposals/bookings, label them pilot artifacts, not legal/payment-ready business records.

Boundary rule:

- Every pilot run note must explicitly mark `data_mode` as `seed/demo`, `pilot-entered non-production`, or `unclear`. If unclear, stop and escalate.

## 10. Residual hard decisions for Marlon

FOUNDER ESCALATION REQUIRED before any of these move forward:

1. Approve exact pilot invite list and whether participants are internal-only, friendly external, or real customer/vendor prospects.
2. Approve the target environment and who owns it.
3. Approve whether any real pilot-entered data may be stored, retained, exported, or reset.
4. Approve written participant expectations: private pilot, no public launch, no legal/payment readiness, support limits.
5. Approve support owner and expected response window, if any.
6. Approve whether test-mode Stripe may be configured for payment-flow inspection.
7. Approve when, if ever, live-payment work may start as a separate scoped lane.
8. Approve legal review path for public Terms, Privacy, refunds, disputes, fees, bookings, vendor/client obligations, and acceptance-version language.
9. Approve release-clean review of the inherited dirty tree before any deployment candidate.
10. Approve Sentinel verification scope for the eventual private pilot environment.

## 11. Findings

Confirmed findings:

- P7 local DB-backed smoke is Sentinel-PASSed, including health 200 and authenticated contract signing, but the final sprint report explicitly denies production/public/live-payment/legal readiness.
- Role-aware navigation and P5 UX tests support a coherent invite-only pilot candidate for planner/provider/venue/admin surfaces.
- Booking request/response and proposal/contract/signature flows have code/test evidence suitable for controlled pilot inspection.
- Payment code contains test-mode/live-key guardrails and manual-admin-only handling, but payment surfaces still require a live-payment freeze in the pilot brief because payment entry is visible on payable contracts.
- Admin transaction visibility is explicitly read-only/local/test-mode and does not expose release/refund/payout/transfer controls.
- Support/help surfaces remain draft/limited; support ownership must be operationally assigned before inviting pilot users.
- Current repo tree is dirty and should not be called release-clean.

Assumptions:

- The private pilot will run in a non-production environment unless Marlon approves otherwise.
- Pilot participants can be invited/role-mapped manually by the owner/operator.
- Atlas/Sentinel will coordinate any environment-specific verification after this package.

## 12. User-facing impact

Positive pilot impact:

- A small invite-only group can inspect the product spine: role entry, event work, provider/venue request handling, proposal/contract/signature flow, and admin observation.
- Clear excluded-flow language reduces confusion around payments, legal enforceability, and support promises.
- Health/preflight/admin surfaces provide enough operational signals for controlled inspection.

Residual user-facing friction/risk:

- Participants may see payment-entry concepts and misunderstand them as live-payment availability unless freeze language is explicit.
- Help/support content is not complete enough for unsupported self-serve use.
- A dirty repo tree and local-smoke evidence can confuse stakeholders if presented as release/production evidence.
- Real pilot data handling needs explicit owner approval before any external participant enters sensitive information.

## 13. Verdict

PARTIAL

OneHub is coherent enough for private-pilot release-control preparation after P7 local smoke PASS, but it is not approved for production, public launch, live payments, legal readiness, billing, or public support commitments.

## 14. Narrow recommended next action for Atlas

Atlas should route a narrow Sentinel/ops verification card for the chosen private pilot environment only after Marlon approves: invite list, environment owner, support owner, data boundary, and live-payment freeze wording. Do not route production launch, public exposure, legal publication, or live-payment work from this package.
