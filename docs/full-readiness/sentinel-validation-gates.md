# Sentinel validation gates and smoke evidence

Task: `t_e7f314d3`  
Lane: Sentinel validation gates  
Date: 2026-09-02 UTC  
Canonical target: `https://www.1hubevents.com`  
Repo: `/root/.hermes/workspaces/onehub/repo`  
Raw log: `docs/full-readiness/sentinel-validation-raw.log`

## Scope under review

Read-only validation gate bundle for the OneHub full-depth readiness audit:

- repo status and commit identity
- typecheck, unit/component/API tests, lint, production build
- route and test inventory
- safe canonical HTTP smoke checks
- available secret/log hygiene checks and stabilization scripts
- confidence limits for protected/authenticated flows without credentials/session

Guardrails observed: no production credential, billing, infrastructure, domain, live payment, destructive DB, or public exposure changes were made. The only repo files written by this lane are this report and the raw validation log under `docs/full-readiness/`.

## Environment evidence

Command:

`pwd && git status --short && git branch --show-current && git rev-parse HEAD`

Result:

- exit code: 0
- working directory: `/root/.hermes/workspaces/onehub/repo`
- branch: `atlas/slice7-canonical-deploy`
- commit: `970cc473745e5aa8ec09bf310f200212b181ac0c`
- dirty tree before gates: `?? docs/full-readiness/`

Command:

`node -v && pnpm -v`

Result:

- exit code: 0
- Node: `v24.14.0`
- pnpm: `9.0.0`

## Gate results

| Gate | Command | Result | Evidence |
| --- | --- | --- | --- |
| Typecheck | `pnpm run typecheck` | PASS | `tsc --noEmit`, exit 0 |
| Tests | `pnpm run test` | PASS | Vitest: 86 test files passed, 455 tests passed, exit 0 |
| Lint | `pnpm run lint` | PASS WITH WARNINGS | ESLint exit 0, `331 problems (0 errors, 331 warnings)` |
| Build | `pnpm run build` | PASS WITH WARNINGS | Prisma generate succeeded twice, Next.js 15.5.21 compiled successfully, generated 114 static pages, exit 0 |
| Stabilization script | `pnpm run stabilize` | PASS WITH LEGACY WARNINGS | Blocking checks passed; legacy warnings remain for Prisma usage/imports in app/server route layer and `as any` in API routes/routers |
| Final repo status | `git status --short` | DIRTY EXPECTED | `?? docs/full-readiness/` only observed after gates |

## Route and test inventory

Command:

`route/test inventory`

Result:

- exit code: 0
- route file count: 163
- test file count: 86

Inventory source paths scanned:

- routes: `apps/web/src/app`, `apps/web/src/pages` if present
- tests: `apps/web/tests`, `apps/web/src/**/*.test.*`, `packages/**/*.test.*`

Notable route coverage surfaced by inventory/build output:

- Public/auth routes: `/`, `/signin`, `/signup`, `/features`, `/support`, `/privacy`, `/terms`, `/help`, `/marketplace`, `/providers/start`, `/rsvp/[token]`
- Protected app/admin routes: `/app`, `/admin/overview`, `/admin/users`, `/admin/verification`, `/billing/connect`, `/billing/payouts`, `/events/[eventSlug]/*`, `/payments`-related event routes, `/contracts/[id]`, `/proposals/[id]`, `/vendor/dashboard`, `/venue/dashboard`
- API routes include auth, signup, payments, contracts, proposals, refunds, Stripe webhook, Google integration, messages, notifications, admin role/impersonation, event access/share/stakeholders, RSVP, users search, vendor search, and health.

## Canonical HTTP smoke evidence

Safe unauthenticated `curl -I -L --max-time 20` checks were run against the canonical domain.

| URL | Result | Notes |
| --- | --- | --- |
| `https://www.1hubevents.com` | HTTP/2 200 | Vercel/Next.js, HSTS present, `x-matched-path: /` |
| `https://www.1hubevents.com/signin` | HTTP/2 200 | `x-matched-path: /signin` |
| `https://www.1hubevents.com/signup` | HTTP/2 200 | `x-matched-path: /signup` |
| `https://www.1hubevents.com/features` | HTTP/2 200 | `x-matched-path: /features` |
| `https://www.1hubevents.com/support` | HTTP/2 200 | `x-matched-path: /support` |
| `https://www.1hubevents.com/api/health` | HTTP/2 200 | JSON content-type, `x-matched-path: /api/health` |
| `https://www.1hubevents.com/app` | HTTP/2 307 -> HTTP/2 200 | Redirected to `/signin?callbackUrl=%2Fapp`, confirming unauthenticated protected route gating at smoke level |

Home page body smoke:

Command:

`curl -L --max-time 20 https://www.1hubevents.com | python3 -c 'import sys; data=sys.stdin.read(); print(len(data)); print(data[:500])'`

Result:

- exit code: 0
- body length printed: `38953`
- first bytes started with `<!DOCTYPE html><html lang="en"...`, indicating canonical HTML rendered.

## Secret/log hygiene evidence

Command:

`secret/log hygiene inventory`

Result:

- exit code: 0
- files scanned: 704
- text occurrence counts:
  - `secret`: 195
  - `token`: 393
  - `password`: 139
  - `private_key`: 0
  - `console.log`: 79
  - `console.error`: 162

This was an inventory scan, not proof that every occurrence is safe or unsafe. The full test suite also includes and passed `apps/web/tests/sensitive-log-hygiene.test.ts` as part of `pnpm run test`.

## Weak points and release-safety implications

1. Lint is not clean despite exit 0.
   - Evidence: `pnpm run lint` reported `331 problems (0 errors, 331 warnings)`.
   - Main categories visible in the log: widespread `@typescript-eslint/no-explicit-any`, unused variables/imports, React hook dependency warnings, and unescaped entity warnings.
   - Release-safety implication: not a build blocker under current config, but weakens maintainability and type-safety confidence, especially because warnings appear in admin, verification, payments, contracts, vault, router, and test paths.

2. Stabilization script passes blocking checks but still reports legacy architecture warnings.
   - Evidence: `pnpm run stabilize` output: `All blocking stabilization checks passed`, with warnings for Prisma imports/usage in app/server route layer and `as any` in API routes/routers.
   - Release-safety implication: current stabilization gate allows these as legacy warnings; they should not be represented as fully remediated architectural risk.

3. Authenticated/protected flow confidence is bounded.
   - Evidence: canonical smoke had no credentials/session and only verified unauthenticated HTTP response/redirect behavior.
   - Release-safety implication: protected app/admin/payment/contract flows are not live-smoke-verified end-to-end in this lane. Confidence for those comes from source tests/build and prior targeted Sentinel tasks, not from authenticated production browser/API exercise in this run.

4. Secret/log inventory is not a full secret audit.
   - Evidence: inventory counted keyword occurrences and all tests passed, including sensitive-log hygiene coverage, but no credential-specific secret scanner or production log access was run.
   - Release-safety implication: no exposed private key string was found by the inventory query, but live logging/privacy safety still requires deeper Steward/security review and/or a dedicated secret scanner if Atlas wants release-grade assurance.

## Verdict

PASSED for validation-gate execution.

The repo validation gates executed successfully at commit `970cc473745e5aa8ec09bf310f200212b181ac0c`:

- typecheck passed
- full Vitest suite passed: 455/455 tests, 86/86 files
- lint exited 0 with 331 warnings
- production build passed
- stabilization blocking checks passed
- canonical public smoke checks returned HTTP 200 for sampled public routes and health endpoint
- `/app` unauthenticated smoke redirected to signin as expected

NOT FULLY RELEASE-SAFE as standalone evidence.

This lane verifies that the current repo/build/test baseline is technically green under existing gates. It does not prove public launch readiness for authenticated, money-moving, private-data, legal, or production operational flows because credentials/session/live payment operations were intentionally unavailable and out of scope.

## Next required action for Atlas

Atlas should route this evidence into the final readiness synthesis child and require the synthesis to preserve these confidence limits: green automated gates are real evidence, but lint debt, legacy stabilization warnings, keyword-only secret/log inventory, and lack of authenticated production smoke must remain explicit release-safety caveats.
