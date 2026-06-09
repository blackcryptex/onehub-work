# OneHub Gate 7 Launch Readiness — No-Provision Checklist

Generated: 2026-06-03T17:04:18Z
Profile: Steward
Task: t_2434f864
Scope: planning/inventory only. No Oracle. No infrastructure provisioning, DNS changes, credential/API-key changes, billing changes, live Stripe enablement, destructive database/schema/migration actions, or public launch actions were performed.

## Backend scope under review

Gate 7 launch readiness gaps for:

- monitoring and error tracking
- incident response
- legal/policy documents
- domain and SSL readiness
- secrets/environment readiness
- launch/payment safety gates

This is not an acceptance of production launch. It is a planning artifact for what must be true before Gate 7 can be accepted.

## Evidence examined

- `apps/web/package.json`
- `apps/web/.env.example`
- `apps/web/src/lib/health.ts`
- `apps/web/src/server/router/index.ts`
- `apps/web/src/middleware.ts`
- `apps/web/src/lib/maintenance.ts`
- `apps/web/src/app/maintenance/page.tsx`
- `apps/web/src/lib/__tests__/maintenance.test.ts`
- `apps/web/src/lib/logger.ts`
- `apps/web/src/lib/errorTracker.ts`
- `apps/web/src/app/error.tsx`
- `apps/web/src/app/global-error.tsx`
- `docs/devops.md`
- `docs/payments.md`
- `docs/legal-exceptions-register.md`
- `.github/workflows/ci.yml`
- `git status --short` read-only inspection

## High-level verdict

Verdict: PARTIAL / RISK.

OneHub has useful local launch-readiness building blocks: structured logger, request IDs, security headers, health-check helper, error boundaries, maintenance mode/write freeze, payment documentation, and a legal exceptions register. Gate 7 is not launch-ready because several readiness areas are documented as intended but not production-bound or not configured: Sentry/error tracking is a console/TODO abstraction only, `.env.example` does not list Sentry/rate-limit/domain/SSL/incident variables advertised in `docs/devops.md`, no `src/instrumentation.ts` exists, no public legal Terms/Privacy/Support pages were found, domain/SSL ownership decisions are absent, incident ownership and escalation are not formalized, and the working tree is already heavily dirty from other Gate work.

## Launch-readiness checklist

Legend:

- READY-LOCAL: present enough for local/test-mode planning.
- PARTIAL: exists but not production-bound or needs verification.
- BLOCKED-DECISION: requires Marlon decision before execution.
- BLOCKED-PROVISION: cannot be done in this task because it would provision, alter infra/DNS/credentials, or enable live services.
- RISK: unsafe to treat as launch-ready.

| Area | Current evidence | Status | Gate 7 checklist requirement |
|---|---|---:|---|
| Error tracking service | `apps/web/src/lib/errorTracker.ts` logs to `console.error`; lines 32-37 contain TODO for Sentry. `apps/web/package.json` has no `@sentry/nextjs`. No `apps/web/src/instrumentation.ts` found. | RISK / BLOCKED-PROVISION | Choose error tracker, create project, configure DSNs, wire server/client capture, define alert rules, verify non-secret event payloads. |
| Error boundaries | `apps/web/src/app/error.tsx` and `global-error.tsx` call `trackError`; digest is shown to user. | PARTIAL | Keep, but connect `trackError` to selected monitoring provider and ensure PII/secret scrubbing. |
| Structured logging | `apps/web/src/lib/logger.ts` uses pino and redacts auth/password/token/access_token paths. Middleware sets `x-request-id`. | PARTIAL | Expand redaction list, standardize request-id propagation into route handlers/jobs, define log sink/retention. |
| Health checks | `apps/web/src/lib/health.ts` checks DB and optional Stripe; `server/router/index.ts` exposes tRPC health query. Maintenance allowlist includes `/api/health`, but no `apps/web/src/app/api/health/route.ts` file was found by file search. | PARTIAL / RISK | Add/verify actual HTTP health endpoint used by deployment and monitors; avoid leaking dependency details. |
| Maintenance/write freeze | `middleware.ts`, `maintenance.ts`, `maintenance/page.tsx`, and `maintenance.test.ts` show local implementation and tests for `ONEHUB_MAINTENANCE_MODE`. | READY-LOCAL / PARTIAL | Sentinel should rerun tests and route smoke checks. Before launch, document operator toggle procedure without exposing secrets. |
| Security headers | `middleware.ts` sets Referrer-Policy, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, and CSP Report-Only. | PARTIAL | Decide when to enforce CSP instead of report-only; verify headers cover public and app routes. |
| Rate limiting | `docs/devops.md` documents env vars and says Wave 6 uses in-memory rate limiting, but `.env.example` does not list those vars and code evidence was not confirmed in this pass. | RISK | Inventory actual rate limiter implementation and tests; decide whether launch needs Redis-backed limits. |
| Secrets readiness | `.env.example` includes DB/Auth/maintenance/Google/Stripe/OpenAI placeholders; it lacks Sentry and rate-limit variables described in `docs/devops.md`. Secret values were not inspected or copied. | PARTIAL / BLOCKED-DECISION | Produce complete non-secret env manifest; Marlon/operator must choose secret storage/rotation/owners. |
| Domain/SSL | No domain/SSL config, DNS target, certificate policy, or canonical production URL evidence found in inspected files. `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` appear as env-driven app URLs. | BLOCKED-DECISION / BLOCKED-PROVISION | Marlon must approve domain, hosting target, DNS authority, SSL provider, redirect/canonical URL policy. No DNS/SSL action in this task. |
| Legal/public docs | `docs/legal-exceptions-register.md` exists for guarded MVP exception policy; no `terms`, `privacy`, or `support` app pages found under `apps/web/src/app` by file search. `docs/payments.md` has payment operational notes, not public legal terms. | RISK / BLOCKED-DECISION | Marlon/legal must approve Terms, Privacy, payment/refund/dispute language, vendor/client obligations, support contact, and effective dates before public launch. |
| Incident response | `docs/devops.md` has troubleshooting and production considerations, but no incident commander, severity matrix, escalation path, customer comms template, or rollback owner found in this pass. | RISK / BLOCKED-DECISION | Create incident response runbook locally; Marlon must assign launch owner/escalation/contact policy. |
| Payment launch safety | Gate 5 evidence exists and Stripe routes are present, but this task cannot enable live Stripe or touch billing. `docs/payments.md` says production webhook needs dashboard endpoint. | BLOCKED-PROVISION | Keep live payments disabled until Stripe account mode, webhook endpoint, Connect obligations, refund/dispute operations, and monitoring are approved/verified. |
| CI/build gates | `.github/workflows/ci.yml` runs lint/typecheck/test/prisma diff. Root package scripts exist. | PARTIAL | Sentinel should run current local typecheck/build/tests; branch is dirty so acceptance must separate inherited dirty state from Gate 7 docs. |
| Dirty-tree control | `git status --short` shows many pre-existing modified/untracked app, Prisma, report, and migration files. | RISK | Do not launch or merge from this tree until Atlas/Sentinel bucket the dirty state and verify what is intended. |

## Minimum acceptance checklist before Gate 7 can be called launch-ready

1. Monitoring/error tracking
   - Select provider and create project outside code only after approval.
   - Add non-secret env names to `.env.example`.
   - Wire server/client error capture through `trackError` or official Next instrumentation.
   - Confirm no passwords, tokens, auth headers, webhook payload secrets, or PII are emitted.
   - Define alert thresholds for 5xx, unhandled exceptions, payment webhook failures, auth failures, and job failures.

2. Health and uptime
   - Confirm a real HTTP `/api/health` endpoint exists and is safe for unauthenticated monitor access.
   - Health endpoint should avoid exposing secret config or sensitive dependency details.
   - Define uptime check URL, regions, frequency, alert recipients, and maintenance suppression behavior.

3. Incident response
   - Create a launch incident runbook with severity levels, owners, escalation, customer comms, evidence capture, rollback decision path, and postmortem template.
   - Define what actions agents may take without Marlon and what actions require explicit Marlon approval.
   - Include live-payment freeze rules and Stripe webhook incident handling, but do not enable live Stripe here.

4. Legal/public documents
   - Draft or import public Terms of Service, Privacy Policy, Payment/Refund/Dispute policy, vendor/venue obligations, client obligations, support channel, and effective date/versioning.
   - Ensure public app routes or footer links exist and are accessible before signup/payment.
   - Map `docs/legal-exceptions-register.md` guarded MVP policy to public-facing terms and internal admin procedure.

5. Domain/SSL
   - Marlon chooses domain and launch host.
   - Confirm DNS authority, SSL certificate source, canonical URL, www/apex redirect, staging vs production URL split, HSTS policy, and auth callback URLs.
   - No DNS/cert changes until explicitly approved.

6. Secrets/environment
   - Produce complete non-secret env manifest for production and staging.
   - Define secret storage, rotation owner, least-privilege access, and redaction policy.
   - Verify `.env.example` aligns with `docs/devops.md` and actual code.
   - Do not paste or inspect real secrets in reports.

7. Payment launch safety
   - Live Stripe remains off until Marlon approves live payments.
   - Verify webhook endpoint, Connect onboarding, refund/release/dispute operations, idempotency, alerting, and reconciliation in test mode first.
   - Confirm legal/payment terms before collecting money.

8. Verification
   - Sentinel runs local typecheck/build/targeted tests.
   - Sentinel verifies maintenance mode, error tracking stub behavior, health endpoint safety, legal doc presence, and no secret exposure.
   - Sentinel acceptance required before Atlas reports Gate 7 readiness.

## Hard Marlon-decision items

1. Domain: exact production domain, apex vs subdomain policy, and who controls DNS.
2. Hosting/deployment target: where production will run, who has access, and whether public exposure is approved.
3. SSL/TLS policy: certificate provider, HSTS timing, www/apex redirect, staging/prod separation.
4. Monitoring provider: Sentry or alternative, alert recipients, retention, error sampling, and budget.
5. Uptime/status provider: status page or internal-only monitoring, public vs private incident visibility.
6. Incident chain of command: launch incident commander, backup, escalation path, customer support channel, Marlon interrupt threshold.
7. Legal documents: who approves Terms/Privacy/Payment/Refund/Dispute policies and effective date.
8. Live payments: when Stripe live mode can be enabled, who owns dashboard configuration, webhook endpoint creation, Connect onboarding, refunds, and disputes.
9. Secrets policy: storage backend, rotation cadence, access list, emergency revocation authority.
10. Launch posture: private beta, invite-only pilot, or public launch; each changes legal/support/monitoring burden.

## Safe pre-work Forge can do locally

No provisioning, no credentials, no DNS, no live payments:

1. Add a non-secret launch env manifest file or update `.env.example` with placeholders for monitoring/rate-limit/domain-related env names only.
2. Implement/verify an actual `apps/web/src/app/api/health/route.ts` if absent, returning minimal safe status.
3. Replace `errorTracker.ts` TODO with a provider-neutral adapter interface that still defaults to console locally; keep Sentry dependency gated behind later approval if desired.
4. Add tests for error redaction and `trackError` no-secret behavior.
5. Add public placeholder routes for `/terms`, `/privacy`, and `/support` using draft/internal copy clearly marked not legal-approved, or create docs-only drafts if public UI is not approved.
6. Add an incident response runbook under `docs/` or `reports/production/acceleration/` with severity levels and approval boundaries.
7. Add route/header smoke tests for maintenance mode, security headers, and health endpoint behavior.
8. Align `docs/devops.md` with actual code so it does not claim Sentry instrumentation files that do not exist.

## Safe pre-work Sentinel can do locally

1. Verify this report against repo state without touching secrets.
2. Run local non-destructive checks: typecheck, build if feasible, targeted maintenance tests, targeted health/error-tracking tests if added.
3. Confirm no report contains real secrets; search generated evidence for secret-like tokens and replace with `[REDACTED]` if found.
4. Confirm no DNS, infra, billing, live Stripe, DB migration, or destructive action occurred.
5. Produce Gate 7 acceptance or rejection note under the same evidence directory.

## Exact risk/blocker

Gate 7 readiness is blocked on Marlon decisions and Sentinel verification. It would be unsafe to call OneHub launch-ready from this task because production observability, public legal docs, domain/SSL, incident response ownership, secrets policy, and live payment operating decisions are not finalized or provisioned, and provisioning is explicitly out of scope here.
