# Gate 2 Phase 2B DB target verification handoff

Verdict: PARTIAL / RISK

Scope: read-only, non-destructive verification of the active DATABASE_URL target, Prisma migration status, live metadata/count/RLS posture, and Prisma schema drift preview.

Target class:
- Selected source: apps/web/.env.local
- Class: remote-managed-postgres
- Host: aws-1-us-east-1.pooler.supabase.com
- Database: postgres
- Port: 5432
- Active ambiguity: false
- Secrets: full URL, username, password, and query values were not written to evidence.

Commands run:
- python3 reports/production/gate2/phase2b/db-target-verification/classify_db_target.py
- pnpm exec prisma migrate status --schema apps/web/prisma/schema.prisma
- psql --no-password --no-psqlrc with PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=30000' and BEGIN READ ONLY metadata/count/RLS queries
- pnpm exec prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel apps/web/prisma/schema.prisma --script > reports/production/gate2/phase2b/db-target-verification/live-drift-preview.sql

Evidence paths:
- reports/production/gate2/phase2b/db-target-verification/target-classification.md
- reports/production/gate2/phase2b/db-target-verification/target-classification.json
- reports/production/gate2/phase2b/db-target-verification/prisma-migrate-status.log.md
- reports/production/gate2/phase2b/db-target-verification/psql-readonly-metadata.log.md
- reports/production/gate2/phase2b/db-target-verification/prisma-migrate-diff.log.md
- reports/production/gate2/phase2b/db-target-verification/live-drift-preview.sql
- reports/production/gate2/phase2b/db-target-verification/command-results.json
- reports/production/gate2/phase2b/db-target-verification/drift-result.json

Key results:
- Prisma migrate status exit: 0.
- Prisma reported: 24 migrations found in prisma/migrations; database schema is up to date.
- psql read-only metadata exit: 0.
- The psql session confirmed transaction_read_only=on.
- _prisma_migrations history query returned 28 rows, including one rolled-back row for 20251224030040_enable_rls_on_deposit and applied zero-step rows.
- ShortlistItem integrity counts: total=17, null_event_id=0, null_listing_id=0, duplicate_event_listing_pairs=0.
- RLS posture query found rowsecurity=true for 69 public tables, with policies listed in evidence.
- Drift preview exit: 0, but the generated SQL is not empty.
- Drift preview would drop DreamResponse foreign keys, Message/Thread/ThreadParticipant indexes, the DreamResponse table, and DreamResponse enums if applied. This was preview-only; no SQL was applied.

Risk / blocker:
- Gate 2B target verification itself succeeded without destructive action, but the live DB has schema objects not represented in apps/web/prisma/schema.prisma. The drift preview is destructive if applied.
- Do not proceed to any migration/apply step until Atlas/Marlon accepts a remediation path for DreamResponse and the communication indexes, or confirms those live-only objects are intentionally removable.

Narrow next action:
- Remediation / schema reconciliation is next before Gate 2C. Gate 2C should not run any DB-mutating command against this target based on the current drift preview.

Secret check:
- Evidence scan found no full DATABASE_URL or DB password values in generated files.
