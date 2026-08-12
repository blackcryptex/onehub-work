# Preview Alias Assistant Workspace Diagnosis — 2026-08-11

## Scope
Read-only diagnosis after Sentinel task `t_5a305103` failed the accessible Preview alias smoke. This report inspected local source at HEAD `b2e50e866e0c70e6fa0a4f7ab31d415a31b205c3`, GitHub deployment/status metadata, and safe unauthenticated HTTP headers/bodies. No Vercel aliases, domains, env vars, DB data, secrets, billing, infrastructure, production settings, or live payments were mutated.

## Local source route expectations at `b2e50e8`
Expected assistant collaboration API routes exist in the local Next app source:

- `apps/web/src/app/api/assistant-collaboration/tasks/route.ts`
  - `GET /api/assistant-collaboration/tasks`
  - optional query params: `eventId`, `status`
  - expected unauthenticated failure shape from source is JSON `401` (`{"error":"Unauthorized"}`), not a Next HTML 404, because the route exists and delegates auth to `taskRouter`.
  - `POST /api/assistant-collaboration/tasks`
- `apps/web/src/app/api/assistant-collaboration/tasks/[taskId]/route.ts`
  - `PATCH /api/assistant-collaboration/tasks/:taskId`
- `apps/web/src/app/api/assistant-collaboration/checklist-items/[itemId]/route.ts`
  - `PATCH /api/assistant-collaboration/checklist-items/:itemId`
- `apps/web/src/app/api/assistant-collaboration/invites/route.ts`
  - `GET /api/assistant-collaboration/invites?orgId=...`
  - `POST /api/assistant-collaboration/invites`

Expected UI surfaces also exist in local source:

- `apps/web/src/app/app/page.tsx:200-208` renders `<h2>Assigned task workspace</h2>` and `AssistantTaskWorkspace mode="assistant"` for `role === "CLIENT"`.
- `apps/web/src/components/pro-planner/AssistantTaskWorkspace.tsx:39-46` fetches `/api/assistant-collaboration/tasks` or `/api/assistant-collaboration/tasks?eventId=...`.
- `apps/web/src/components/pro-planner/AssistantTaskWorkspace.tsx:108-177` renders `Assistant task workspace`, `My assigned task controls`, status controls in assistant mode, and assigned checklist controls when present.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:895-908` renders the planner/event-vault assistant collaboration section and uses the same workspace component.

Local commit evidence:

- `git rev-parse HEAD` returned `b2e50e866e0c70e6fa0a4f7ab31d415a31b205c3`.
- `git show --stat b2e50e8 -- apps/web/src/app/app/page.tsx ...` showed `b2e50e8 fix: expose assistant assigned task workspace` modified `apps/web/src/app/app/page.tsx` with 19 insertions.

## GitHub deployment/status evidence
GitHub commit status for `b2e50e866e0c70e6fa0a4f7ab31d415a31b205c3` is successful for three Vercel Preview projects:

- `Vercel – onehub-work-web-xh3l`: success, deployment completed, target `https://vercel.com/one-hub2/onehub-work-web-xh3l/ECRoELBuxBdsuS6Ms6n4oevByD6H`
- `Vercel – onehub-work-web`: success, deployment completed, target `https://vercel.com/one-hub2/onehub-work-web/FztB16m5TwJovmzKWpYbjGXfAFKh`
- `Vercel – onehub-work-web-8kph`: success, deployment completed, target `https://vercel.com/one-hub2/onehub-work-web-8kph/AJavzSX8XB5vaLRELkU6VubN3zU9`

GitHub deployment API for the same SHA shows the raw `onehub-work-web-8kph` Preview deployment URL as:

- deployment id `5838400763`
- environment `Preview – onehub-work-web-8kph`
- environment/target URL `https://onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app`
- status `success`
- created `2026-08-10T19:19:24Z`, status `2026-08-10T19:19:25Z`

The accessible alias Sentinel used is different:

- accessible alias: `https://onehub-work-web-8kph-two.vercel.app`
- raw successful deployment for `b2e50e8`: `https://onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app`

## Safe HTTP evidence
Against the accessible alias `https://onehub-work-web-8kph-two.vercel.app`:

- `GET /api/health` returned HTTP 200 JSON:
  - `content-type: application/json`
  - `x-matched-path: /api/health`
  - body prefix: `{"status":"ok","timestamp":"2026-08-11T22:03:50.345Z","checks":{"database":"ok","stripe":"ok"}}`
- `GET /api/assistant-collaboration/tasks` returned HTTP 404 HTML:
  - `content-type: text/html; charset=utf-8`
  - `x-matched-path: /_not-found`
  - `x-next-error-status: 404`
  - body begins with a Next HTML document, not JSON.
- `GET /api/assistant-collaboration/invites?orgId=probe` returned HTTP 404 HTML with `x-matched-path: /_not-found`.
- `HEAD /api/assistant-collaboration/tasks/probe` returned HTTP 404 HTML headers with `x-matched-path: /_not-found`.
- `HEAD /api/assistant-collaboration/checklist-items/probe` returned HTTP 404 HTML headers with `x-matched-path: /_not-found`.

Against the raw GitHub/Vercel deployment URL for `b2e50e8`:

- `HEAD https://onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app/api/health` returned HTTP 302 to `https://vercel.com/sso-api?...` with `x-robots-tag: noindex` and `x-frame-options: DENY`.
- `HEAD https://onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app/api/assistant-collaboration/tasks` also returned HTTP 302 to `https://vercel.com/sso-api?...`.

## Diagnosis
The accessible alias likely does not point to the `b2e50e8` deployment behavior for the `onehub-work-web-8kph` Preview project, or it is serving a build/project configuration that predates the assistant collaboration routes.

Reasoning:

1. Local source at `b2e50e8` contains concrete route files for `/api/assistant-collaboration/tasks`, `/tasks/:taskId`, `/checklist-items/:itemId`, and `/invites`.
2. If the accessible alias were serving this source, an unauthenticated `GET /api/assistant-collaboration/tasks` should hit the route and return a JSON auth error or another route-level JSON response. It should not resolve to Next's `/_not-found` HTML route.
3. The accessible alias is healthy for `/api/health`, so this is not a total outage.
4. GitHub says the successful `onehub-work-web-8kph` deployment for `b2e50e8` is the raw URL `onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app`, but that raw URL is Vercel SSO/protected and cannot be verified by this read-only worker.
5. Sentinel's prior authenticated browser evidence that CLIENT `/app` lacked `Assigned task workspace` matches the same stale/different-behavior pattern as the API 404s.

## Narrowest safe remediation path
Atlas should route Vercel/Preview ownership to one of these narrow actions, without changing production:

1. Confirm in Vercel which deployment `https://onehub-work-web-8kph-two.vercel.app` is aliased to.
2. If it is stale or attached to a different deployment/project behavior, move only the approved Preview alias to the successful `b2e50e8` `onehub-work-web-8kph` deployment, or provide Sentinel with approved access to the protected raw URL `https://onehub-work-web-8kph-4lrp2il38-one-hub2.vercel.app`.
3. Re-route Sentinel for one authenticated Preview smoke covering:
   - CLIENT `/app` contains `Assigned task workspace`.
   - authenticated `GET /api/assistant-collaboration/tasks` returns route JSON rather than 404 HTML.
   - Pro Planner event vault assistant collaboration still renders.

FOUNDER ESCALATION REQUIRED only if the remediation would require changing production domains, production environment variables, billing/security settings, public exposure policy, or Vercel protection/SSO policy beyond the approved Preview verification path.

## Git status outcome
Before writing this diagnosis, `git status --short --branch` showed:

```text
## atlas/vercel-preview-current-main
?? reports/preview/preview-alias-assistant-workspace-smoke-2026-08-11.md
```

This diagnosis added only this report file under `reports/preview/`. No application code files were modified.

After writing this diagnosis, `git status --short --branch` showed:

```text
## atlas/vercel-preview-current-main
?? reports/preview/preview-alias-assistant-workspace-diagnosis-2026-08-11.md
?? reports/preview/preview-alias-assistant-workspace-smoke-2026-08-11.md
```
