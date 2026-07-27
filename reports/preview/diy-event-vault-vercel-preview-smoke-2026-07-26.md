# DIY Planner / Event Vault Vercel Preview Smoke — 2026-07-26

## Scope
Verify the deployed Vercel Preview for the DIY Planner / Event Vault route-continuity cleanup.

## Target
- Vercel project: `onehub-work-web-8kph`
- Deployment: `dpl_6DGrhiajmD7qJJp7BhJPmPX52q9Y`
- Preview URL: `https://onehub-work-web-8kph-nvfbthnr1-one-hub2.vercel.app`
- Branch: `atlas/vercel-preview-current-main`
- Commit: `b09a2fafb57c3802323d0cfaf1d191898cb48374`
- Commit message: `fix(onehub): clean DIY event vault route continuity`

## Access method
Vercel Preview protection bypass header was used for automated smoke. Secret values were not recorded in this report.

## Checks run
1. `GET /api/health` on the protected Preview with bypass header.
2. Homepage load.
3. Authenticated DIY user sign-in using seeded test credentials.
4. Authenticated `/diy-planner` dashboard load.
5. Authenticated `/events/new` Event Wizard load.
6. Authenticated `/app/vault` route-continuity redirect/load to `/diy-planner/vault`.
7. Authenticated `/app/proposals` and `/app/contracts` route checks; both routed to DIY vault shell without browser/page errors in this smoke.

## Results
- `/api/health`: HTTP 200, status ok, database ok, stripe ok.
- `/`: HTTP 200, homepage rendered.
- `/diy-planner`: HTTP 200 after sign-in, dashboard rendered.
- `/events/new`: HTTP 200, Event Wizard rendered.
- `/app/vault`: HTTP 200, final URL `/diy-planner/vault`, Event Vault rendered.
- `/app/proposals`: HTTP 200, final URL `/diy-planner/vault`, Event Vault rendered.
- `/app/contracts`: HTTP 200, final URL `/diy-planner/vault`, Event Vault rendered.
- Browser console/page errors captured during smoke: none.

## Screenshots
Generated locally during smoke:
- `/root/.hermes/workspaces/onehub/preview-diy-planner.png`
- `/root/.hermes/workspaces/onehub/preview-after-diy-login.png`
- `/root/.hermes/workspaces/onehub/preview-smoke-diy_planner.png`
- `/root/.hermes/workspaces/onehub/preview-smoke-events_new.png`
- `/root/.hermes/workspaces/onehub/preview-smoke-app_vault.png`
- `/root/.hermes/workspaces/onehub/preview-smoke-app_proposals.png`
- `/root/.hermes/workspaces/onehub/preview-smoke-app_contracts.png`

## Assessment
PASS for the scoped Preview smoke: the deployed DIY Planner / Event Vault route-continuity cleanup is reachable behind Vercel protection, health is OK, seeded DIY authentication works, the dashboard and Event Wizard render, and vault/proposal/contract entrypoints route into the DIY vault shell without browser errors.

## Guardrails preserved
- No production setting changes.
- No DB mutation beyond normal authenticated read/navigation smoke.
- No secret values recorded.
- No public exposure change.
- No billing/infrastructure changes.
