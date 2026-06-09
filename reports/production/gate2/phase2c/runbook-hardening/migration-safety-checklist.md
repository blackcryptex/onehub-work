# OneHub Gate 2 Phase 2C — Migration Safety Checklist

Generated: 2026-05-31T08:18:20Z
Scope: non-destructive documentation evidence.

## Required checklist status legend

- PASS: evidence exists and is reviewed.
- PARTIAL: evidence exists but needs review or is incomplete.
- BLOCKED: not safe to proceed.
- N/A: not applicable to this migration scope.

## 1. Scope and approval

- [ ] Exact migration name(s) listed.
- [ ] Target environment classified.
- [ ] Marlon/Atlas approval recorded for the exact target and command set.
- [ ] Steward/backend risk review completed.
- [ ] Sentinel verification completed before production execution.
- [ ] No unrelated destructive migration work included.
- [ ] No credential/billing/infra/production setting changes included.
- [ ] No live payment actions included.

Current Gate 2C runbook-hardening status: PARTIAL. This task is documentation/evidence only and does not approve execution.

## 2. Preflight

- [ ] Repo branch, commit SHA, and dirty-tree status recorded.
- [ ] Migration SQL reviewed for DROP/ALTER, required columns, unique constraints, data backfills, RLS/policy changes, auth/session/user/payment/contract/dispute/refund/payout/webhook impact.
- [ ] Affected table row counts and duplicate/null checks listed for target DB.
- [ ] `_prisma_migrations` history captured read-only.
- [ ] RLS status and migration role access checked.
- [ ] Direct DB connection vs pooler connection confirmed.
- [ ] Local Prisma schema validates with dummy redacted URL.
- [ ] Typecheck passes.
- [ ] Secret redaction confirmed for all evidence logs.

Current status: PARTIAL. Local validate/typecheck can be run safely; target DB metadata requires approval.

## 3. Backup and restore

- [ ] Approved backup command recorded.
- [ ] Backup produced with timestamp/env/git SHA naming.
- [ ] Backup checksum/size recorded without exposing secrets.
- [ ] Backup restored into isolated scratch DB.
- [ ] Scratch restore read-only smoke checks passed.
- [ ] Restore artifact reviewed before migration.

Current status: BLOCKED for production readiness. Backup/restore was not executed in this documentation task and remains approval-required.

## 4. Staging success

- [ ] Staging/prod-like DB target classified and approved.
- [ ] Staging backup and restore verified.
- [ ] Staging migration executed only after approval.
- [ ] Staging post-migration Prisma status passes.
- [ ] Staging drift preview is empty or reviewed.
- [ ] Staging app smoke checks pass.
- [ ] Staging rollback branch rehearsed for the migration risk class.

Current status: BLOCKED for production readiness. No staging migration rehearsal was run in this task.

## 5. Maintenance mode / write freeze

- [ ] App-level maintenance flag exists.
- [ ] Protected UI routes show maintenance page during flag.
- [ ] Mutating API routes return 503 during flag.
- [ ] Health/read-only allowlist is documented.
- [ ] Admin/operator bypass, if any, is narrowly documented and tested.
- [ ] Maintenance mode has automated tests or smoke checks.

Current status: BLOCKED. Inspection found no app-level maintenance mode implementation. `apps/web/src/middleware.ts` protects app/client/planner paths for auth/role only and has no maintenance flag or 503 behavior; repository search found no `MAINTENANCE_MODE` / `ONEHUB_MAINTENANCE_MODE` implementation.

## 6. Migration deploy policy

- [ ] Use `prisma migrate deploy` only after approvals and staging success.
- [ ] Never use `migrate dev`, `db push`, `seed`, or `reset` against production-like/production DBs.
- [ ] `migrate resolve` requires separate history-only approval and proof objects match migration intent.
- [ ] Do not hand-edit `_prisma_migrations`.
- [ ] Stop after first failure and invoke rollback branch; do not iterate blindly.

Current status: PARTIAL. Policy documented; enforcement should be added to future PR/card templates and reviewed by Sentinel.

## 7. Rollback branches

- [ ] Branch A: migration fails before applying.
- [ ] Branch B: partial/uncertain DB state.
- [ ] Branch C: DB succeeds, app fails.
- [ ] Branch D: data corruption or wrong target.
- [ ] Branch E: payment/trust table risk.
- [ ] Restore-from-backup is preferred over ad hoc reverse SQL for destructive/data migrations.

Current status: PARTIAL. Branches documented in `production-migration-runbook.md`; not rehearsed under this task.

## 8. Smoke checks

- [ ] Prisma status post-migration.
- [ ] Drift preview post-migration.
- [ ] App starts.
- [ ] Auth/session route responds.
- [ ] Read-only app/dashboard path responds.
- [ ] Mutating routes are blocked while maintenance mode is on.
- [ ] No unapproved production writes are used as smoke tests.
- [ ] No secrets printed.
- [ ] Payment/trust rows checked only through approved redacted invariants.

Current status: PARTIAL / BLOCKED. Smoke policy documented; production smoke execution requires maintenance mode and target approval.

## 9. Secret redaction

- [ ] No full `postgres://` / `postgresql://` URL in evidence.
- [ ] No `DATABASE_URL=` value containing password in evidence.
- [ ] No Stripe/OpenAI/Google/NextAuth secrets in evidence.
- [ ] Logs show redacted placeholders for sensitive values.

Current status: PASS for files created in this runbook-hardening directory by manual review and verification command recorded in `verification-results.md`.

## 10. Final gate decision

Production migration execution remains BLOCKED until all required items above are PASS or explicitly accepted as N/A by Marlon/Atlas plus Sentinel.

This Gate 2C hardening task may move to review-required because it produced the missing runbook/checklist evidence and identified a narrow implementation gap: app-level maintenance mode / write-freeze safety checks.
