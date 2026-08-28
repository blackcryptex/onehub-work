# OneHub Phase 11 private-pilot proof and founder packet

Date: 2026-08-28
Verifier: Sentinel
Task: t_bf576dc0
Scope: Final read-only proof after accepted Phase 1-10 implementation work on branch `atlas/slice7-canonical-deploy`.

## Verdict

FAILED for final release handoff / NOT RELEASE-SAFE for unsupervised private-pilot release.

Score update: 7.8 / 10.

Reason: the source, test, typecheck, lint, build, health, and board evidence now show a credible private-pilot MVP trust spine across the requested roles and commercial surfaces. However, two final acceptance gates are not clean:

1. The repo is not clean. `git status --short` shows 53 modified/untracked paths before this packet was written.
2. Full authenticated Preview/browser proof did not run. The branch Preview `/api/health` probe redirects to Vercel SSO/login, and the local browser harness could not launch Chrome in this headless run. Canonical production `/api/health` is healthy, but that does not prove the uncommitted branch bundle is deployed there.

This is not a public-launch, live-payment, legal-readiness, or production-change approval.

## Evidence examined

### Repository and branch

- `pwd` returned `/root/.hermes/workspaces/onehub/repo`.
- `git branch --show-current` returned `atlas/slice7-canonical-deploy`.
- `git ls-remote --heads origin atlas/slice7-canonical-deploy` returned remote head `8a9050baecd9638cea3d5fbb0fd64b73d206868a`.
- `git status --short | wc -l` returned `53` before this packet was written.

### Runtime target checks

- Canonical production health probe:
  - Command: `curl -sS -L -o /tmp/onehub_canonical_health_phase11.txt -w ... https://www.1hubevents.com/api/health`
  - Result: `http_code=200`, `content_type=application/json`.
  - Body: `{"status":"ok","timestamp":"2026-08-28T08:40:38.656Z","checks":{"database":"ok","stripe":"ok"}}`.
- Canonical authenticated route protection:
  - Command: `curl -sS -L ... https://www.1hubevents.com/pro/planner`
  - Result: redirected to `https://www.1hubevents.com/signin?callbackUrl=%2Fpro%2Fplanner`, `http_code=200`.
- Branch Preview health probe:
  - Command: `curl -sS -L ... https://onehub-work-web-8kph-git-atlas-slice7-canonical-deploy-one-hub2.vercel.app/api/health`
  - Result: effective URL starts with `https://vercel.com/login?next=...`; protected by Vercel SSO/login.
- Browser proof blocker:
  - `browser_exec` failed twice with `chrome-not-running: no supported Chromium-family browser is running -- start Chrome, then retry`.

### Test/build gates

- `git diff --check`: PASS, exit 0.
- `pnpm run test -- apps/web/tests/private-pilot-readiness-hardening.test.tsx ... apps/web/tests/guest-rsvp-api.test.ts`: PASS. Vitest config ran the full suite: 65 files / 363 tests passed.
- `pnpm run typecheck`: PASS, `tsc --noEmit` exit 0.
- `pnpm run lint`: PASS, exit 0, with 328 warnings / 0 errors.
- `pnpm run build`: PASS. Prisma client generated, Next.js compiled successfully, and build listed the expected role, marketplace, commercial, admin, RSVP, and API routes.

### Board state

- Board DB from `$HERMES_KANBAN_DB`: `/root/.hermes/kanban/boards/onehub/kanban.db`.
- Open task query before completion returned `open_count=1`, and the only open item was this running task `t_bf576dc0`.

## Acceptance mapping

### Admin flow

Status: PASS by source/test/build; canonical authenticated browser smoke not completed.

Evidence:
- `apps/web/tests/admin-overview-workflow.test.tsx:75-99` verifies the admin trust/risk command center renders data-backed dispute, refund, holdback, payout, abuse, failed payment, webhook, and audit surfaces with reachable admin links and no placeholder/no-op copy.
- `apps/web/tests/admin-overview-workflow.test.tsx:101-128` verifies useful empty states and reachable oversight routes when no risk queues are open.
- Build lists `/admin/overview`, `/admin/users`, `/admin/verification`, and verification detail routes.

### Pro Planner flow

Status: PASS by source/test/build; canonical authenticated browser smoke not completed.

Evidence:
- `apps/web/tests/dashboard-core-routes.test.tsx:91-191` verifies `/messages`, `/calendar`, `/messages/[threadId]`, admin message parity, non-admin message isolation, and `/notifications` useful states.
- `apps/web/tests/marketplace-provider-actionability.test.tsx:178-240` verifies event-attached marketplace discovery, authenticated nav without public CTAs, listing trust/readiness copy, and event-smart booking request defaults.
- Build lists `/pro/planner`, `/pro/planner/vault`, `/pro/planner/vault/[eventSlug]`, `/marketplace`, `/marketplace/[slug]`, `/requests`, `/messages`, `/notifications`, and `/calendar`.

### DIY Planner flow

Status: PASS by source/test/build; canonical authenticated browser smoke not completed.

Evidence:
- Full vitest suite includes `apps/web/tests/diy-planner-cockpit.test.tsx` and `apps/web/tests/diy-planner-route-continuity.test.tsx` passing inside the 65-file/363-test run.
- Build lists `/diy-planner`, `/diy-planner/vault`, `/diy-planner/vault/[eventSlug]`, `/events/new`, and event workspace subroutes.
- Parent t_71234726 independently verified DIY cockpit/polish behavior and reported PASS with residual read-only guest pane limitations.

### Client flow

Status: PASS by source/test/build; canonical authenticated browser smoke not completed.

Evidence:
- `apps/web/tests/app-client-events-visibility.test.tsx:66-91` verifies client dashboard fetches stakeholder events, annotates summary shares, links to `/client/events/[eventSlug]`, and avoids dead `/app/vault` links.
- `apps/web/tests/app-client-events-visibility.test.tsx:93-130` verifies pending/no-relationship client states avoid create-event/sign-in copy and show safe waiting language.
- Build lists `/client/events/[eventSlug]`.

### Vendor and Venue flows

Status: PASS by source/test/build; canonical authenticated browser smoke not completed.

Evidence:
- Full vitest suite includes `apps/web/tests/vendor-dashboard-workflow.test.tsx` and `apps/web/tests/venue-dashboard-workflow.test.tsx` passing inside the 65-file/363-test run.
- `apps/web/tests/marketplace-provider-actionability.test.tsx:144-176` verifies provider profile publish syncs to a real on-platform marketplace listing.
- Build lists `/vendor/dashboard`, `/venue/dashboard`, `/providers/onboarding`, `/providers/start`, `/marketplace/manage`, `/billing/connect`, and `/billing/payouts`.

### Health/auth/session/database-backed commercial evidence

Status: PASS for health/database/Stripe on canonical production; PASS for auth/session guardrails by tests.

Evidence:
- Canonical `/api/health` returned status ok with `database: ok` and `stripe: ok`.
- `apps/web/src/app/api/health/route.ts:15-35` returns 200 only when `performHealthChecks()` returns `status === "ok"`; otherwise 503/down.
- `apps/web/tests/auth-session-impersonation-security.test.ts:51-77` verifies arbitrary client session updates cannot change acting user or role.
- `apps/web/tests/auth-session-impersonation-security.test.ts:79-142` verifies only server-signed impersonation/stop tokens change session identity.

### Provider-backed proposal -> contract -> signature/payment readiness gates

Status: PASS by source/test/build.

Evidence:
- `apps/web/src/lib/provider-backed-proposal.ts:19-42` requires listing context and `PROVIDER_PROPOSAL_SUBMITTED` activity evidence.
- `apps/web/src/app/api/proposals/[id]/approve/route.ts:89-97` blocks approval unless the proposal is `SENT` and provider-submitted evidence exists.
- `apps/web/tests/proposal-provider-handoff.test.tsx:117-169` verifies drafts, missing listing context, and missing provider evidence are blocked, while provider-backed SENT proposals can be accepted with acceptance recording.
- `apps/web/src/app/api/contracts/from-proposal/route.ts:77-122` requires accepted/converted proposal, listing context, and provider evidence before contract generation.
- `apps/web/tests/contract-from-provider-backed-proposal.test.ts:106-137` verifies contract generation blocks missing provider evidence and creates draft contracts only for accepted provider-backed proposals with buyer/seller IDs preserved.
- `apps/web/src/app/api/contracts/[id]/sign/route.ts:34-39` requires signer email to match authenticated user.
- `apps/web/src/app/api/contracts/[id]/sign/route.ts:89-100` limits signing to buyer-side event managers or seller-side org users.
- `apps/web/src/app/api/contracts/[id]/sign/route.ts:140-174` marks contracts partially or fully signed only from actual buyer/seller signatures.
- `apps/web/src/app/api/payments/create-intent/route.ts:76-102` limits payment intent creation to buyer-side users and locks payment until accepted provider-backed proposal plus payable signed contract state.
- `apps/web/src/app/api/payments/create-intent/route.ts:262-289` sets Stripe idempotency keys and `allow_redirects: "never"` with local metadata.
- `apps/web/src/lib/payments/confirm-payment.ts:42-63` checks Stripe metadata, amount, and currency against local intent.
- `apps/web/src/lib/payments/confirm-payment.ts:192-195` requires payment acceptance proof before confirmed local payment state.
- `apps/web/src/lib/payments/confirm-payment.ts:250-329` updates payment intent, milestone, escrow account, transaction, holdback, contract status, and activity inside the confirmation path.

### Role privacy

Status: PASS by source/test/build.

Evidence:
- `apps/web/tests/dashboard-core-routes.test.tsx:143-179` verifies admin message list/detail parity and non-admin thread isolation.
- Full vitest suite includes proposal/contract router access, event RBAC, event access/share/stakeholder security, and users-search role-security tests passing inside the 65-file/363-test run.
- Auth/session impersonation tests pass as above.

### Marketplace/profile/actionability, communication/task/milestone/crisis/admin surfaces

Status: PASS by source/test/build.

Evidence:
- Marketplace/provider actionability tests pass, including profile publish, authenticated event-attached marketplace navigation, listing trust copy, unauthorized event context stripping, booking request modal defaults, and persisted booking request path.
- `apps/web/tests/private-pilot-readiness-hardening.test.tsx:31-44` verifies legacy `/app/requests` redirects to `/requests` and authenticated marketplace nav avoids public auth CTAs.
- `apps/web/tests/private-pilot-readiness-hardening.test.tsx:46-92` verifies invite modal truthfully shows not-configured delivery and says no email was sent.
- `apps/web/tests/phase7-crisis-workflow.test.ts:75-116` verifies crisis issue creation can start replacement recovery while explicitly avoiding automatic refund, release, cancellation, or legal conclusion.
- Full vitest suite includes task/milestone and communication/accountability tests passing inside the 65-file/363-test run.

### Repo clean

Status: FAIL.

Evidence:
- `git status --short | wc -l` returned `53` before this packet was written.
- The dirty tree includes broad modified/untracked Phase 5-10 implementation files and reports. This can be an intentional release-candidate bundle, but it is not a clean repository state.

### Board clean

Status: PASS, excluding the running current task.

Evidence:
- Read-only query against `$HERMES_KANBAN_DB` returned `open_count=1`, and that one open item was this task.

## Residuals and risks

1. Release blocker: repository is not clean. Atlas must decide whether the broad dirty tree is the intended release batch, then have the correct owner commit it.
2. Verification gap: full authenticated branch Preview browser smoke is blocked by Vercel SSO/protected access and browser harness launch failure in this run. Canonical health is good, but canonical production does not prove the uncommitted branch bundle is deployed.
3. Non-blocking but real debt: `pnpm run lint` exits 0 but still reports 328 warnings.
4. Live money/legal/public launch remains explicitly unapproved. Current evidence supports guarded private-pilot readiness only.
5. Payment readiness is evidence-gated, but no live Stripe payment or payout was attempted or approved in this verification.

## Final score update

Previous score baseline from `reports/strategy/ONEHUB_BEAT_THE_MARKET_SCORECARD_2026-08-27.md`: 4.8 / 10.

Updated score after accepted Phase 1-10 work and this proof: 7.8 / 10.

Rationale: OneHub now has a credible verified private-pilot execution/trust MVP spine across marketplace, provider-backed proposals, contract gates, signature gates, guarded payment readiness, messaging/accountability, RSVP/guest, crisis/admin surfaces, and role privacy. It does not reach 8+ final private-pilot release because the repo is dirty and full authenticated branch Preview proof remains blocked/unperformed.

## Exact next founder/Atlas decision

Atlas recommended next action:

1. Treat this as a FAILED final release-safety handoff, not as a product failure.
2. Ask Atlas/Marlon to confirm whether the current 53-path dirty working tree is the intended Phase 11 release-candidate bundle.
3. If yes, route the appropriate implementation owner to commit the full intended bundle and produce a clean tree, then re-run Sentinel final proof on the committed SHA.
4. For authenticated Preview proof, provide an approved protected Preview session/bypass or deploy an approved unprotected private Preview target. Do not change public exposure without founder approval.

FOUNDER ESCALATION REQUIRED before any public launch claim, live Stripe/payment activation, production billing/credential change, public Preview/domain exposure change, legal approval claim, or live outbound email/SMS activation.
