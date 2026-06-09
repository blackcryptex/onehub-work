# Gate 2 Phase 2C DreamResponse migration-history reconciliation preflight plan

timestamp_utc: 2026-05-31T02:37:12Z
scope: approved narrow reconciliation for live DreamResponse migration history only
approved migration: 20260509210000_add_dream_response

Safety constraints:
- No DROP/ALTER destructive SQL.
- No prisma migrate deploy/dev, db push, seed, reset, rollback, manual table deletion, credential edits, billing/infra changes, or data deletion.
- Live write is allowed only if evidence confirms live DreamResponse objects match local migration intent closely enough for history-only reconciliation.
- The only permitted DB-mutating action in this run is a non-destructive migration-history record such as `prisma migrate resolve --applied 20260509210000_add_dream_response`.

Preflight steps before any live write:
1. Re-read Sentinel t_1acd0d66 and Steward t_0b8ee27d handoffs plus Phase 2B evidence.
2. Inspect local `apps/web/prisma/migrations/20260509210000_add_dream_response/migration.sql` and `apps/web/prisma/schema.prisma` for DreamResponse table/enums/FKs/indexes.
3. Capture current DB target classification with secrets redacted.
4. Run read-only live checks for:
   - `_prisma_migrations` row for `20260509210000_add_dream_response`.
   - `DreamResponse` columns, defaults, nullability, indexes, FKs.
   - related DreamResponse enums.
   - drift preview from live DB to local Prisma schema.
5. Compare live evidence to local migration intent. If structural mismatch exists, stop and block with exact mismatch/approval needed.

Permitted reconciliation if safe:
- Run `pnpm exec prisma migrate resolve --applied 20260509210000_add_dream_response --schema apps/web/prisma/schema.prisma` against the approved target.
- This records migration history only; it must not apply the migration SQL or change product tables/data.

Post-validation:
1. Re-run `prisma migrate status` and capture before/after status.
2. Re-run `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel apps/web/prisma/schema.prisma --script` and capture drift preview.
3. Run `prisma validate`, `prisma generate` if needed, and `pnpm -C apps/web typecheck` if feasible.
4. Write redacted logs/evidence under this directory and stop review-required with exact action, risk, and Gate 2C readiness verdict.
