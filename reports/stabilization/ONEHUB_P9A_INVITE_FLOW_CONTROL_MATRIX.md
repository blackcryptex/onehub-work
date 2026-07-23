# OneHub P9A — Private Pilot Invite and Flow-Control Matrix

Generated: 2026-07-22T16:21:00Z
Task: `t_1e2f2d22`
System: OneHub
Repo: `/root/.hermes/workspaces/onehub/repo`
Branch observed: `cleanup/accelerated`

## Executive posture

P9A converts the P8 private-pilot release-control package into an invite-only participant, role, route, and evidence-control matrix. This artifact does not approve production, public launch, legal publication, live payments, billing, credentials, infrastructure, production database use, or destructive database/schema/migration operations.

Pilot posture: PARTIAL — invite-only private pilot control artifact only.

Zero-readiness statement: this matrix makes zero claim of production readiness, public-launch readiness, legal readiness, live-payment readiness, billing readiness, or production infrastructure readiness.

## 1. Scope inspected

Inspected no-code documentation/control scope only:

- `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md`.
- `reports/stabilization/ONEHUB_STABILIZATION_SPRINT_FINAL_REPORT.md`.
- Route/role helper evidence in `apps/web/src/lib/routes.ts`.
- P5/P2 flow evidence already cited by the P8 package.
- Seed/test account evidence in `scripts/seed.ts`.
- Payment/live-key guardrail evidence in `apps/web/src/lib/payments/money-state.ts`.
- Health-check control evidence in `apps/web/src/app/api/health/route.ts`.

Not inspected or changed:

- No product code changed.
- No credentials, production DB, billing, live payment, infra, public exposure, legal text, schema, migration, or destructive operation was changed.
- No hosted/private pilot environment was accessed or verified.

## 2. Evidence reviewed

Primary release-control evidence:

- `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md:11-15` permits only controlled invite-only private-pilot candidate posture and explicitly denies production, public-launch, live-payment, legal, billing, and production-infra readiness.
- `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md:78-109` identifies eligible private-pilot flows: role entry/navigation, planner event/vault work, provider/venue booking request loop, proposal-to-contract-to-signature local smoke path, test-mode payment-entry visibility only, admin observation, and seed/demo path.
- `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md:111-122` excludes production deployment, public signup, public marketplace access, live payments, legal publication, production support commitments, destructive real-data operations, and production-readiness claims.
- `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md:124-132` supplies live-payment freeze language and requires founder escalation for any pay/collect/refund/release/dispute/invoice/billing request.
- `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md:157-189` defines environment checks, during-pilot logging, and after-session evidence requirements.
- `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md:191-218` defines immediate stop conditions and rollback options.

P7/P8 PASS evidence:

- `reports/stabilization/ONEHUB_STABILIZATION_SPRINT_FINAL_REPORT.md:91-105` records P7 final Sentinel PASS: local smoke DB reset, 29 migrations applied in the approved local-only scope, seed loaded, `/api/health` returned HTTP 200, authenticated contract signing returned HTTP 200, tests passed, build passed, and no in-scope P7 blocker remained.
- `reports/stabilization/ONEHUB_STABILIZATION_SPRINT_FINAL_REPORT.md:115-148` keeps private-pilot release controls, release hygiene, legal/support/public trust, live payments, and infrastructure/public exposure as remaining decisions and risks.

Role/route evidence:

- `apps/web/src/lib/routes.ts:23-41` maps vault base path by role: DIY planner, pro planner, client, vendor, venue, admin, and event dreamer.
- `apps/web/src/lib/routes.ts:54-72` maps vault detail routes and sends vendor, venue, admin, and event dreamer away from planner/client vault details to canonical dashboards.
- `apps/web/src/lib/routes.ts:111-126` exposes shared proposal and contract detail route helpers.
- `apps/web/src/lib/routes.ts:147-165` maps role dashboards.

Flow-control evidence:

- `apps/web/tests/p5-provider-booking-ux-flow.test.tsx:61-89` verifies vendor and venue dashboard empty states keep booking-request and listing-management actions discoverable.
- `apps/web/tests/p5-pro-planner-command-center.test.tsx:36-167` verifies planner command-center truth-state labels, progress calculation, and commerce-linked cancel/archive wording.
- `apps/web/tests/p2-canonical-lifecycle.test.ts:16-119` verifies canonical proposal approval, contract generation/signature rules, signable generated contracts, full-contract payment amount matching, and malformed legal acceptance payload handling.
- `apps/web/src/lib/payments/money-state.ts:36-43` blocks non-test Stripe secret keys for payment-intent creation policy.
- `apps/web/src/lib/payments/money-state.ts:45-66` blocks deposit payment intents and requires payable contract/milestone states for payment-intent creation policy.
- `apps/web/src/app/api/health/route.ts:15-40` returns minimal health status and uses HTTP 200 only for `ok`, HTTP 503 for degraded/down/failure.
- `scripts/seed.ts:6-14` seeds test users for DIY planner, pro planner, vendor, venue, client, and admin.
- `scripts/seed.ts:91-115` creates the stable `demo-wedding` demo event.

Repo-state evidence:

- `git status --short` observed an inherited dirty tree before this task, including modified product files and untracked P8/stabilization artifacts. P9A must not add product-code changes and must limit Scout output to this report artifact.

## 3. Approved pilot personas and roles

The following personas are approved for P9A invite-control planning only. Each participant must be explicitly invited, role-mapped, and assigned to one primary persona before receiving access.

| Persona | OneHub role | Pilot purpose | Approved account type | Required operator mapping | Access posture |
|---|---|---|---|---|---|
| DIY planner | `DIY_PLANNER` | Inspect self-serve event planning, vault/event work, checklist/task/budget/guest surfaces, and non-commerce planner flow continuity. | Seed/test account or named invited pilot user. | `participant_id`, `email`, `role=DIY_PLANNER`, `org/event scope`, `data_mode`. | Private invite only; no public signup. |
| Pro planner | `PRO_PLANNER` | Inspect pro planner dashboard, event command center, planner vault, booking request initiation, proposal/contract review path, and commerce-aware cancel/archive copy. | Seed/test account or named invited pilot user tied to approved planner org. | `participant_id`, `email`, `role=PRO_PLANNER`, `org_id/slug`, `event_slug`, `data_mode`. | Private invite only; no production/client obligations. |
| Client | `CLIENT` | Inspect client event route and shared proposal/contract surfaces as a receiving/buyer-side participant. | Seed/test account or named invited client mapped to one approved event/org. | `participant_id`, `email`, `role=CLIENT`, `buyer_org/event scope`, `data_mode`. | Private invite only; no legal acceptance claim. |
| Vendor | `VENDOR` | Inspect vendor dashboard, booking request visibility, listing-management entry points, quote/hold/decline posture, and seller-side contract visibility. | Seed/test account or named invited vendor mapped to approved vendor org. | `participant_id`, `email`, `role=VENDOR`, `seller_org`, `allowed request/event scope`, `data_mode`. | Private invite only; no binding marketplace booking claim. |
| Venue | `VENUE` | Inspect venue dashboard, booking request visibility, listing-management entry points, quote/hold/decline posture, and seller-side contract signature smoke path. | Seed/test account or named invited venue mapped to approved venue org. | `participant_id`, `email`, `role=VENUE`, `seller_org`, `allowed request/event scope`, `data_mode`. | Private invite only; no binding marketplace booking claim. |
| Internal admin/ops observer | `ADMIN` | Observe admin overview, verification, audit, transaction visibility, user-management posture, health/preflight checks, stop-condition enforcement, and evidence intake. | Internal-only named account. | `operator_id`, `email`, `role=ADMIN`, `approved admin surfaces`, `session owner`. | Internal only; no external admin users. |
| Event dreamer | `EVENT_DREAMER` | Optional internal-only route sanity check for dreamer-to-DIY planner posture. | Internal seed/test only unless Marlon explicitly approves. | `participant_id`, `email`, `role=EVENT_DREAMER`, `reason for inclusion`. | Not a default pilot participant. |

Approved default pilot group for first P9 session:

1. One internal pro planner operator.
2. One internal vendor or venue operator.
3. One internal client-side observer.
4. One internal admin/ops observer.
5. Optional one DIY planner only if Marlon wants self-serve planner feedback in the same slice.

Do not invite external/friendly customer/vendor prospects until Marlon approves the exact invite list and written participant expectations.

## 4. Allowed routes and flows

All allowed flows are private, invite-only, non-production, non-public, and subject to the stop conditions in this document.

| Flow id | Persona/role | Allowed route or surface | Allowed action | Required evidence | Hard boundary |
|---|---|---|---|---|---|
| P9A-F01 | All approved non-admin roles | Role dashboard from `dashboard(role)` | Confirm login lands on the expected role surface. | Screenshot or route note with role/account mapping. | Stop if user reaches another role's private/admin-only surface. |
| P9A-F02 | DIY planner | `/diy-planner`, `/diy-planner/vault`, `/diy-planner/vault/[eventSlug]` | Inspect event/vault navigation and planning surfaces with seed/demo or approved non-production data. | Route, event slug, data mode, outcome. | No production data; no destructive real pilot reset without approval. |
| P9A-F03 | Pro planner | `/pro/planner`, `/pro/planner/vault`, `/pro/planner/vault/[eventSlug]` | Inspect command center, checklist/task/budget/guest/milestone continuity, and commerce-aware event action copy. | Route, event slug, progress/status observed, defects. | No public launch claims; no destructive commerce-linked changes without operator approval. |
| P9A-F04 | Client | `/client`, `/client/events/[eventSlug]` | Inspect client event view and shared proposal/contract handoff visibility where available. | Route, event slug, client account mapping. | No legal enforceability claim. |
| P9A-F05 | Vendor | `/vendor/dashboard`, `/requests`, `/marketplace/manage` | Inspect booking request/listing-management discoverability and provider response posture. | Request id or seed scenario, response attempted, outcome. | Quote/hold/decline is pilot/test-operational only, not a binding booking. |
| P9A-F06 | Venue | `/venue/dashboard`, `/requests`, `/marketplace/manage` | Inspect venue request/listing-management discoverability and response posture. | Request id or seed scenario, response attempted, outcome. | Quote/hold/decline is pilot/test-operational only, not a binding booking. |
| P9A-F07 | Planner + provider/venue | `/events/[eventSlug]/proposals`, `/events/[eventSlug]/proposals/new`, `/proposals/[id]` | Inspect proposal creation/approval/visibility only in approved non-production data mode. | Proposal id, actor role, state transition, outcome. | No legal acceptance or billing/payment obligation claim. |
| P9A-F08 | Client/planner/provider/venue | `/contracts/[id]` | Inspect contract viewing and signature smoke path where state is signable. | Contract id, actor role, status before/after, outcome. | Product-flow artifact only; no legal enforceability claim. |
| P9A-F09 | Admin/internal ops | `/admin/overview`, admin verification/audit/user/transaction visibility surfaces as available | Observe pilot state, transaction visibility, and audit/oversight posture. | Admin route checked, findings, stop-condition notes. | Read-only observation by default; no release/refund/payout/transfer/admin payment action. |
| P9A-F10 | Operator/evidence owner | `/api/health`, `/api/demo/preflight` where applicable | Confirm environment health and seed/demo posture before each session. | HTTP status, timestamp, data mode, operator initials. | Stop if health is non-200, data mode is unclear, or environment appears production/public. |

## 5. Excluded flows

The following are excluded from P9A and from private pilot operation unless Marlon approves a separate scoped lane and Sentinel independently verifies it:

- Production deployment, production database use, production credentials, production migrations, production schema changes, production monitoring, DNS, SSL, hosting, public traffic, or public exposure.
- Public signup, public marketplace access, open invite links, public marketing launch, app-store/public directory listing, or any invite mechanism that cannot be controlled by named operators.
- Live payments and billing: live Stripe keys, live card collection, payment capture, escrow/fund movement, payouts, transfers, refunds, disputes, chargebacks, fee collection, invoicing, billing subscriptions, tax claims, or payment release operations.
- Legal publication or legal-readiness claims: Terms, Privacy, payment terms, refund/dispute/fee language, vendor/client obligations, acceptance-version legal effect, escrow guarantees, or booking enforceability.
- Production support commitments: phone support, AI chat support, SLA promises, incident response promises, public help-center completeness claims, or unsupported self-serve escalation paths.
- Destructive operations on real pilot-entered data without written operator approval and evidence export/retention decision.
- Cross-role probing, admin access by external users, unauthorized event/org access, or any test intended to bypass authorization outside a separate security review lane.
- Any statement that seed/demo, test-mode, local smoke, or P7/P8 evidence proves production readiness.

## 6. Required account mapping

Before each invite is sent, the pilot owner must complete this mapping. If any field is unknown, do not invite the participant.

| Field | Required value | Example allowed value | Stop condition if missing/unclear |
|---|---|---|---|
| `participant_id` | Stable internal identifier for the invitee. | `pilot-001` | Stop invite. |
| `participant_name` | Human-readable participant name. | `Internal Pro Planner A` | Stop invite. |
| `participant_email` | Exact account email to be used. | `pro@example.com` or approved named pilot email. | Stop invite. |
| `role` | One primary OneHub role. | `PRO_PLANNER` | Stop invite; no multi-role ambiguity. |
| `persona` | One approved pilot persona. | `Pro planner` | Stop invite. |
| `org_id_or_slug` | Approved organization scope, if role is org-scoped. | `planner-agency`, `vendor-co`, `venue-llc`. | Stop flow if org-scoped route is used. |
| `event_slug_or_id` | Approved event scope, if event-specific flow is used. | `demo-wedding`, `agency-sample-event`, or approved pilot event. | Stop event/vault/proposal/contract flow. |
| `data_mode` | `seed/demo`, `pilot-entered non-production`, or `unclear`. | `seed/demo` | Stop if `unclear`. |
| `environment_label` | Private non-production target label. | `local smoke`, `private staging`, `pilot sandbox`. | Stop if production/public ambiguity exists. |
| `support_owner` | Named owner for participant issue intake. | `Marlon`, `Atlas-designated operator`. | Stop invite. |
| `evidence_owner` | Named owner for evidence capture. | `Scout/Atlas-designated evidence owner`. | Stop session. |
| `payment_boundary_ack` | Participant/operator acknowledgment that live payments are frozen. | `acknowledged` | Stop if not acknowledged. |
| `legal_boundary_ack` | Participant/operator acknowledgment that pilot artifacts are not legal/public-launch approval. | `acknowledged` | Stop if not acknowledged. |

Seed/test account inventory from current seed evidence:

| Seed email | Seed role | Default P9A use |
|---|---|---|
| `diy@example.com` | `DIY_PLANNER` | Internal self-serve planner route check. |
| `pro@example.com` | `PRO_PLANNER` | Internal planner command-center and proposal/contract flow check. |
| `vendor@example.com` | `VENDOR` | Internal provider booking/listing route check. |
| `venue@example.com` | `VENUE` | Internal venue booking/listing and seller-side signature smoke check. |
| `client@example.com` | `CLIENT` | Internal client event/proposal/contract visibility check. |
| `admin@example.com` | `ADMIN` | Internal admin observation check. |
| `admin@onehub.local` | `ADMIN` | Internal admin observation fallback only. |

Seed accounts are repeatable demo/test accounts, not approved external pilot accounts. External participants require Marlon-approved invite mapping before use.

## 7. Per-session evidence log template

Copy this template for every private pilot session. Do not include secrets, raw credentials, full payment details, or uncontrolled PII in durable logs.

```md
# OneHub Private Pilot Session Evidence Log

Session id:
Date/time UTC:
Operator:
Evidence owner:
Support owner:
Environment label:
Environment URL or local target label:
Health check result before session:
Demo/preflight result, if applicable:
Data mode: seed/demo | pilot-entered non-production | unclear
Live-payment freeze acknowledged: yes | no
Legal/public-launch freeze acknowledged: yes | no

## Participant/account mapping

| Participant id | Name | Email | Role | Persona | Org scope | Event scope | Invite approved by | Boundary ack complete? |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

## Flow attempts

| Attempt id | Flow id | Actor role | Route/surface | Data object id/slug | Action attempted | Expected result | Actual result | Evidence link/path | Outcome: PASS/PARTIAL/BROKEN/UNCLEAR | Stop condition triggered? |
|---|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |

## Defects/friction observed

| Finding id | Severity | User-facing issue | Evidence | Assumption vs confirmed | Recommended narrow correction | Owner/routing |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |

## Excluded-flow requests

| Request | Participant role | Why excluded | Operator response | Escalated to Marlon/Atlas? |
|---|---|---|---|---|
|  |  |  |  |  |

## Data handling notes

- Was pilot-entered data created? yes | no
- Was any data exported? yes | no
- Was any data reset/deleted? yes | no
- Written approval for reset/delete, if any:
- Screenshots/logs scrubbed for secrets/PII? yes | no | not applicable

## Session closeout

Overall session verdict: COHERENT | PARTIAL | BROKEN | UNCLEAR | OUT OF SCOPE
Residual blocker:
Founder escalation required? yes | no
Recommended next action for Atlas:
```

## 8. Operator go/no-go checklist

### Before invite

| Check | Go condition | No-go condition |
|---|---|---|
| Invite list | Exact participants approved by Marlon or Atlas-designated pilot owner. | Any participant, email, role, or persona is unknown/unapproved. |
| Role mapping | Each participant has one primary role/persona and one approved route/flow scope. | Multi-role ambiguity or cross-org/cross-event scope uncertainty. |
| Environment | Target is private, non-public, non-production, and labeled. | Production/public target, unknown DB, unknown secrets, or public exposure ambiguity. |
| Payment freeze | Live-payment freeze language acknowledged by operators and participants. | Any request or expectation for real pay/collect/refund/release/dispute/invoice/billing. |
| Legal/public freeze | Participant communication says pilot is not public launch/legal approval. | Any legal/public-launch/marketplace enforceability claim. |
| Support owner | Named support intake owner and channel are active for the session. | No owner, no channel, phone/AI chat/SLA promise, or unsupported support expectation. |
| Evidence owner | Named evidence owner has the log template ready. | No one assigned to evidence capture. |
| Health | `/api/health` returns HTTP 200 in the selected environment. | Non-200 health or dependency ambiguity. |
| Demo/preflight | If using seed/demo flow, preflight posture is known. | Seed/demo status unclear while relying on seed/demo narratives. |
| Data boundary | `data_mode` is set before the session. | `data_mode=unclear`. |

### During session

| Check | Continue condition | Stop condition |
|---|---|---|
| Role surface | Participant remains inside mapped role/org/event surfaces. | Participant reaches unauthorized role, org, event, or admin surface. |
| Allowed flow | Attempt maps to one P9A flow id. | Attempt enters excluded flow list. |
| Payment language | Payment UI, if visible, is explained as test-mode/product-flow only. | Participant interprets payment UI as live payment availability. |
| Contract language | Contract/proposal artifacts are framed as pilot product-flow artifacts only. | Participant treats artifacts as legally binding or public-marketplace ready. |
| Health/support | Health stays OK and support owner can respond. | Health non-200, support unavailable, or operational ownership unclear. |
| Evidence | Each attempt is logged with outcome and user-facing impact. | Evidence cannot be safely captured or would expose secrets/uncontrolled PII. |

### After session

| Check | Complete condition | Escalation condition |
|---|---|---|
| Evidence log | Session log is complete enough for Atlas/Sentinel review. | Missing route, role, data mode, result, or stop-condition evidence. |
| Data handling | Created/exported/reset data is recorded with owner approval where needed. | Pilot-entered data handling is unclear or destructive action occurred without approval. |
| Findings | Friction is separated into confirmed findings and assumptions. | Findings rely on memory or unverified participant reports only. |
| Residuals | No residual or explicit Marlon-required decision captured. | Invite expansion, environment change, legal/payment/support/public decision needed. |
| Next action | Narrow recommendation provided to Atlas. | Scope expansion required without founder approval. |

## 9. Participant communication boundaries

Use plain, controlled language in invitations and session scripts:

Approved message boundaries:

- "You are being invited to a private, invite-only OneHub pilot session."
- "This session is for product-flow inspection and feedback, not public launch."
- "Use only the account, role, event, and flows assigned by the pilot operator."
- "Do not enter sensitive real payment details."
- "Payment, escrow, payout, refund, dispute, transfer, billing, fee, and fund-movement functionality is frozen."
- "Contracts, proposals, bookings, and marketplace actions in this pilot are product-flow artifacts unless Marlon later approves a separate legal/payment path."
- "Support during this pilot is through the named pilot support channel only; no phone/AI chat/SLA commitment is being made."
- "Screenshots or logs may be captured for product evidence, but should avoid secrets, payment data, or unnecessary personal information."

Disallowed message boundaries:

- Do not say OneHub is production-ready.
- Do not say OneHub is publicly launched.
- Do not say OneHub supports live payments, escrow, payouts, refunds, disputes, transfers, billing, or fee collection.
- Do not say OneHub legal terms, payment terms, privacy terms, refund/dispute language, or vendor/client obligations are legal-approved.
- Do not promise phone support, AI chat support, incident response, SLA response windows, or public help-center completeness.
- Do not invite participants to explore outside their assigned role/event/org scope.
- Do not ask participants to use real cards, live bank details, production credentials, or production data.
- Do not frame seed/demo/local smoke evidence as production or market readiness.

Recommended invite note:

> You are invited to a private OneHub pilot session for controlled product-flow inspection. The pilot is invite-only and not a public launch. Please use only the account, role, event, and flows assigned by the operator. OneHub live payments, billing, escrow, payouts, refunds, disputes, transfers, fees, and fund movement are frozen; any payment UI you see is test-mode/product-flow inspection only and must not be used for real money. Contracts, proposals, booking requests, and marketplace actions in this session are pilot artifacts, not legal or payment-ready business records. Send issues to the named pilot support owner during the session.

## 10. Explicit live-payment, legal, and public-launch freeze

Live-payment freeze:

"OneHub private pilot is invite-only and does not support live payments. All payment, escrow, payout, refund, dispute, transfer, billing, fee, invoice, card-collection, and fund-movement functionality is frozen unless Marlon separately approves live-payment operations and Sentinel independently verifies the approved environment. Any payment UI visible during pilot is for controlled test-mode/product-flow inspection only and must not be used to collect or move real funds."

Legal freeze:

"OneHub private pilot does not represent legal approval of Terms, Privacy, payment terms, refund/dispute/fee language, vendor/client obligations, booking enforceability, acceptance-version language, escrow status, or contract enforceability. Pilot contracts, proposals, bookings, signatures, listings, and requests are product-flow artifacts unless Marlon separately routes and approves a legal review lane."

Public-launch freeze:

"OneHub private pilot is not public launch. No public signup, public marketplace access, public marketing claim, production-readiness claim, public-support claim, production deployment, DNS/SSL/hosting/public exposure, or open invite path is approved by this artifact."

Founder escalation trigger:

If a participant, operator, or stakeholder asks to move money, collect payment details, publish legal terms, launch publicly, invite external users beyond the approved list, use production DB/credentials, expose the app publicly, change infra, make billing claims, or destroy real pilot-entered data, stop and route to Marlon/Atlas as FOUNDER ESCALATION REQUIRED.

## 11. Stop conditions and rollback posture

Immediate stop conditions:

- Any `sk_live_` key, live webhook, live charge, payout, transfer, refund, dispute, chargeback, billing request, invoice request, fee collection, or fund-movement path appears.
- `/api/health` is not HTTP 200 in the selected environment.
- Target DB, environment, invite mechanism, or credentials boundary is unclear.
- Participant reaches unauthorized role, org, event, data, or admin surface.
- Participant interprets payment/legal/support copy as live, binding, public, or production-ready.
- Support owner is unavailable during a session.
- Evidence capture would expose secrets, raw credentials, full payment data, or uncontrolled PII.
- Real pilot-entered data is about to be reset, deleted, exported, or retained without explicit approval.

Rollback posture:

1. Soft stop: pause invites/sessions and preserve environment for evidence capture.
2. Flow freeze: allow login/dashboard observation only; stop booking/proposal/contract/payment-entry attempts.
3. Seed/demo reset: reset only approved local/seed/demo data when environment owner approves.
4. Pilot-data hold: preserve real pilot-entered non-production data until Marlon/Atlas approves retention/export/reset.
5. Full pilot stop: revoke/pause pilot access, preserve evidence, and route findings to Atlas.

## 12. Residual decisions

No P9A documentation/control contradiction was found that required product-code changes. This artifact is ready as the P9A invite/role/flow-control matrix.

Residual decisions before any actual pilot invite goes out are founder/operator decisions, not Scout implementation decisions:

1. Marlon or Atlas-designated pilot owner must approve the exact invite list.
2. Marlon or Atlas-designated environment owner must approve the exact non-production private pilot environment.
3. Marlon must approve whether external/friendly participants are allowed, or whether first session remains internal-only.
4. Marlon or Atlas-designated support owner must approve the support channel and response posture.
5. Marlon must approve whether any pilot-entered non-production data may be retained, exported, or reset.
6. Marlon must approve whether test-mode Stripe inspection is allowed; live payments remain frozen regardless.

These decisions are FOUNDER ESCALATION REQUIRED before expanding beyond internal/seed/demo controlled flow inspection.

## 13. Findings

Confirmed findings:

- P8 already defines the eligible and excluded private-pilot lanes, but P9A needed an operational matrix tying personas, routes, account mapping, and evidence capture into one artifact.
- P7/P8 evidence supports controlled private-pilot inspection of role entry, planner event/vault work, provider/venue booking request loops, proposal/contract/signature smoke flow, admin observation, and seed/demo posture.
- Payment code includes a test-key guard, but participant/operator communication still needs explicit live-payment freeze language because payment concepts may be visible during contract/payment-entry inspection.
- Route helpers intentionally return canonical dashboards for vendor, venue, admin, and event dreamer instead of planner/client vault detail surfaces.
- Seed accounts exist for DIY planner, pro planner, vendor, venue, client, and admin, but seed accounts are not equivalent to approved external pilot participants.
- The repo remains inherited-dirty; P9A must be treated as a report artifact, not a release-clean code state.

Assumptions:

- The first pilot session will use seed/demo or approved non-production data unless Marlon approves named external participants and data handling.
- Atlas/Sentinel will own any future environment-specific verification routing.
- Scout is not approving final QA, production launch, legal readiness, live payments, or public exposure.

## 14. User-facing impact

Positive impact:

- Participants can be routed through narrow, role-correct flows without implying public launch, live payments, or legal readiness.
- Operators have a repeatable mapping and evidence template to capture what each participant actually saw.
- Explicit stop conditions reduce the risk that visible payment/contract/booking concepts are misunderstood as binding or live.

Residual user-facing risk:

- Payment-entry and contract concepts may still confuse participants unless the freeze language is read before the session.
- Help/support remains limited; the support owner and channel must be set before invites.
- External participants increase data, legal, support, and expectation risk and require Marlon approval.

## 15. Verdict

PARTIAL

OneHub has a coherent P9A invite/role/flow-control matrix for a controlled invite-only private pilot candidate. It is not approval for production, public launch, live payments, legal readiness, billing, credentials, infrastructure, production DB use, or external participant expansion.

## 16. Narrow recommended next action for Atlas

Atlas should route the next narrow P9 slice only after Marlon approves the exact pilot invite list, environment owner, support owner, and data boundary. Recommended next safe route: Sentinel/ops verification of the selected private non-production pilot environment using this P9A matrix; do not route production, public launch, legal publication, live-payment, billing, infra, or production-DB work from P9A.
