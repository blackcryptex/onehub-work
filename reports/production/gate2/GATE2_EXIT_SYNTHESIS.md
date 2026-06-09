# OneHub Gate 2 Exit Synthesis

Generated: 2026-06-01T12:36:32Z
Owner: Atlas / default
Scope: documentation synthesis only. No code edits beyond this report, no DB mutations, no credential/billing/infra/production setting changes, no public exposure, no live payment actions, no Oracle.

## Executive decision

Gate 2 may be treated as COMPLETE for planning purposes.

Gate 3 Business Logic may be planned next, but production migration/live action is still NOT approved. Gate 2 evidence supports readiness to design the next business-logic lane under Directive V2, not readiness to migrate production, expose services, touch live payments, or merge broad dirty-tree work without review.

## Completed Gate 2 phases

### Phase 2A — database operations safety setup

Status: completed as safety setup / risk inventory.

Evidence:
- `reports/production/gate2/phase2a/setup/database-operations-safety-audit.md`
- Sentinel active review `t_04f6232c`: PASS.

Key findings:
- Prisma schema validated with a dummy redacted `DATABASE_URL`; no live DB connection was used in Phase 2A.
- Local schema/migration inventory was documented: PostgreSQL datasource, migration lock present, 67 models, 36 enums, and 24 migration directories at that point.
- Risky migration areas were explicitly identified, including destructive/constraint risk in `20251123215319_shortlist_proposals_contracts`, manual backfill in `manual_add_freetext_event_type_budget`, RLS lock-down on `_prisma_migrations` and sensitive/system tables, and seed-data risk.
- Approval gates were correctly stated for DB access, migrations, backups/restores, seed, manual SQL, credentials, billing, infrastructure, public exposure, and Stripe/payment systems.

Decision impact:
- Phase 2A passed as a safety review, not as database readiness approval.

### Phase 2B — DB target verification and schema reconciliation

Status: completed after reconciliation and Sentinel review.

Evidence:
- `reports/production/gate2/phase2b/db-target-verification/handoff.md`
- `reports/production/gate2/phase2b/schema-reconciliation/handoff.md`
- Sentinel active DB drift review `t_bd449864`: PASS.
- Sentinel schema reconciliation review `t_1acd0d66`: PASS.

Key findings:
- DB target was classified as a remote managed Postgres/Supabase pooler target with secrets redacted.
- Approved read-only checks confirmed the target was reachable and `transaction_read_only=on` was used for psql metadata/count/RLS queries.
- Initial drift preview was not safe to apply: it would have dropped live `DreamResponse` objects and Message/Thread/ThreadParticipant indexes/FKs.
- Schema reconciliation represented those live objects in Prisma/schema source instead of approving destructive removal.
- Validation evidence after reconciliation showed `prisma validate`, `prisma generate`, `pnpm -C apps/web typecheck`, and live drift preview passing, with the post-reconciliation drift preview empty.

Decision impact:
- Phase 2B passed after schema source was reconciled to live state.
- The original destructive drift path remains rejected.

### Phase 2C — migration-history reconciliation, runbook hardening, and maintenance/write-freeze

Status: completed for Gate 2 exit planning after Sentinel review.

Evidence:
- `reports/production/gate2/phase2c/migration-history-reconciliation/handoff.md`
- `reports/production/gate2/phase2c/runbook-hardening/evidence-index.md`
- `reports/production/gate2/phase2c/maintenance-mode/forge-implementation-evidence.md`
- Sentinel DreamResponse history review `t_5082a548`: PASS.
- Sentinel runbook hardening review `t_c27bbaf7`: PASS as documentation/safety evidence, not production migration readiness.
- Sentinel maintenance/write-freeze review `t_c8de7dae`: PASS.

Key findings:
- DreamResponse migration-history reconciliation was limited to non-destructive history reconciliation: `prisma migrate resolve --applied 20260509210000_add_dream_response`.
- Evidence shows before/after migrate status, before/after drift previews, checksum, migration-row state, validate/generate/typecheck, and redaction checks were coherent.
- After reconciliation, migrate status was green and drift preview remained empty.
- Runbook hardening produced production migration runbook, migration safety checklist, maintenance-mode recommendation, evidence index, and verification results.
- Maintenance/write-freeze implementation added a server-side `ONEHUB_MAINTENANCE_MODE` flag, centralized maintenance helpers, middleware handling for mutating `/api/*` requests, a `/maintenance` page, and targeted tests.
- Sentinel confirmed mutating `/api/*` requests return safe 503 JSON with `Retry-After: 300`, protected UI routes redirect to `/maintenance`, safe/static/auth paths are preserved, no client-visible maintenance bypass secret was found, and targeted vitest plus no-incremental typecheck passed.

Decision impact:
- Phase 2C now supports Gate 2 exit synthesis.
- This is still not production migration approval.

## Sentinel PASS evidence summary

Sentinel passed the accepted Gate 2 path:

1. `t_04f6232c` — PASS for Gate 2 Phase 2A database operations safety review.
2. `t_bd449864` — PASS for Gate 2 Phase 2B active DB drift review; confirmed destructive drift risk and required reconciliation.
3. `t_1acd0d66` — PASS for Gate 2 Phase 2B schema reconciliation active review.
4. `t_5082a548` — PASS for Gate 2 Phase 2C DreamResponse migration-history reconciliation active review.
5. `t_c27bbaf7` — PASS for Gate 2 Phase 2C runbook-hardening review as documentation/safety evidence, with maintenance/write-freeze implementation identified as the required follow-up.
6. `t_c8de7dae` — PASS for Gate 2 Phase 2C maintenance-mode/write-freeze independent active review.

## Remaining risks and stale duplicate cards

### Real remaining risks

- Production migration/live action is not approved.
- Backup/restore verification and staging rehearsal are not completed by Gate 2 evidence.
- The worktree is broad and dirty, including unrelated product/app modifications outside the narrow Gate 2 evidence path.
- Maintenance mode covers `/api/*` mutating requests and enumerated protected UI namespaces; future mutating routes outside those paths must update the centralized helper/matcher.
- Future DB-mutating operations still require scoped safety checks, explicit approval, and Sentinel verification.
- Gate 2 evidence does not approve live payment actions, Stripe/webhook changes, payouts, refunds, billing configuration, credentials, infrastructure, public exposure, or production setting changes.

### Stale/blocked duplicate cards to ignore for gate status

The board still contains older review-required/blocked parent cards and dependent todo cards from the accepted active-review workaround pattern. They should not drag Gate 2 status backward because independent active Sentinel reviews passed the accepted path.

Stale/blocked or duplicate Gate 2 cards observed:
- `t_8d040401` — blocked Steward Phase 2A parent; superseded by Sentinel PASS `t_04f6232c`.
- `t_0f4bc94e` — todo dependent Phase 2A verifier; superseded by active review `t_04f6232c`.
- `t_e3defdac` — blocked Steward Phase 2B target-verification parent; superseded by Sentinel PASS `t_bd449864`.
- `t_c4eb84c3` — todo dependent Phase 2B verifier; superseded by active review `t_bd449864`.
- `t_0b8ee27d` — blocked schema-reconciliation parent; superseded by Sentinel PASS `t_1acd0d66`.
- `t_4a66f1ed` — todo dependent schema-reconciliation verifier; superseded by active review `t_1acd0d66`.
- `t_a02d8fbc` — blocked DreamResponse migration-history parent; superseded by Sentinel PASS `t_5082a548`.
- `t_8ce7c2b9` — todo dependent DreamResponse verifier; superseded by active review `t_5082a548`.
- `t_a1681994` — blocked runbook-hardening parent; superseded by Sentinel PASS `t_c27bbaf7`.
- `t_b8464768` — todo dependent runbook verifier; superseded by active review `t_c27bbaf7`.
- `t_894a981d` — older todo maintenance-mode implementation card; superseded by active Forge implementation `t_357dd8fc` and Sentinel PASS `t_c8de7dae`.
- `t_357dd8fc` — blocked Forge maintenance/write-freeze parent; superseded for acceptance by Sentinel PASS `t_c8de7dae`.
- `t_5fa97714` — todo dependent maintenance/write-freeze verifier; superseded by independent active review `t_c8de7dae`.

Recommended board hygiene later: archive or mark these stale cards according to Marlon/Atlas board-cleanup policy. Do not treat them as active Gate 2 blockers.

## Gate 3 readiness decision

Gate 3 Business Logic may be planned next.

Reason:
- Gate 2’s accepted evidence path has Sentinel PASS coverage across safety setup, DB target drift review, schema reconciliation, migration-history reconciliation, runbook hardening, and maintenance/write-freeze.
- The remaining risks are production/live-action gates, not blockers to planning the next read-only/implementation-scoped business-logic lane under Directive V2.

Gate 3 planning must stay scoped and must not assume production readiness. It should define exact business-logic acceptance criteria, route work through the approved OneHub roster only, and preserve Sentinel veto at each phase.

## Exact approval gates still required before production migration or live action

Marlon approval is still required before any of the following:

1. Running any command against staging, production-like, or production `DATABASE_URL` beyond the already approved/read-only or already reviewed narrow history reconciliation evidence.
2. Running `prisma migrate dev`, `prisma migrate deploy`, `prisma migrate resolve`, `prisma db push`, `prisma db seed`, reset, rollback, or manual SQL against any persistent database.
3. Applying any destructive or structural DB/schema change, including drop/alter operations, migration repair, or `_prisma_migrations` manipulation.
4. Taking, exporting, restoring, or moving backups containing real client/user/provider/payment data.
5. Reading/exporting live rows from user, account, payment, Stripe/webhook, admin, dispute, refund, contract, or other sensitive tables.
6. Editing credentials, rotating secrets, changing `.env.local`, deployment environment variables, Supabase/hosting settings, infrastructure, public exposure, or production settings.
7. Touching Stripe live/payment systems, webhook endpoints, payouts, refunds, billing, or payment processor configuration.
8. Running seed data against anything other than a disposable local database.
9. Treating the broad dirty worktree as accepted, merged, or release-ready without scoped review.
10. Launching production migration execution without a verified backup/restore artifact, staging rehearsal, smoke-check plan, rollback branch/plan, maintenance/write-freeze activation plan, and Sentinel verification.

## Final Gate 2 exit decision

Decision: Gate 2 is complete enough to exit into Gate 3 planning.

Restriction: Gate 2 exit does not authorize production migration, live DB mutation, live payment action, public exposure, infrastructure/config changes, or release acceptance of unrelated dirty-tree work.

Next recommended move: plan Gate 3 Business Logic as the next Directive V2 lane, with Sentinel gates and explicit approval checkpoints before any production/live action.
