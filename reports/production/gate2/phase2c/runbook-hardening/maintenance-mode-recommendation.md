# OneHub Gate 2 Phase 2C — Maintenance Mode Inspection and Forge Recommendation

Generated: 2026-05-31T08:18:20Z
Profile: Steward
Scope: inspect/document only; no implementation.

## 1. Inspection performed

Repository searches:

- File search for `*maintenance*`: no matching maintenance-mode implementation files found.
- Content search for `MAINTENANCE_MODE`, `maintenance mode`, `maintenance`: no app-level feature flag or route-blocking implementation found. Matches were documentation/general wording only.
- Content search for `process.env.ONEHUB`, `process.env.MAINT`, `process.env[...]`: found `ONEHUB_DEMO_MODE`, `DEV_GOD_MODE`, auth secrets, and regular environment reads, but no maintenance flag.
- Reviewed `apps/web/src/middleware.ts`.

Relevant middleware evidence:

- `apps/web/src/middleware.ts` currently imports `NextResponse`, `NextRequest`, and `getToken`.
- Middleware generates/sets `x-request-id` and security headers.
- Middleware authenticates matched app/client/planner routes.
- Middleware blocks selected cross-role route access:
  - CLIENT blocked from `/pro/planner`, `/diy-planner`, `/app/vault`
  - PRO_PLANNER / DIY_PLANNER blocked from `/client/events` except admin-like paths
- Matcher is limited to:
  - `/app/:path*`
  - `/pro/planner/:path*`
  - `/diy-planner/:path*`
  - `/client/:path*`
- No maintenance flag, maintenance page, API 503 behavior, write-route block, or bypass policy was present in this inspected file.

## 2. Backend correctness verdict

Verdict: RISK / IMPLEMENTATION NEEDED before production migration readiness.

Reason:

Gate 2 Phase 2C requires maintenance mode to prevent writes during production migrations. The current repository does not show an app-level maintenance mode that blocks mutating API routes or user write paths. Without it, a migration window depends on external traffic/write freeze discipline only, which is weaker and harder to verify.

## 3. Narrow Forge implementation recommendation

Recommended next card assignee: Forge

Title:

Implement OneHub maintenance mode write-freeze safety gate

Card body:

```markdown
OneHub Gate 2 Phase 2C follow-up — implement app-level maintenance mode / write-freeze safety gate.

Scope: narrow production-migration safety implementation only. Do not run DB migrations, do not change credentials, do not touch billing/infra/production settings, do not perform live payment actions.

Context:
- Steward runbook-hardening evidence found no existing maintenance mode implementation.
- `apps/web/src/middleware.ts` currently handles request id/security headers/auth role routing only; no maintenance flag or 503 behavior was found.
- Gate 2C production migration readiness requires maintenance mode that prevents user writes during migration windows.

Required implementation:
1. Add a server-side environment flag, preferably `ONEHUB_MAINTENANCE_MODE=true`, documented in `.env.example` without secrets.
2. Add centralized helper(s) so API/write routes can consistently detect maintenance mode.
3. Ensure mutating API requests return HTTP 503 with a safe JSON body while maintenance mode is active.
4. Ensure protected user-facing app routes show or redirect to a maintenance page during maintenance mode.
5. Define and document an allowlist for safe routes such as health/static/auth callback needs; do not accidentally block assets needed for the maintenance page.
6. If an admin/operator bypass is added, make it server-only, narrow, and documented; avoid broad client-visible bypass secrets.
7. Add targeted tests or smoke evidence proving:
   - maintenance flag off: normal route behavior preserved
   - maintenance flag on: mutating API route returns 503
   - maintenance flag on: protected app UI shows maintenance response/page
   - secrets are not exposed in responses/logs
8. Run safe local checks: `pnpm -C apps/web typecheck` and any targeted tests/route checks feasible without production credentials.

Acceptance criteria:
- No database/schema migrations are run or added for this card unless separately approved.
- No live DB or payment systems are touched.
- Typecheck passes.
- Maintenance-mode behavior is covered by tests or reproducible local smoke logs.
- Steward/Sentinel can verify that write freeze is effective enough for Gate 2C migration windows.
```

## 4. What not to implement in that card

- No production migration execution.
- No DB push/reset/seed/rollback.
- No secret rotation or deployment environment edits.
- No live Stripe/payment behavior changes.
- No broad infrastructure change.

## 5. Current recommendation

Create/route the Forge card above before treating Gate 2C as production-execution ready.
