# OneHub Gate 2 Phase 2C — Production Migration Runbook

Generated: 2026-05-31T08:18:20Z
Profile: Steward
Scope: documentation / non-destructive verification only. This runbook does not authorize production execution.
Verdict: PARTIAL / REVIEW-REQUIRED until maintenance mode and staging restore/migration rehearsal are independently implemented and verified.

## 0. Hard boundary

Do not proceed unless the exact production migration scope has Marlon/Atlas approval.

Still forbidden without explicit Marlon approval:

- `prisma migrate deploy`, `prisma migrate dev`, `prisma db push`, `prisma db seed`, `prisma migrate reset`, rollback SQL, manual `DROP` / destructive `ALTER`, or `_prisma_migrations` mutation against staging, production-like, or production databases.
- `pg_dump`, `pg_restore`, `psql`, or Prisma commands using a real `DATABASE_URL` unless the target environment is classified and approved for that exact command.
- Credential changes, `.env.local` changes, deployment environment edits, Supabase/hosting/infra/billing changes, public exposure of dashboards, live Stripe/payment actions, payouts, refunds, or billing configuration.
- Reading/exporting sensitive live user/account/payment/contract/dispute rows beyond explicitly approved minimum metadata.
- Oracle involvement for OneHub.

## 1. Required approvals before any production migration window

Required approvers / evidence:

1. Marlon or Atlas approves the exact migration name(s), target environment, migration window, backup command, restore verification plan, migration command, smoke checks, and rollback branches.
2. Steward/backend review accepts the migration risk class and confirms no unsafe hidden data-integrity risk remains.
3. Sentinel verifies evidence from staging and preflight before production execution.
4. If payment, contract, dispute, refund, or Stripe-adjacent tables are touched, payment/trust-specific approval is required before execution.

No approval by implication: the prior DreamResponse migration-history reconciliation only approved a narrow history-only resolve for `20260509210000_add_dream_response`; it does not approve unrelated destructive migration work.

## 2. Preflight checklist

Complete and record all items before the migration window:

- Pin repo state:
  - current branch
  - commit SHA
  - `git status --short --branch`
  - exact migration directories included
- Classify database target:
  - local disposable / staging / production-like / production
  - direct Postgres connection vs pooler connection
  - migration owner role, app runtime role, backup/restore operator role, read-only audit role
- Confirm migration owner can access `_prisma_migrations` despite OneHub RLS lock-down.
- Confirm app/runtime role remains least-privilege and cannot mutate `_prisma_migrations`.
- Generate local-only schema validation evidence:
  - `DATABASE_URL value: [REDACTED] pnpm -C apps/web exec prisma validate --schema prisma/schema.prisma`
  - `pnpm -C apps/web typecheck`
- Review migration SQL for risk classes:
  - destructive drops
  - required non-null columns
  - unique indexes / constraints
  - backfills / data rewrites
  - RLS/policy changes
  - payment, contract, dispute, refund, payout, webhook, or auth/session/user tables
- Run approved read-only metadata checks on the target only after target approval:
  - Postgres version and extensions
  - `_prisma_migrations` ordered history
  - row counts for affected tables
  - duplicate/null checks for new required or unique constraints
  - RLS status/policy inventory for affected tables
  - schema drift preview using `prisma migrate diff` without applying changes
- Confirm secret redaction:
  - no full DB URLs in reports
  - no passwords/API keys/tokens in logs
  - no unredacted Stripe/OpenAI/Google/NextAuth secrets

## 3. Backup and restore verification

Production migration may not start until backup and restore are both complete and evidenced.

Backup policy:

1. Use a logical custom-format backup with timestamp, environment name, git SHA, and migration target SHA in the filename.
2. Store backup in the approved private location only.
3. Capture backup command exit code and backup file size/checksum, but do not publish secrets or full URLs.
4. Restore into an isolated scratch database, never back into production during preflight.
5. Run read-only restore smoke checks against the scratch restore:
   - table count and critical table presence
   - selected row counts for affected tables
   - `_prisma_migrations` history present
   - no obvious restore errors in logs
6. Record restore verification artifact before migration execution.

Commands are templates only; do not run without target approval:

```bash
# backup, approved target only
pg_dump --format=custom --no-owner --no-acl \
  --file "backups/onehub-<env>-<timestamp>-<gitsha>.dump" \
  "$DATABASE_URL"

# restore verification, isolated scratch DB only
createdb "onehub_restore_check_<timestamp>"
pg_restore --clean --if-exists --no-owner --no-acl \
  --dbname "postgresql://<scratch-redacted>" \
  "backups/onehub-<env>-<timestamp>-<gitsha>.dump"
```

## 4. Staging success gate

Production execution requires a staging or production-like rehearsal that uses the same migration set and materially similar schema/data shape.

Required staging evidence:

- target classification and approval for staging/prod-like DB
- backup and scratch restore verification
- pre-migration status and drift preview
- migration execution log if approved for staging
- post-migration status
- app smoke checks
- rollback branch rehearsal appropriate to risk class
- secret-redacted logs saved under the Gate 2 evidence tree

Production is blocked if staging has any unresolved migration error, drift mismatch, restore failure, failed smoke check, unreviewed destructive operation, or unexplained RLS/migration-role behavior.

## 5. Execution policy

Allowed production command policy only after all gates pass:

- Prefer `pnpm -C apps/web exec prisma migrate deploy --schema prisma/schema.prisma` for approved production migration deployment.
- Do not use `prisma migrate dev` against shared/persistent databases.
- Do not use `prisma db push` against production or production-like data.
- Do not run seed scripts against production unless Marlon explicitly approves a production fixture policy.
- Do not use `migrate resolve` except for a separately approved history-only reconciliation with proof live objects already match migration intent.
- Do not hand-edit `_prisma_migrations`.

Operational sequence:

1. Confirm approved migration window and responsible operator.
2. Enable app-level maintenance mode if implemented and verified; if absent, use external traffic/write freeze only as an explicitly approved fallback.
3. Confirm backup and scratch restore evidence is current.
4. Confirm staging evidence is current and matches the production migration set.
5. Run pre-migration read-only status checks.
6. Execute the approved migration command once.
7. Capture exit code and redacted log.
8. Run post-migration status and drift preview.
9. Run smoke checks.
10. Disable maintenance mode only after smoke checks pass and approver accepts the post-migration state.

## 6. Rollback branches

Choose the branch before execution.

Branch A — migration command fails before applying changes:

- Keep maintenance mode/write freeze active.
- Capture command log and migration status.
- Do not retry more than once without Steward/Sentinel review.
- If no partial DB change exists, roll back code deployment if necessary and exit the window.

Branch B — migration partially applies or database state is uncertain:

- Keep maintenance mode/write freeze active.
- Stop all further DB mutation.
- Capture `_prisma_migrations` and affected table metadata read-only.
- Prefer restore from verified backup into production only after explicit Marlon approval for restore action.
- Do not write ad hoc reverse SQL unless pre-written, reviewed, and rehearsed.

Branch C — migration succeeds but application smoke checks fail:

- Keep database as migrated if schema is valid and data is intact.
- Roll back application code to the last compatible release if possible.
- If app rollback is incompatible with DB state, use maintenance mode and escalate before DB restore.

Branch D — data corruption or wrong target:

- Freeze writes immediately.
- Escalate to Marlon/Atlas.
- Preserve all logs.
- Restore from verified backup only under explicit approval.
- Run incident/postmortem before any new attempt.

Branch E — live payment/contract/dispute/refund/payout risk detected:

- Freeze writes and live payment actions.
- Do not issue refunds/payouts or modify Stripe state.
- Escalate for payment/trust review.

## 7. Smoke checks

Minimum post-migration checks:

- Prisma status says database schema is up to date for approved migration set.
- Drift preview is empty or reviewed/expected.
- App process starts.
- Auth/session path responds.
- Read-only dashboard or app landing path responds.
- Critical write routes remain disabled during maintenance mode.
- After maintenance mode off, one approved non-payment write smoke can be tested only against staging; production write smoke requires separate approval.
- No secrets printed in logs.
- No unexpected error spike in app logs.

For OneHub trust/payment tables, smoke checks must include read-only confirmation that existing payment/contract/dispute/refund/payout rows still satisfy expected counts/invariants, without exposing raw PII/payment details.

## 8. Evidence output requirements

Each migration attempt must leave:

- approved scope and approver
- target classification
- repo SHA and dirty-tree status
- migration list and risk classification
- backup/restore verification artifact
- staging success artifact
- production execution log, if run
- post-migration status/drift/smoke evidence
- rollback branch selected and whether invoked
- secret redaction proof

## 9. Current Gate 2C state

Current evidence supports planning and runbook hardening only.

Sound evidence available:

- Gate 2A audit documented migration risks, backup/restore requirements, and approval-required commands.
- Gate 2B reconciliation represented live DreamResponse/communications/refund-holdback/security-advisor migration history in source and cleared structural drift preview.
- Gate 2C DreamResponse history-only reconciliation was reviewed as PASS by Sentinel parent task `t_5082a548` and did not approve unrelated destructive work.

Remaining gaps before production migration readiness:

- Backup/restore has not been evidenced end-to-end for production-like data under this task.
- Staging migration rehearsal for a future production migration is not evidenced under this task.
- App-level maintenance mode is not implemented in the inspected code path.
- Safety checklist should be attached to future migration PRs/cards and verified by Sentinel before production execution.
