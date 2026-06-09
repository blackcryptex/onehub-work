# Gate 2 Phase 2C maintenance-mode/write-freeze implementation evidence

Timestamp UTC: 2026-05-31T16:52:57Z
Worker: Forge
Task: t_357dd8fc

## Scope

Implemented a narrow app-level maintenance-mode safety gate for approved production migration windows. No database migration, db push, seed, reset, rollback, credential, billing, infrastructure, production setting, payment, or Oracle action was performed.

## Files changed for this lane

- `apps/web/.env.example`
  - Documents server-only `ONEHUB_MAINTENANCE_MODE=false` example.
  - Explicitly says not to expose the flag as `NEXT_PUBLIC_*`.
- `apps/web/src/lib/maintenance.ts`
  - Centralized helper for the flag, mutating method detection, safe allowlist, protected page detection, redirect path, and safe JSON body.
- `apps/web/src/middleware.ts`
  - Applies the centralized helper before auth/role checks.
  - Returns HTTP 503 JSON plus `retry-after: 300` for mutating `/api/*` requests while maintenance mode is enabled.
  - Redirects protected user-facing app routes to `/maintenance` with 307 while maintenance mode is enabled.
  - Allows safe/static/auth/health paths and non-mutating API reads.
- `apps/web/src/app/maintenance/page.tsx`
  - User-facing maintenance page explaining temporary write freeze.
- `apps/web/src/lib/__tests__/maintenance.test.ts`
  - Targeted tests covering flag off/on behavior, mutating API decision, protected UI redirect decision, safe allowlist, and no bypass-secret exposure pattern.

## Maintenance allowlist

Exact safe paths:

- `/maintenance`
- `/favicon.ico`
- `/robots.txt`
- `/sitemap.xml`
- `/api/health`

Safe prefixes:

- `/_next/`
- `/assets/`
- `/images/`
- `/api/auth/`
- `/api/google/callback`

Protected UI prefixes redirected during maintenance:

- `/app`
- `/pro/planner`
- `/diy-planner`
- `/client`
- `/vendor`
- `/venue`
- `/providers/onboarding`

## Validation performed

Command:

```bash
pnpm -C apps/web exec vitest run src/lib/__tests__/maintenance.test.ts
```

Result:

```text
RUN  v2.1.9 /root/.hermes/workspaces/onehub/repo/apps/web

[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
 ✓ src/lib/__tests__/maintenance.test.ts (6 tests) 5ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  16:52:25
   Duration  2.12s (transform 102ms, setup 162ms, collect 44ms, tests 5ms, environment 1.14s, prepare 94ms)
```

Exit: 0

Command:

```bash
pnpm -C apps/web typecheck
```

Result:

```text
> @onehub/web@0.1.0 typecheck /root/.hermes/workspaces/onehub/repo/apps/web
> tsc --noEmit
```

Exit: 0

Command:

```bash
search_files pattern: NEXT_PUBLIC_.*MAINTENANCE|MAINTENANCE_BYPASS|ONEHUB_MAINTENANCE_MODE under apps/web
```

Result: Only `ONEHUB_MAINTENANCE_MODE` references were found in `.env.example`, the server helper, and tests. No `NEXT_PUBLIC_*` maintenance flag and no bypass secret were found.

## Steward/Sentinel verification readiness

Steward/Sentinel can verify that the write-freeze behavior is now implemented at the middleware layer for migration windows:

- flag off: helper returns no maintenance block;
- flag on + mutating `/api/*`: middleware path returns 503 safe JSON;
- flag on + protected UI route: middleware path redirects to `/maintenance`;
- safe/static/auth/health allowlist remains reachable;
- no client-visible bypass secret was added.

## Residual risk

The gate is middleware-scoped. It covers matched protected UI namespaces and `/api/:path*`. Any future write surface outside `/api/*` or outside the protected route prefixes must either move under these matchers or call the centralized helper directly. Current validation is targeted helper/typecheck evidence, not a full running-browser production smoke because no production credentials or live service actions were in scope.
