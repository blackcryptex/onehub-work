# OneHub Incident Response Runbook (Draft)

Status: local launch-readiness draft. Not a production approval. Marlon must approve owners, customer-facing language, live-payment handling, external monitoring, and public launch posture before use in production.

## Scope

This runbook covers OneHub application incidents during local/pre-launch readiness work and future approved production launch windows. It does not authorize DNS, SSL, infrastructure, credential, billing, live Stripe, database migration, or public launch actions.

## Severity levels

| Severity | Definition | Examples | Target first response |
|---|---|---|---:|
| SEV0 | Critical trust, payment, credential, or data-safety risk | Suspected secret exposure, unauthorized data access, live-payment misrouting, destructive data risk | Immediate stop and Marlon escalation |
| SEV1 | Core OneHub unavailable or unsafe for active users | App-wide 5xx, auth outage, payment confirmation failure, vendor/client data integrity issue | 15 minutes after detection |
| SEV2 | Major workflow degraded with workaround | Marketplace, proposals, contracts, notifications, or admin oversight partially failing | 1 hour after detection |
| SEV3 | Minor defect or documentation/process gap | Non-critical UI issue, delayed non-payment notification, local-only flaky check | Next work cycle |

## Approval boundaries

Agents may do without Marlon approval:

- Inspect local code, local docs, and non-secret generated evidence.
- Run non-destructive local tests, lint, typecheck, and builds.
- Add local-only docs/tests/safe code fixes inside approved Kanban scope.
- Toggle local environment placeholders in examples only, without real secret values.

Agents must get explicit Marlon approval before:

- Public launch, production deployment, DNS/SSL/domain changes, or exposing internal services.
- Credential/API key creation, rotation, revocation, or secret-store changes.
- Billing/live Stripe actions, webhook dashboard changes, payouts, refunds, disputes, or Connect account changes.
- Destructive database/schema/migration actions or production data changes.
- Customer/public incident statements or legal/policy acceptance language.

## First-response checklist

1. Classify severity using the table above.
2. Freeze scope: only inspect and stabilize the current approved lane.
3. Preserve evidence under the active report directory; do not paste secrets.
4. If SEV0 or payment-related, stop mutating actions and escalate to Marlon.
5. If local maintenance mode is appropriate and approved for the environment, set `ONEHUB_MAINTENANCE_MODE=true` through the approved config channel. Never expose this as `NEXT_PUBLIC_*`.
6. Run targeted non-destructive checks that match the symptom.
7. Document commands, exit codes, affected files, and remaining blockers.

## Rollback and maintenance-mode process

Local/pre-launch safe process:

1. Identify the smallest suspect change set with `git status --short` and `git diff -- <file>`.
2. Prefer targeted code revert over broad cleanup in dirty worktrees.
3. Use maintenance mode only to block writes/protected pages during approved windows.
4. Keep `/api/health`, `/maintenance`, auth callbacks, and static assets available during maintenance.
5. Record before/after validation commands and exit codes in the evidence report.

Production process requires Marlon-approved operator ownership before execution:

- Named incident commander and backup.
- Approved deployment rollback mechanism.
- Approved maintenance-mode config path.
- Approved customer/support communications path.
- Approved payment freeze owner.

## Live-payment freeze rules

Live payments remain frozen unless Marlon explicitly approves live mode and operating owners.

If any payment, webhook, payout, refund, dispute, Connect, reconciliation, or legal/payment-terms risk appears:

1. Treat as at least SEV1; treat credential/exposure/fund-movement risk as SEV0.
2. Stop new payment-affecting changes.
3. Do not alter Stripe dashboard, live webhooks, payouts, refunds, disputes, or Connect settings without approval.
4. Capture only non-secret metadata: route name, local test name, error category, timestamps, and sanitized request IDs.
5. Escalate to Marlon with decision needed and safe options.

## Evidence template

```md
# Incident evidence

- Detected at:
- Severity:
- Scope:
- Suspected component:
- Commands run and exit codes:
- Files inspected/changed:
- Secrets redacted: yes/no
- Maintenance mode used: yes/no/local only
- Payment freeze triggered: yes/no
- Current status:
- Decision needed from Marlon:
```

## Post-incident review template

```md
# Post-incident review

- Summary:
- Timeline:
- Root cause:
- Customer/user impact:
- Payment/trust impact:
- What worked:
- What failed:
- Follow-up tasks:
- Owner approvals needed:
```
