# Steward Security, Money, Privacy, and Code Audit

Task: `t_d1709f94`
Date: 2026-09-02
Scope: read-only source audit of OneHub backend/security/money/privacy surfaces for Atlas full-readiness review.
Verdict: RISK

## Scope reviewed

High-risk backend and structural areas inspected:

- Auth/session/impersonation/RBAC: `apps/web/src/lib/auth.ts`, `apps/web/src/lib/auth-helpers.ts`, `apps/web/src/lib/rbac.ts`, `apps/web/src/middleware.ts`, admin role and impersonation routes.
- Prisma/data integrity: `apps/web/prisma/schema.prisma` with focus on users, orgs, events, guests, contracts, proposals, payments, refunds, disputes, holdbacks, Google tokens, audit logs.
- tRPC API routers: `apps/web/src/server/trpc.ts`, `apps/web/src/server/routers/*` with focus on `publicProcedure` exposures.
- REST API routes: payments, contracts, proposals, Google calendar, signup, admin, refund, users.
- Money flow: create/confirm/release/refund/dispute/holdback/admin override paths.
- Logs/token/privacy surfaces: pino redaction, Google OAuth persistence, public audit/membership/guest access.
- Seed/demo safety and rate-limit plumbing.

## Evidence examined

Representative files read directly with line numbers:

- `apps/web/src/server/trpc.ts`
- `apps/web/src/lib/auth.ts`
- `apps/web/src/lib/auth-helpers.ts`
- `apps/web/src/lib/rbac.ts`
- `apps/web/src/server/lib/access.ts`
- `apps/web/src/server/lib/rateLimit.ts`
- `apps/web/prisma/schema.prisma`
- `apps/web/src/server/routers/admin.ts`
- `apps/web/src/server/routers/audit.ts`
- `apps/web/src/server/routers/billing.ts`
- `apps/web/src/server/routers/bookingRequest.ts`
- `apps/web/src/server/routers/budget.ts`
- `apps/web/src/server/routers/calendar.ts`
- `apps/web/src/server/routers/checklist.ts`
- `apps/web/src/server/routers/contract.ts`
- `apps/web/src/server/routers/dispute.ts`
- `apps/web/src/server/routers/event.ts`
- `apps/web/src/server/routers/flags.ts`
- `apps/web/src/server/routers/guest.ts`
- `apps/web/src/server/routers/invite.ts`
- `apps/web/src/server/routers/listing.ts`
- `apps/web/src/server/routers/membership.ts`
- `apps/web/src/server/routers/notification.ts`
- `apps/web/src/server/routers/org.ts`
- `apps/web/src/server/routers/proposal.ts`
- `apps/web/src/server/routers/seating.ts`
- `apps/web/src/server/routers/settings.ts`
- `apps/web/src/server/routers/thread.ts`
- `apps/web/src/server/routers/message.ts`
- `apps/web/src/app/api/payments/create-intent/route.ts`
- `apps/web/src/app/api/payments/confirm/route.ts`
- `apps/web/src/app/api/payments/release-milestone/route.ts`
- `apps/web/src/app/api/payments/mark-milestone-complete/route.ts`
- `apps/web/src/app/api/stripe/webhook/route.ts`
- `apps/web/src/app/api/refund-requests/route.ts`
- `apps/web/src/app/api/contracts/from-proposal/route.ts`
- `apps/web/src/app/api/contracts/sign/route.ts`
- `apps/web/src/app/api/contracts/[id]/sign/route.ts`
- `apps/web/src/app/api/proposals/[id]/approve/route.ts`
- `apps/web/src/app/api/google/*`
- `apps/web/src/app/api/auth/signup/route.ts`
- `apps/web/src/app/api/admin/*`
- `scripts/seed-safety.ts`

## Correctness verdict

RISK.

The guarded money path has several strong controls and the full test/type/lint gates are green, but OneHub is not public/live-production safe from a backend privacy/security perspective. Multiple tRPC routers still expose private tenant data or mutate tenant objects behind `publicProcedure`, sometimes with no authentication and sometimes with only broad membership checks. The most serious live-readiness blockers are privacy/data exposure surfaces, not Stripe ledger arithmetic.

## P0 findings: must fix before public/live production

### P0-1: Audit logs are publicly readable through tRPC

Evidence:

- `apps/web/src/server/routers/audit.ts:3` imports only `publicProcedure`.
- `apps/web/src/server/routers/audit.ts:7` defines `list: publicProcedure...query`.
- `apps/web/src/server/routers/audit.ts:9` allows caller-supplied `orgId`, or no `orgId` at all.
- `apps/web/src/server/routers/audit.ts:10` reads `db.auditLog.findMany(...)`.
- `apps/web/src/server/routers/audit.ts:17` returns mapped logs.

Risk:

Any caller who can reach the tRPC surface can list audit records by org, and if no `orgId` is supplied the where clause is `{}`. Audit logs include actor IDs, org IDs, actions, targets, metadata, IP fields in the Prisma model, and sensitive operational history. This is a direct account/privacy and admin-operations exposure.

Narrow next action:

Convert `audit.list` to `protectedProcedure`, require platform/admin or org-admin access, and if `orgId` is omitted restrict to the caller's authorized org IDs rather than all logs.

### P0-2: Guest list PII is publicly readable by event ID

Evidence:

- `apps/web/src/server/routers/guest.ts:11` defines `list: publicProcedure`.
- `apps/web/src/server/routers/guest.ts:12` fetches event plus `guestLists.guests` including `group`, `seat`, and `invitations`.
- `apps/web/src/server/routers/guest.ts:15` returns `guestList.guests` without auth or event access check.
- Prisma guest data includes names, emails, phones, dietary details, notes, seating, and RSVP data at `apps/web/prisma/schema.prisma:1181-1202`.
- Invitation token/URL fields exist at `apps/web/prisma/schema.prisma:1204-1214`.

Risk:

A guessed or leaked event ID can expose attendee names, contact details, dietary notes, seating assignments, and invitation tokens. This is high-impact privacy exposure for weddings/events and can also compromise RSVP links.

Narrow next action:

Make guest list reads protected and require `canViewEvent` or event-manager access. Never include `invitations.token` or `invitationUrl` in general guest-list responses; expose RSVP tokens only to authorized sender workflows.

### P0-3: Checklist router allows unauthenticated reads and writes to event checklists

Evidence:

- `apps/web/src/server/routers/checklist.ts:6` `createFromTemplate` is `publicProcedure` and creates checklists for caller-provided `eventId`.
- `apps/web/src/server/routers/checklist.ts:15` `list` is `publicProcedure` and returns checklist items by `eventId`.
- `apps/web/src/server/routers/checklist.ts:16` `addItem` is `publicProcedure` and creates checklist items by `checklistId`.
- `apps/web/src/server/routers/checklist.ts:17` `toggleItem` is `publicProcedure` and mutates item completion by item ID.

Risk:

Unauthenticated callers can read operational plans and alter checklist state. For real events this can leak vendor/logistics data and corrupt execution state.

Narrow next action:

Move all checklist operations to `protectedProcedure`; require event read access for list and event manage access for create/add/toggle.

### P0-4: Membership roster exposes users for any org ID

Evidence:

- `apps/web/src/server/routers/membership.ts:9` defines `getMembers: publicProcedure`.
- `apps/web/src/server/routers/membership.ts:10` returns `db.membership.findMany({ where: { orgId }, include: { user: true, team: true } })`.

Risk:

This exposes organization rosters and full included user records for any org ID. Depending on Prisma default selection, `user: true` may include email, name, image, role, password hash field presence, timestamps, and relations if added later. It is a direct privacy and org-boundary issue.

Narrow next action:

Make `getMembers` protected, require org membership/admin access, and select only safe user fields needed by the UI.

### P0-5: Event list can enumerate private events for an org slug without auth

Evidence:

- `apps/web/src/server/routers/event.ts:62` defines `list: publicProcedure`.
- `apps/web/src/server/routers/event.ts:63` calls `getCurrentUser()` but does not require a user.
- `apps/web/src/server/routers/event.ts:68` initializes `where` to all events in the org.
- `apps/web/src/server/routers/event.ts:69-72` only narrows results when the user exists and is a planner.
- `apps/web/src/server/routers/event.ts:77-83` returns event rows.

Risk:

Unauthenticated callers with an org slug can enumerate event names, status, schedule fields, locations, budget fields, and IDs depending on Prisma row shape. That breaks tenant privacy and feeds later ID-based attacks against other public routers.

Narrow next action:

Make event listing protected. Require org membership/admin access, and preserve planner isolation using `createdById` or `canViewEvent` filtering.

## P1 findings: block private pilot hardening / live-money confidence until resolved

### P1-1: Many tenant routers use `publicProcedure` for authenticated-only mutations, creating inconsistent enforcement and review blind spots

Evidence:

- `apps/web/src/server/trpc.ts:8` makes `publicProcedure = t.procedure`; only `protectedProcedure` at `apps/web/src/server/trpc.ts:14-28` guarantees auth.
- `apps/web/src/server/routers/budget.ts:9`, `:18`, `:27`, `:36`, `:48` are `publicProcedure` for budget create/update/delete/list/summary, with manual auth checks inside.
- `apps/web/src/server/routers/event.ts:23`, `:85`, `:96`, `:132` are `publicProcedure` for event create/get/update/status, with manual checks inside.
- `apps/web/src/server/routers/invite.ts:17`, `:43`, `:55`, `:66` are `publicProcedure` for invite admin/member flows, with manual checks inside.
- `apps/web/src/server/routers/proposal.ts:34`, `:131`, `:210` are `publicProcedure` for create/accept/reject.
- `apps/web/src/server/routers/contract.ts:125`, `:182`, `:325`, `:389` are `publicProcedure` for signature/change-order operations.

Risk:

Some manual checks are sound, but the pattern already produced P0 exposures above. Backend safety is not structurally credible while private tenant actions are represented as public procedures and reviewed resolver-by-resolver.

Narrow next action:

Classify every tRPC resolver as public, authenticated, org-scoped, event-scoped, commercial-record-scoped, or platform-admin. Replace manual auth branches with helper-wrapped procedures or shared access functions.

### P1-2: Seating and guest mutations allow any org member, not event manager/editor, to modify sensitive event execution data

Evidence:

- `apps/web/src/server/routers/guest.ts:34-36` allows `createMany` when the caller is any member of the event org.
- `apps/web/src/server/routers/guest.ts:88-90` allows guest updates when the caller is any member of the event org.
- `apps/web/src/server/routers/guest.ts:99-101` allows guest deletion when the caller is any member of the event org.
- `apps/web/src/server/routers/seating.ts:25-27` allows seating-plan create/update by any org member.
- `apps/web/src/server/routers/seating.ts:47-49`, `:77-79`, `:101-103`, `:115-117`, `:135-137` repeat broad membership checks for table, assignment, and auto-assignment mutations.

Risk:

VIEWER/MEMBER users can alter guest lists, seating plans, and operational execution data. That is weaker than the event-specific model in `rbac.ts` and risks accidental or malicious operational corruption.

Narrow next action:

Use `requireEventManageAccess` or `canEditEvent` for write operations, and `canViewEvent` for reads. Treat guest list and seating as sensitive event data, not generic org data.

### P1-3: Legacy contract/proposal paths conflict with canonical guarded-money path

Evidence:

- Canonical contract generation sets `buyerId`/`sellerId` in `apps/web/src/app/api/contracts/from-proposal/route.ts:209-227`.
- Canonical payment intent creation requires `contract.buyerId` and `contract.sellerId`: `apps/web/src/app/api/payments/create-intent/route.ts:111-122` checks buyer-side authorization and `:143-150` requires seller/payee context.
- Legacy tRPC proposal acceptance creates a contract at `apps/web/src/server/routers/proposal.ts:177-184` with only `proposalId`, `orgId`, `eventId`, `title`, and `bodyMd`; it does not set `buyerId`, `sellerId`, or `platformFeePercent`.
- That same legacy path creates an escrow account at `apps/web/src/server/routers/proposal.ts:186-194` before canonical payment readiness.

Risk:

The legacy tRPC path can create structurally incomplete commercial records that cannot pass canonical money checks and can confuse UI/state. This is a live-readiness and data-integrity risk even if funds are not directly released.

Narrow next action:

Disable `proposal.accept` tRPC for guarded MVP or route it through the same canonical approval + contract generation code used by `/api/proposals/[id]/approve` and `/api/contracts/from-proposal`.

### P1-4: Legacy contract signing route can create signatures outside intended signer slots

Evidence:

- Safer route `apps/web/src/app/api/contracts/[id]/sign/route.ts:42-47` requires signer email to match the authenticated user, and `:114-150` updates an existing signature or creates one after party authorization.
- tRPC `contract.sign` at `apps/web/src/server/routers/contract.ts:233-240` explicitly requires the intended signature email to match the user.
- Legacy REST route `apps/web/src/app/api/contracts/sign/route.ts:81-99` authorizes any buyer-side org member or seller-side org member.
- `apps/web/src/app/api/contracts/sign/route.ts:101-144` creates a new signature when no existing signature for that user exists.
- This legacy route also does not record acceptance proof, unlike `apps/web/src/app/api/contracts/[id]/sign/route.ts:196-213`.

Risk:

A broad org member can add a signature record rather than being constrained to intended signer slots. That weakens legal/contract integrity and creates inconsistent proof trails.

Narrow next action:

Remove or hard-disable `/api/contracts/sign`; keep only `[id]/sign` or tRPC `contract.sign` after verifying intended signer and recording acceptance.

### P1-5: OAuth/calendar tokens are server-only but stored as plaintext database fields

Evidence:

- Auth callback avoids putting Google tokens into JWT/session and stores them server-side at `apps/web/src/lib/auth.ts:276-304`.
- Calendar callback also copies NextAuth account tokens into `CalendarAccount` at `apps/web/src/app/api/google/callback/route.ts:28-55`.
- Prisma stores NextAuth account tokens as nullable strings: `apps/web/prisma/schema.prisma:51-63`.
- Prisma stores calendar `accessToken` and `refreshToken` as nullable strings: `apps/web/prisma/schema.prisma:1097-1104`.

Risk:

The session/JWT protection is good, but DB compromise or overly broad DB read access exposes OAuth bearer/refresh tokens. Calendar scope includes read/write calendar access from `apps/web/src/lib/auth.ts:173-176`.

Narrow next action:

Encrypt OAuth token material at rest with an app-managed key/KMS before writing `Account`/`CalendarAccount`, or minimize stored scopes/tokens until encryption is approved. This involves security/credential handling; FOUNDER ESCALATION REQUIRED before production-key changes.

### P1-6: Rate limiter exists but is not wired into sensitive endpoints

Evidence:

- Rate limit helper exists at `apps/web/src/server/lib/rateLimit.ts:70-110`.
- It is disabled unless `RATE_LIMIT_ENABLED === "true"` at `apps/web/src/server/lib/rateLimit.ts:80-83`.
- Search found no usages of `withRateLimit` outside the helper itself.
- Sensitive unauth/auth endpoints include signup at `apps/web/src/app/api/auth/signup/route.ts:31-44`, user search at `apps/web/src/app/api/users/search/route.ts:14-24`, client invite at `apps/web/src/app/api/users/invite-client/route.ts:19-33`, and payment creation at `apps/web/src/app/api/payments/create-intent/route.ts:55-64`.

Risk:

Brute force, enumeration, spam signup, invite abuse, and expensive workflow endpoints are not structurally throttled in source. In-memory limiting would also be weak in serverless/multi-instance production.

Narrow next action:

Apply a shared Redis/edge-compatible limiter to signup, auth-adjacent, invite/search, public RSVP, abuse report, and payment intent endpoints. Do not rely on process memory for production.

### P1-7: Admin tRPC router uses `publicProcedure` for admin operations, although most resolvers manually call `requireAdmin`

Evidence:

- `apps/web/src/server/routers/admin.ts:3` imports `publicProcedure` only.
- `apps/web/src/server/routers/admin.ts:16-33` defines `requireAdmin`, including real-user checks under impersonation.
- Admin list/review/impersonation routes are still exposed as public procedures: examples at `admin.ts:37`, `:67`, `:76`, `:101`, `:133`, `:142`, `:159`, `:170`, `:207`, `:240`.

Risk:

Manual enforcement appears present in the inspected admin resolvers, but the router shape invites future omission and automated scans cannot distinguish intentionally public abuse reports from admin-only actions.

Narrow next action:

Create an `adminProcedure` or nested admin router middleware and keep only `abuse.report` public if intentionally public.

## P2 findings: correctness/readiness improvements

### P2-1: Middleware CSP is report-only and allows unsafe inline/eval

Evidence:

- `apps/web/src/middleware.ts:16-24` builds CSP with `script-src 'self' 'unsafe-inline' 'unsafe-eval'`.
- `apps/web/src/middleware.ts:25` sets `Content-Security-Policy-Report-Only`, not enforcing CSP.

Risk:

This does not block XSS payloads in production. It is acceptable for preview telemetry, not a production hardening posture.

Narrow next action:

Move toward enforceable CSP with nonces/hashes and remove `unsafe-eval` outside development.

### P2-2: Logger redaction is too narrow for current token fields

Evidence:

- `apps/web/src/lib/logger.ts:8-11` redacts only `req.headers.authorization`, `password`, `token`, and `access_token`.
- Code has `refreshToken`, `accessToken`, `id_token`, Google account/token fields, invitation `token`, and metadata-heavy audit paths across Prisma schema and routes.

Risk:

Structured logs can accidentally include camelCase token fields or nested token-bearing metadata not matched by current redaction paths.

Narrow next action:

Expand pino redaction paths/patterns to `*.token`, `*.accessToken`, `*.refreshToken`, `*.id_token`, `*.clientSecret`, `*.authorization`, and invitation URLs/tokens where logs can include payloads.

### P2-3: Public signup allows 6-character passwords and all non-admin roles

Evidence:

- Signup permits public role selection for DIY/PRO/VENDOR/VENUE/CLIENT/EVENT_DREAMER at `apps/web/src/app/api/auth/signup/route.ts:5-12`.
- Password minimum is only 6 characters at `apps/web/src/app/api/auth/signup/route.ts:42-44`.
- Hashing uses bcrypt cost 10 at `apps/web/src/app/api/auth/signup/route.ts:14-18`.

Risk:

No admin escalation is allowed, which is good, but weak password policy and open role self-selection are not production-credible for business/vendor/venue roles without verification/onboarding controls.

Narrow next action:

Raise password minimum and gate provider/business roles behind email verification or profile/onboarding review if public launch is planned.

### P2-4: Seed safety is present but demo credentials are still printed by seed script

Evidence:

- Safety guard requires DB URL, refuses production NODE_ENV, and rejects non-local DB unless explicitly allowed at `scripts/seed-safety.ts:23-41`.
- Seed script prints demo login email/password at `scripts/seed.ts:877-880`.

Risk:

Safety guard is good. Demo password output is acceptable for local/demo seed only, but it must never run against a public shared environment.

Narrow next action:

Keep `ALLOW_NON_LOCAL_SEED` restricted by process and ensure public deployments never seed demo users with known passwords.

## Already-green / sound evidence

- Auth secrets: production does not silently use the development secret. `apps/web/src/lib/auth.ts:33-44` and `:127-128` require `NEXTAUTH_SECRET`/`AUTH_SECRET` outside development.
- Founder admin bootstrap is scoped to a single email and app-level ADMIN only: `apps/web/src/lib/auth.ts:195-213`.
- Impersonation uses short-lived HMAC-signed transition tokens: `apps/web/src/lib/auth.ts:54-88`, with 60-second TTL at `:21` and transition validation at `:235-273`.
- Admin impersonation route requires guarded-MVP platform authority and break-glass reason/ticket: `apps/web/src/app/api/admin/impersonate/route.ts:28-46`, audit trail at `:63-77`.
- Public signup blocks ADMIN self-selection: `apps/web/src/app/api/auth/signup/route.ts:5-12`, `:25-29`, and checks invite token/email match at `:52-71`.
- Invite acceptance is transactional and single-use: `apps/web/src/app/api/auth/signup/route.ts:77-111`; tRPC invite acceptance similarly checks token/email/expiry and uses transaction/updateMany at `apps/web/src/server/routers/invite.ts:66-94`.
- Canonical payment creation derives payable amount server-side: `apps/web/src/app/api/payments/create-intent/route.ts:167-195`, rejects client amount mismatch at `:191-193`, requires signed/provider-backed records at `:124-141`, and uses Stripe metadata binding at `:309-330`.
- Payment confirmation checks payer ownership and Stripe/local metadata/amount matching: `apps/web/src/app/api/payments/confirm/route.ts:62-85`; `apps/web/src/lib/payments/confirm-payment.ts:183-190`.
- Stripe webhook verifies signature and idempotently reserves webhook events: `apps/web/src/app/api/stripe/webhook/route.ts:82-100`, `:107-113`, `:127-135`.
- Milestone release is platform-admin-only, blocks open refunds/disputes/holdbacks, requires Stripe Connect recipient and transfer evidence before final paid state: `apps/web/src/app/api/payments/release-milestone/route.ts:128-160`, `:241-251`, `:372-407`, `:410-463`.
- Refund approval requires guarded-MVP platform admin, captured charge, escrow balance reservation, Stripe refund idempotency, and audit/admin override records: `apps/web/src/lib/refund-request.ts:359-370`, `:161-204`, `:220-356`, `:434-473`.
- Thread/message routers use protected procedures plus shared access helpers: `apps/web/src/server/routers/thread.ts:172-287`, `apps/web/src/server/routers/message.ts:7-57`, `apps/web/src/server/lib/access.ts:187-215`.

## Validation commands/results

All commands were run read-only from `/root/.hermes/workspaces/onehub/repo`.

1. `git status --short && git branch --show-current && git ls-files | wc -l`
   - Result: branch `atlas/slice7-canonical-deploy`; repo had existing untracked `docs/full-readiness/`; tracked file count `764`.

2. `pnpm run typecheck`
   - Result: passed, exit 0.

3. `pnpm exec vitest run --config apps/web/vitest.config.ts apps/web/tests/security-main-blockers.test.ts apps/web/tests/contract-router-access.test.ts apps/web/tests/payment-intent-lifecycle.test.ts apps/web/tests/payment-release-guardrails.test.ts apps/web/tests/payment-refund-review-effects.test.ts apps/web/tests/google-token-protection.test.ts apps/web/tests/invite-router-protection.test.ts apps/web/tests/seed-safety.test.ts`
   - Result: passed, 8 files / 69 tests.

4. `pnpm run lint`
   - Result: passed with warnings, exit 0. ESLint reported 331 warnings and 0 errors.

5. `pnpm run test`
   - Result: passed, 86 files / 455 tests, duration 248.71s.

Not run: production build. This Steward lane is read-only backend/security audit; Sentinel validation lane owns final build/gate bundle. Running `pnpm run build` would also run Prisma generate and is not needed to prove these backend findings.

## Final launch-readiness judgment for Atlas

- Public/live-production readiness: BLOCKED by P0 tenant privacy and unauthenticated/private-data surfaces.
- Private pilot readiness: PARTIAL. Money guardrails are materially improved, but private pilot should still be protected/limited until P0 routers are closed and legacy commercial paths are disabled.
- Live payments: PARTIAL/RISK. Canonical money path is strong in source and tests pass, but legacy proposal/contract paths can create inconsistent commercial records; public/private data leaks would undermine account and operational trust.
- Account/privacy safety: RISK due to public audit, guest, membership, checklist, and event-list exposures.

## Recommended next action for Atlas

Route a narrow Forge backend hardening slice before any public or live-money launch:

1. Close P0 tRPC exposures: `audit`, `guest.list`, `checklist`, `membership.getMembers`, `event.list`.
2. Convert high-risk manual-auth public procedures to protected/scoped procedures.
3. Disable legacy commercial paths: tRPC `proposal.accept` contract creation and `/api/contracts/sign`.
4. Add production-suitable rate limiting for signup, invites/search, RSVP, abuse reports, and payment endpoints.
5. Decide token-at-rest encryption approach for Google/NextAuth tokens. FOUNDER ESCALATION REQUIRED for production key/KMS/credential changes.
