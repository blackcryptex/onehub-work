# OneHub Phase 1 Commercial Trust Spine Proof — 2026-08-27

Status: PARTIAL

Reason: the current pushed branch passes the source/local proof for the provider-submitted evidence gates and request → proposal → contract → payment-readiness trust spine. Runtime Preview proof is limited because the current branch Preview alias is protected by Vercel SSO/login, so the authenticated trust-spine flow could not be smoked without credentials or infrastructure changes.

## Scope tested

Task: Forge: Phase 1 commercial trust spine Preview proof (`t_fa960bb0`)

Guardrails observed:
- No live Stripe/payment activation.
- No billing, credential, env, domain, production, or infrastructure setting changes.
- No destructive database/migration commands.
- No legal/public launch claims.
- No unrelated implementation changes.

## Branch and commit tested

- Repo: `https://github.com/blackcryptex/onehub-work.git`
- Branch: `atlas/slice7-canonical-deploy`
- Commit: `6e54e93b65b23ab83cf9051ecdb985f0026691c6`
- Commit subject: `fix(proposals): require provider-submitted evidence gates`
- Remote branch check: `git ls-remote --heads origin atlas/slice7-canonical-deploy` returned the same commit SHA.
- GitHub PR lookup: `gh pr list --head atlas/slice7-canonical-deploy ...` returned `[]`; no PR was discoverable from the current repo metadata.

## Preview/deployment discovery

GitHub commit status for `6e54e93b65b23ab83cf9051ecdb985f0026691c6`:

- State: `success`
- Context: `Vercel – onehub-work-web-8kph`
- Description: `Deployment has completed`
- Target URL: `https://vercel.com/one-hub2/onehub-work-web-8kph/8dJamNTvukL4MXnaJ318PmBEGBPu`

GitHub check runs:

- `Vercel Preview Comments`: `completed`, `success`

GitHub deployments API:

- `gh api 'repos/blackcryptex/onehub-work/deployments?ref=atlas/slice7-canonical-deploy&per_page=10'` returned `[]`.

Local Vercel project metadata:

- `.vercel/` is not present in the repo workspace.
- `vercel` CLI is not installed/discoverable in this shell.

Candidate branch Preview alias tested:

- `https://onehub-work-web-8kph-git-atlas-slice7-canonical-deploy-one-hub2.vercel.app/api/health`
- Result: redirected to Vercel login/SSO and rendered the Vercel protected deployment login page.
- Effective URL began with: `https://vercel.com/login?next=%2Fsso-api%3Furl%3Dhttps%253A%252F%252Fonehub-work-web-8kph-git-atlas-slice7-canonical-deploy-one-hub2.vercel.app%252Fapi%252Fhealth...`
- HTTP result after redirects: `200`, `text/html; charset=utf-8`, Vercel login page.

Legacy accessible alias checked for comparison only:

- `https://onehub-work-web-8kph-two.vercel.app/api/health`
- Result: `200`, `application/json`, body included `{"status":"ok", ... "checks":{"database":"ok","stripe":"ok"}}`.
- This proves the older public alias is reachable, but it is not evidence that the current branch commit is running there.

Runtime conclusion:

- Current branch Preview appears deployed successfully from GitHub/Vercel status metadata.
- Current branch Preview is protected by Vercel access control, so full public/authenticated smoke of the request → proposal → contract → payment-readiness flow is blocked without Vercel credentials/session or settings changes.
- This is an access guardrail blocker, not a source-code trust-spine defect.

## Focused provider-backed trust-spine validation

Command:

`pnpm vitest run --config apps/web/vitest.config.ts apps/web/tests/booking-request-provider-proposal.test.ts apps/web/tests/proposal-provider-handoff.test.tsx apps/web/tests/proposal-trpc-accept-guard.test.ts apps/web/tests/contract-from-provider-backed-proposal.test.ts apps/web/tests/contract-readiness-clarity.test.tsx apps/web/tests/payment-intent-lifecycle.test.ts apps/web/tests/pro-planner-event-workspace-polish.test.tsx apps/web/tests/pro-planner-dashboard-buildout.test.tsx`

Result:

- Test files: 8 passed / 8
- Tests: 47 passed / 47
- Duration: 15.23s

Coverage represented by these focused tests:

- Booking request quote → provider-backed proposal handoff records `PROVIDER_PROPOSAL_SUBMITTED` evidence.
- Proposal approval route rejects planner-sent/generated/listing-backed proposals without provider-submitted evidence.
- Legacy tRPC proposal accept path rejects proposals without provider-submitted evidence before side effects.
- Contract generation rejects accepted proposals missing provider-submitted evidence.
- Proposal detail UI labels non-provider-backed/generated proposals truthfully and locks approval/contract generation until provider-submitted evidence exists.
- Contract page/payment readiness copy keeps payment locked unless provider-backed proposal evidence, accepted state, and signatures are complete.
- Payment intent creation rejects contracts/proposals missing accepted provider-backed proposal evidence.
- Pro Planner event workspace and dashboard do not count/label proposals as provider-backed or vendor-ready without provider-submitted activity evidence.

## Full local/source validation

Full tests:

`pnpm run test`

- Result: PASS
- Test files: 58 passed / 58
- Tests: 326 passed / 326
- Duration: 89.35s

Typecheck:

`pnpm -C apps/web typecheck`

- Result: PASS
- Output: `tsc --noEmit`

Lint:

`pnpm run lint`

- Result: PASS with existing warnings
- Output summary: `333 problems (0 errors, 333 warnings)`
- No new code changes were made before this lint run; warnings are pre-existing repo-wide lint warnings.

Build:

`NODE_OPTIONS=--max-old-space-size=4096 pnpm -C apps/web build`

- Result: PASS
- Next.js compiled successfully and generated static pages/routes.
- Existing lint warnings were emitted during build.

Root build:

`pnpm run build`

- Result: FAIL due local Node heap OOM during Next.js build worker.
- Failure: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`.

Retried with explicit heap allowance:

`NODE_OPTIONS=--max-old-space-size=4096 pnpm run build`

- Result: PASS
- Root script completed `pnpm db:generate && pnpm -C apps/web build`.
- Existing lint warnings were emitted during build.

Diff check:

`git diff --check`

- Result before this report: PASS; no whitespace errors reported.

Git status before this report:

`git status --short --branch`

- `## atlas/slice7-canonical-deploy`
- `?? .hermes/`
- `?? reports/security/`
- `?? reports/strategy/`

Notes:

- `.hermes/plans/2026-08-27-onehub-beat-the-market-plan.md` was already untracked in this workspace when the task started.
- `reports/security/ONEHUB_ROLE_PRIVACY_ACCESS_CONTROL_MAP_2026-08-27.md` and `reports/strategy/ONEHUB_BEAT_THE_MARKET_SCORECARD_2026-08-27.md` are untracked artifacts present in the workspace; Forge did not modify them for this proof.

## Implementation changes made by this task

Changed files:

- `reports/stabilization/ONEHUB_PHASE1_COMMERCIAL_TRUST_SPINE_PROOF_2026-08-27.md`

No application source code was changed. No in-scope code defect was found that blocked the trust spine under local/source validation.

## Phase 1 proof verdict

Overall: PARTIAL

Passed:

- Current branch and pushed commit were identified and confirmed against origin.
- Vercel/GitHub metadata shows a successful Vercel deployment status for the tested commit.
- Focused provider-backed trust-spine tests passed: 8 files, 47 tests.
- Full Vitest suite passed: 58 files, 326 tests.
- Typecheck passed.
- Lint passed with warnings only.
- App build passed with `NODE_OPTIONS=--max-old-space-size=4096`.
- Root build passed with `NODE_OPTIONS=--max-old-space-size=4096`.
- `git diff --check` passed before report creation.
- The trust spine remains source-validated from request quote handoff through provider-backed proposal approval, contract generation/readiness, and payment intent readiness locking.

Blocked/partial:

- Current branch Preview runtime smoke is blocked by Vercel protected deployment access.
- Full authenticated request → proposal → contract → payment-readiness browser smoke requires Vercel/session credentials or an approved unprotected Preview target; Forge did not change access settings.
- Plain `pnpm run build` can OOM in this shell without `NODE_OPTIONS=--max-old-space-size=4096`; the same root build passes with the heap allowance required by the Sentinel child task.

## Residual risks

- Runtime behavior on the current protected Preview could not be fully observed from this headless worker without credentials/session access.
- Existing repo-wide ESLint warnings remain; they were not introduced or changed by this task.
- Existing untracked artifacts outside this report remain in the workspace and should be reviewed by Atlas/Sentinel before commit/push decisions.

## Sentinel readiness

Sentinel can verify with these commands:

1. `git rev-parse HEAD`
2. `git ls-remote --heads origin atlas/slice7-canonical-deploy`
3. `pnpm vitest run --config apps/web/vitest.config.ts apps/web/tests/booking-request-provider-proposal.test.ts apps/web/tests/proposal-provider-handoff.test.tsx apps/web/tests/proposal-trpc-accept-guard.test.ts apps/web/tests/contract-from-provider-backed-proposal.test.ts apps/web/tests/contract-readiness-clarity.test.tsx apps/web/tests/payment-intent-lifecycle.test.ts apps/web/tests/pro-planner-event-workspace-polish.test.tsx apps/web/tests/pro-planner-dashboard-buildout.test.tsx`
4. `pnpm run test`
5. `pnpm -C apps/web typecheck`
6. `pnpm run lint`
7. `NODE_OPTIONS=--max-old-space-size=4096 pnpm run build`
8. `git diff --check`
9. `git status --short --branch`
10. `curl -sS -L -o /tmp/onehub_branch_health_body.txt -w 'url=%{url_effective}\nhttp_code=%{http_code}\ncontent_type=%{content_type}\n' 'https://onehub-work-web-8kph-git-atlas-slice7-canonical-deploy-one-hub2.vercel.app/api/health'`

Recommended next action for Atlas:

- Route Sentinel child task `t_db036827` to verify the report and source proof, then decide whether a credentialed/protected Preview smoke should be separately approved. FOUNDER ESCALATION REQUIRED only if Atlas wants Vercel access settings changed, a protected deployment bypass/session shared, or a public Preview/domain exposure change.

## Recovery addendum — legacy payment auto-build provider evidence gate

Task: Forge recovery: gate legacy payment auto-build provider evidence (`t_c1fdaba5`)

Recovery implementation:

- `apps/web/src/app/api/payments/auto-build/route.ts` now applies the same provider-submitted evidence gate used by `apps/web/src/app/api/payments/plan/from-accepted-proposals/route.ts`.
- The legacy auto-build route now queries `PROVIDER_PROPOSAL_SUBMITTED` activity evidence for accepted proposal IDs in the requested event/org.
- Only accepted proposals with listing context and matching provider-submitted activity are eligible for payout creation.
- Accepted listing-backed proposals without provider-submitted evidence now return `400` with `No accepted provider-backed proposals found for this event` before any payout lookup/create side effect.
- Existing role, event authority, accepted proposal, listing, existing non-canceled payout, and payout creation behavior are preserved for provider-submitted proposals.

Recovery regression coverage:

- Added `apps/web/tests/payment-auto-build-provider-evidence.test.ts`.
- Negative coverage proves `/api/payments/auto-build` does not create payout lines from accepted listing-backed proposals without `PROVIDER_PROPOSAL_SUBMITTED` evidence.
- Positive coverage proves accepted provider-submitted proposals still create intended payout lines.

Recovery validation:

1. `pnpm test -- tests/payment-auto-build-provider-evidence.test.ts`
   - PASS: 1 file, 2 tests.
   - RED observed before implementation: the negative regression failed with `expected 200 to be 400`, proving the legacy route previously created payout lines without provider evidence.
2. `pnpm test -- tests/payment-auto-build-provider-evidence.test.ts tests/contract-from-provider-backed-proposal.test.ts tests/payment-intent-lifecycle.test.ts tests/proposal-trpc-accept-guard.test.ts tests/proposal-provider-handoff.test.tsx tests/booking-request-provider-proposal.test.ts`
   - PASS: 6 files, 29 tests.
3. `pnpm run test`
   - PASS: 59 files, 328 tests.
4. `pnpm -C apps/web typecheck`
   - PASS.
5. `pnpm -C apps/web lint`
   - PASS with existing warnings only: 295 warnings, 0 errors.
6. `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C apps/web build`
   - PASS. Next.js compiled successfully and generated 93 static pages/routes.
7. `git diff --check`
   - PASS.
8. `git status --short --branch`
   - Shows modified `apps/web/src/app/api/payments/auto-build/route.ts`, new `apps/web/tests/payment-auto-build-provider-evidence.test.ts`, this report, and pre-existing untracked `.hermes/`, `reports/security/`, and `reports/strategy/` artifacts.

Recovery verdict:

- Source/local blocker recovery is complete for the Sentinel-blocked legacy auto-build route.
- Atlas can route Sentinel reverify for Phase 1 blocker `t_db036827` via child task `t_fa8bb21a`.
