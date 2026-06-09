# OneHub Stabilization P0 — Source-of-Truth / Dirty-Tree Checkpoint

Generated: 2026-06-06T11:37:48+00:00
Worker: Steward
Task: t_680eaf52
Scope: read-only backend/source-of-truth stabilization review; no code changes made. This report artifact is the only intentional write.

## 1. Backend scope under review

- Canonical repo/runtime truth for OneHub stabilization.
- Dirty tree domain buckets and sequencing risk.
- Runtime process path and mismatch risk between Hermes canonical repo and migrated OpenClaw runtime copy.
- Prisma/migration/schema status using non-destructive checks only.

Guardrails respected:
- No credential changes.
- No billing/live-payment activation.
- No public exposure/infra changes.
- No destructive DB/schema/migration commands.
- No source-code implementation.

## 2. Evidence examined

Commands/evidence:
- `git rev-parse --show-toplevel`
- `git remote -v`
- `git status --short --branch`
- `git log --oneline --decorate -8`
- `git diff --stat`
- `git status --porcelain=v1`
- `git diff --name-only`
- `git ls-files --others --exclude-standard`
- `ps -eo pid,ppid,lstart,cmd`
- `/proc/<pid>/cwd` symlink inspection for runtime Next/pnpm processes
- `ss -ltnp`
- `curl -sS -m 5 -i http://127.0.0.1:3000/api/health`
- `pnpm --dir apps/web exec prisma validate --schema prisma/schema.prisma`
- `pnpm -C apps/web typecheck`
- migration directory listing under `apps/web/prisma/migrations`
- dirty-tree count comparison between:
  - canonical: `/root/.hermes/workspaces/onehub/repo`
  - runtime: `/root/.openclaw/workspace/onehub_work`

## 3. Canonical path recommendation

Verdict: SOUND for canonical repo path, PARTIAL/RISK for currently running runtime path.

Recommended canonical source of truth:

`/root/.hermes/workspaces/onehub/repo`

Reasons:
- Kanban task body explicitly names `/root/.hermes/workspaces/onehub/repo` as the primary repo.
- Workspace AGENTS.md confirms this as the primary Hermes-managed OneHub repo copy.
- It is a git repo at branch `main`, remote `https://github.com/blackcryptex/onehub-work.git`.
- HEAD is `4526f6468fbacc78836b334bfef3be0c2f3e9e7d` (`Finalize Pro command center layout and IA`).
- Local branch is `main...origin/main [ahead 2]`.

Do not treat `/root/.openclaw/workspace/onehub_work` as canonical for implementation lanes unless Atlas/Marlon explicitly asks for a compare/import step.

## 4. Runtime mismatch risk

Verdict: RISK.

Running process evidence:
- `node /usr/bin/pnpm start`, child `next start`, child `next-server (v14.2.6)`.
- Process CWD for all runtime processes inspected:
  - `/root/.openclaw/workspace/onehub_work/apps/web`
- Port/process evidence:
  - `*:3000` served by `next-server`.
  - nginx is also listening on `0.0.0.0:80` and `0.0.0.0:443`.
- Local health endpoint returned `HTTP/1.1 200 OK` with JSON:
  - `status: ok`
  - `checks.database: ok`
  - `checks.stripe: ok`

Mismatch details:
- Canonical and runtime copies share the same HEAD SHA: `4526f6468fbacc78836b334bfef3be0c2f3e9e7d`.
- Dirty trees are not the same.
- Canonical dirty status entries: 105.
- Runtime dirty status entries: 158.
- Runtime tracked modified count: 122.
- Runtime untracked count: 42.
- Dirty paths common to both: 47.
- Runtime has many runtime-only dirty paths including auth routes, admin routes, event pages, Google auth/calendar code, TRPC route, marketplace pages, dashboards, public assets, and screenshot/report artifacts.

Implication:
- The app currently running on port 3000 is not running from the canonical Hermes repo. Even though HEAD matches, uncommitted working trees differ materially. Browser/manual QA against the live local runtime may validate OpenClaw-copy changes that are absent or different in the canonical repo.

Narrow next action:
- Freeze runtime acceptance claims until either:
  1. runtime is restarted from `/root/.hermes/workspaces/onehub/repo/apps/web`, or
  2. Atlas explicitly creates a compare/import lane to reconcile runtime-only dirty work into the canonical repo.

## 5. Git state / dirty-tree summary for canonical repo

Canonical repo:
- Path: `/root/.hermes/workspaces/onehub/repo`
- Remote: `origin https://github.com/blackcryptex/onehub-work.git`
- Branch: `main`
- Tracking: `origin/main`, ahead by 2 commits
- HEAD: `4526f6468fbacc78836b334bfef3be0c2f3e9e7d`
- Recent commits:
  - `4526f64 (HEAD -> main) Finalize Pro command center layout and IA`
  - `86b1602 feat(guarded-mvp): land payments, acceptance, disputes, legal, and admin verification surfaces`
  - `254e480 (origin/main, origin/HEAD) initial clean import`

Dirty-tree counts before this report write:
- Tracked modified files: 69
- Untracked status entries: 36
- Untracked file count from `git ls-files --others --exclude-standard`: 184
- Staged entries: 1 observed in porcelain parsing, `.env.example` appeared as staged/modified in one porcelain parse; confirm before commit because normal short status displayed it as modified.
- Total status entries: 105
- `git diff --stat`: 69 files changed, 974 insertions, 448 deletions.
- No staged diff stat was printed by `git diff --cached --stat`.

Note: this report adds one additional allowed untracked/modified report artifact under `reports/stabilization/source-of-truth/`.

## 6. Dirty-tree domain buckets

These buckets are sequencing aids, not final code approval.

### A. Schema / migrations — 5 status entries

Paths:
- `apps/web/prisma/schema.prisma` modified
- `apps/web/prisma/migrations/20260410181500_add_refund_request_and_payment_holdback/` untracked
- `apps/web/prisma/migrations/20260411160000_add_communications_foundation_indexes/` untracked
- `apps/web/prisma/migrations/20260509210000_add_dream_response/` untracked
- `apps/web/prisma/migrations/20260509212000_enable_rls_on_security_advisor_tables/` untracked

Schema diff includes:
- new `DreamResponse` model
- new `DreamResponseStatus`, `DreamResponseType`, `DreamResponseProviderType` enums
- new User/Event/Organization relations for dream responses
- Message/Thread/ThreadParticipant relation/index changes

Migration inventory:
- Total migration directories: 28
- Untracked migration directories: 4
- Recent untracked migration SQL files exist and have non-zero line counts.

Validation:
- `pnpm --dir apps/web exec prisma validate --schema prisma/schema.prisma` failed only because `DATABASE_URL` is missing from the worker environment:
  - Prisma P1012: `Environment variable not found: DATABASE_URL`
- This does not prove schema correctness or failure. It means schema validation is blocked by env availability.

Risk:
- HIGH. Schema and migration changes must be settled before implementation lanes that depend on DreamResponse, communications indexes, holdbacks/refunds, or RLS/security-advisor behavior.
- Do not run migrate/apply/resolve/destructive DB operations without explicit separate approval.

### B. Trust / payments / contracts backend — 21 status entries

Representative paths:
- payment confirm/create-intent routes
- Stripe webhook route
- proposal approval and contract sign routes
- admin holdbacks route
- payout lock/refund/money-state/transaction-loop libs
- payment/refund/holdback tests and reconciliation script

Risk:
- HIGH. This is money-state and trust-engine-sensitive work. It should not be mixed with unrelated UI/legal/admin changes in one acceptance decision.

### C. Auth / roles / onboarding — 13 status entries

Representative paths:
- signup page/API route
- org creation route
- middleware
- provider onboarding page/components
- role/signup/onboarding libs and tests

Risk:
- HIGH. Auth/role/onboarding changes affect permission boundaries and account routing. Needs backend correctness review before acceptance.

### D. Admin / notifications / oversight — 12 status entries

Representative paths:
- admin overview and verification pages
- admin audit/transactions routes/pages
- notification dropdown/router
- admin oversight lib and gate6 tests

Risk:
- MEDIUM/HIGH. Admin oversight surfaces can expose sensitive operational state or create false authority if not permission-gated.

### E. Product UI / vault / marketplace / dashboards — 19 status entries

Representative paths:
- requests/vault/marketplace/dashboard pages
- booking response control component/API
- DIY/pro planner/vendor/venue dashboard changes
- eventVault select changes

Risk:
- MEDIUM. User-facing continuity work should be validated by Scout/Sentinel, but backend data selection/API touchpoints need Steward review where they cross permissions/data integrity.

### F. Legal / support docs and anchors — 10 status entries

Representative paths:
- help/support/privacy/terms/legal pages
- LegalNotice / DraftLegalPageNotice
- incident-response doc
- trust/legal support anchor tests

Risk:
- MEDIUM. Product/legal wording can imply guarantees, refund/payment obligations, or dispute process commitments. Needs trust/legal consistency review but can be sequenced after schema/money-state freeze.

### G. Ops / observability / maintenance — 5 status entries

Representative paths:
- health route
- logger/errorTracker
- maintenance page/lib

Risk:
- MEDIUM. Health route currently reports database and stripe as ok from runtime, but runtime is not canonical. Avoid using this alone as launch proof.

### H. Tests / scripts / build artifacts — 7 status entries

Representative paths:
- tsbuildinfo
- vitest config
- seed/reminders scripts
- maintenance/launch-safety/event-delete tests

Risk:
- MEDIUM. Keep tests, but remove build artifacts such as `tsconfig.tsbuildinfo` from acceptance commits unless intentionally tracked.

### I. Reports / docs — 2 pre-existing status entries

Representative paths:
- docs/devops.md
- reports/production/

Risk:
- LOW/MEDIUM. Useful evidence, but reports cannot substitute for current validation.

### J. Other / cross-cutting — 10 status entries

Representative paths:
- events API route
- layout components/routes
- dispute-case/server routers/guest/admin
- client page/server events

Risk:
- MEDIUM. Needs route-by-route owner assignment; avoid bundling into schema/money-state commit.

## 7. Validation results

Non-destructive validation performed:

- Local runtime health:
  - Command: `curl -sS -m 5 -i http://127.0.0.1:3000/api/health`
  - Result: `HTTP/1.1 200 OK`
  - Caveat: runtime path is `/root/.openclaw/workspace/onehub_work/apps/web`, not canonical.

- Prisma validate:
  - Command: `pnpm --dir apps/web exec prisma validate --schema prisma/schema.prisma`
  - Result: failed with Prisma P1012 because `DATABASE_URL` is unavailable.
  - Caveat: no conclusion on schema validity beyond missing env.

- Typecheck:
  - Command: `pnpm -C apps/web typecheck`
  - Result: exit 0 (`tsc --noEmit`).
  - Caveat: typecheck success does not settle runtime mismatch, dirty-tree scope, schema migration application state, or product readiness.

## 8. Correctness verdict

PARTIAL / RISK.

Sound:
- Canonical repo recommendation is clear: `/root/.hermes/workspaces/onehub/repo`.
- Runtime mismatch is confirmed by process CWD evidence.
- Dirty-tree buckets are identifiable and broad enough to require freeze/sequencing.
- Typecheck currently passes in the canonical repo.

Risk:
- Running runtime is OpenClaw copy, not canonical Hermes repo.
- Canonical and runtime dirty trees materially diverge despite identical HEAD SHA.
- Schema/migration changes are dirty and untracked; database migration state was not safely verifiable without env and without destructive commands.
- Money-state/payment/Stripe/contract routes are dirty in the same tree as auth/onboarding/admin/UI/legal changes.
- Local health endpoint is not sufficient acceptance evidence for canonical repo.

Blocked/unknown:
- Actual database migration applied state is unknown from this task because no DB credentials/env were available and destructive DB/migration commands are prohibited.
- Whether runtime-only OpenClaw dirty work should be imported is a coordination decision for Atlas/Marlon, not Steward.

## 9. Safe sequencing guidance for implementation lanes

Recommended freeze order:

1. Source-of-truth freeze
   - Treat `/root/.hermes/workspaces/onehub/repo` as the only canonical implementation workspace.
   - Stop accepting runtime QA against `/root/.openclaw/workspace/onehub_work` unless comparing/importing is the explicit task.

2. Runtime alignment gate
   - Either restart OneHub runtime from canonical repo or create a dedicated compare/import card for runtime-only dirty changes.
   - Do not merge/accept based on screenshots or health checks from OpenClaw runtime without path disclosure.

3. Schema/migration gate
   - Review `schema.prisma` plus four untracked migration directories as one schema packet.
   - Validate with proper non-production env only.
   - Do not apply/resolve migrations destructively without explicit approval.

4. Money-state/payment/contract gate
   - Isolate payment/Stripe/contract/proposal/holdback/refund/transaction-loop changes after schema is frozen.
   - Require Steward backend correctness review and Sentinel veto path before acceptance.

5. Auth/role/onboarding gate
   - Isolate signup/org/middleware/role-onboarding changes.
   - Verify permission boundaries before UI acceptance.

6. Admin/notifications/oversight gate
   - Review admin authority, visibility, and audit assumptions separately.

7. Product UI/legal/support/ops lanes
   - Let Scout/Sentinel validate user-facing continuity and trust/legal copy after backend and schema gates settle.
   - Keep docs/reports as evidence, not source of truth.

## 10. Narrow next actions

- Atlas/default: declare `/root/.hermes/workspaces/onehub/repo` canonical for the sprint and decide whether to restart runtime from canonical or assign a compare/import lane for `/root/.openclaw/workspace/onehub_work`.
- Steward: review schema/migration packet next, once env/DB validation scope is clarified or a non-production env is made available.
- Sentinel: veto/hold acceptance until runtime path and schema/money-state gates are clean.
- Scout: only evaluate user-facing runtime after runtime path is aligned with canonical repo.

Final backend judgment: PARTIAL / RISK.
