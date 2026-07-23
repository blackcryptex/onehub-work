# OneHub P9C — Support/Admin Monitoring and Pilot-Session Operating Runbook

Generated: 2026-07-22
Task: `t_557568aa`
System: OneHub
Repo: `/root/.hermes/workspaces/onehub/repo`
Branch observed: `cleanup/accelerated`

## Executive posture

P9C converts the P9A invite/flow controls and P9B private non-production environment package into an operating runbook for a small invite-only private pilot session.

Pilot operating posture: PARTIAL — operational runbook only.

Zero-readiness statement: this runbook makes zero claim of production readiness, public-launch readiness, legal readiness, live-payment readiness, billing readiness, production-support readiness, production-monitoring readiness, credential readiness, infrastructure readiness, or production database readiness.

## 1. Backend or structural scope reviewed

Reviewed no-code support/admin monitoring and pilot-session operations scope only:

- P9A invite/role/flow-control matrix: `reports/stabilization/ONEHUB_P9A_INVITE_FLOW_CONTROL_MATRIX.md`.
- P9B private non-production environment verification package: `reports/stabilization/ONEHUB_P9B_PRIVATE_ENVIRONMENT_VERIFICATION.md`.
- P8 private pilot release-control package: `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md`.
- Health and demo preflight endpoints: `apps/web/src/app/api/health/route.ts`, `apps/web/src/lib/health.ts`, `apps/web/src/app/api/demo/preflight/route.ts`.
- Support/help posture: `apps/web/src/app/support/page.tsx`, `apps/web/src/app/help/page.tsx`.
- Admin observation surfaces: `apps/web/src/app/(app)/admin/overview/page.tsx`, `apps/web/src/app/(app)/admin/verification/page.tsx`, `apps/web/src/app/(app)/admin/transactions/page.tsx`, `apps/web/src/app/(app)/admin/audit/page.tsx`.
- Route/role helper evidence: `apps/web/src/lib/routes.ts`.
- Package scripts and repo-state posture: `package.json`, `git status --short`.

Not performed:

- No product code changed.
- No environment was started.
- No hosted/private pilot URL was accessed.
- No DB reset, migration, seed, destructive command, credentials, billing, live payment, Stripe dashboard, production/public infrastructure, DNS/SSL/hosting, legal, or public-launch action was performed.

## 2. Evidence examined

P9A/P9B/P8 control evidence:

- P9A states it is not production, public-launch, legal, live-payment, billing, credential, infrastructure, or production-DB approval: `reports/stabilization/ONEHUB_P9A_INVITE_FLOW_CONTROL_MATRIX.md:9-15`.
- P9A requires participant/account/environment/data/support/evidence mapping before invites: `reports/stabilization/ONEHUB_P9A_INVITE_FLOW_CONTROL_MATRIX.md:127-159`.
- P9A requires `/api/health` and `/api/demo/preflight` pre-session checks and stops if health, data mode, or environment posture is unclear: `reports/stabilization/ONEHUB_P9A_INVITE_FLOW_CONTROL_MATRIX.md:101-113`, `221-237`, `307-326`.
- P9A defines participant communication boundaries and live-payment/legal/public-launch freeze language: `reports/stabilization/ONEHUB_P9A_INVITE_FLOW_CONTROL_MATRIX.md:259-305`.
- P9B preserves support/admin monitoring needs and exact Marlon-required decisions before real invites: `reports/stabilization/ONEHUB_P9B_PRIVATE_ENVIRONMENT_VERIFICATION.md:262-343`.
- P8 identifies required owners: pilot owner, environment owner, support owner, admin/ops owner, and evidence owner: `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md:134-156`.
- P8 defines environment monitoring checks, during-session logging, and post-session logging: `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md:157-189`.
- P8 defines immediate stop conditions and rollback options: `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md:191-218`.

Repo evidence:

- `/api/health` returns minimal `status` and `timestamp`; HTTP 200 only for `ok`, HTTP 503 for degraded/down/failure: `apps/web/src/app/api/health/route.ts:15-40`.
- Health checks DB connectivity and Stripe connectivity only if Stripe is configured; missing Stripe is treated as optional/ok: `apps/web/src/lib/health.ts:20-59`.
- `/api/demo/preflight` returns `demoModeActive`, `seedOk`, `verifiedListingsCount`, AI availability/fallback, and timestamp; failure returns HTTP 500 with safe status fields: `apps/web/src/app/api/demo/preflight/route.ts:10-70`.
- Support page marks AI chat and phone support as not operationally verified and points current support to email; response timing remains an internal draft: `apps/web/src/app/support/page.tsx:21-37`.
- Help page marks documentation, videos, API docs, and articles as coming soon/draft: `apps/web/src/app/help/page.tsx:67-118`.
- Admin overview is role-gated and links to verification, transactions, audit, and users: `apps/web/src/app/(app)/admin/overview/page.tsx:8-45`.
- Admin verification is role-gated and surfaces refunds, disputes, holdbacks, payouts, and overrides for canonical review: `apps/web/src/app/(app)/admin/verification/page.tsx:24-141`.
- Admin transactions page is role-gated and explicitly describes read-only local/test-mode payment visibility with no release/refund/payout/transfer/provider controls exposed: `apps/web/src/app/(app)/admin/transactions/page.tsx:15-100`.
- Admin audit is role-gated and redacts metadata that looks like secrets, tokens, credentials, provider payloads, signatures, or raw webhook payloads: `apps/web/src/app/(app)/admin/audit/page.tsx:14-70`.
- Route helper maps roles to canonical surfaces, including admin to `/admin/overview`, vendor to `/vendor/dashboard`, venue to `/venue/dashboard`, and client/planner to role-specific event/vault paths: `apps/web/src/lib/routes.ts:23-72`, `147-167`.
- `package.json:6-20` defines dev/build/lint/typecheck/test/e2e/db scripts; this P9C task did not run service start, DB, migration, seed, or destructive scripts.
- `git status --short` observed an inherited dirty tree before this run, with existing product-code modifications and untracked P8/P9 reports. P9C output is limited to this report artifact and is not release-clean proof.

## 3. Correctness verdict

PARTIAL

OneHub has enough documented and repo-backed control evidence to operate a small invite-only private pilot session with named support/admin/evidence ownership, health/preflight checks, severity routing, stop conditions, rollback posture, and founder escalation triggers.

This runbook does not certify any selected hosted/private environment, production support readiness, public support commitments, live payment operations, billing, legal readiness, production database use, public exposure, or release-clean code state.

## 4. Exact risks or blockers

1. Pilot-owner decision blocker
   - Real invites cannot begin until Marlon or an explicitly Atlas-designated pilot owner records the exact invite list, session owner, environment owner, support owner, admin observer, evidence owner, data boundary, rollback owner, and participant communication boundary.

2. Support posture risk
   - Product support/help surfaces remain draft/limited. Email exists in product copy, but AI chat, phone support, SLA, public help-center completeness, and response timing are not operationally verified.

3. Admin observation risk
   - Admin surfaces expose powerful operational views. Pilot admin observation must be internal-only, role-mapped, read-only by default, and must not execute release/refund/payout/transfer/dispute/payment mutations without separate Marlon/Sentinel approval.

4. Health/preflight risk
   - `/api/health` confirms only minimal dependency status and `/api/demo/preflight` confirms only demo/seed posture. Health 200 and seedOk do not prove production readiness, legal readiness, public-launch readiness, or live-payment readiness.

5. Data-boundary risk
   - Seed/demo data and real pilot-entered non-production data must not be mixed in reporting. If `data_mode` is unclear, stop the session.

6. Live-payment/legal/public expectation risk
   - Contract, proposal, booking, payment, refund, dispute, payout, and support concepts can be misread as binding/live. Every participant brief must preserve the P9A/P9B freeze language.

7. Dirty-tree/release-clean risk
   - The repo remains inherited-dirty. This runbook supports operation of a controlled private pilot only; it does not establish a clean deployable release candidate.

## 5. Required owner map before any pilot session

If any required owner is missing, stop before invites.

| Owner | Required named person/role | Owns | Must not do |
|---|---|---|---|
| Pilot owner | Marlon or Atlas-designated pilot owner | Invite list, session approval, participant expectations, start/stop authority, founder escalations | Expand invite scope without Marlon approval |
| Environment owner | Named ops/environment owner | Private non-production target, DB classification, secret source, auth callback/base URL, rollback path, health/preflight execution | Expose credentials, touch production DB, change infra, start public service |
| Support owner | Named support intake owner | Single monitored support channel, issue triage, participant support responses, support log | Promise AI chat, phone, SLA, 24/7, public support, or unapproved response windows |
| Admin/ops observer | Named internal admin only | Admin overview/verification/transactions/audit observation, stop-condition detection | Invite external admins, execute payment/admin mutations, inspect unauthorized cross-org data |
| Evidence owner | Named evidence owner | Evidence log, screenshot/log hygiene, defect records, storage naming, scrubbed artifacts | Store secrets, raw credentials, full payment details, uncontrolled PII |
| Rollback owner | Environment owner or pilot owner | Soft stop, flow freeze, seed reset approval, pilot-data hold, full stop execution | Reset/export/delete real pilot-entered data without approval |

## 6. Support intake owner workflow

Use one owner-controlled intake queue for the session. Do not route participants to multiple unsupported channels.

Approved support intake channel:

- Default channel: owner-monitored email or private operator channel selected before session.
- Product copy currently points to `support@onehub.events`, but the active pilot channel must be confirmed by the support owner before invites.
- Support owner records all issues in the session evidence log or agreed issue queue using the naming rules in section 12.

Workflow:

1. Before invite
   - Confirm support owner name.
   - Confirm monitored channel label.
   - Confirm response expectation language; if no approved response window exists, say only that support is pilot-limited and owner-monitored during the session.
   - Confirm participants know not to use phone, AI chat, public help center, or unsupported social/direct channels as official pilot support.

2. During session
   - Support owner watches the approved channel continuously for the session window.
   - Every inbound issue receives an intake id: `P9C-SUPPORT-<session_id>-<nn>`.
   - Log participant id, role, route/surface, issue summary, severity, evidence path, and routing owner.
   - Separate confirmed defects from participant confusion or unsupported/excluded requests.
   - Stop immediately if support owner becomes unavailable.

3. After session
   - Close each issue as `resolved in session`, `known limitation`, `defect routed`, `excluded/out of scope`, or `founder escalation required`.
   - Produce a support summary: issue count by severity, unresolved issues, excluded-flow requests, communication confusion, and next action for Atlas.
   - Do not promise fixes, launch timelines, legal/payment changes, refunds, billing changes, or production support.

## 7. Admin monitoring schedule

Admin monitoring is internal-only and read-only by default.

| Timing | Admin/ops action | Evidence to record | Stop condition |
|---|---|---|---|
| T-30 minutes | Confirm admin account is internal-only and role-gated to admin surfaces | Admin account email, role, allowed surfaces | External admin, unknown role, unauthorized surface |
| T-20 minutes | Open admin overview only after environment owner approves target | Route checked, timestamp, high-level counts only | Cross-org/private data exposure or auth failure |
| T-15 minutes | Check admin verification page for refunds/disputes/holdbacks/payouts/overrides only as observation | Route, filters if any, count summary without sensitive details | Any payment mutation/control request |
| T-10 minutes | Check admin transactions page as read-only local/test-mode visibility | Route, count summary, manual-admin-only signals | Release/refund/payout/transfer/provider action needed |
| T-5 minutes | Check admin audit page for unexpected auth/admin/payment events | Route, redacted finding ids | Secret/raw webhook/credential exposure |
| During each flow | Observe only the mapped participant/session objects | Role, route, object id/slug, anomaly | Unauthorized role/org/event/admin access |
| On defect report | Re-check relevant admin surface only if safe and necessary | Defect id, evidence path, severity | PII/secret exposure or scope expansion needed |
| Session close | Final overview/transactions/audit check | Closeout timestamp, unresolved admin findings | Live-payment, production/public, support/legal confusion |

Admin boundaries:

- No external admin users.
- No admin impersonation unless separately approved for a named internal account and logged.
- No release, refund, payout, transfer, dispute, holdback mutation, webhook replay, billing, fee, Stripe Connect, or provider-dashboard action.
- No cross-org or cross-event probing outside the approved participant mapping.
- Any admin surface exposing secrets, raw credentials, full payment details, or uncontrolled PII triggers stop and evidence-scrub handling.

## 8. Health and preflight cadence

Run checks only against the approved private non-production target or local target. Do not start public services from this runbook.

Required cadence:

| Timing | Check | Required safe result | Stop condition |
|---|---|---|---|
| T-30 minutes | Target/owner confirmation | Environment label, owner, DB classification, data mode, support owner recorded | Any unknown target, public/prod ambiguity, unknown DB |
| T-20 minutes | `GET <target>/api/health` | HTTP 200, `status=ok`, timestamp recorded | Non-200, degraded/down, inaccessible target, stack trace, secret leakage |
| T-15 minutes | `GET <target>/api/demo/preflight` if seed/demo is used | `seedOk=true`; demo/AI fallback posture understood | HTTP 500, `seedOk=false` when seed/demo required, unclear `ONEHUB_DEMO_MODE` posture |
| T-10 minutes | Account/role mapping | Each participant has one role/persona/event/org scope | Multi-role, unknown email, unknown event/org |
| T-5 minutes | Payment freeze confirmation | Stripe absent or owner-attested test-mode only; no live money movement | Any live key/webhook/payment/billing/fund-movement expectation |
| Every 30 minutes during session | Health re-check | HTTP 200, `status=ok` | Non-200 or dependency ambiguity |
| Immediately after any failure report | Health re-check and support/admin correlation | Failure correlated to route/role/object if safe | Unknown root cause affecting active session |
| Session end | Health and preflight closeout if used | Final status/timestamp recorded | Missing closeout evidence |

Health/preflight evidence fields:

- `session_id`
- `environment_label`
- `target_label_or_redacted_url`
- `operator_initials`
- `timestamp_utc`
- `endpoint`
- `http_status`
- `safe_response_fields`
- `data_mode`
- `result`: `PASS | PARTIAL | FAIL | UNCLEAR`
- `stop_condition_triggered`: `yes | no`

## 9. Pilot session start procedure

Do not start a session until every required field is recorded.

1. Confirm scope freeze
   - Private invite-only pilot only.
   - No public launch, production, legal, billing, live-payment, credentials, infrastructure, DB reset, service start, or launch claim.

2. Confirm owner map
   - Pilot owner, environment owner, support owner, admin/ops observer, evidence owner, and rollback owner are named.

3. Confirm participant map
   - Each participant has one id, name, email, role, persona, org scope, event scope, data mode, environment label, support owner, evidence owner, payment-boundary ack, and legal-boundary ack.

4. Confirm environment
   - Selected target is private, non-public, non-production, invite-only.
   - DB target is classified without exposing credentials.
   - Secret source is known without copying secret values.

5. Run preflight
   - `/api/health` passes.
   - `/api/demo/preflight` passes if seed/demo data is used.
   - Account/role mapping is available.
   - Support/admin/evidence owners are active.

6. Read participant boundary script
   - Use only approved communication boundaries from section 13.
   - Explicitly state live payments, legal enforceability, public launch, production support, and public marketplace claims are not approved.

7. Start session log
   - Create evidence folder/log using section 12 naming rules.
   - Assign first flow attempt id.

8. Begin only the approved flow
   - Each flow must map to P9A flow ids and approved routes.
   - Stop if participant asks to leave assigned scope.

## 10. Pilot session end procedure

1. Stop participant activity
   - Confirm no participant continues unsupervised exploration.
   - Pause or end access according to the pilot owner’s access rule.

2. Run closeout checks
   - Re-check `/api/health`.
   - Re-check `/api/demo/preflight` if seed/demo posture was part of the session.
   - Admin observer checks overview/transactions/audit only as read-only evidence.

3. Close evidence log
   - Each flow attempt has role, route, object id/slug, expected result, actual result, evidence path, and outcome.
   - Each defect has severity, evidence, owner/routing, and whether it is confirmed or assumed.
   - Each excluded-flow request is recorded with operator response.

4. Close support log
   - Each issue has a final status or routing owner.
   - Unresolved issues are categorized by severity.
   - Communication confusion is logged separately from product defects.

5. Data handling closeout
   - Record whether pilot-entered data was created.
   - Record whether data was exported, retained, reset, or deleted.
   - If data handling is unclear, stop and route to Marlon/Atlas before cleanup.

6. Produce session verdict
   - Allowed verdicts: `COHERENT`, `PARTIAL`, `BROKEN`, `UNCLEAR`, `OUT OF SCOPE`.
   - Record recommended next action for Atlas.
   - Mark `FOUNDER ESCALATION REQUIRED` for any Marlon-required decision.

## 11. Defect severity routing

Use the narrowest safe routing. Do not convert defects into broad implementation tasks without Atlas routing.

| Severity | Definition | Examples | Immediate action | Routing |
|---|---|---|---|---|
| S0 STOP | Safety, security, money, production, legal, public exposure, data-boundary, credential, or access-control risk | Live key, public/prod target, participant reaches unauthorized org/admin data, real payment/fund movement, credential/secret exposure, destructive real-data action | Stop session or affected flow immediately; preserve evidence | Atlas + Marlon. FOUNDER ESCALATION REQUIRED when scope/cost/security/payment/legal/public/prod decision is involved |
| S1 BLOCKING | Core approved pilot flow cannot continue or health/support/admin ownership fails | `/api/health` non-200, support owner unavailable, login/role mapping fails for primary flow, admin observation cannot verify critical anomaly | Freeze affected flow; continue only unrelated safe observation if pilot owner approves | Atlas routes to appropriate specialist; Sentinel/Steward if structural/backend correctness |
| S2 HIGH | Significant participant-facing defect in approved flow, but session can continue safely with workaround | Proposal/contract visibility wrong, route confusion, status mismatch, missing expected booking request, admin count anomaly | Log evidence; restrict flow if needed | Atlas routes implementation/review after session |
| S3 MEDIUM | Friction, copy ambiguity, missing draft support/help content, non-blocking UX confusion | Participant misunderstands pilot/payment/legal/support boundary but accepts correction; help article missing | Log and correct verbal boundary; continue | Atlas decides follow-up priority |
| S4 LOW | Cosmetic, wording, minor evidence gap with no safety impact | Minor label typo, screenshot missing noncritical field | Log only | Backlog if Atlas chooses |
| OUT OF SCOPE | Request outside P9C/P9 allowed pilot | Public launch, live payment, legal approval, billing, production infra, provider dashboard changes, DB reset | Decline within script boundary; stop if repeated | Marlon/Atlas decision only |

Severity assignment rules:

- If money movement, live credentials, legal/public claim, production/public exposure, destructive real-data action, or unauthorized data access is involved, classify as S0 STOP.
- If health/support ownership is broken, classify at least S1 BLOCKING.
- If evidence cannot be captured safely without secrets/PII, classify S0 STOP for evidence handling.
- If a participant asks for an excluded flow, classify as OUT OF SCOPE and escalate only if they request scope change.

## 12. Evidence naming and storage rules

P9C does not create or choose a production evidence system. Use these rules for scrubbed local/private pilot evidence storage selected by the evidence owner.

Recommended root path pattern:

`reports/stabilization/evidence/p9c/<session_id>/`

Session id pattern:

`P9C-YYYYMMDD-<environment_label>-<nn>`

File naming patterns:

- Session log: `<session_id>__session-log.md`
- Health check: `<session_id>__health__<YYYYMMDDTHHMMSSZ>.json`
- Demo preflight: `<session_id>__demo-preflight__<YYYYMMDDTHHMMSSZ>.json`
- Participant map: `<session_id>__participant-map.redacted.md`
- Flow evidence: `<session_id>__flow-<flow_id>__<role>__<route_slug>__<PASS|PARTIAL|BROKEN|UNCLEAR>.md`
- Screenshot: `<session_id>__screenshot__<flow_id>__<role>__<nn>.png`
- Support issue: `<session_id>__support__P9C-SUPPORT-<session_id>-<nn>.md`
- Defect: `<session_id>__defect__S<severity>__<short_slug>.md`
- Stop/rollback record: `<session_id>__stop-or-rollback__<YYYYMMDDTHHMMSSZ>.md`
- Closeout: `<session_id>__closeout.md`

Storage/scrubbing rules:

- Do not store raw credentials, secret values, tokens, cookies, full webhook payloads, full payment details, real card/bank data, or uncontrolled PII.
- Redact email addresses unless exact participant mapping requires them and storage is owner-approved.
- Record object ids/slugs only when needed to reproduce the flow.
- Mark evidence as `seed/demo`, `pilot-entered non-production`, or `unclear`.
- If evidence cannot be scrubbed safely, stop capture and record `evidence unsafe to store` with reason.
- Do not store evidence in public repos, public links, public buckets, or external tools without Marlon/Atlas approval.

## 13. Participant communication script boundaries

Approved opening script:

"This is a private, invite-only OneHub pilot session for controlled product-flow inspection. It is not a public launch, production launch, legal approval, live-payment approval, billing approval, or support-readiness claim. Please use only the account, role, event, organization, and flows assigned by the pilot operator. Do not enter sensitive real payment details, production credentials, or unnecessary personal information. Any contract, proposal, booking, marketplace, payment, refund, dispute, payout, or support feature you see is a pilot product-flow artifact unless Marlon separately approves a specific legal or payment lane. Send issues only through the named pilot support channel during this session."

Approved support boundary:

"Support for this pilot is limited to the named pilot support owner and approved channel during the session. OneHub is not promising phone support, AI chat support, SLA response windows, incident-response commitments, or public help-center completeness."

Approved payment boundary:

"OneHub private pilot does not support live payments. Do not use real cards, bank details, invoices, billing details, refunds, disputes, transfers, payouts, escrow, fee collection, or fund movement. Any payment UI visible during this session is test-mode/product-flow inspection only if the pilot owner has approved that inspection."

Approved legal/public boundary:

"Contracts, proposals, bookings, signatures, listings, marketplace actions, payment terms, refund/dispute/fee language, support pages, Terms, and Privacy content in this pilot are not legal approval or public-launch approval. Treat them as product-flow artifacts only."

Disallowed statements:

- Do not say OneHub is production-ready.
- Do not say OneHub is publicly launched.
- Do not say OneHub has approved legal terms, payment terms, privacy terms, refund/dispute/fee language, vendor/client obligations, booking enforceability, escrow guarantees, or acceptance-version legal effect.
- Do not say live payments, billing, escrow, payouts, transfers, refunds, disputes, fee collection, invoices, cards, or fund movement are available.
- Do not promise phone support, AI chat support, incident response, SLA windows, public-support completeness, or help-center completeness.
- Do not invite participants to explore beyond their mapped role/org/event scope.
- Do not describe health 200, seed/demo, local smoke, or test-mode behavior as production/market readiness.

## 14. Stop and rollback protocol

Use the narrowest safe stop that preserves evidence and prevents escalation of risk.

Immediate stop triggers:

- `/api/health` returns non-200, `degraded`, `down`, or cannot be reached.
- `/api/demo/preflight` fails or `seedOk=false` while seed/demo flow is required.
- Environment, DB, credentials, data mode, invite mechanism, or public/private boundary is unclear.
- Any production DB, public target, public signup/open invite, DNS/SSL/hosting/public exposure, or production credential appears.
- Any `sk_live_`, `pk_live_`, live webhook, Connect/live payout, refund, dispute, chargeback, invoice, billing, fee, real card collection, or fund movement appears.
- Participant reaches unauthorized role, org, event, account, data, or admin surface.
- External participant receives admin access or admin-only information.
- Admin observer is asked to execute release/refund/payout/transfer/dispute/payment/provider mutation.
- Support owner becomes unavailable or participant is promised unsupported phone/AI/SLA/public support.
- Participant treats payment/legal/support/product copy as live, binding, public, production-ready, or legally approved.
- Evidence capture would expose secrets, raw credentials, full payment details, raw provider payloads, or uncontrolled PII.
- Real pilot-entered data is about to be exported, retained, reset, or deleted without approval.

Rollback levels:

1. Soft stop
   - Pause invites and session activity.
   - Preserve environment for evidence capture.
   - Use for health ambiguity, support ambiguity, participant confusion, or owner mapping gaps.

2. Flow freeze
   - Allow login/dashboard/admin observation only if safe.
   - Stop booking/proposal/contract/payment-entry/request flows.
   - Use when a specific flow has risk but environment remains safe for read-only triage.

3. Seed/demo reset hold
   - For `LOCAL_SEED` or `PRIVATE_NONPROD_SEED` only.
   - Reset only after environment owner approval.
   - Do not reset if real pilot-entered data may exist.

4. Pilot-data hold
   - For `PRIVATE_NONPROD_PILOT_DATA`.
   - Preserve data and evidence.
   - No export, deletion, reset, or retention decision without Marlon/Atlas approval.

5. Full pilot stop
   - End all pilot access/invites as approved by pilot owner.
   - Preserve scrubbed evidence.
   - Route findings to Atlas.
   - Use for live-payment, legal/public-support confusion, production/public exposure, production DB, unauthorized access, or credentials exposure.

## 15. Exact escalation triggers for Marlon

Mark `FOUNDER ESCALATION REQUIRED` and stop the relevant flow if any of the following occurs:

1. Invite expansion
   - Any request to invite external/friendly participants, real customer/vendor prospects, more roles, more orgs/events, public users, or open invite links beyond the approved list.

2. Environment/public exposure
   - Any request to use production, public domain, DNS/SSL/hosting changes, public traffic, public signup, public marketplace access, provider dashboard changes, or infra changes.

3. Credentials/secrets
   - Any request to create, rotate, inspect, paste, share, store, or change credentials, API keys, OAuth secrets, Stripe keys, webhook secrets, production DB URLs, or secret stores.

4. Database/data handling
   - Any production DB use, unclear DB target, DB reset, migration, schema change, destructive operation, or decision to retain/export/delete/reset real pilot-entered non-production data.

5. Live payment/billing
   - Any live Stripe key, live card collection, real charge, escrow, payout, transfer, refund, dispute, chargeback, invoice, fee, billing, subscription, Connect onboarding, Stripe dashboard action, or fund movement request.

6. Legal/public claims
   - Any request to publish/approve Terms, Privacy, legal/payment/refund/dispute/fee language, vendor/client obligations, booking enforceability, acceptance-version legal effect, public launch claims, or market-readiness claims.

7. Support commitments
   - Any request to promise phone support, AI chat support, incident response, SLA windows, 24/7 coverage, public help-center completeness, public support guarantees, or staffing commitments.

8. Security/access-control
   - Any unauthorized role/org/event/admin access, external admin request, cross-role probing, private data leakage, privilege escalation, or request to bypass auth outside a separate security review lane.

9. Irreversible/high-risk action
   - Any cost, billing, production, public exposure, legal, security, credentials, payment, infra, destructive data, or irreversible decision.

## 16. Pilot session templates

### Session header

```md
# OneHub P9C Pilot Session Log

Session id:
Date/time UTC:
Pilot owner:
Environment owner:
Support owner:
Admin/ops observer:
Evidence owner:
Rollback owner:
Environment label:
Target label/redacted URL:
DB classification: LOCAL_SEED | PRIVATE_NONPROD_SEED | PRIVATE_NONPROD_PILOT_DATA | UNCLEAR | PRODUCTION_OR_PUBLIC
Data mode: seed/demo | pilot-entered non-production | unclear
Invite list approved by:
Live-payment freeze acknowledged: yes | no
Legal/public-launch freeze acknowledged: yes | no
Support boundary acknowledged: yes | no
```

### Participant/account map

```md
| Participant id | Name | Email/redacted email | Role | Persona | Org scope | Event scope | Data mode | Approved flow ids | Boundary ack complete? |
|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |
```

### Health/preflight log

```md
| Timestamp UTC | Endpoint | HTTP status | Safe response fields | Result | Stop condition? | Operator initials |
|---|---|---:|---|---|---|---|
|  | /api/health |  |  | PASS/PARTIAL/FAIL/UNCLEAR | yes/no |  |
|  | /api/demo/preflight |  |  | PASS/PARTIAL/FAIL/UNCLEAR | yes/no |  |
```

### Flow attempt log

```md
| Attempt id | Flow id | Participant id | Role | Route/surface | Object id/slug | Expected result | Actual result | Evidence path | Outcome | Severity if defect |
|---|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  | PASS/PARTIAL/BROKEN/UNCLEAR/OUT_OF_SCOPE |  |
```

### Support issue log

```md
| Support id | Participant id | Role | Channel | Summary | Severity | Evidence path | Status | Routed to |
|---|---|---|---|---|---|---|---|---|
| P9C-SUPPORT-<session_id>-001 |  |  |  |  | S0/S1/S2/S3/S4/OUT_OF_SCOPE |  |  |  |
```

### Closeout

```md
Overall verdict: COHERENT | PARTIAL | BROKEN | UNCLEAR | OUT OF SCOPE
Health closeout result:
Preflight closeout result, if used:
Support issues total:
Defects by severity:
Excluded-flow requests:
Pilot-entered data created: yes | no | unclear
Data exported/retained/reset/deleted: yes | no | unclear
Founder escalation required: yes | no
Residual decisions:
Recommended next action for Atlas:
```

## 17. Residual decisions

No P9C documentation/control contradiction was found that required product-code changes.

Residuals are zero for this artifact except Marlon/operator pilot-owner decisions before real invites:

1. Exact invite list and whether first session is internal-only or includes friendly external participants.
2. Exact private non-production environment target, owner, DB classification, and secret source.
3. Support owner, support channel, and response expectation language.
4. Admin/ops observer account and allowed admin surfaces.
5. Evidence owner and scrubbed storage path.
6. Data mode and retention/export/reset/delete rule.
7. Test-mode Stripe inspection decision; live payments remain frozen regardless.
8. Rollback owner and stop authority.
9. Participant communication brief approval.

These decisions are FOUNDER ESCALATION REQUIRED before any real invite or scope expansion beyond internal/seed/demo controlled inspection.

## 18. Narrow recommended next action for Atlas

Atlas should use this P9C runbook as the support/admin monitoring and session-operations artifact for the invite-only private pilot package, then obtain Marlon/operator approval for the exact invite list, private non-production environment, support owner/channel, admin observer, evidence owner/storage path, data boundary, rollback owner, and test-mode Stripe inspection decision.

After those decisions are recorded, Atlas may route Sentinel/ops to execute the P9B environment verification routine and use this P9C runbook during the first controlled pilot session. Do not route production/public launch, legal publication, billing, live-payment, Stripe dashboard, DNS/SSL/hosting, production DB, schema/migration, credentials, destructive data, public support, or infrastructure work from P9C.
