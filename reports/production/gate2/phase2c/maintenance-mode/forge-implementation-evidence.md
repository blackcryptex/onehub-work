# Gate 2 Phase 2C maintenance-mode/write-freeze Forge evidence

Timestamp: 2026-05-31T17:04:15Z
Task: t_357dd8fc
Profile: forge
Workspace: /root/.hermes/workspaces/onehub/repo

## Scope
Narrow production-migration safety implementation only. No DB migrations, no schema changes, no db push, no seed/reset/rollback, no credential/billing/infra/production setting changes, no live payment actions, no Oracle, no unrelated product work.

## Implementation
- Added server-only environment flag `ONEHUB_MAINTENANCE_MODE` to `apps/web/.env.example` with warning not to expose it as `NEXT_PUBLIC_*`.
- Added centralized maintenance helpers in `apps/web/src/lib/maintenance.ts`:
  - explicit true-only flag parsing
  - safe method/mutating method classification
  - allowlist for `/maintenance`, health, static/assets, and auth/callback paths
  - protected app namespace classification
  - safe 503 JSON response body
- Updated `apps/web/src/middleware.ts` to:
  - return HTTP 503 JSON plus `Retry-After: 300` for mutating `/api/*` requests while maintenance mode is active
  - redirect protected user-facing app routes to `/maintenance` while maintenance mode is active
  - preserve normal API pass-through behavior when maintenance mode is inactive
- Added `apps/web/src/app/maintenance/page.tsx` as the user-facing maintenance response page.
- Added targeted tests in `apps/web/src/lib/__tests__/maintenance.test.ts`.

## Validation performed
1. `pnpm -C apps/web exec vitest run src/lib/__tests__/maintenance.test.ts`
   - Exit: 0
   - Result: 1 test file passed, 8 tests passed
   - Evidence: flag-off behavior, mutating API 503, protected UI redirect, allowlist, safe response body, no client-visible bypass secret helper.
2. `pnpm -C apps/web typecheck`
   - Exit: 0
   - Result: TypeScript check passed.
3. Targeted sensitive maintenance exposure scan over changed maintenance files
   - Exit: 0
   - Result: `sensitive maintenance exposure findings: 0`
   - Patterns checked: client-visible maintenance env assignment, maintenance bypass env assignment, Stripe live/webhook secret literal.

## Evidence checks mapped to acceptance criteria
- Flag off preserves normal behavior: `shouldBlockForMaintenance({ enabled: false, pathname: "/api/proposals/123/approve", method: "POST" })` returns `{ blocked: false }`.
- Flag on returns 503 for mutating API: middleware test for `POST /api/proposals/123/approve` returns status 503 and the safe JSON body.
- Protected UI shows maintenance response/page: middleware test for `GET /app/events/demo` returns 307 redirect to `/maintenance`; maintenance page is implemented at `apps/web/src/app/maintenance/page.tsx`.
- Secrets are not exposed: no bypass token or client-visible `NEXT_PUBLIC_*` maintenance bypass was added; `.env.example` documents `ONEHUB_MAINTENANCE_MODE` only.

## Residual risk
- This implementation relies on Next middleware matching `/api/:path*` and listed protected namespaces. Any future mutating route outside `/api/*` or protected UI namespace should be added to the centralized helper/matcher.
- Existing unrelated workspace modifications were present in the repo and were not part of this scope.

## Steward/Sentinel verification readiness
Steward/Sentinel can verify write-freeze behavior for Gate 2C migration windows by rerunning the targeted vitest command and `pnpm -C apps/web typecheck`, then inspecting `apps/web/src/lib/maintenance.ts`, `apps/web/src/middleware.ts`, `apps/web/.env.example`, and `apps/web/src/app/maintenance/page.tsx`.
