# Gate 7 Final Closure — Ops Decision Register

Scope: docs/planning only. This register does not approve production launch, public exposure, DNS/SSL changes, monitoring provisioning, credential/API-key changes, billing changes, live Stripe/payment activation, destructive database/schema/migration actions, or legal acceptance.

Evidence sources read:

- `reports/production/acceleration/gate7-launch-readiness-no-provision/launch-readiness-checklist.md`
- `reports/production/acceleration/gate7-safe-local-prework/evidence.md`
- `docs/devops.md`
- `docs/incident-response.md`
- `docs/payments.md`
- `apps/web/.env.example`

## Safe default items

These are safe planning defaults for local/read-only/docs/test-mode work. They are not production acceptance.

| Area | Safe default | Why safe | Remaining verification |
|---|---|---|---|
| Monitoring/error tracking | Keep `ERROR_TRACKING_PROVIDER=console` and `ONEHUB_ERROR_LOG_SAMPLE_RATE=0` for local/default docs posture. | Avoids provisioning an external provider or exposing DSNs while preserving provider-neutral adapter path. | Sentinel/ops should verify redaction behavior and that no secrets appear in logs/reports. |
| Uptime/status | Treat `/api/health` as the minimal local health target only. Do not publish a status page yet. | Avoids public monitoring exposure and external account setup. | Verify `/api/health` returns only minimal status/timestamp and no dependency details. |
| Incident owner | Default to "Marlon approval required" for SEV0/live-payment/public-comms actions. | Preserves control boundaries and prevents autonomous production/public actions. | Marlon must name incident commander, backup, support channel, and interrupt threshold. |
| Secrets policy | Keep all real values out of docs/reports; use placeholders only. | Prevents accidental secret disclosure. | Choose approved secret storage, access list, rotation cadence, emergency revocation path. |
| Domain/SSL | Keep local URLs/placeholders only. No DNS/SSL changes. | Prevents public launch or infra side effects. | Marlon must approve domain, DNS authority, certificate source, redirects, HSTS timing, auth callbacks. |
| Hosting | No production deployment/provisioning from this lane. | Preserves no-infra/no-public-launch boundary. | Marlon must approve deployment target, operators, access model, staging/prod separation. |
| Live payments | Keep live Stripe frozen; use only test-mode/local planning evidence. | Prevents fund movement, dashboard changes, and legal/payment obligations. | Payment operations, legal terms, webhook ownership, Connect, refunds/disputes/reconciliation must be approved. |

## Marlon approval required

| Area | Decision item | Minimum decision needed | Blocked action until approved |
|---|---|---|---|
| Monitoring | Provider selection: Sentry or alternative; project ownership; alert recipients; retention; sampling; budget. | Name provider, owner, budget/retention, and who receives alerts. | Creating provider project, setting DSNs, enabling production alerting. |
| Uptime/status | Internal-only uptime monitor vs public status page; regions/frequency; maintenance suppression. | Choose visibility, monitor provider, alert recipients, and status communication posture. | Public status page, external uptime account, customer-visible incident page. |
| Incident owner | Incident commander, backup, escalation chain, customer/support comms owner, Marlon interrupt threshold. | Assign named owners and approval boundaries. | Production incident execution, customer/public statements, production rollback/maintenance actions. |
| Secrets policy | Secret storage backend, access list, rotation cadence, emergency revocation authority. | Decide where secrets live and who may create/read/rotate/revoke them. | Credential/API key creation, rotation, insertion into hosting environment. |
| Domain/SSL | Production domain, staging domain, apex/www/subdomain policy, DNS authority, SSL provider, HSTS timing, redirect/canonical policy. | Approve exact domains and DNS/SSL operator. | DNS record changes, certificate issuance, auth callback updates, public launch. |
| Hosting | Production/staging host, deployment operator, access model, rollback path, log retention. | Approve hosting target and public exposure posture. | Provisioning, deploy, exposing service publicly. |
| Live payments | Whether/when Stripe live mode may be enabled; dashboard owner; live webhook endpoint; Connect; payouts/refunds/disputes/reconciliation. | Explicit live-payment go/no-go and operator assignment. | Live Stripe keys, live webhooks, Connect live onboarding, payouts/refunds/disputes/fund movement. |
| Launch posture | Private beta, invite-only pilot, or public launch. | Choose launch posture and user/support/legal burden. | Any public launch claim or customer-facing rollout. |

## External/legal required

| Area | External/legal dependency | Required artifact before production use | Blocked action until satisfied |
|---|---|---|---|
| Legal public docs | Terms of Service, Privacy Policy, Payment/Refund/Dispute policy, vendor/client obligations, support language, effective dates. | Legal-approved public documents and internal version references. | Public signup/payment flows and legal acceptance claims. |
| Payment operations | Stripe account readiness, webhook endpoint configuration, Connect obligations, KYC/identity flow, refund/dispute/payout handling, reconciliation. | Stripe dashboard setup evidence, payment operations runbook, legal/payment approval. | Live payment collection, transfers, payouts, refunds, disputes, Connect onboarding. |
| Monitoring vendor | Sentry/alternative account/project, data retention/privacy review, alert channels. | Approved provider configuration and non-secret event scrubbing evidence. | Production DSNs, external alerting, production error ingestion. |
| Uptime/status vendor | Uptime monitor/status provider account and notification routing. | Approved monitor targets, recipients, status visibility, maintenance suppression policy. | External production uptime checks/status page. |
| Hosting/domain vendor | Registrar/DNS/hosting/certificate access and approval. | Approved domain/DNS/SSL/hosting records and rollback plan. | DNS/SSL/hosting changes and public exposure. |
| Support/customer comms | Support channel, customer-visible incident/update templates, owner assignment. | Approved support/comms procedure and escalation matrix. | Customer/public incident statements or launch support claims. |

## Closure verdict

Gate 7 final ops/env/payment closure is SOUND for docs-only planning and RISK/BLOCKED for production acceptance. The safe local posture is to keep monitoring provider setup, public uptime/status, production hosting, DNS/SSL, real secrets, legal/public documents, and live payments blocked until Marlon and required external/legal owners approve them.
