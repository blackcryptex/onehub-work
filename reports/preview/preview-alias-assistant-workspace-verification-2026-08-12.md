# Preview Alias Assistant Workspace Verification — 2026-08-12

## Scope

Sentinel verified only the approved OneHub Preview alias:

- `https://onehub-work-web-8kph-two.vercel.app`

No production custom domain verification or mutation was performed. No Vercel aliases, domains, env vars, database records, billing settings, production settings, cookies, tokens, or secrets were printed or mutated.

## Target deployment context

Atlas reported that the Preview alias was moved from an older production/main deployment to READY deployment `dpl_AJavzSX8XB5vaLRELkU6VubN3zU9` for commit `b2e50e8`, with raw deployment URL:

- `https://onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app`

Safe public checks did not expose a deployment id in the alias response headers. DNS for both the alias and raw deployment resolved to Vercel edge IPs, but that does not prove the backing deployment id. The raw deployment URL still returned Vercel SSO/protection redirects for unauthenticated checks, so Sentinel could not directly inspect that raw host without credentials or changing access policy.

Runtime behavior on the public Preview alias now matches the expected fixed deployment surface: the assistant collaboration API route exists and the CLIENT and PRO planner browser surfaces render the expected workspace sections.

## Evidence examined

### Workspace / git evidence

- Workspace: `/root/.hermes/workspaces/onehub/worktrees/current-main`
- Branch: `atlas/vercel-preview-current-main`
- Local HEAD: `b2e50e8`
- Initial `git status --short --branch` before this report showed:
  - `## atlas/vercel-preview-current-main`
  - untracked prior reports:
    - `reports/preview/preview-alias-assistant-workspace-diagnosis-2026-08-11.md`
    - `reports/preview/preview-alias-assistant-workspace-smoke-2026-08-11.md`

### HTTP checks

1. `GET https://onehub-work-web-8kph-two.vercel.app/api/health`
   - Result: HTTP 200
   - `content-type: application/json`
   - `x-matched-path: /api/health`
   - JSON body reported `status: ok` with `database: ok` and `stripe: ok`.

2. `GET https://onehub-work-web-8kph-two.vercel.app/api/assistant-collaboration/tasks` unauthenticated
   - Result: HTTP 401
   - `content-type: application/json`
   - `x-matched-path: /api/assistant-collaboration/tasks`
   - JSON body prefix: `{ "error": "Unauthorized" }`
   - This is the expected route-level auth response, not 404 HTML.

3. `GET https://onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app/api/health` unauthenticated
   - Result: HTTP 302 to Vercel SSO/protection.
   - This confirms the raw deployment remains protected from this verifier's unauthenticated path.

4. DNS / header check
   - `onehub-work-web-8kph-two.vercel.app` and `onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app` both resolved to Vercel edge IPs.
   - Alias response headers did not include a public deployment id, so exact alias-to-`dpl_AJavzSX8XB5vaLRELkU6VubN3zU9` mapping could not be proven without Vercel-authenticated metadata.

### Browser checks

1. Sign-in page
   - `GET /signin?callbackUrl=/app` rendered the expected credentials form and Google button.
   - Browser console check after navigation captured no JavaScript errors.

2. CLIENT `/app`
   - Signed in as seeded demo CLIENT account `client@example.com` through the browser.
   - `/app` rendered a CLIENT dashboard.
   - Visible page text included:
     - `Assigned task workspace`
     - `Assistant task workspace`
   - The rendered assistant workspace copy said assigned persisted tasks are locked for title/assignment controls and no persisted tasks were loaded.

3. Authenticated assistant collaboration fetch
   - From the authenticated CLIENT browser session, `fetch('/api/assistant-collaboration/tasks', { credentials: 'include' })` returned:
     - HTTP 200
     - `content-type: application/json`
     - JSON array body: `[]`
   - This passed the requirement that authenticated browser fetch returns a 200 JSON array, not 404 HTML.

4. PRO Planner event vault
   - Signed in as seeded demo PRO planner account `pro@example.com` through the browser.
   - Navigated to `/pro/planner/vault/demo-wedding`.
   - Page rendered `Demo Wedding Event`.
   - Visible page text included:
     - `Assistant collaboration`
     - `Assistant task workspace`
   - The assistant collaboration section listed existing member assistants and the workspace displayed `No persisted tasks loaded.`
   - Browser console check after verification captured no JavaScript errors.

## Verdict

PASSED.

## Exact blocker, regression, or weak point

No runtime blocker was found for the assigned alias-fix verification scope.

Residual weak point: public unauthenticated evidence still cannot directly prove the alias maps to Vercel deployment `dpl_AJavzSX8XB5vaLRELkU6VubN3zU9`, because Vercel did not expose that id in safe response headers and the raw deployment URL remains SSO/protected. However, the public Preview alias now exposes the expected assistant collaboration route and UI behavior that was missing in the prior failed smoke, so the residual alias-id proof gap is not a runtime failure caused by the alias fix.

## Release-safety implication

The Preview alias is release-safe for the assigned assistant workspace smoke scope. The prior failure mode is no longer reproduced: the assistant collaboration API route is present on the public alias, CLIENT `/app` renders the assigned assistant workspace, authenticated task fetch returns JSON 200, and the PRO Planner event vault still renders assistant collaboration and task workspace sections.

This verdict does not approve production custom domains, production alias mutation, Vercel protection policy changes, billing, security settings, or any scope outside the named Preview alias.

## Next required action for Atlas

Atlas can mark this Preview alias assistant workspace verification as PASSED for the assigned scope and continue the approved OneHub release/verification lane. If Atlas needs cryptographic or Vercel-dashboard proof of the alias-to-`dpl_AJavzSX8XB5vaLRELkU6VubN3zU9` mapping, route that to the Vercel-owning operator with authenticated Vercel access; Sentinel should not request or print those credentials.
