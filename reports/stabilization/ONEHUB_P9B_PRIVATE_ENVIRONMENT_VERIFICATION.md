# OneHub P9B — Private Non-Production Pilot Environment Verification

Generated: 2026-07-22
Task: `t_afd3d4fd`
System: OneHub
Repo: `/root/.hermes/workspaces/onehub/repo`
Branch observed: `cleanup/accelerated`

## Executive posture

P9B converts P9A invite/flow controls into a private non-production environment verification package. This artifact is non-destructive and evidence-based. It does not approve production, public launch, legal publication, public support commitments, live payments, billing, credentials, infrastructure changes, schema/migration changes, production database use, or external provider/dashboard changes.

Environment verification posture: PARTIAL — verification package is ready for a selected private non-production pilot target, but no hosted/private target was accessed or certified in this task.

Zero-readiness statement: this report makes zero claim of production readiness, public-launch readiness, legal readiness, live-payment readiness, billing readiness, production support readiness, or production infrastructure readiness.

## 1. Backend or structural scope reviewed

Reviewed only private non-production pilot environment controls:

- P9A invite/role/flow-control matrix: `reports/stabilization/ONEHUB_P9A_INVITE_FLOW_CONTROL_MATRIX.md`.
- P8 private pilot release-control package: `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md`.
- Safe example/config references: `apps/web/.env.example`, `docs/devops.md`, and Gate 7 non-secret environment/payment freeze reports.
- Package scripts and smoke commands in `package.json`.
- Health and demo preflight endpoints.
- Stripe/test-key guardrails and money-movement freeze evidence.
- Seed/test account requirements from `scripts/seed.ts`.
- Support/admin monitoring posture from support/help pages and prior P8/P9A control language.

Not performed:

- No product code changes.
- No real secrets, `.env.local` values, production credentials, provider dashboards, billing accounts, live Stripe settings, DNS/SSL/hosting, public services, database resets, migrations, destructive DB commands, or production DB targets were touched.
- No public service was started.
- No hosted/private pilot URL was accessed, because no selected environment target/owner credentials were provided in this task.

## 2. Evidence examined

Primary P9A/P8 control evidence:

- P9A explicitly states it is not production, public-launch, legal, live-payment, billing, credential, infrastructure, or production-DB approval: `reports/stabilization/ONEHUB_P9A_INVITE_FLOW_CONTROL_MATRIX.md:9-15`.
- P9A requires exact participant/account/environment/data/support/evidence mapping before invites: `reports/stabilization/ONEHUB_P9A_INVITE_FLOW_CONTROL_MATRIX.md:127-159`.
- P9A defines `/api/health` and `/api/demo/preflight` as required pre-session checks and stops if health, data mode, or environment posture is unclear: `reports/stabilization/ONEHUB_P9A_INVITE_FLOW_CONTROL_MATRIX.md:101-113`, `221-237`, `307-326`.
- P9A preserves founder/operator residual decisions before real invites: exact invite list, environment owner, support owner, data boundary, and Stripe test-mode inspection decision: `reports/stabilization/ONEHUB_P9A_INVITE_FLOW_CONTROL_MATRIX.md:328-341`.
- P8 requires target environment to be private/non-public/invite-only, DB target to be non-production, health 200 before invite, demo preflight if using seed/demo flows, no live Stripe key, named support/admin/evidence owners, and rollback/data-boundary rules: `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md:157-189`, `191-252`.

Environment/config evidence:

- `apps/web/.env.example:1-44` contains placeholders for `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `ONEHUB_CANONICAL_URL`, `ONEHUB_PRIMARY_DOMAIN`, `ONEHUB_MAINTENANCE_MODE`, observability placeholders, rate-limit placeholders, OAuth placeholders, Stripe test placeholders, and OpenAI placeholders. It includes no real production credential value in inspected content.
- `docs/devops.md:58-80` classifies rate limiting as local in-memory and not launch-ready for horizontally scaled production traffic.
- Gate 7 non-secret manifest classifies environment variables by sensitivity and blocks production/public launch, DNS/SSL/hosting provisioning, credential/API-key creation or rotation, billing/live Stripe/payment activation, and destructive DB/schema/migration actions: `reports/production/acceleration/gate7-final-closure/non-secret-env-manifest.md:20-61`.

Health/preflight evidence:

- `/api/health` returns only `status` and `timestamp`; it returns HTTP 200 only for `ok`, and 503 for degraded/down/failure: `apps/web/src/app/api/health/route.ts:15-40`.
- Health checks database connectivity and Stripe connectivity only when Stripe is configured; missing Stripe is treated as optional/ok: `apps/web/src/lib/health.ts:20-59`.
- `/api/demo/preflight` reports `demoModeActive`, `seedOk`, `verifiedListingsCount`, AI availability/fallback, and timestamp; it returns 500 with safe status fields if preflight itself fails: `apps/web/src/app/api/demo/preflight/route.ts:10-70`.
- Demo mode is driven by `ONEHUB_DEMO_MODE === "true"`: `apps/web/src/lib/demo-mode.ts:9-11`.

Payment/backend guardrail evidence:

- Payment-intent and webhook paths call `ensureTestModeStripeSecret(process.env.STRIPE_SECRET_KEY)`: `apps/web/src/app/api/payments/create-intent/route.ts:192-193`, `apps/web/src/app/api/stripe/webhook/route.ts:80-87`.
- `ensureTestModeStripeSecret` rejects missing keys and rejects any key that does not start with `sk_test_`: `apps/web/src/lib/payments/money-state.ts:36-43`.
- Stripe webhook path requires a signing secret and verifies signatures before handling events: `apps/web/src/app/api/stripe/webhook/route.ts:89-107`.
- Payment freeze checklist keeps live Stripe keys, webhook setup, Connect onboarding, refunds/disputes/payouts/transfers, legal/payment terms, and monitoring/alerting blocked until approval: `reports/production/acceleration/gate7-final-closure/payment-freeze-monitoring-checklist.md:14-92`.
- Milestone release can create a Stripe transfer if a recipient Stripe account exists and Stripe is configured: `apps/web/src/app/api/payments/release-milestone/route.ts:289-335`. Therefore release/refund/payout/transfer paths remain out of pilot scope unless separately approved and test-mode-verified.

Seed/support/admin evidence:

- Seed script creates test users for `DIY_PLANNER`, `PRO_PLANNER`, `VENDOR`, `VENUE`, `CLIENT`, and `ADMIN`, including `admin@example.com` and `admin@onehub.local`: `scripts/seed.ts:6-14`.
- Seed script creates stable demo event `demo-wedding`: `scripts/seed.ts:91-115`.
- Support page states AI chat and phone support are not operationally verified and points current support to email: `apps/web/src/app/support/page.tsx:18-44`.
- Help page marks docs/videos/API docs and articles as coming soon/draft: `apps/web/src/app/help/page.tsx:67-118`.

Package/script evidence:

- `package.json:6-20` defines `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `e2e`, `db:migrate`, `db:generate`, `db:seed`, and `stabilize` scripts. For this P9B task, only inspection was required; destructive DB commands and public service startup remain out of scope.

Repo-state evidence:

- `git status --short` observed an inherited dirty tree before this report, including many modified product files and untracked stabilization artifacts. P9B output must remain limited to this report artifact and must not be treated as release-clean proof.

## 3. Correctness verdict

PARTIAL

OneHub has enough code and documentation evidence to define a safe private non-production environment verification routine for a small invite-only pilot. The package is structurally coherent for environment-owner execution, but it does not verify any actual hosted/staging environment because no selected target, owner confirmation, non-production DB label, or approved secret/config channel was available in this task.

## 4. Exact risks or blockers

1. Environment target blocker
   - No specific private non-production target URL, owner, DB label, invite mechanism, secret source, or access boundary was provided. A real invite cannot proceed until these are named and verified.

2. Database-boundary blocker
   - `DATABASE_URL` is secret and must not be inspected in reports. The DB target must be classified by owner-provided metadata, not by exposing credentials. If the DB target is unclear or production-like, stop.

3. Live-payment blocker
   - Payment-intent/webhook code has test-key guards, but release code can call `stripe.transfers.create` if configured with a recipient Stripe account and Stripe client. All pay/collect/refund/release/payout/transfer/dispute/billing paths must remain frozen in the pilot unless Marlon separately approves a payment lane and Sentinel verifies it in test mode.

4. Support/admin posture risk
   - Support/help pages remain draft/limited. A named support owner and monitored support channel are required before inviting participants; do not promise phone, AI chat, SLA, or public support coverage.

5. Dirty-tree/release-clean risk
   - The repo is inherited-dirty. This package supports environment verification planning only. It does not make the tree release-clean or deployment-ready.

6. Public/legal expectation risk
   - Contracts, bookings, proposals, signatures, and payment UI can be misunderstood as binding/live. Participant and operator language must preserve P9A live-payment/legal/public-launch freeze language before every session.

## 5. Environment owner checklist

The environment owner must complete this before the first real invite. If any required field is unknown, stop.

| Check | Required safe state | Evidence to record | Stop condition |
|---|---|---|---|
| Environment label | Private non-production target named, e.g. `pilot sandbox` or `private staging` | Label, owner, date/time UTC | Label absent, ambiguous, public, or production-like |
| Environment owner | Named owner responsible for config, DB boundary, secret source, rollback, and health | Owner name/role, contact path | No accountable owner |
| URL/exposure | Private/non-public URL or local target only | Redacted URL/target label; no public marketing route | Public signup/open invite/public marketing/DNS ambiguity |
| Auth callback/base URL | `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `ONEHUB_CANONICAL_URL`, and `ONEHUB_PRIMARY_DOMAIN` match the selected private target | Values recorded as redacted placeholders or approved non-secret labels | Production/public domain or callback mismatch |
| Secret source | Secrets loaded only from approved secret storage or local non-production file controlled by owner | Secret store name, not values | Secrets copied into docs/chat/reports or unknown source |
| DB target | Non-production DB classified before smoke | DB label/name, host class, owner attestation; no password | Production DB, unknown DB, or unclear data owner |
| Data mode | `seed/demo` or `pilot-entered non-production` selected before session | `data_mode` in evidence log | `data_mode=unclear` |
| Invite boundary | Exact invite list/account mapping approved by Marlon or Atlas-designated pilot owner | Participant table from P9A | Open invite, unknown email, multi-role ambiguity |
| Health | `/api/health` returns HTTP 200 immediately before session | HTTP status, response fields, timestamp | Non-200, degraded/down, or inaccessible |
| Demo preflight | If using seed/demo flow, `/api/demo/preflight` confirms `seedOk=true` or records exact reason false | Response fields, timestamp | Seed/demo posture unclear while relying on seed data |
| Stripe/payment | `STRIPE_SECRET_KEY` absent or `sk_test_...`; no `sk_live_`; no live webhook/connect/payout setup | Prefix classification only; no raw key | Any live key, live webhook, or money-movement expectation |
| Support owner | Named monitored support owner and channel for the session | Owner and channel label | No owner, unsupported phone/AI/SLA promise |
| Admin/ops owner | Named internal admin observer only | Admin account mapping and allowed surfaces | External admin user or payment/admin mutation requested |
| Evidence owner | Owner has P9A session evidence template ready | Log path/location; no secrets/PII | Evidence capture would expose secrets or uncontrolled PII |
| Rollback owner | Owner selected soft stop, flow freeze, seed reset, pilot-data hold, or full stop path | Rollback rule chosen before session | Destructive reset/export/retention unclear |

## 6. Safe environment variable matrix

Do not paste real values into this report, chat, screenshots, or participant logs. Record only redacted placeholders, safe prefixes, or owner attestations.

| Variable | Required for pilot? | Safe placeholder/evidence | Sensitivity | P9B rule |
|---|---:|---|---|---|
| `DATABASE_URL` | Yes for DB-backed smoke | `postgresql://<nonprod-user>:<redacted>@<nonprod-host>/<nonprod-db>` | Secret | Owner must attest non-production; never expose password/full URL. |
| `NEXTAUTH_URL` | Yes | `https://<private-nonprod-host>` or `http://localhost:3000` | Public/internal config | Must match selected non-production target. |
| `NEXTAUTH_SECRET` | Yes for auth | `<secret-managed-by-owner>` | Secret | Must exist in approved secret channel; do not inspect value. |
| `NEXT_PUBLIC_APP_URL` | Recommended | `https://<private-nonprod-host>` or `http://localhost:3000` | Public | Must not imply public launch. |
| `ONEHUB_CANONICAL_URL` | Recommended | `https://<private-nonprod-host>` or `http://localhost:3000` | Internal/public URL config | Must match non-production target. |
| `ONEHUB_PRIMARY_DOMAIN` | Optional for private target | `<private-nonprod-domain>` or `localhost` | Public | Production/public domain requires Marlon approval. |
| `ONEHUB_MAINTENANCE_MODE` | Optional control | `false` normally; `true` only via owner-approved stop/freeze | Internal | Server-side only; never `NEXT_PUBLIC_*`. |
| `ONEHUB_DEMO_MODE` | Required only for demo-safe flows | `true` or `false` | Internal | If using seed/demo narrative, record value and preflight result. |
| `ERROR_TRACKING_PROVIDER` | Optional | `console` | Internal | External provider/DSN requires approval. |
| `SENTRY_DSN` | No unless approved | `<unset>` or `<secret-managed-by-owner>` | Secret/internal | Do not provision or paste DSNs in P9B. |
| `NEXT_PUBLIC_SENTRY_DSN` | No unless approved | `<unset>` | Public | Only after monitoring owner approval. |
| `ONEHUB_ERROR_LOG_SAMPLE_RATE` | Optional | `0` for local/private minimal posture unless approved | Internal | Must not capture uncontrolled PII/secrets. |
| `RATE_LIMIT_ENABLED` | Optional | `false` or owner-approved private target value | Internal | Local in-memory helper is not production-scale. |
| `RATE_LIMIT_WINDOW_MS` | Optional | `60000` or owner-approved value | Internal | Record value, no production claim. |
| `RATE_LIMIT_MAX_REQUESTS` | Optional | `100` or owner-approved value | Internal | Record value and false-positive owner. |
| `RATE_LIMIT_TRUST_PROXY` | Optional | `false` unless proxy topology approved | Internal | Do not trust proxy headers without hosting/proxy owner approval. |
| `GOOGLE_CLIENT_ID` | Optional | `<unset>` or `<nonprod-oauth-client-id>` | Public/internal OAuth config | Separate OAuth approval required if enabled. |
| `GOOGLE_CLIENT_SECRET` | Optional | `<secret-managed-by-owner>` | Secret | Do not inspect or expose. |
| `STRIPE_SECRET_KEY` | Optional/test-mode only | `<unset>` or `sk_test_<redacted>` | Secret | `sk_live_` is an immediate stop. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional/test-mode only | `<unset>` or `pk_test_<redacted>` | Public | `pk_live_` is a stop unless separate live-payment approval exists. |
| `STRIPE_WEBHOOK_SECRET` | Optional/test-mode only | `<unset>` or `whsec_<redacted>` | Secret | No live webhook setup in P9B. |
| `STRIPE_CONNECT_CLIENT_ID` | No for default pilot | `<unset>` or `<test-connect-client-id>` | Internal/public Stripe config | Connect onboarding/fund movement blocked. |
| `OPENAI_API_KEY` | Optional | `<unset>` or `<secret-managed-by-owner>` | Secret | AI usage/budget owner required if enabled. |
| `OPENAI_MODEL` | Optional | `gpt-4o-mini` or owner-approved model | Internal | Record model; do not imply AI reliability or support readiness. |

## 7. DB target classification procedure

Use this procedure without exposing secrets or touching production DB.

1. Identify source of DB config.
   - Allowed evidence: secret store name, environment owner attestation, redacted connection label, host class, database name if non-sensitive.
   - Disallowed evidence: full `DATABASE_URL`, passwords, tokens, production credentials.

2. Classify target.
   - `LOCAL_SEED`: localhost/dev DB, disposable seed/demo data.
   - `PRIVATE_NONPROD_SEED`: private hosted/staging DB seeded for pilot-safe flows.
   - `PRIVATE_NONPROD_PILOT_DATA`: private hosted/staging DB that may contain real pilot-entered non-production data.
   - `UNCLEAR`: any unknown owner/host/name/source/data mode.
   - `PRODUCTION_OR_PUBLIC`: any production DB, public/customer DB, live operational DB, or DB whose owner cannot deny production status.

3. Required safe outcomes.
   - `LOCAL_SEED`: allowed for local smoke only; can be reset only with owner approval.
   - `PRIVATE_NONPROD_SEED`: allowed for seed/demo pilot if owner confirms no production data.
   - `PRIVATE_NONPROD_PILOT_DATA`: allowed only after Marlon/owner approves retention/export/reset rules.
   - `UNCLEAR`: stop; no invite.
   - `PRODUCTION_OR_PUBLIC`: stop; out of scope; FOUNDER ESCALATION REQUIRED.

4. Record minimum DB evidence.
   - Environment label:
   - DB classification:
   - DB owner:
   - Secret source label:
   - Data mode:
   - Reset/rollback rule:
   - Confirmation: no production DB used yes/no.

5. Never run destructive commands in P9B.
   - Do not reset/drop DB.
   - Do not run migrations against the pilot target.
   - Do not use production DB.
   - Do not export/delete pilot-entered data without written owner approval.

## 8. Health/preflight verification routine

Run this routine only against the approved private non-production target or local target. Do not start public services.

Before each invite/session:

1. Confirm target label and owner.
   - Record `environment_label`, `environment_owner`, `data_mode`, and `support_owner`.

2. Verify health.
   - Request: `GET <target>/api/health`.
   - Expected safe response: HTTP 200 with only `status` and `timestamp`, where `status=ok`.
   - Stop on: HTTP non-200, `status=degraded`, `status=down`, stack trace, dependency details, secrets, or target ambiguity.

3. Verify demo preflight if using seed/demo.
   - Request: `GET <target>/api/demo/preflight`.
   - Expected fields: `demoModeActive`, `seedOk`, `verifiedListingsCount`, `ai.hasOpenAIKey`, `ai.fallbackActive`, `timestamp`.
   - Required safe state for seed/demo pilot: `seedOk=true`, data mode recorded as `seed/demo`, and AI fallback posture understood by the operator.
   - Stop on: 500, `seedOk=false` while seed data is required, or mismatch between `ONEHUB_DEMO_MODE` posture and session plan.

4. Verify auth/account readiness without exposing passwords.
   - Confirm selected account email exists in seed inventory or approved invite list.
   - Confirm one primary role/persona and event/org scope are assigned.
   - Do not paste passwords into logs.

5. Verify payment freeze.
   - Confirm `STRIPE_SECRET_KEY` is absent or owner-attested `sk_test_<redacted>`.
   - Confirm no `sk_live_`, no `pk_live_`, no live webhook, no live Connect/payout/transfer/refund/dispute setup.
   - If payment UI is inspected, record it as test-mode/product-flow only.

6. Verify support/admin readiness.
   - Confirm named support owner is watching the agreed channel.
   - Confirm admin observation account is internal-only.
   - Confirm admin observer will not run release/refund/payout/transfer/dispute/admin payment actions.

After each session:

1. Record health and preflight results with timestamp.
2. Record participant, role, event/org scope, and data mode.
3. Record any stop condition or excluded-flow request.
4. Record whether any pilot-entered data was created, exported, retained, or reset.
5. Preserve evidence without secrets, raw credentials, full payment data, or uncontrolled PII.

## 9. Stripe/test-key freeze checks

Allowed P9B state:

- `STRIPE_SECRET_KEY` unset, or set only to owner-attested `sk_test_<redacted>` in an approved private non-production secret channel.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` unset, or set only to `pk_test_<redacted>` if test-mode payment-entry inspection is approved.
- `STRIPE_WEBHOOK_SECRET` unset, or `whsec_<redacted>` for test-mode webhook verification only.
- No live Connect onboarding, transfers, payouts, refunds, disputes, billing, chargebacks, fee collection, or real card collection.

Immediate stop state:

- Any `sk_live_` key, `pk_live_` key, live webhook endpoint, live Connect account, real charge, payout, transfer, refund, dispute, chargeback, invoice, subscription, billing request, or participant request to move money.
- Any operator request to configure Stripe dashboard, create/revoke/rotate keys, activate live mode, or enable public payment acceptance.

Required operator language:

"OneHub private pilot is invite-only and does not support live payments. Any payment UI visible during pilot is for controlled test-mode/product-flow inspection only and must not be used to collect, move, refund, release, dispute, invoice, or bill real funds."

FOUNDER ESCALATION REQUIRED before any live-payment, Stripe dashboard, Connect, legal/payment-terms, billing, or fund-movement work.

## 10. Support/admin monitoring checklist

Minimum monitoring posture for a private non-production pilot session:

| Area | Required owner/action | Stop condition |
|---|---|---|
| Support intake | Named support owner watching one approved email/chat/channel | No owner, no channel, or unapproved phone/AI/SLA promise |
| Support expectations | Participant brief says support is pilot-limited and owner-controlled | Public support, 24h/SLA, phone, or AI chat promise |
| Evidence intake | Evidence owner logs role/route/result/defect/stop condition | Evidence capture exposes secrets/PII/payment data |
| Admin observation | Internal admin maps to approved admin surfaces only | External admin, cross-org data exposure, unauthorized admin surface |
| Admin payments | Admin does not release/refund/payout/transfer/dispute funds | Any money/admin mutation request |
| Health monitoring | `/api/health` checked before session and after failure reports | Non-200 or dependency ambiguity |
| Preflight monitoring | `/api/demo/preflight` checked when seed/demo flow is used | Seed/demo posture unclear |
| Incident/rollback | Owner knows soft stop, flow freeze, seed reset, pilot-data hold, full stop | No rollback owner or destructive action ambiguity |

## 11. Rollback and data-boundary rules

Use the narrowest safe rollback that preserves evidence and protects data.

1. Soft stop
   - Pause invites and sessions.
   - Preserve current environment for evidence capture.
   - Use when health, support, role, or participant expectation becomes unclear.

2. Flow freeze
   - Allow login/dashboard observation only.
   - Stop booking/proposal/contract/payment-entry attempts.
   - Use when one flow becomes risky but environment can remain available for read-only triage.

3. Seed/demo reset
   - Only for `LOCAL_SEED` or `PRIVATE_NONPROD_SEED` data.
   - Requires environment owner approval.
   - Do not reset if any real pilot-entered data may be present.

4. Pilot-data hold
   - For `PRIVATE_NONPROD_PILOT_DATA`.
   - Preserve data until Marlon/Atlas approves retention, export, deletion, or reset.
   - Do not export screenshots/logs containing secrets, raw credentials, payment data, or uncontrolled PII.

5. Full pilot stop
   - Revoke/pause pilot access and invites.
   - Preserve evidence.
   - Route findings to Atlas.
   - Use for live-payment, public exposure, production DB, legal/support expectation, or cross-role/access boundary failures.

Data-boundary rule:

Every session log must mark `data_mode` as `seed/demo`, `pilot-entered non-production`, or `unclear`. If `unclear`, stop. Seed/demo evidence proves only route/local persistence behavior and must not be described as production, legal, market, or payment readiness.

## 12. Exact Marlon-required decisions before real invites

FOUNDER ESCALATION REQUIRED before real invites unless Marlon or an explicitly Atlas-designated pilot owner has already recorded the decision.

1. Exact pilot invite list.
   - Participant names, emails, primary roles, personas, event/org scope, and whether each participant is internal-only, friendly external, or real customer/vendor prospect.

2. Exact private non-production environment.
   - Target label/URL class, owner, DB classification, secret source, auth/callback posture, and proof it is not production/public.

3. Data boundary and retention/reset rule.
   - Whether session uses seed/demo or real pilot-entered non-production data; whether that data may be retained, exported, deleted, or reset.

4. Support owner and support promise.
   - Named owner, channel, response expectation, and explicit prohibition on unsupported phone/AI/SLA/public-support claims.

5. Evidence owner and evidence storage path.
   - Who captures route/account/session evidence and where scrubbed evidence is stored.

6. Test-mode Stripe inspection decision.
   - Whether payment-entry UI/test-mode Stripe can be inspected at all; live payments remain frozen regardless.

7. Admin/ops observer decision.
   - Which internal admin account may observe and which admin surfaces are allowed; no external admin access.

8. Participant communication boundary.
   - Written brief preserving private-pilot, no public-launch, no legal-readiness, no live-payment, no production-support language.

9. Rollback owner and stop authority.
   - Who can pause invites, freeze flows, hold data, or stop the pilot.

10. Expansion boundary.
   - Whether first session remains internal-only. External/friendly participant expansion requires explicit approval.

## 13. Assumptions separated from confirmed facts

Confirmed:

- Health endpoint is minimal and status-code-gated.
- Demo preflight endpoint can report seed/demo posture without auth.
- Stripe payment-intent and webhook paths reject non-test secret keys.
- Seed accounts and `demo-wedding` exist in seed script.
- Support/help posture is still limited/draft.
- P9A/P8 block production, public launch, live payments, legal readiness, production support, public exposure, and production DB use.

Assumptions:

- The first P9 pilot environment will be local, private staging, or pilot sandbox, not production.
- Environment owner can provide DB classification without exposing secrets.
- Atlas/Sentinel will perform environment-specific verification after Marlon/owner chooses the target.
- No real pilot invite will be sent until the Marlon-required decisions are recorded.

Unsafe assumptions:

- Do not assume `.env.example` values describe a running pilot target.
- Do not assume `sk_test_` availability means payment operations are pilot-approved.
- Do not assume health 200 means production readiness.
- Do not assume seed/demo data can be reset if any real pilot-entered data exists.
- Do not assume current dirty repo state is release-clean.

## 14. Narrow next action for Atlas

Atlas should obtain Marlon/operator decisions for the exact invite list, private non-production environment owner/target, DB classification, support owner, evidence owner, data retention/reset rule, and whether test-mode Stripe inspection is allowed. After those are recorded, route Sentinel/ops to execute this P9B verification routine against the selected private non-production target. Do not route production/public launch, legal publication, billing, live-payment, Stripe dashboard, DNS/SSL/hosting, production DB, schema/migration, or destructive data work from this package.
