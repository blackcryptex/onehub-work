# OneHub Full Backend Audit

Date: 2026-06-12
Repo: `/root/.hermes/workspaces/onehub/repo`
Branch: `cleanup/accelerated`
Commit reviewed: `31f9792a75f7664431ab6319272917fbdbd9601a`
Mode: read-only audit; only this report file was written.

## Scope reviewed

1. API route inventory under `apps/web/src/app/api/**/route.ts`.
2. Server routers under `apps/web/src/server/routers/*.ts` and auth primitive in `apps/web/src/server/trpc.ts`.
3. Auth/permission matrix and IDOR risks for contracts, proposals, payments, bookings, notifications, and messages.
4. Prisma transaction/data-integrity risks, especially multi-write and money-related flows.
5. Security hygiene: tracked-file secret pattern scan without reporting secret values, security headers, Zod/input validation on mutating routes.
6. Dependency audit with `pnpm audit --prod`.
7. Error handling: swallowed errors, raw error leakage, stack/PII logging.

## Executive verdict

Verdict: RISK

Backend is not structurally safe for production credibility yet. The highest risk is not in the Next.js API routes; it is in the tRPC/server router layer, where many sensitive procedures are `publicProcedure` and several have no resolver-level auth or object ownership checks. Messaging, threads, booking request org listing, audit/activity logs, tasks, checklists, milestones, and guest list reads expose cross-user/cross-tenant IDOR surfaces.

## Severity scale

- P0: production-blocking exposure or unauthorized write/read of sensitive tenant/user data.
- P1: high-risk security, data-integrity, or money-flow flaw that should be fixed before real users/payments.
- P2: defense-in-depth, hygiene, incomplete validation, operational exposure, or lower-risk hardening.

## P0/P1 findings

### P0-1: Threads and messages are public/IDOR-prone

Impact: arbitrary message injection and cross-tenant private conversation disclosure.

Evidence:
- `apps/web/src/server/routers/thread.ts:3` imports `publicProcedure` only.
- `apps/web/src/server/routers/thread.ts:6-23` `thread.create` accepts caller-supplied `orgId`, `eventId`, `proposalId`, `listingId`, and `participants`; creates a thread with no auth or membership check.
- `apps/web/src/server/routers/thread.ts:25-29` `thread.listByContext` returns threads for caller-supplied context IDs with no auth.
- `apps/web/src/server/routers/thread.ts:30-31` `thread.get` returns a thread, participants, and messages by `threadId` with no auth.
- `apps/web/src/server/routers/message.ts:7-21` `message.send` is `publicProcedure`; it calls `auth()` but does not require a session, then creates a message using `senderId: userId ?? undefined`.

Required fix:
- Convert thread/message procedures to protected procedures.
- Enforce participant, event membership, proposal party, listing owner, or org membership authorization before read/write.
- Reject unauthenticated sends; never permit anonymous `senderId` on private threads.

### P0-2: Booking request org listing leaks booking/contact data by org slug

Impact: unauthorized user can enumerate booking requests and associated contact information for any known organization slug.

Evidence:
- `apps/web/src/server/routers/bookingRequest.ts:20-31` booking request creation stores `contactName`, `contactEmail`, and `contactPhone`.
- `apps/web/src/server/routers/bookingRequest.ts:50-53` `listForOrg` takes only `orgSlug`, looks up the org, and returns `db.bookingRequest.findMany({ where: { orgId: org.id }, include: { listing: true, event: true } })` with no auth or org membership check.

Required fix:
- Require authenticated user.
- Enforce org owner/admin/member policy explicitly before returning booking requests.
- Consider limiting returned contact fields to roles that need them.

### P0-3: Planning data routers expose unauthenticated read/write/delete surfaces

Impact: unauthenticated or unauthorized caller can read, create, mutate, or delete event planning state by guessed IDs.

Evidence:
- Tasks: `apps/web/src/server/routers/task.ts:6-9` exposes `create`, `update`, `delete`, and `listByEvent` as `publicProcedure` with no auth/permission checks.
- Checklists: `apps/web/src/server/routers/checklist.ts:6-17` exposes `createFromTemplate`, `list`, `addItem`, and `toggleItem` as `publicProcedure` with no auth/permission checks.
- Milestones: `apps/web/src/server/routers/milestone.ts:19-33` exposes `update`, `delete`, `list`, and `bulkGenerate` as `publicProcedure` with no auth/permission checks. `create` only requires a session at `milestone.ts:11-13`, but does not check membership on the target event.

Required fix:
- Require authentication on all planning-data writes and private reads.
- Enforce `canViewEvent`/`canManageEvent` or equivalent event/org membership on every caller-supplied event/task/checklist/milestone ID.

### P0-4: Guest list read is public and exposes PII

Impact: guest names, emails, phones, groups, seats, and invitations are readable by event ID without auth.

Evidence:
- `apps/web/src/server/routers/guest.ts:9-13` `guest.list` is `publicProcedure` and returns `event.guestLists.guests` including `group`, `seat`, and `invitations` without auth.
- Mutation procedures in the same router do require auth/membership in several paths, proving this list endpoint is inconsistent with intended privacy.

Required fix:
- Require authenticated user.
- Enforce event/org membership or explicit guest-management permission before returning guest lists.
- Trim returned PII fields by role.

### P1-1: Public audit/activity log reads leak tenant operational data

Impact: operational timelines and masked payment-related activity are accessible cross-tenant.

Evidence:
- `apps/web/src/server/routers/audit.ts:7-17` `audit.list` accepts optional `orgId` and returns audit logs using `publicProcedure` with no auth.
- `apps/web/src/server/routers/activity.ts:8-20` `activity.list` accepts `orgSlug`/`eventId` and returns activity feed items using `publicProcedure` with no auth.

Required fix:
- Require auth and org membership/admin before returning logs.
- Consider admin-only access for audit logs.

### P1-2: Proposal financial totals are public by proposal ID

Impact: anyone with a proposal ID can read financial totals.

Evidence:
- `apps/web/src/server/routers/proposal.ts:76-82` `calculateTotals` is `publicProcedure`, loads a proposal by ID with line items, and returns `subtotalCents`, `taxCents`, and `totalCents` without auth or event/listing access check.

Required fix:
- Require auth and enforce proposal access by event planner/client, vendor/listing owner, contract party, or admin.

### P1-3: AI source-vendors API exposes event metadata without auth

Impact: caller can submit arbitrary `eventId` and learn event existence/name plus related vendor/listing/org result data.

Evidence:
- `apps/web/src/app/api/ai/source-vendors-venues/route.ts:85-99` `POST` reads and validates body without auth/session check.
- `apps/web/src/app/api/ai/source-vendors-venues/route.ts:101-117` loads event by supplied `eventId` and returns a distinct `Event not found` signal.
- `apps/web/src/app/api/ai/source-vendors-venues/route.ts:133-156` reads listings and org names.
- `apps/web/src/app/api/ai/source-vendors-venues/route.ts:231-237` returns event `id`, event `name`, and results.

Required fix:
- Require authenticated user and `canViewEvent` before reading event details.
- If intentionally public, remove event existence oracle and do not return private event metadata.

### P1-4: Availability slot release/book is authenticated but not object-authorized

Impact: any authenticated user can release or book any slot by `slotId` if they know/guess it.

Evidence:
- `apps/web/src/server/trpc.ts:14-27` `protectedProcedure` only requires authentication and adds `ctx.user`; it does not enforce object ownership.
- `apps/web/src/server/routers/availability.ts:24` `releaseSlot` updates by `slotId` with only `protectedProcedure`.
- `apps/web/src/server/routers/availability.ts:26` `markBooked` updates by `slotId` with only `protectedProcedure`.

Required fix:
- Load the slot with listing/org relationship and enforce listing owner/admin or booking-authorized role before update.

### P1-5: Dependency audit has critical/high production vulnerabilities

Command run:

```text
pnpm audit --prod
```

Result: exit code `1`; 35 vulnerabilities found.

Summary:
- 1 critical
- 11 high
- 18 moderate
- 5 low

Evidence:
- `apps/web/package.json:33` pins `next` to `14.2.6`.
- `apps/web/package.json:29` has `@trpc/server` `^10.45.2`.
- Audit reported critical Next.js middleware authorization bypass patched in `>=14.2.25`.
- Audit reported additional high Next.js advisories, high `@trpc/server` prototype pollution patched in `>=10.45.3`, and high `jws@4.0.0` via Google auth dependency.

Required fix:
- Upgrade Next.js to a patched version satisfying the current advisory floor.
- Upgrade `@trpc/server` to `>=10.45.3` or the project-compatible latest patch.
- Re-run `pnpm audit --prod` until critical/high are cleared or explicitly risk-accepted by Atlas/Marlon.

### P1-6: Payment intent creation performs dependent DB writes without a transaction

Impact: partial local payment/acceptance/escrow state if Stripe call or later DB update fails.

Evidence:
- `apps/web/src/app/api/payments/create-intent/route.ts:171-180` creates local escrow account.
- `apps/web/src/app/api/payments/create-intent/route.ts:220-223` cancels existing local payment intent.
- `apps/web/src/app/api/payments/create-intent/route.ts:226-236` creates new local payment intent.
- `apps/web/src/app/api/payments/create-intent/route.ts:238-262` creates acceptance record.
- `apps/web/src/app/api/payments/create-intent/route.ts:268-292` creates Stripe PaymentIntent.
- `apps/web/src/app/api/payments/create-intent/route.ts:294-300` updates local payment intent with Stripe ID.
- `apps/web/src/app/api/payments/create-intent/route.ts:302-306` updates escrow account.

Required fix:
- Split into an idempotent local transaction around local records and a clear post-Stripe reconciliation step.
- Add recovery/retry path for local record without Stripe ID and Stripe intent without fully updated local state.

### P1-7: Milestone release performs external Stripe transfer inside DB transaction

Impact: local DB rollback after successful Stripe transfer can diverge from external money movement; DB locks may be held during network call.

Evidence:
- `apps/web/src/app/api/payments/release-milestone/route.ts:256-257` starts `db.$transaction`.
- `apps/web/src/app/api/payments/release-milestone/route.ts:292-321` performs Stripe transfer inside that transaction.
- `apps/web/src/app/api/payments/release-milestone/route.ts:325-410` then writes payout, milestone, escrow, and money transaction state.

Required fix:
- Use a durable state machine/outbox pattern: mark release pending in DB transaction, perform Stripe transfer outside the DB transaction with idempotency key, then finalize local state in a second transaction.

### P1-8: Payment plan/deposit auto-builders use multi-write loops without transactions

Impact: partial payout/deposit plan state if one loop iteration fails.

Evidence:
- `apps/web/src/app/api/payments/plan/from-accepted-proposals/route.ts:70-123` loops proposals and writes payouts; `setLocked` happens separately at `115-122`.
- `apps/web/src/app/api/payments/deposits/auto/route.ts:111-167` loops auto deposit creation/update without a wrapping transaction.
- `apps/web/src/app/api/payments/auto-build/route.ts:67-91` creates payouts in a loop without a wrapping transaction.

Required fix:
- Use `db.$transaction` for all-or-nothing plan mutations, or make builders idempotent and return a repairable partial-state marker.

## P2 findings

### P2-1: Public auth error page reflects unsanitized query params into HTML

Impact: reflected XSS risk on a public endpoint.

Evidence:
- `apps/web/src/app/api/auth/error/route.ts:4-6` reads `error` and `error_description` from query params.
- `apps/web/src/app/api/auth/error/route.ts:79` injects `errorDescription` into an HTML template without escaping.
- `apps/web/src/app/api/auth/error/route.ts:81` injects `error` into HTML without escaping.
- `apps/web/src/app/api/auth/error/route.ts:96-100` returns `Content-Type: text/html`.

Required fix:
- Escape HTML entities for all query-derived output or render this through a safe React page.

### P2-2: Security headers exist but are not production-hard enough

Evidence:
- `apps/web/src/middleware.ts:18-33` sets security headers.
- `apps/web/src/middleware.ts:32` sets `Content-Security-Policy-Report-Only`, not enforcing `Content-Security-Policy`.
- `apps/web/src/middleware.ts:25-26` allows `script-src 'unsafe-inline' 'unsafe-eval'` and `style-src 'unsafe-inline'`.
- No `Strict-Transport-Security`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, or `Cross-Origin-Resource-Policy` header was found in the reviewed middleware.
- `apps/web/src/middleware.ts:71-75` applies headers to `/api/` responses.

Required fix:
- Add HSTS for production HTTPS.
- Move CSP from report-only to enforce after fixing inline/eval needs.
- Add Permissions-Policy and cross-origin isolation/resource headers as appropriate.

### P2-3: Mutating route input validation is inconsistent

Good examples using Zod:
- `apps/web/src/app/api/events/create/route.ts:15-33`
- `apps/web/src/app/api/payments/create-intent/route.ts:13-18`
- `apps/web/src/app/api/payments/release-milestone/route.ts:22-26`
- `apps/web/src/app/api/providers/profile/route.ts:6-41`
- `apps/web/src/app/api/refund-requests/route.ts:7-27`
- `apps/web/src/app/api/proposals/[id]/route.ts:7-34`

Mutating routes observed with direct `request.json()` and manual/no schema validation:
- `apps/web/src/app/api/auth/signup/route.ts:14-27`
- `apps/web/src/app/api/orgs/create/route.ts:14-27`
- `apps/web/src/app/api/contracts/from-proposal/route.ts:27-35`
- `apps/web/src/app/api/payments/lines/route.ts:23-31`
- `apps/web/src/app/api/payments/lines/[id]/route.ts:30-31`
- `apps/web/src/app/api/payments/auto-build/route.ts:23-31`
- `apps/web/src/app/api/payments/deposits/auto/route.ts:23-31`
- `apps/web/src/app/api/payments/plan/from-accepted-proposals/route.ts:24-31`
- `apps/web/src/app/api/proposals/generate/route.ts:27-29`

Required fix:
- Add Zod schemas to every mutating route.
- Enforce typed parse before authorization-sensitive DB reads/writes where possible.

### P2-4: Raw internal error messages leak to clients in some API routes

Impact: Prisma/Stripe/provider messages can reveal internal implementation details or PII.

Evidence:
- `apps/web/src/app/api/payments/lines/route.ts:88-92`
- `apps/web/src/app/api/payments/deposits/auto/route.ts:183-189`
- `apps/web/src/app/api/payments/auto-build/route.ts:98-104`
- `apps/web/src/app/api/payments/plan/from-accepted-proposals/route.ts:131-137`
- `apps/web/src/app/api/proposals/[id]/route.ts:141-144`
- `apps/web/src/app/api/proposals/generate/route.ts:246-248`
- `apps/web/src/app/api/contracts/from-proposal/route.ts:235-239`
- `apps/web/src/app/api/orgs/create/route.ts:61-65`

Required fix:
- Return generic client errors for 5xx.
- Log detailed errors through a redacted logger/error tracker only.

### P2-5: Stack traces and PII/tenant context appear in logs

Evidence:
- `apps/web/src/app/api/events/create/route.ts:562-577` logs `stack` and includes validated event name/type/budget raw text.
- `apps/web/src/app/api/payments/release-milestone/route.ts:516-527` logs `stack`.
- `apps/web/src/app/api/proposals/generate/route.ts:241-244` logs stack/message.
- `apps/web/src/app/api/events/create/route.ts:548-558` logs event name and budget on success.
- `apps/web/src/app/api/shortlist/add/route.ts:61-63` and `75-76` log user/event/listing context on forbidden/not-found paths.
- `apps/web/src/lib/errorTracker.ts:33-39` and `67-76` have redaction, but direct `console.error`/`logger.error` paths bypass some redaction.

Required fix:
- Standardize on redacted structured error reporting.
- Avoid stack traces and event names/budget/contact data in production logs unless gated and redacted.

### P2-6: Some child-write failures are swallowed, creating partial-state risk

Evidence:
- `apps/web/src/app/api/payments/create-intent/route.ts:216-218` ignores Stripe PaymentIntent cancellation failure.
- `apps/web/src/app/api/events/create/route.ts:360-365` and `380-385` swallow stakeholder/share creation errors while continuing event creation.
- `apps/web/src/app/api/events/create/route.ts:396-399` swallows client-linking failure.
- `apps/web/src/app/api/events/create/route.ts:586-601` swallows audit logging failure after event creation failure.
- `apps/web/src/app/api/stripe/webhook/route.ts:30-56` catches all webhook-claim create errors and treats them as an existing claim path without verifying error type.

Required fix:
- Decide which child writes are required vs optional.
- Required child writes should be in a transaction or fail the parent mutation.
- Optional failures should emit redacted operational events and return explicit partial status where relevant.

### P2-7: Demo preflight exposes operational readiness signals publicly

Impact: unauthenticated environment reconnaissance.

Evidence:
- `apps/web/src/app/api/demo/preflight/route.ts:6-10` explicitly states no auth and exports `GET`.
- `apps/web/src/app/api/demo/preflight/route.ts:45-53` returns demo mode, seed status, verified listing count, and AI key/fallback availability booleans.

Required fix:
- Restrict to admin/demo operator or remove environment readiness details in non-local deployments.

## Auth/permission matrix by focus area

| Area | Verdict | Evidence | Risk |
|---|---|---|---|
| Contracts | Mostly sound | `contract.get` and `render` use `protectedProcedure` and `assertCanAccessContract` (`apps/web/src/server/routers/contract.ts:18-79`, `85-120`). `sendForSignature`, `addChangeOrder`, and `approveChangeOrder` perform auth/permission checks (`145-184`, `229-263`, `293-347`). | Policy review needed: `approveChangeOrder` allows buyer/seller org membership, not necessarily owner/admin (`328-339`). |
| Proposals | Partial | `create` requires session and event org membership (`proposal.ts:40-45`); `send` uses `protectedProcedure` and `canSendProposal` (`86-105`); `reject` checks `canManageEvent` (`128-155`). | `calculateTotals` is public IDOR (`76-82`). `create` accepts optional `listingId` without validating listing relationship/ownership (`31-52`). |
| Payments/Billing | Partial | API payment endpoints mostly require auth/role/object authorization; billing connect and escrow procedures use `protectedProcedure` plus owner/admin/canManage checks (`billing.ts:16-27`, `57-69`, `94-116`). | Transaction/external-call integrity risks; `refundMilestone` is publicProcedure with manual auth and optional amount needs cap verification (`billing.ts:159-199`). |
| Bookings | Risk | `create`, `listForListing`, `setStatus`, `quote` have auth/org checks (`bookingRequest.ts:11-48`, `55-73`). | `listForOrg` is public and leaks booking/contact data (`50-53`). |
| Notifications | Sound in reviewed paths | `listMy` returns only current user's notifications or `[]` unauthenticated (`notification.ts:11-15`); `markRead` uses `updateMany` with `id + userId` (`17-26`). | No immediate IDOR found in notifications. |
| Messages/Threads | P0 Risk | `thread.ts:6-31`; `message.ts:7-21`. | Public thread create/read and unauthenticated message send. |

## API route inventory

Classification is based on server-side enforcement found in route handlers, not middleware-only. `role` means authenticated plus role/membership/authority check. `public-disabled` means no sensitive mutation because handler returns disabled/410.

| Route | Methods | Classification | Server-side enforcement verdict |
|---|---:|---|---|
| `/api/acceptance` | GET | admin | Enforced: `getCurrentUser` + ADMIN. |
| `/api/admin/holdbacks` | GET, POST | admin/role | Enforced: `canManageHoldbacks`. |
| `/api/admin/holdbacks/verification` | GET | admin/role | Enforced: `canManageHoldbacks`. |
| `/api/admin/impersonate` | POST | admin | Enforced: `auth()` + PLATFORM_ADMIN authority. |
| `/api/admin/override-history` | GET | admin | Enforced: current user ADMIN. |
| `/api/admin/stop-impersonate` | POST | admin | Enforced: real user ADMIN + active impersonation check. |
| `/api/ai/source-vendors-venues` | POST | should be authenticated/role | RISK: no auth; reads event/listings. See P1-3. |
| `/api/auth/[...nextauth]` | GET, POST | auth framework | Delegated to NextAuth handlers. |
| `/api/auth/error` | GET | public | RISK: reflected HTML query params. See P2-1. |
| `/api/auth/signup` | POST | public | Public signup; role validated manually. |
| `/api/bookings/request` | POST | authenticated/role | Enforced: current user + event/org/listing checks. |
| `/api/bookings/respond` | POST | authenticated/role | Enforced: provider/org membership checks. |
| `/api/contracts/[id]` | PATCH | authenticated/role | Enforced: current user + ownership/permission check. |
| `/api/contracts/[id]/sign` | POST | authenticated/contract party | Enforced: signer identity/contract party checks. |
| `/api/contracts/from-proposal` | POST | authenticated/role | Enforced: auth/current user + proposal/event authorization. |
| `/api/contracts/sign` | POST | public-disabled | Disabled, returns 410. |
| `/api/demo/milestones/[id]/fund` | POST | authenticated/demo role | Enforced: demo gate + current user + permission. |
| `/api/demo/milestones/[id]/release` | POST | public-disabled | Disabled, returns 410. |
| `/api/demo/payouts/[id]/release` | POST | public-disabled | Disabled, returns 410. |
| `/api/demo/preflight` | GET | public | P2 operational exposure. |
| `/api/diy/events` | GET | authenticated/role | Enforced: auth + blocks CLIENT role. |
| `/api/dreams/create` | POST | authenticated | Enforced: `auth()`. |
| `/api/events/[eventSlug]/deposits` | POST, GET | authenticated/role | Enforced: current user + CLIENT/membership checks. |
| `/api/events/[eventSlug]` | GET, DELETE | authenticated/role for DELETE | DELETE has membership/role checks; GET reviewed as route-level handler with auth/user checks. |
| `/api/events/[eventSlug]/share` | POST, DELETE | authenticated/role | Enforced: user + role/membership. |
| `/api/events/[eventSlug]/stakeholders` | POST, DELETE | authenticated/role | Enforced: user + role/membership. |
| `/api/events/create` | POST | authenticated/role | Enforced: auth/current user + blocks CLIENT. |
| `/api/google/calendar/create-or-use` | POST | authenticated | Enforced: `auth()`. |
| `/api/google/callback` | GET | authenticated/oauth | Enforced: `auth()`. |
| `/api/google/connect` | POST, GET | authenticated | Enforced: `auth()`. |
| `/api/google/events/overlay` | GET | authenticated | Enforced: `auth()`. |
| `/api/google/status` | GET | authenticated | Enforced: `auth()`. |
| `/api/google/sync/push` | POST | authenticated | Enforced: `auth()`; note this may not match real webhook push semantics. |
| `/api/health` | GET | public | Intentional minimal public health. |
| `/api/invites/vendor` | POST | authenticated | Enforced: current user. |
| `/api/notifications/[id]/read` | POST | authenticated/owner | Enforced: current user; should verify update includes userId in implementation. |
| `/api/notifications` | GET | authenticated/owner | Enforced: current user. |
| `/api/orgs/create` | POST | authenticated | Enforced: `auth()`. |
| `/api/payments/auto-build` | POST | role | Enforced: PRO_PLANNER + event permission. |
| `/api/payments/confirm` | POST | authenticated/owner | Enforced: auth + ownership/authorization. |
| `/api/payments/create-intent` | POST | authenticated/role | Enforced: auth + buyer-side authorization. Integrity risk P1-6. |
| `/api/payments/deposits/auto` | POST | role | Enforced: PRO_PLANNER + event permission. Integrity risk P1-8. |
| `/api/payments/lines/[id]` | PATCH, DELETE | role | Enforced: PRO_PLANNER + event permission. |
| `/api/payments/lines` | POST | role | Enforced: PRO_PLANNER + event permission. |
| `/api/payments/mark-milestone-complete` | POST | authenticated/party | Enforced: seller/planner authorization. |
| `/api/payments/mark-milestone-paid-demo` | POST | public-disabled | Disabled, returns 410. |
| `/api/payments/plan/from-accepted-proposals` | POST | role | Enforced: PRO_PLANNER + event permission. Integrity risk P1-8. |
| `/api/payments/receipts/[id]` | GET | authenticated | Enforced: current user; receipt status checks. |
| `/api/payments/release-milestone` | POST | admin/authority | Enforced: guarded PLATFORM_ADMIN authority. Integrity risk P1-7. |
| `/api/proposals/[id]/approve` | POST | authenticated/role | Enforced: current user + event/proposal authorization. |
| `/api/proposals/[id]` | PATCH, DELETE | authenticated/role | Enforced: owner/permission checks. |
| `/api/proposals/generate` | POST | authenticated/role | Enforced: current user + event/listing checks. |
| `/api/providers/profile` | POST | public draft / authenticated publish | Draft path public echo only; publish requires auth. |
| `/api/refund-requests` | POST | authenticated/role | Enforced: current user + event membership/admin. |
| `/api/shortlist/add` | POST | authenticated/role | Enforced: current user + event management check. |
| `/api/shortlist` | GET, POST | authenticated/role | Enforced by shared auth/membership helper. |
| `/api/stripe/webhook` | POST | webhook | Enforced: Stripe signature + webhook secret. |
| `/api/users/invite-client` | POST | role | Enforced: planner/admin. |
| `/api/users/search` | GET | role | Enforced: planner/admin. |
| `/api/vendor-venue/check-profile` | GET | authenticated-ish | Calls auth; unauth returns false booleans. |
| `/api/vendors/search` | GET | public | Public catalog search, Zod query validation. |
| `/api/vendors/search-external` | GET | public | Public mock external search. |

## Server router inventory and auth classification

Important structural finding: `apps/web/src/server/trpc.ts:14-27` defines `protectedProcedure` as authentication-only. Object/tenant authorization must still be done in each resolver.

The router layer has 135 detected procedures; only 14 are `protectedProcedure`. Many `publicProcedure` resolvers manually call `auth()`/`getCurrentUser()`, but several do not. The table below classifies the server router surface at router/procedure granularity.

| Router | Procedures | Classification / enforcement verdict |
|---|---|---|
| `activity.ts` | `list` | P1 RISK: public activity feed by org/event (`activity.ts:8-20`). |
| `admin.ts` | `metrics.daily`, `abuse.report`, `abuse.update`, `abuse.list`, `bookingClassification.getProposalContext`, `refundRequests.list/review/getVerification`, `users.list`, `impersonation.start/stop` | Mostly role/admin enforced manually through `requireAdmin`; abuse report appears intentionally public. |
| `ai.ts` | `suggestChecklist`, `suggestVendors`, `draftMessage` | Public AI helper procedures; should be reviewed for tenant/event context before production use. |
| `audit.ts` | `list` | P1 RISK: public audit log read (`audit.ts:7-17`). |
| `availability.ts` | `setSlots`, `holdSlot`, `releaseSlot`, `markBooked`, `list` | `setSlots` checks listing edit permission; `releaseSlot`/`markBooked` are authenticated-only but not object-authorized; `holdSlot`/`list` public. |
| `billing.ts` | `connectOnboard`, `connectStatus`, `escrowCreatePaymentIntent`, `escrowReleaseMilestone`, `refundMilestone` | Connect/escrow protected and role checked; release disabled; refund manually requires user/canManageEvent but amount cap needs verification. |
| `bookingRequest.ts` | `create`, `listForListing`, `listForOrg`, `setStatus`, `quote` | P0 RISK on `listForOrg`; others have auth/org checks. |
| `budget.ts` | `create`, `update`, `delete`, `list` | Manual auth + `canViewBudget`/`canEditBudget` checks observed. |
| `calendar.ts` | `list`, `create`, `update`, `delete`, sync helpers | `list` is public by org/event; writes check membership. |
| `checklist.ts` | `createFromTemplate`, `list`, `addItem`, `toggleItem` | P0 RISK: no auth/authorization. |
| `contract.ts` | `get`, `render`, `sendForSignature`, `sign`, `addChangeOrder`, `approveChangeOrder` | Mostly sound; protected get/render; access helper; sign disabled; change orders check event/party. Policy review for any-member approval. |
| `dispute.ts` | `create`, `list`, `adminReview`, `getForVerification` | Protected procedures with scoped checks; admin review requires admin. |
| `event.ts` | `create`, `list`, `getBySlug`, `update`, `setStatus` | Mutations manually auth/check; `list` can expose org events unauthenticated depending input; `getBySlug` likely public/tenant visibility needs product decision. |
| `flags.ts` | `listFlags`, `setFlag`, `setUserFlag`, `setOrgFlag`, `resolveFlags` | Reads public; mutations require admin manually. |
| `guest.ts` | `list`, `createMany`, `update`, `remove`, `invite`, `rsvp` | P0 RISK on public `list`; mutations generally require auth/membership; RSVP may be intentionally tokenized/public. |
| `invite.ts` | `createInvite`, `getInvites`, `revokeInvite`, `addMemberByInvite` | `getInvites` public by orgId; metadata exposure. Mutations have manual checks/token flow. |
| `listing.ts` | create/update/read/tag/media procedures | Public marketplace reads appear intentional; mutations check ownership/admin. |
| `membership.ts` | `getMembers`, `removeMember`, `setMemberRole` | `getMembers` public by orgId; metadata exposure. Mutations check role manually. |
| `message.ts` | `send` | P0 RISK: unauthenticated send permitted. |
| `milestone.ts` | `create`, `update`, `delete`, `list`, `bulkGenerate` | P0 RISK: most operations public/no object auth; create lacks event membership. |
| `notification.ts` | `listMy`, `markRead` | Sound in reviewed paths: current user scoped; `markRead` uses id + userId. |
| `org.ts` | `createOrg`, `getMyOrgs`, `getOrgBySlug`, `updateOrg`, `deleteOrg` | Public org lookup likely intentional; mutations manually enforce owner/admin. |
| `proposal.ts` | `create`, `calculateTotals`, `send`, `accept`, `reject` | P1 RISK on public `calculateTotals`; create and send/reject have auth checks; accept disabled. |
| `review.ts` | `create`, `list`, `flag` | Public review surfaces; check product intent. |
| `search.ts` | `searchListings`, `similarListings` | Public marketplace search likely intentional. |
| `seating.ts` | `getPlan`, `createPlan`, `createTable`, `updateTable`, `deleteTable`, `assignSeat`, `autoAssign` | Needs follow-up: procedure names detected as public; likely event guest/seating private and should require event management. |
| `settings.ts` | `getUserSettings`, `updateUserSettings`, `getOrgSettings`, `updateOrgSettings` | `getOrgSettings` public by orgId; user/org updates need auth/ownership verification. |
| `shortlist.ts` | `list`, `add`, `remove`, `isShortlisted` | Uses current user / management checks in reviewed routes; lower immediate risk. |
| `task.ts` | `create`, `update`, `delete`, `listByEvent` | P0 RISK: no auth/authorization. |
| `thread.ts` | `create`, `listByContext`, `get` | P0 RISK: public private-thread read/write. |

## Secrets scan summary

Tracked files were scanned for credential-like patterns. Actual values are intentionally not included here.

Result: no confirmed production secret value was reported in this audit. Findings were placeholders, docs, or test fixtures, including:
- `.env.example` placeholder keys/secrets.
- Google/Stripe/OpenAI examples in docs.
- Redaction tests with fake secret-like values.
- A test auth secret in a test file.

Recommendation:
- Keep `.env*` ignored except examples.
- Add CI secret scanning if not already active.
- Treat docs/test fixtures as acceptable only if values are clearly fake and non-live.

## Positive controls observed

- Stripe webhook verifies signature with webhook secret before event handling (`apps/web/src/app/api/stripe/webhook/route.ts:89-106`).
- Money-state webhook success processing uses a DB transaction for PaymentIntent/milestone/escrow/transaction updates (`apps/web/src/lib/payments/money-state.ts:543`, `584-620`, `644-663`).
- Several API payment/admin routes perform strong server-side role/authority checks rather than relying on middleware only.
- Notifications router appears user-scoped in reviewed paths.
- Contract access helper is structurally stronger than most routers.

## Prioritized fix list for Forge

1. P0: Lock down `thread.ts` and `message.ts`.
   - Convert to protected procedures.
   - Add `canAccessThread` helper enforcing participant/event/proposal/listing/org access.
   - Add tests proving cross-user reads/writes fail.

2. P0: Lock down `bookingRequest.listForOrg`.
   - Require auth.
   - Enforce org owner/admin/member policy.
   - Restrict contact fields by role.

3. P0: Lock down planning routers.
   - `task.ts`, `checklist.ts`, `milestone.ts`, `guest.ts` need event/org authorization on every private read/write.
   - Add regression tests for unauthenticated and cross-org IDOR attempts.

4. P1: Lock down log/metadata leaks.
   - Add auth/RBAC to `audit.list`, `activity.list`, `membership.getMembers`, `invite.getInvites`, `settings.getOrgSettings`, and likely private `calendar.list`/`seating` reads.

5. P1: Fix `proposal.calculateTotals` and `ai/source-vendors-venues`.
   - Require auth and object-level event/proposal access.

6. P1: Upgrade vulnerable dependencies.
   - Upgrade Next.js beyond current advisory floors.
   - Upgrade `@trpc/server` to patched version.
   - Re-run `pnpm audit --prod`; no critical/high should remain unless formally risk-accepted.

7. P1: Refactor money/data-integrity flows.
   - Payment intent creation: add idempotent local transaction and reconciliation path.
   - Milestone release: remove Stripe transfer from inside DB transaction; use pending/finalize state machine and idempotency key.
   - Payment plan/deposit builders: wrap all-or-nothing writes in transactions or return explicit partial status.

8. P2: Standardize input validation.
   - Add Zod schemas to every mutating route with direct `request.json()`.
   - Reject unknown/invalid fields consistently.

9. P2: Standardize error hygiene.
   - Stop returning raw `error.message` on 5xx.
   - Route all detailed errors through redacted structured logging.
   - Remove stack/PII logging in production paths.

10. P2: Harden security headers.
   - Add HSTS and Permissions-Policy.
   - Move CSP toward enforce mode and remove unsafe inline/eval where feasible.

## Recommended next action for Atlas

Route Forge to address P0 items first in this order:
1. Thread/message P0 lockdown.
2. Booking request org listing P0 lockdown.
3. Task/checklist/milestone/guest P0 lockdown.

After those are implemented, route Steward/Sentinel verification on targeted IDOR tests before moving to P1 dependency and payment-integrity work.
