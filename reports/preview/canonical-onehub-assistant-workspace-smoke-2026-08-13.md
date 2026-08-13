# Canonical OneHub Assistant Workspace Smoke — 2026-08-13

## Scope

Sentinel verified only the canonical OneHub URL:

- `https://www.1hubevents.com`

Scope was read-only runtime smoke. No production settings, Vercel settings, database records, credentials, billing, live-payment, or infrastructure settings were mutated or printed.

## Evidence examined

### Workspace / git evidence

- Workspace: `/root/.hermes/workspaces/onehub/worktrees/current-main`
- Branch: `atlas/vercel-preview-current-main`
- Local HEAD: `77e0083`
- `git status --short --branch` before report write showed: `## atlas/vercel-preview-current-main`
- Demo credential values were not found in this worker environment; standard seeded demo credentials from repo seed data were used for browser/runtime smoke.

### Unauthenticated canonical HTTP checks

1. `GET https://www.1hubevents.com/api/health`
   - Result: HTTP 200
   - `content-type: application/json`
   - `x-matched-path: /api/health`
   - JSON body reported `status: ok`, `checks.database: ok`, and `checks.stripe: ok`.

2. `GET https://www.1hubevents.com/api/auth/providers`
   - Result: HTTP 200
   - `content-type: application/json`
   - `x-matched-path: /api/auth/[...nextauth]`
   - JSON body exposed `credentials` and `google` providers.
   - Response was app JSON, not Vercel/protection HTML.

3. `GET https://www.1hubevents.com/api/assistant-collaboration/tasks` unauthenticated
   - Result: HTTP 401
   - `content-type: application/json`
   - `x-matched-path: /api/assistant-collaboration/tasks`
   - JSON body: `{ "error": "Unauthorized" }`
   - This is the expected route-level auth response, not 404 HTML.

### Browser / authenticated checks

1. Sign-in page
   - `GET /signin?callbackUrl=/app` rendered the credentials form and Google button.
   - Browser console after navigation showed no JavaScript errors.

2. CLIENT `/app`
   - Signed in as the standard seeded CLIENT demo account from repo seed data.
   - `/app` rendered a CLIENT dashboard.
   - Visible page text included:
     - `Assigned task workspace`
     - `Assistant task workspace`
   - Authenticated browser fetch `fetch('/api/assistant-collaboration/tasks', { credentials: 'include' })` returned HTTP 200, `content-type: application/json`, body `[]`.
   - Browser console after this check showed no JavaScript errors.

3. PRO Planner event vault
   - Standard seeded PRO planner demo auth succeeded at HTTP/runtime level.
   - `GET /pro/planner/vault/demo-wedding` returned HTTP 200 `text/html; charset=utf-8`.
   - Rendered HTML contained:
     - `Demo Wedding Event`
     - `Assistant collaboration`
     - `Assistant task workspace`
   - This confirms the PRO planner vault still renders the assistant collaboration surface on the canonical host.

## Verdict

PASSED.

## Exact blocker, regression, or weak point

No blocker or regression was found for the assigned canonical runtime smoke scope.

Weak point: the browser tool's second visible PRO sign-in click did not advance, but an equivalent cookie/session HTTP smoke using the same standard seeded PRO credentials verified the canonical PRO planner vault response and required assistant collaboration content. This is not classified as a product failure because the authenticated canonical route returned the expected 200 HTML surface and the route content matched acceptance criteria.

## Release-safety implication

The canonical OneHub URL is release-safe for the assigned assistant workspace smoke scope. The canonical host returns app JSON for health/providers, returns route-level JSON 401 for unauthenticated assistant tasks instead of 404/protection HTML, renders the CLIENT assigned assistant workspace, returns authenticated assistant task JSON, and preserves the PRO planner vault assistant collaboration surface.

This verdict does not approve production setting changes, Vercel mutation, database mutation, billing/live-payment behavior, credentials handling, or any scope outside the canonical URL runtime smoke.

## Next required action for Atlas

Atlas can mark the canonical OneHub assistant workspace smoke as PASSED for the assigned scope and continue the approved OneHub verification/release lane. If Atlas needs additional proof beyond runtime smoke, route a separate scoped task for Vercel-authenticated deployment metadata or deeper role-flow testing.
