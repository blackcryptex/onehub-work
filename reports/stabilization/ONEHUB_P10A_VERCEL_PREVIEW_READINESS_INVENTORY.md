# OneHub P10A — Vercel Preview Readiness Inventory

Generated: 2026-07-23T00:46:55Z
Task: `t_c3b91de5`
System: OneHub
Repo: `/root/.hermes/workspaces/onehub/repo`
Branch observed: `cleanup/accelerated`

## Executive posture

Verdict: PARTIAL.

OneHub has a recognizable Next.js/Vercel-compatible web app shape and enough prior P8/P9 control artifacts to define a safe private preview path. It is not ready to create or expose a Vercel preview yet because the repo is inherited-dirty, no `vercel.json` or Vercel project linkage was found, the Vercel CLI is unavailable in this workspace, and the selected private non-production target plus approved secret source are not recorded.

This inventory is read-only release-prep except for this report artifact. It does not approve deployment, git push, production/public exposure, env or credential changes, DB reset/migration/schema changes, live payments, billing, legal claims, or provider-dashboard actions.

## 1. Backend or structural scope reviewed

Reviewed only Vercel preview readiness inventory scope:

- Live repo state, branch, dirty tree, remotes, and non-invasive GitHub/Vercel auth availability.
- Package manager, workspace, package scripts, Next.js configuration, and test/build command surfaces.
- Vercel config absence/presence.
- Next app structure and API route inventory.
- Existing P8/P9 readiness artifacts and P7 stabilization baseline references.
- Environment variable categories using redacted placeholders only.
- Validation commands needed before any private Vercel preview.
- Blockers classified as repo cleanup, Marlon decision, or credential/infra approval.

Not performed:

- No deploy.
- No git push.
- No Vercel project creation/linking.
- No production/public exposure.
- No `.env.local` or real secret values read.
- No env/credential/provider/billing changes.
- No DB reset, migration, seed, schema change, or destructive command.
- No live payment, legal, billing, or public-launch claim.
- No product code changed.

## 2. Evidence examined

Repo and auth availability:

- `pwd` confirmed workspace root: `/root/.hermes/workspaces/onehub/repo`.
- `git branch --show-current` and `git status --short --branch` showed branch `cleanup/accelerated`.
- `git remote -v` showed `origin` at `https://github.com/blackcryptex/onehub-work.git` for fetch and push.
- `gh auth status` showed GitHub CLI authenticated to `github.com` as `blackcryptex`; the tool output redacted the token.
- `vercel whoami` failed because `vercel` command is not installed in the workspace shell.

Package and app structure:

- Root `package.json:2-20` defines monorepo package `onehub`, package manager `pnpm@9.0.0`, workspaces `apps/*` and `packages/*`, and scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `e2e`, `db:migrate`, `db:generate`, `db:seed`, `stabilize`.
- Web app `apps/web/package.json:2-18` is private ESM package `@onehub/web` with Next scripts `dev`, `build`, `start`, `lint`, `typecheck`, placeholder `test`/`e2e`, and `linkcheck`.
- Web app dependencies include Next `14.2.6`, React `18.3.1`, NextAuth beta, Prisma, Stripe, OpenAI, Google APIs, tRPC server, Zod, and local packages `@onehub/types` and `@onehub/ui`: `apps/web/package.json:20-60`.
- `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, app `tsconfig.json`, and app `vitest.config.ts` are present.
- App Router structure exists under `apps/web/src/app` with grouped protected routes `(app)`, auth routes `(auth)`, public pages, role pages, support/legal/privacy/terms, and `api` route handlers.
- API route inventory includes health, auth, bookings, contracts, demo preflight, events, Google calendar, payments, proposals, providers, Stripe webhook, user invite/search, vendor search, and admin routes.

Next/Vercel config:

- No `vercel.json` or other `*vercel*` repo config file was found.
- `apps/web/next.config.mjs:2-13` enables `reactStrictMode`, experimental `typedRoutes`, image domains, and transpilation of `@onehub/ui` and `@onehub/types`.
- `apps/web/next.config.mjs:7-9` sets `typescript.ignoreBuildErrors: true`, which means `next build` can pass despite TypeScript errors. A separate `pnpm run typecheck` is mandatory before preview readiness.
- `apps/web/next.config.mjs:14-28` customizes webpack for server extension aliases and ignores codemod scripts.

Security/runtime posture relevant to preview:

- `apps/web/src/middleware.ts:20-35` sets security headers and request ids; CSP is report-only.
- `apps/web/src/middleware.ts:51-71` honors maintenance mode for API/app protected surfaces.
- `apps/web/src/middleware.ts:73-78` allows API requests through after request/security headers; route-level API auth must remain verified separately.
- `apps/web/src/middleware.ts:80-153` protects matched app namespaces with NextAuth token checks and role redirects.
- `apps/web/src/lib/auth.ts:22-32` requires an auth secret outside development; `authConfig` also accepts `NEXTAUTH_SECRET` or `AUTH_SECRET`.
- `apps/web/src/lib/auth.ts:161-177` enables Google only when `GOOGLE_ID` and `GOOGLE_SECRET` are configured, while `.env.example` documents `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; this naming mismatch must be clarified before a preview using Google OAuth.
- `apps/web/src/server/lib/rateLimit.ts:1-110` implements local in-memory rate limiting only when `RATE_LIMIT_ENABLED=true`; docs classify it as local/test-only, not horizontally scaled production-ready.
- Prisma schema uses PostgreSQL through `DATABASE_URL`: `apps/web/prisma/schema.prisma:1-8`.

Environment placeholder evidence:

- `apps/web/.env.example:1-44` provides redacted/local placeholders for `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `ONEHUB_CANONICAL_URL`, `ONEHUB_PRIMARY_DOMAIN`, `ONEHUB_MAINTENANCE_MODE`, observability, rate limiting, OAuth, Stripe test-mode, and OpenAI.
- `docs/devops.md:112-131` names deployment env categories and `pnpm build` as the build command.
- `reports/production/acceleration/gate7-final-closure/non-secret-env-manifest.md:20-46` classifies staging/production env names by sensitivity and owner decision.
- No real environment values were inspected or copied.

Existing P8/P9 artifacts:

- P8 defines a controlled invite-only private pilot candidate and explicitly excludes production/public/legal/infra/billing/live-payment approval: `reports/stabilization/ONEHUB_P8_PRIVATE_PILOT_RELEASE_CONTROL_PACKAGE.md:9-15`, `111-122`.
- P9B states the environment verification package is ready but no hosted/private target was accessed or certified: `reports/stabilization/ONEHUB_P9B_PRIVATE_ENVIRONMENT_VERIFICATION.md:9-15`, `30-36`.
- P9B requires target label, owner, URL/exposure, approved secret source, non-production DB, data mode, invite boundary, health, demo preflight, Stripe/payment freeze, support/admin/evidence/rollback ownership before a pilot target is used: `reports/stabilization/ONEHUB_P9B_PRIVATE_ENVIRONMENT_VERIFICATION.md:109-130`.
- P9 final packet is SOUND for planning but PARTIAL/NO-GO for actual invites until Marlon/operator decisions and selected-target verification are recorded: `reports/stabilization/ONEHUB_P9_FINAL_PRIVATE_PILOT_READINESS_PACKET.md:9-23`.
- P9E defaults to Marlon as accountable owner, Atlas as operator, Sentinel as verifier, internal seed/demo first-session posture, live-payment/legal/public freeze, and no selected environment target yet: `reports/stabilization/ONEHUB_P9E_DEFAULT_PILOT_OPERATING_SETUP.md:71-87`.

Dirty tree evidence:

- `git status --short --branch` showed 30 tracked modified files and 11 untracked paths before this P10A report was written.
- `git diff --stat` reported 30 files changed with 462 insertions and 112 deletions.
- Dirty tree buckets:
  - Role/navigation and protected route/page changes: app route pages for client events, contracts, event proposals, marketplace manage, proposals, requests, vaults, planner, venue dashboard, middleware, and `apps/web/src/lib/routes.ts`.
  - Contract/proposal/payment-adjacent code: contract-from-proposal API route, contract/proposal client components and buttons, P2 canonical lifecycle test.
  - Vendor/venue/planner UX changes: vendor, venue, pro planner dashboards and event command-center helper.
  - Test artifacts: role-selection routing test, P5 pro planner command center test, P5 provider booking UX flow test.
  - Data/schema artifact: untracked Prisma migration directory `apps/web/prisma/migrations/20260722103000_reconcile_dispute_admin_fields/` and modified `scripts/seed.ts`.
  - Stabilization reports: untracked P8/P9/final stabilization reports.

## 3. Correctness verdict

PARTIAL.

Safe assumption: the repo has a Next.js App Router web application that can likely be configured for a Vercel preview using `apps/web` as the app root or a monorepo-aware Vercel project, provided package install/build settings and env vars are supplied.

Unsafe assumption: that this branch is preview-clean or deployable as-is. The tree is inherited-dirty, an untracked Prisma migration exists, Vercel project linkage is not visible, the Vercel CLI is unavailable, no private preview target is selected, and no approved secret/env source is recorded.

## 4. Required environment variable categories for private Vercel preview

Use redacted placeholders only. Do not paste real values into reports, chat, commits, or screenshots.

| Category | Variables / safe placeholders | Required before preview? | Approval / safety note |
|---|---|---:|---|
| Database | `DATABASE_URL=postgresql://<nonprod-user>:***@<nonprod-host>/<nonprod-db>` | Yes | Must be private non-production. Owner must attest DB class without exposing password/full URL. No production DB. |
| Auth base URLs | `NEXTAUTH_URL=https://<private-vercel-preview-or-custom-preview-host>`, `NEXT_PUBLIC_APP_URL=https://<private-preview-host>`, `ONEHUB_CANONICAL_URL=https://<private-preview-host>`, `ONEHUB_PRIMARY_DOMAIN=<private-preview-host>` | Yes | Host/callback policy requires Marlon/Atlas approval before exposure. Must match selected Vercel preview URL/domain. |
| Auth secrets | `NEXTAUTH_SECRET=<secret-managed-by-owner>`, optional `AUTH_SECRET=<secret-managed-by-owner>` | Yes | Secret storage only. Required outside development. |
| Session tuning | `NEXTAUTH_SESSION_MAX_AGE=<seconds>`, `NEXTAUTH_SESSION_UPDATE_AGE=<seconds>` | Optional | If unset, code defaults to 12h max age and 1h update age. |
| Maintenance/write freeze | `ONEHUB_MAINTENANCE_MODE=false` normally; `true` only for approved stop/freeze | Optional control | Server-side only. Must not be public. |
| Demo mode | `ONEHUB_DEMO_MODE=true|false` | Required if relying on seed/demo flows | Record selected data mode and run `/api/demo/preflight` if enabled. |
| Observability | `ERROR_TRACKING_PROVIDER=console`, `SENTRY_DSN=<unset-or-secret>`, `NEXT_PUBLIC_SENTRY_DSN=<unset-or-public-dsn>`, `ONEHUB_ERROR_LOG_SAMPLE_RATE=0` | Optional | External Sentry/provider setup requires approval for provider, budget, retention, alerting, and PII/secret scrubbing. |
| Rate limiting | `RATE_LIMIT_ENABLED=false|true`, `RATE_LIMIT_WINDOW_MS=60000`, `RATE_LIMIT_MAX_REQUESTS=100`, `RATE_LIMIT_TRUST_PROXY=false` | Optional | Current helper is in-memory; private preview can use conservative settings, but no production-scale claim. Proxy trust requires hosting topology approval. |
| OAuth / Google | Code expects `GOOGLE_ID=<client-id>` and `GOOGLE_SECRET=<secret>`; `.env.example` documents `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` | Optional | Naming mismatch must be resolved before Google OAuth preview. Separate non-production OAuth client/callback approval required. |
| Stripe test mode | `STRIPE_SECRET_KEY=<unset-or-sk_test_redacted>`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<unset-or-pk_test_redacted>`, `STRIPE_WEBHOOK_SECRET=<unset-or-whsec_redacted>`, optional `STRIPE_CONNECT_CLIENT_ID=<unset-or-test-connect-id>` | Optional / frozen by default | Any `sk_live_`, `pk_live_`, live webhook, live Connect, payout, transfer, billing, refund, or fund movement is a stop. |
| AI | `OPENAI_API_KEY=<unset-or-secret-managed-by-owner>`, `OPENAI_MODEL=gpt-4o-mini` | Optional | Usage/cost owner required if enabled. Do not imply AI support readiness. |
| Admin guardrails | `GUARDED_MVP_PLATFORM_ADMIN_USER_IDS=<redacted-user-ids>`, `GUARDED_MVP_HOLDBACK_THRESHOLD_CENTS=<integer>` | Optional / depends on admin/payment test scope | Admin/payment actions remain frozen unless scoped and verified. |
| Client feature flag | `NEXT_PUBLIC_OPEN_EVENT_IN_NEW_TAB=false|true` | Optional | Browser-visible; safe only as an explicit product/preview setting. |
| Dev-only bypass | `DEV_GOD_MODE=false` | No for Vercel preview | Must not be enabled in a hosted preview. Code gates it to development, but preview env should still keep it absent/false. |

## 5. Validation commands needed before private preview

Do not run destructive DB commands against an unclear or production-like DB. These commands should be run after the dirty tree is intentionally accepted or cleaned and after env source/target are approved.

Minimum local/repo validation:

1. `pnpm install --frozen-lockfile`
2. `pnpm run lint`
3. `pnpm run typecheck`
4. `pnpm run test`
5. `pnpm run build`
6. `pnpm run stabilize`

Preview-target validation after private Vercel environment exists and env vars are configured by an approved owner:

1. Confirm Vercel project root/build settings without exposing secrets:
   - Monorepo root: repo root.
   - App root likely: `apps/web`.
   - Install command likely: `pnpm install --frozen-lockfile`.
   - Build command likely: `pnpm run build` from repo root, or `pnpm -C apps/web build` if Vercel project root is `apps/web`.
2. Confirm `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `ONEHUB_CANONICAL_URL` match the selected private preview URL.
3. Confirm DB owner attests non-production DB and safe data mode.
4. Run `GET /api/health`; require HTTP 200 and safe response fields.
5. If seed/demo mode is used, run `GET /api/demo/preflight`; record fields without secrets.
6. Verify no live Stripe key prefixes or live payment provider setup are present.
7. Verify auth sign-in and role landing for approved internal accounts only.
8. Verify participant/support/evidence/rollback owner map from P9E before any invite.

Not safe in P10A without explicit approval:

- `pnpm run db:migrate`, `prisma migrate dev`, `prisma migrate deploy`, `pnpm run db:seed`, DB reset, schema changes, or migration changes against any real/shared target.
- Vercel deploy/link/project creation or env var writes.
- DNS, SSL, public domain, production hosting, billing, live Stripe, OAuth provider dashboard, or credential rotation actions.

## 6. Blockers to private Vercel preview

### Fixable by repo cleanup / scoped implementation

1. Dirty tree not release-clean.
   - 30 tracked modified files and 11 untracked paths pre-exist this report.
   - Required next state: Atlas decides which changes belong in the preview slice, then a scoped cleanup/verification lane makes the tree reviewable.

2. Untracked Prisma migration is present.
   - `apps/web/prisma/migrations/20260722103000_reconcile_dispute_admin_fields/` exists untracked.
   - Required next state: schema/migration owner reviews whether this migration is intended for preview; no DB apply until target and approval exist.

3. TypeScript build masking.
   - `typescript.ignoreBuildErrors: true` in Next config can allow `next build` to pass with type errors.
   - Required next state: `pnpm run typecheck` must be a hard preview gate regardless of `next build` result.

4. Google OAuth env naming mismatch.
   - Code gates Google on `GOOGLE_ID` / `GOOGLE_SECRET`; `.env.example` documents `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
   - Required next state: align placeholders/code or explicitly choose no Google OAuth for first private preview.

5. Vercel config absent.
   - No `vercel.json` or visible Vercel project settings are in repo.
   - Required next state: decide whether to rely on Vercel dashboard settings or add a minimal non-secret repo config in a separate reviewed slice.

### Marlon decision blockers

1. Exact private preview target posture.
   - Marlon/Atlas must approve whether this is Vercel-generated private preview URL only, a protected preview deployment, or a named private non-production domain.

2. First preview data mode.
   - Decide `seed/demo` vs `pilot-entered non-production`; default from P9E is internal seed/demo first.

3. Invite/access boundary.
   - Decide internal-only operator access first vs any friendly external participant. P9E default is no external invites.

4. Support/evidence/rollback ownership.
   - P9E defaults Marlon accountable, Atlas operator, Sentinel verifier, but actual support channel, evidence path, and stop/rollback authority must be recorded for the selected preview.

5. Stripe and AI inspection posture.
   - Decide whether payment-entry UI/test Stripe and AI features are enabled or left unset/fallback for first private preview.

### Credential / infrastructure approval blockers

1. Vercel account/project access.
   - Vercel CLI is not installed and no Vercel auth/project linkage was verified. Project creation/linking/deploy/env writes require approved operator access.

2. Secret storage and env injection.
   - Preview needs approved secret source for `DATABASE_URL`, auth secret, optional provider keys, and URL values. No real values may be stored in repo or report.

3. Non-production DB provisioning/classification.
   - Preview needs an owner-attested non-production Postgres target. Production DB or unclear DB is a stop.

4. OAuth/provider dashboards.
   - Google OAuth callback/client setup, Stripe test webhooks, Sentry project, OpenAI key budget, and any provider dashboard changes require approval before use.

5. Public exposure controls.
   - Any public URL, custom domain, DNS/SSL, shareable invite, public signup, or external participant access is not covered by this inventory and requires approval.

## 7. Narrow recommended next P10 slice

Recommended next slice for Atlas: P10B — repo cleanup and preview gate stabilization, no deploy.

Scope for P10B:

1. Freeze the intended preview branch contents: classify the inherited dirty tree into keep/revert/defer buckets.
2. Resolve the untracked Prisma migration decision without applying it to any DB.
3. Fix or explicitly document the Google OAuth env naming mismatch.
4. Add or document Vercel project settings using non-secret config only.
5. Run `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `pnpm run build`; treat failures as blockers.
6. Produce a clean preview candidate handoff for Sentinel/ops.

FOUNDER ESCALATION REQUIRED before any actual Vercel deploy, Vercel project creation/linking, env/secret write, DB provisioning/use, public/custom-domain exposure, OAuth/Stripe/Sentry/OpenAI provider setup, external invite, live-payment action, billing action, or legal/public-readiness claim.

## 8. Residuals

Residual repo-cleanup items are fixable by scoped engineering/review lanes.

Residual decision-only items: private preview target posture, owner map, first data mode, invite boundary, support/evidence path, rollback rule, optional OAuth/Stripe/AI/observability enablement.

Residual approval-gated items: Vercel access/project/env writes, secret source, non-production DB target, provider dashboard setup, and any public/custom-domain exposure.
