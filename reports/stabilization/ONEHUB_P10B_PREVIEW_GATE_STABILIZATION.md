# OneHub P10B — Preview Gate Stabilization

Generated: 2026-07-23T11:08:20Z
Task: `t_b0a44ab8`
System: OneHub
Repo: `/root/.hermes/workspaces/onehub/repo`
Branch observed: `cleanup/accelerated`

## 1. Backend or structural scope reviewed

Reviewed only the approved P10B preview-gate stabilization slice:

- Current Git baseline and working-tree state.
- Google OAuth preview environment-variable contract.
- Non-secret deployment/preview documentation surface.
- Vercel configuration posture.
- Local validation gates: lint, typecheck, test, build, and diff whitespace checks.

Explicitly not performed: no Vercel deploy, no git push, no environment or secret writes, no database changes, no public exposure, no live payments, no billing, and no production/infrastructure changes.

## 2. Evidence examined

Baseline and tree:

- `git rev-parse --short HEAD` returned `324f8ae`.
- `git log --oneline -5` identifies `324f8ae` as `chore(onehub): package pilot stabilization work`.
- Before this run's final packaging, the only tracked modification visible was `apps/web/src/lib/auth.ts`, from the prior crashed P10B run's Google OAuth alias alignment.
- No `vercel.json` or `*vercel*` repository config file was found by file search.

OAuth contract:

- `apps/web/src/lib/auth.ts` now resolves Google OAuth credentials from canonical `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` first, with legacy `GOOGLE_ID` / `GOOGLE_SECRET` aliases accepted for compatibility.
- `apps/web/.env.example` documents canonical non-secret placeholders and now records the legacy alias compatibility note without any secret value.
- `docs/devops.md` now lists optional Google OAuth preview variables and the legacy alias compatibility note.

Preview/Vercel config posture:

- No repo-level `vercel.json` is needed for the first private preview gate based on current evidence.
- Recommended first preview posture is dashboard-only Vercel project settings with repo root as the monorepo root, web app rooted at `apps/web` or equivalent dashboard build settings, root install/build commands, and all secrets injected only through approved provider/secret storage.
- A minimal `vercel.json` should be deferred unless Sentinel/Atlas finds dashboard settings ambiguous or non-reproducible. Adding one now would be a repo config change without confirmed project settings.

## 3. Correctness verdict

Verdict: PARTIAL.

P10B is structurally stabilized for the no-deploy preview gate: the baseline is identified, the Google OAuth variable mismatch is resolved without secrets, the Vercel config decision is documented, and all required local commands exited 0.

Residual preview acceptance is still approval-gated because actual private preview use requires approved Vercel project access/settings, approved secret source, approved non-production database posture, and Sentinel verification. The build also surfaced a configured database authentication failure during static generation of `/api/demo/preflight`, while still exiting 0; that is not fixed in this slice because DB credential/env changes are explicitly out of scope.

## 4. Changes packaged

Changed files:

- `apps/web/src/lib/auth.ts`
  - Accepts canonical `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and legacy `GOOGLE_ID` / `GOOGLE_SECRET` aliases.
  - Google provider remains disabled unless both resolved credential values are present.
- `apps/web/.env.example`
  - Documents canonical Google OAuth preview placeholders and compatibility with legacy aliases.
- `docs/devops.md`
  - Adds optional Google OAuth env entries to the deployment environment-variable manifest.
- `reports/stabilization/ONEHUB_P10B_PREVIEW_GATE_STABILIZATION.md`
  - This handoff artifact.

## 5. Gate results

Commands were run from `/root/.hermes/workspaces/onehub/repo`.

| Gate | Result | Evidence |
|---|---:|---|
| `pnpm run lint` | PASS, exit 0 | Completed with existing warning-level lint findings only; no fatal lint errors. |
| `pnpm run typecheck` | PASS, exit 0 | TypeScript check completed successfully. |
| `pnpm run test` | PASS, exit 0 | 31 test files passed; 228 tests passed. |
| `pnpm run build` | PASS, exit 0 | Next.js build compiled and generated pages successfully. Build log included non-fatal Prisma authentication errors while evaluating `/api/demo/preflight` against the configured DB environment. |
| `git diff --check` | PASS, exit 0 | No whitespace/diff-check errors. |

## 6. Exact risk or blocker

Residual approval-gated risks:

1. Private preview deployment remains blocked until Atlas/Marlon approve provider-side Vercel project access/settings and a private exposure model.
2. Secret/env injection remains blocked until an approved secret source is used; no secrets should be pasted into repo/docs/reports.
3. Database readiness remains blocked until an owner-attested non-production database is configured. The local build observed DB authentication failures during static generation, so the current shell DB environment cannot be treated as preview-ready.
4. Google OAuth remains optional. The code/docs mismatch is resolved, but enabling Google OAuth for preview still requires an approved non-production OAuth client and callback configuration.
5. Sentinel verification is required before acceptance.

No production/public deploy, credential write, DB mutation, live payment, billing action, or infrastructure change was performed.

## 7. Narrow next action for Atlas

Recommended next action for Atlas: route this P10B package to Sentinel for verification against commit `324f8ae` plus the P10B working-tree changes, with special attention to the non-fatal build-time DB authentication evidence and the dashboard-only Vercel settings decision.

FOUNDER ESCALATION REQUIRED before any actual Vercel deploy, Vercel project creation/linking, env/secret write, DB provisioning/use, public/custom-domain exposure, OAuth/Stripe/Sentry/OpenAI provider setup, external invite, live-payment action, billing action, or legal/public-readiness claim.
