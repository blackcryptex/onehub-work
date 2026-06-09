# OneHub Gate 2 Phase 2A Setup — Database Operations Safety Audit

Generated: 2026-05-28T07:21:40Z
Profile: Steward
Scope: read-only audit/planning, except writing this evidence report.
Verdict: PARTIAL / RISK

## 0. Boundary and non-actions

I did not run destructive DB/schema/migration commands.
I did not touch credentials, billing, infrastructure, production settings, live payment systems, or public exposure.
I did not run `prisma migrate dev`, `prisma migrate deploy`, `prisma db push`, `prisma db seed`, `migrate resolve`, `pg_dump`, `pg_restore`, or any live SQL.

Commands actually run:

```bash
git status --short --branch
git rev-parse --show-toplevel
git branch --show-current
git log -1 --oneline
DATABASE_URL value: [REDACTED] pnpm exec prisma validate --schema apps/web/prisma/schema.prisma
git ls-files apps/web/.env.example apps/web/.env.local apps/web/.env.local.save apps/web/.env.local.save.1 apps/web/prisma/migrations/migration_lock.toml apps/web/prisma/schema.prisma scripts/seed.ts
date -u +%Y-%m-%dT%H:%M:%SZ
```

Validation result:

```text
Prisma schema loaded from apps/web/prisma/schema.prisma
The schema at apps/web/prisma/schema.prisma is valid
```

Note: first validation attempt without a stub `DATABASE_URL` failed with P1012 because the root command environment did not expose `DATABASE_URL`. The follow-up used a dummy redacted URL and did not connect to a database.

## 1. Current Prisma / schema / migration inventory

Evidence paths:

- `apps/web/prisma/schema.prisma`
- `apps/web/prisma/migrations/`
- `apps/web/prisma/migrations/migration_lock.toml`
- `package.json`
- `apps/web/package.json`
- `scripts/seed.ts`
- `docs/devops.md`

Current repo state observed:

- Branch: `main`
- Upstream state: `main...origin/main [ahead 2]`
- HEAD: `4526f64 Finalize Pro command center layout and IA`
- Working tree already dirty before this report, with multiple app/source files modified and `reports/production/` untracked.
- No schema/migration files were dirty in the observed `git status` output.

Prisma schema inventory:

- Schema file: `apps/web/prisma/schema.prisma`
- Datasource block: `provider = "postgresql"`, `url = env("DATABASE_URL")`
- Generator: `provider = "prisma-client-js"`
- Migration lock: `apps/web/prisma/migrations/migration_lock.toml` says `provider = "postgresql"`
- Schema count: 67 models, 36 enums
- Schema env references: `DATABASE_URL` only
- Referential action posture: many relations use `onDelete: Cascade` (57 occurrences observed), no `Restrict` or `SetNull` occurrences observed in schema text.

Model inventory:

```text
User, Account, Session, Organization, Team, Membership, Invite, UserSettings,
OrgSettings, FeatureFlag, UserFeatureFlag, OrgFeatureFlag, AuditLog,
AdminOverride, AcceptanceCapture, Event, ShortlistItem, EventStakeholder,
EventShare, Milestone, ChecklistTemplate, Checklist, ChecklistItem, Task,
BudgetLine, Activity, Notification, Listing, ListingTag, Media,
AvailabilitySlot, Offer, BookingRequest, Review, Proposal, ProposalLineItem,
PaymentMilestone, ProposalSection, Contract, Signature, ChangeOrder,
EscrowAccount, Payout, MoneyTx, WebhookEvent, PaymentIntent, Transaction,
PaymentHoldback, Deposit, Thread, ThreadParticipant, Message, Dispute,
RefundRequest, CalendarAccount, CalendarMapping, CalendarSyncState,
CalendarEvent, GuestList, GuestGroup, Guest, Invitation, SeatingPlan, Table,
Seat, MetricDaily, AbuseReport
```

Enum inventory:

```text
Role, AdminOverrideTargetType, AdminOverrideExceptionType,
AdminOverrideDecision, OrgType, OrgRole, StaffRole, EventType, EventStatus,
EventStakeholderRole, EventShareScope, TaskStatus, TaskPriority,
BudgetCategory, ListingType, ListingCategory, AvailabilityStatus,
BookingStatus, BookingClassification, ProposalStatus, MilestoneDueType,
MilestoneStatus, ContractStatus, ChangeOrderStatus, EscrowStatus,
PayoutStatus, PaymentIntentStatus, DepositStatus, DisputeStatus,
DisputeFreezeState, DisputeResolutionType, RefundRequestStatus,
HoldbackState, HoldbackDecision, RefundFeeTreatment, RSVPStatus
```

Migration inventory: 24 migration directories currently exist.

```text
20251101063309_wave6
20251113095900_add_provid
20251113111143_add_payment_intent_and_transaction
20251113143759_add_event_dreamer_role
20251123215319_shortlist_proposals_contracts
20251207143637_add_event_stakeholder
20251207144203_add_event_share
20251207154137_add_deposit_model
20251224030040_enable_rls_on_deposit
20251224091500_lock_down_prisma_migrations_rls
20251224092000_enable_rls_on_session
20251224093000_optimize_deposit_rls_initplan
20251224093500_optimize_session_rls_initplan
20251224094500_enable_rls_on_user
20251224095000_enable_rls_on_account
20251224100000_lock_down_system_tables
20251224101000_enable_rls_on_usersettings
20251224101500_fix_usersettings_multiple_policies
20260323101900_add_payment_intent_funded_at
20260405123600_add_stripe_connect_account_id
20260409162000_add_proposal_booking_classification
20260409170500_add_acceptance_capture
20260409184000_add_admin_override_source_of_truth
manual_add_freetext_event_type_budget
```

Important migration flags found by read-only SQL scan:

- `20251123215319_shortlist_proposals_contracts` contains destructive/drop-risk operations:
  - Drops `ShortlistItem.vendorId`
  - Drops `ShortlistItem.vendorName`
  - Adds required `ShortlistItem.listingId TEXT NOT NULL`
  - Adds multiple unique indexes that can fail on duplicate live data
- `manual_add_freetext_event_type_budget` is manually named, not timestamped like the rest of the Prisma chain. It adds nullable Event columns and backfills existing rows with `UPDATE "Event" ... WHERE "eventTypeRaw" IS NULL`.
- RLS/security migrations exist and affect operational readiness:
  - `20251224091500_lock_down_prisma_migrations_rls` enables and forces RLS on `public."_prisma_migrations"`, revokes anon/authenticated, and intentionally leaves no policies.
  - `20251224100000_lock_down_system_tables` enables/forces RLS and revokes anon/authenticated on internal/sensitive tables including `AuditLog`, `WebhookEvent`, `PaymentIntent`, `Transaction`, `MoneyTx`, `EscrowAccount`, `Payout`, `AbuseReport`, `MetricDaily`, feature flag tables, and `OrgSettings`.
- RLS migrations also target `Deposit`, `Session`, `User`, `Account`, and `UserSettings`.

Seed inventory:

- Root script: `package.json` defines `db:seed` as `ts-node --project tsconfig.json scripts/seed.ts`.
- `scripts/seed.ts` uses `new PrismaClient()` and writes/upserts substantial demo/admin/sample data.
- Seed includes fixed demo/test emails and fixed plaintext source passwords before bcrypt hashing, e.g. demo/admin users. This is acceptable only for local/demo fixtures, not production-like or production databases.
- Some seed writes use `upsert`/`createMany(skipDuplicates: true)`, but other createMany calls are not globally idempotent. Treat seed as DB-mutating and approval-required outside local disposable databases.

## 2. Database config / environment requirements, secrets redacted

Tracked / untracked env evidence:

- Tracked by git:
  - `apps/web/.env.example`
- Ignored / not tracked by git:
  - `apps/web/.env.local`
  - `apps/web/.env.local.save`
  - `apps/web/.env.local.save.1`
- `.gitignore` ignores `.env` and `.env.*` while allowing `!.env.example`.

`apps/web/.env.example` keys:

```text
DATABASE_URL value: [REDACTED]
NEXTAUTH_URL=<redacted/local example URL>
NEXTAUTH_SECRET value: [REDACTED]
OPENAI_API_KEY value: [REDACTED]
OPENAI_MODEL=<model name only>
```

Optional keys documented in comments in `.env.example`:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

Local ignored env files contain live-looking keys. Values were not copied into this report:

```text
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_ID / GOOGLE_SECRET
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
GUARDED_MVP_PLATFORM_ADMIN_USER_IDS
OPENAI_API_KEY
OPENAI_MODEL
ONEHUB_DEMO_MODE
ONEHUB_DEMO_PRO_EMAIL
ONEHUB_DEMO_PRO_PASSWORD
GOOGLE_MAPS_API_KEY
```

Required before safe staging/production-like migration work:

1. Environment classification for every `DATABASE_URL`: local disposable, staging, production-like, or production.
2. Explicit read/write role separation:
   - app runtime role
   - migration owner role
   - backup/restore operator role
   - optional read-only audit role
3. Confirmation that the migration role can access `_prisma_migrations` despite RLS lock-down. App/client roles should not.
4. Confirmation that runtime server-side Prisma uses a server-only database URL and does not expose it client-side.
5. Confirmation that Stripe/OpenAI/Google secrets in local env files are not production secrets unless Marlon explicitly authorized local storage.
6. For Supabase/Postgres: clarify direct connection vs pooler connection. Prisma migrations generally require a direct/non-transaction-pooler connection for DDL reliability.

## 3. Backup / restore / rollback plan

Safe preconditions before any migration against staging/production-like or production data:

1. Identify target database and classify environment.
2. Freeze writes or schedule maintenance window if migration can alter constraints, indexes, required columns, or backfill rows.
3. Capture database metadata:
   - Postgres version
   - active extensions
   - table list and row counts
   - current `_prisma_migrations` rows
   - active RLS status/policies for application-critical tables
4. Take a logical backup with schema and data.
5. Store backup with timestamp, environment name, git SHA, and migration target SHA.
6. Verify backup by restoring into an isolated scratch database and running read-only smoke checks.
7. Only then apply migrations to staging/production-like database.
8. Validate schema/migration status and application smoke checks after migration.

Backup commands to prepare but not execute without target approval:

```bash
# Metadata only / safer inventory once DB target is approved
psql "$DATABASE_URL" -c 'select version();'
psql "$DATABASE_URL" -c 'select migration_name, finished_at from "_prisma_migrations" order by started_at;'
psql "$DATABASE_URL" -c "select schemaname, tablename, rowsecurity, forcerowsecurity from pg_tables where schemaname = 'public' order by tablename;"

# Logical backup
pg_dump --format=custom --no-owner --no-acl --file "backups/onehub-<env>-<timestamp>.dump" "$DATABASE_URL"

# Restore verification into isolated scratch DB only
createdb onehub_restore_check_<timestamp>
pg_restore --clean --if-exists --no-owner --no-acl --dbname "postgresql://<scratch>" "backups/onehub-<env>-<timestamp>.dump"
```

Rollback posture:

- Preferred rollback for production-like data is restore-from-verified-backup, not ad hoc reverse SQL.
- For additive nullable migrations, code rollback may be enough if no reads depend on new columns.
- For destructive migrations, required column additions, unique constraints, or data backfills, rollback must be restore-based unless a reviewed reverse migration is written and tested against restored copy first.
- `manual_add_freetext_event_type_budget` includes data backfill and README rollback guidance that says to drop columns; that is destructive and must not be run on live data without approval and a verified backup.
- `20251123215319_shortlist_proposals_contracts` drops old ShortlistItem fields and must be treated as non-reversible without backup if live data still exists in those columns.

## 4. Migration risk list

R1 — Live migration state unknown.

- I did not query any live database.
- Repo contains `apps/web/reports/FINAL_MIGRATION_STATUS.txt` saying only 2 migrations were found and schema was up to date for a prior Supabase target. Current repo has 24 migration directories. That status artifact is stale or from a different working tree/context and cannot prove current staging/production readiness.

R2 — Manual migration naming can confuse Prisma migration history.

- `manual_add_freetext_event_type_budget` does not follow timestamp naming.
- The README tells operators to run `migrate resolve --applied add_freetext_event_type_budget`, but the directory is named `manual_add_freetext_event_type_budget`. That mismatch is a correctness risk unless already reconciled in `_prisma_migrations`.

R3 — Destructive/constraint migration exists in chain.

- `20251123215319_shortlist_proposals_contracts` drops columns and adds required/unique constraints.
- It can fail or lose data on non-empty databases unless preflight duplicate/null/data-preservation checks pass.

R4 — RLS on `_prisma_migrations` is unusual for Prisma operations.

- The migration locks down `_prisma_migrations` from anon/authenticated roles.
- Safe if migration owner bypasses/owns correctly; risky if Prisma deploy uses a constrained role affected by forced RLS.

R5 — Seed script is production-dangerous.

- `scripts/seed.ts` creates demo/admin/sample accounts and data.
- It must not run against production-like or production DB without explicit Marlon approval and a documented fixture policy.

R6 — Environment file drift.

- `.env.example` uses `GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET` comments, while local env files use `GOOGLE_ID/GOOGLE_SECRET`.
- Staging/production env requirements should be normalized before Gate 3.

R7 — Cascading deletes need policy review before production data.

- Schema has many `onDelete: Cascade` relations, including user/org/event-linked data. This can be correct for local cleanup but dangerous with production data if admin/delete flows are not heavily permission-gated and audited.

R8 — Backup strategy is documented only generally.

- `docs/devops.md` says automated database backups are a production consideration, but no concrete repo-level backup/restore runbook or restore verification artifact was found in this audit.

R9 — Dirty working tree raises evidence/traceability risk.

- Current repo was already dirty and ahead of origin. Even though schema/migrations were not dirty, Gate 2 migration readiness should pin a clean commit SHA before any target DB operation.

## 5. Commands required for non-destructive verification

These commands are non-destructive in intent, but any command using a real DB URL still requires target classification and approval to avoid touching production by accident.

Local/repo-only verification, safe with dummy DB URL:

```bash
DATABASE_URL value: [REDACTED] pnpm exec prisma validate --schema apps/web/prisma/schema.prisma
git diff --check -- apps/web/prisma/schema.prisma apps/web/prisma/migrations
pnpm exec prisma migrate diff --from-empty --to-schema-datamodel apps/web/prisma/schema.prisma --script > reports/production/gate2/phase2a/setup/from-empty-schema.sql
```

Read-only DB verification after target approval:

```bash
# Confirm target and migration table history
pnpm exec prisma migrate status --schema apps/web/prisma/schema.prisma
psql "$DATABASE_URL" -c 'select migration_name, checksum, finished_at, rolled_back_at from "_prisma_migrations" order by started_at;'

# Confirm row counts before risky migrations
psql "$DATABASE_URL" -c 'select count(*) from "ShortlistItem";'
psql "$DATABASE_URL" -c 'select count(*) from "ShortlistItem" where "listingId" is null;'
psql "$DATABASE_URL" -c 'select "eventId", "listingId", count(*) from "ShortlistItem" group by 1,2 having count(*) > 1;'

# Confirm RLS posture
psql "$DATABASE_URL" -c "select tablename, rowsecurity, forcerowsecurity from pg_tables where schemaname = 'public' order by tablename;"
psql "$DATABASE_URL" -c "select schemaname, tablename, policyname, roles, cmd from pg_policies where schemaname = 'public' order by tablename, policyname;"

# Confirm schema drift without applying changes
pnpm exec prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel apps/web/prisma/schema.prisma --script > reports/production/gate2/phase2a/setup/live-drift-preview.sql
```

Staging-only destructive-safety rehearsal, not production:

```bash
# Against restored scratch DB only, never production
pnpm exec prisma migrate deploy --schema apps/web/prisma/schema.prisma
pnpm exec prisma migrate status --schema apps/web/prisma/schema.prisma
pnpm -C apps/web typecheck
pnpm -C apps/web build
```

## 6. Actions requiring Marlon approval before execution

Require explicit Marlon approval before any of these actions:

1. Running any command against a staging, production-like, or production `DATABASE_URL`.
2. Running `prisma migrate dev`, `prisma migrate deploy`, `prisma migrate resolve`, `prisma db push`, `prisma db seed`, or manual SQL against any persistent DB.
3. Running `pg_dump` or `pg_restore` against any DB containing real user/client/provider/payment data.
4. Reading or exporting live rows from user, account, payment, Stripe/webhook, admin, dispute, refund, or contract tables.
5. Changing credentials, rotating secrets, editing `.env.local`, editing deployment environment variables, or changing Supabase/hosting/infrastructure settings.
6. Running seed data against anything other than a disposable local DB.
7. Applying rollback SQL, dropping columns, dropping tables, resolving migrations as applied/rolled back, or altering `_prisma_migrations`.
8. Exposing database/admin dashboards or making any internal service public.
9. Touching Stripe live/payment systems, webhook endpoints, payouts, refunds, or billing configuration.

## 7. Gate 2 readiness judgment

Current status: PARTIAL / RISK.

What is sound:

- Prisma schema parses and validates with Prisma CLI 5.22.0 when a dummy `DATABASE_URL` is supplied.
- Schema and migration lock both target PostgreSQL.
- Migration directories are present and committed for schema/migration files checked by `git ls-files`.
- Local env secrets are ignored by git; `.env.example` is the tracked template.

What is not proven yet:

- Current staging/production-like `_prisma_migrations` history matches the 24 migration directories.
- Backup/restore has been performed and verified.
- The migration role can operate correctly with RLS/forced RLS on `_prisma_migrations` and system tables.
- Destructive/constraint migrations are safe against real row counts and duplicate/null preflight checks.
- Seed/schema consistency is safe for anything beyond local demo data.
- Production-like DB readiness is not proven without target-classified read-only checks.

Narrow next action for Sentinel:

- Review this evidence and approve/block the proposed non-destructive verification sequence.
- Before any DB target is touched, require Marlon to identify the intended environment and approve read-only DB verification only.
