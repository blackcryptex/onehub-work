# Preview Alias Assistant Workspace Smoke — 2026-08-11

## Scope
Read-only smoke of the accessible OneHub Preview alias after access re-check request. This was not a production/live-launch verification.

## Targets
- Accessible Preview alias: `https://onehub-work-web-8kph-two.vercel.app`
- Latest raw deployment checked for protection split: `https://onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app`
- Local workspace HEAD inspected: `b2e50e8 fix: expose assistant assigned task workspace`

## Guardrails
- No DB, secrets, billing, infrastructure, production settings, or live payment settings were mutated.
- Seeded demo credential values and cookies are not recorded here.
- Checks were limited to read-only HTTP/browser navigation plus normal demo sign-in session creation.

## Evidence examined
1. Code inspection:
   - `apps/web/src/lib/auth.ts` defines Credentials auth and conditionally enables Google when configured.
   - `apps/web/src/app/(auth)/signin/page.tsx` renders credentials sign-in and shows Google only when `/api/auth/providers` exposes it.
   - `apps/web/src/app/app/page.tsx` in local HEAD should render `Assigned task workspace` for `CLIENT` role users using `AssistantTaskWorkspace`.
   - `apps/web/src/components/pro-planner/AssistantTaskWorkspace.tsx` should fetch `/api/assistant-collaboration/tasks` and render persisted task controls.
2. Runtime HTTP checks against accessible alias:
   - `GET /api/health` -> HTTP 200 JSON: `status=ok`, `checks.database=ok`, `checks.stripe=ok`.
   - `GET /api/auth/providers` -> HTTP 200 JSON with `credentials` and `google` provider keys.
   - `GET /signin` -> HTTP 200 HTML; browser rendered email/password fields and `Continue with Google`.
3. Runtime browser checks against accessible alias:
   - `/signin?callbackUrl=/app` rendered cleanly with no captured browser console errors.
   - Pro Planner demo sign-in succeeded using seeded demo credentials; app routed to the Pro Planner dashboard.
   - Authenticated `GET /pro/planner/vault/demo-wedding` rendered the event vault for `Demo Wedding Event` with selected-event navigation and operational workspace content.
   - CLIENT demo sign-in succeeded using seeded demo credentials; app routed to `/app` and rendered a `CLIENT` dashboard.
   - The authenticated CLIENT `/app` page did not contain `Assigned task workspace`, `Assistant task workspace`, or `My assigned task controls` anywhere in `document.body.innerText`.
   - Authenticated browser fetch to `/api/assistant-collaboration/tasks` on the accessible alias returned HTTP 404 HTML, not the expected assistant collaboration JSON endpoint.
4. Latest raw deployment protection split:
   - `GET https://onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app/api/health` without redirects -> HTTP 302 to `https://vercel.com/sso-api?...`.
   - `GET https://onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app/signin` without redirects -> HTTP 302 to `https://vercel.com/sso-api?...`.

## Verdict
FAILED for the assigned assistant workspace smoke on the accessible Preview alias.

## Exact blocker / weak point
The accessible alias is healthy and sign-in works, but it does not expose the assistant collaboration runtime expected by local HEAD `b2e50e8`:
- Authenticated `CLIENT` `/app` renders a generic dashboard without the assigned task workspace.
- Authenticated `/api/assistant-collaboration/tasks` returns HTTP 404 HTML on the accessible alias.

The raw latest deployment remains behind Vercel SSO/protection, so Sentinel could not verify whether the latest protected deployment contains the expected assistant workspace behavior.

## Release-safety implication
This is not release-safe to call complete from the accessible alias. The alias appears stale or missing the latest assistant collaboration deployment surface, while the deployment that may contain the latest fix is not accessible to this verifier without Vercel SSO/protection access. Approving from the alias would risk a false completion.

## Git status outcome
`git status --short --branch` after writing this report: `## atlas/vercel-preview-current-main` plus the untracked report file `reports/preview/preview-alias-assistant-workspace-smoke-2026-08-11.md`. No application code files were modified.

## Recommended next action for Atlas
Route Forge/Atlas to confirm which deployment the accessible alias points to and promote or expose an approved Preview verification path for the deployment containing `b2e50e8`. Then route Sentinel for one re-verification of `/app` as CLIENT and `/api/assistant-collaboration/tasks` as an authenticated assistant/demo user.
