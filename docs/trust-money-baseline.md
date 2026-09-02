# Trust + Money Baseline

Date: 2026-09-02
Assignee: Steward
Scope: minimum setup/baseline for the approved trust-money fixes. This is not a broad audit.
Canonical target: https://www.1hubevents.com
Plan artifact: docs/trust-money-priority-plan.md

## Repo status

Command: `git status --short && git branch --show-current`
Result:
- Branch: `atlas/slice7-canonical-deploy`
- Existing untracked before this card: `docs/trust-money-priority-plan.md`
- Added by this card: `docs/trust-money-baseline.md`

No production credentials, live payment settings, billing, domains, infrastructure, or production DB/schema were changed.

## Targeted test inventory found

Relevant existing tests:
- `apps/web/tests/contract-router-access.test.ts`
- `apps/web/tests/payment-intent-lifecycle.test.ts`
- `apps/web/tests/payment-release-guardrails.test.ts`
- `apps/web/tests/payment-refund-review-effects.test.ts`
- `apps/web/tests/stripe-webhook-idempotency.test.ts`
- `apps/web/tests/payment-blocking-helpers.test.ts`
- `apps/web/tests/w5-billing-router-guardrails.test.ts`
- `apps/web/tests/auth-session-impersonation-security.test.ts`
- `apps/web/tests/signin-google-provider-ui.test.tsx`
- `apps/web/tests/sensitive-log-hygiene.test.ts`
- Related admin/UI smoke: `apps/web/tests/admin-founder-user-role-route.test.ts`, `apps/web/tests/admin-impersonate-button.test.tsx`, `apps/web/tests/admin-overview-workflow.test.tsx`, `apps/web/tests/w5-admin-trust-review-summary.test.ts`

Targeted command run:
`pnpm exec vitest run --config apps/web/vitest.config.ts apps/web/tests/contract-router-access.test.ts apps/web/tests/payment-intent-lifecycle.test.ts apps/web/tests/payment-release-guardrails.test.ts apps/web/tests/payment-refund-review-effects.test.ts apps/web/tests/stripe-webhook-idempotency.test.ts apps/web/tests/auth-session-impersonation-security.test.ts apps/web/tests/signin-google-provider-ui.test.tsx apps/web/tests/sensitive-log-hygiene.test.ts apps/web/tests/payment-blocking-helpers.test.ts apps/web/tests/w5-billing-router-guardrails.test.ts`

Result: 10 files passed, 59 tests passed.

## Defect map / green evidence

### 1. Contract signing

Files reviewed:
- `apps/web/src/server/routers/contract.ts`
- `apps/web/src/server/lib/contracts.ts`
- `apps/web/prisma/schema.prisma`
- `apps/web/tests/contract-router-access.test.ts`

Already-green evidence:
- `contract.get` and `contract.render` are protected procedures and call `assertCanAccessContract`.
- Existing tests cover seller org access, intended signer email access, unrelated-user denial, and dual-party status promotion.

Concrete blockers:
- `apps/web/prisma/schema.prisma:763` sets `Contract.status` default to `OUT_FOR_SIGNATURE`, not a safe draft/non-signable state. New contracts are signable by default unless every creation path overrides status.
- `apps/web/src/server/routers/contract.ts:168-300` signs a signature without checking the contract is in a signable status such as `OUT_FOR_SIGNATURE` or `PARTIALLY_SIGNED`; a `DRAFT`, `CANCELED`, or otherwise non-signable contract can be signed if a signature row exists.
- `apps/web/src/server/routers/contract.ts:210-218` allows any event manager to sign any signature row through `canManageEvent`, which can let buyer-side management sign a seller slot. This does not enforce correct party/role signing.
- `apps/web/tests/contract-router-access.test.ts` does not currently cover draft-not-signable, wrong-party signer blocked, already-signed/idempotent handling, or status whitelist behavior.

Verdict: RISK.

### 2. Signup / invite / onboarding protection

Files reviewed:
- `apps/web/src/app/(auth)/signup/page.tsx`
- `apps/web/src/app/api/auth/signup/route.ts`
- `apps/web/src/server/routers/invite.ts`
- `apps/web/src/app/(auth)/signin/page.tsx`
- `apps/web/prisma/schema.prisma`
- `apps/web/tests/sensitive-log-hygiene.test.ts`

Already-green evidence:
- Public signup role input is allowlisted and cannot request `ADMIN` through `apps/web/src/app/api/auth/signup/route.ts:5-28`.
- Invite creation/revoke paths check org admin/owner before mutation in `apps/web/src/server/routers/invite.ts:12-21` and `apps/web/src/server/routers/invite.ts:41-49`.
- NextAuth redirect callback restricts callback URLs to same origin or configured base in `apps/web/src/lib/auth.ts:335-354`.

Concrete blockers:
- `apps/web/src/server/routers/invite.ts:38-40` exposes `getInvites` as `publicProcedure` with no auth/authorization and returns pending invite records. Because `Invite.token` exists on the model, this can expose invite tokens and invitee emails unless the client projection strips them later.
- `apps/web/src/app/(auth)/signup/page.tsx` reads role/callback params but never reads or consumes `invite`; `apps/web/src/app/api/auth/signup/route.ts` creates users without validating invite token, invite email, org, expiration, or role.
- `apps/web/src/server/routers/invite.ts:52-65` lets any authenticated user possessing a token accept it; it does not verify the signed-in user's email matches `Invite.email`.
- `apps/web/src/server/routers/invite.ts:58-62` uses membership upsert with `update: { role: inv.role }`, so a reused/leaked valid invite can downgrade or upgrade an existing member's org role until accepted is flipped.
- `apps/web/prisma/schema.prisma:153-163` has no `acceptedById`/`acceptedAt` audit fields, making token-consumption evidence thin.

Verdict: RISK.

### 3. Google OAuth / calendar token protection

Files reviewed:
- `apps/web/src/lib/auth.ts`
- `apps/web/src/lib/google.calendar.ts`
- `apps/web/src/app/api/google/callback/route.ts`
- `apps/web/prisma/schema.prisma`
- `apps/web/tests/auth-session-impersonation-security.test.ts`
- `apps/web/tests/signin-google-provider-ui.test.tsx`
- `apps/web/tests/google-calendar-mapping.test.ts`
- `apps/web/tests/sensitive-log-hygiene.test.ts`

Already-green evidence:
- Google provider is only registered when `GOOGLE_ID` and `GOOGLE_SECRET` are configured in `apps/web/src/lib/auth.ts:162-179`; UI test confirms the button hides when the provider is inactive.
- OAuth config uses PKCE/state checks in `apps/web/src/lib/auth.ts:165-176`.
- Calendar token refresh updates `CalendarAccount` and does not log token values in `apps/web/src/lib/google.calendar.ts:88-106`.

Concrete blockers:
- `apps/web/prisma/schema.prisma:1097-1113` stores `CalendarAccount.accessToken` and `CalendarAccount.refreshToken` as raw nullable strings; no encryption-at-rest wrapper was found in the calendar token path.
- `apps/web/src/lib/auth.ts:274-279` places Google `access_token` and `refresh_token` into the JWT token object even though the session callback does not expose them. This increases token exposure surface and should be removed unless a proven consumer needs it.
- `apps/web/src/app/api/google/callback/route.ts:23-50` duplicates token-copy behavior from the NextAuth JWT callback and also writes raw tokens to `CalendarAccount`.

Verdict: RISK.

### 4. Payment intent creation / confirmation / cleanup

Files reviewed:
- `apps/web/src/app/api/payments/create-intent/route.ts`
- `apps/web/src/app/api/payments/confirm/route.ts`
- `apps/web/src/lib/payments/confirm-payment.ts`
- `apps/web/src/app/api/stripe/webhook/route.ts`
- `apps/web/src/server/routers/billing.ts`
- `apps/web/prisma/schema.prisma`
- `apps/web/tests/payment-intent-lifecycle.test.ts`
- `apps/web/tests/stripe-webhook-idempotency.test.ts`
- `apps/web/tests/w5-billing-router-guardrails.test.ts`

Already-green evidence:
- Legacy tRPC payment intent and release paths are disabled in `apps/web/src/server/routers/billing.ts:92-115`.
- Canonical payment creation requires auth, current payment acceptance, payable contract status, bilateral signature evidence, buyer-side user, accepted provider-backed proposal, server-derived amount, and Stripe metadata binding in `apps/web/src/app/api/payments/create-intent/route.ts`.
- Confirmation checks local state, Stripe metadata, amount/currency, and acceptance proof before escrow credit in `apps/web/src/lib/payments/confirm-payment.ts`.
- Stripe webhook handling reserves event IDs before business handling and treats processed duplicates idempotently in `apps/web/src/app/api/stripe/webhook/route.ts`.
- Existing targeted tests passed for stale intent cleanup, metadata/amount mismatch blocking, canonical charge amount, provider evidence gate, confirmation idempotency, and webhook idempotency.

Concrete blockers:
- No exact blocker found in the inspected payment-intent path for the next Forge slice. Keep this as already-green evidence unless Forge changes contract/signup prerequisites.
- Residual risk: `apps/web/src/app/api/payments/create-intent/route.ts:354-359` logs the full caught error object. It did not appear to print secrets in targeted tests, but Stripe error objects can be noisy; prefer structured/sanitized logging in a later hygiene pass.

Verdict: SOUND for baseline gating, with logging hygiene residual.

### 5. Refund / dispute / release blocking

Files reviewed:
- `apps/web/src/server/routers/billing.ts`
- `apps/web/src/server/routers/dispute.ts`
- `apps/web/src/lib/refund-request.ts`
- `apps/web/src/lib/dispute-case.ts`
- `apps/web/src/app/api/payments/release-milestone/route.ts`
- `apps/web/prisma/schema.prisma`
- `apps/web/tests/payment-release-guardrails.test.ts`
- `apps/web/tests/payment-refund-review-effects.test.ts`
- `apps/web/tests/payment-blocking-helpers.test.ts`

Already-green evidence:
- Release route requires current admin override acceptance and guarded platform-admin release authority in `apps/web/src/app/api/payments/release-milestone/route.ts:47-132`.
- Release blocks open refund requests, open/frozen dispute cases, and active holdbacks before escrow debit/payout/Stripe transfer in `apps/web/src/app/api/payments/release-milestone/route.ts:134-160`.
- Refund approval requires platform-admin authority, rejects off-ledger goodwill approval, reserves local escrow/money transaction before Stripe refund, and finalizes only after Stripe refund evidence in `apps/web/src/lib/refund-request.ts`.
- Existing targeted tests passed for refund/dispute/holdback release blockers, transfer failure no paid finalization, atomic escrow debit, refund local reservation, and refund recovery.

Concrete blockers:
- `apps/web/src/lib/dispute-case.ts:166-183` creates a linked refund request with `amountRequestedCents: 0` when an admin resolves a dispute as `REFUND` and no refund request is already linked. That is a placeholder/fake money state and violates the trust-money guardrail.
- `apps/web/src/server/routers/billing.ts:117-198` keeps `refundMilestone` as `publicProcedure` with manual auth and buyer-side event-manager authorization. It creates refund requests but is not clearly the canonical guarded refund request API; Forge should either make the canonical refund route explicit or disable legacy ambiguity as was done for billing intent/release.

Verdict: RISK.

### 6. Admin controls / oversight

Files reviewed:
- `apps/web/src/server/routers/admin.ts`
- `apps/web/src/lib/admin-override.ts`
- `apps/web/src/app/api/admin/override-history/route.ts`
- `apps/web/src/app/api/admin/holdbacks/route.ts`
- `apps/web/src/app/api/admin/holdbacks/verification/route.ts`
- `apps/web/tests/admin-founder-user-role-route.test.ts`
- `apps/web/tests/admin-impersonate-button.test.tsx`

Already-green evidence:
- `requireAdmin` checks current and real user admin identity before admin tRPC actions in `apps/web/src/server/routers/admin.ts:15-33`.
- Admin override records audit log plus `AdminOverride` rows with authority path, reason, target IDs, and acceptance capture linkage in `apps/web/src/lib/admin-override.ts:18-101`.
- Founder-admin role route and impersonation break-glass tests exist and pass in their targeted files when run by adjacent lanes.

Concrete blockers:
- No exact blocker found in the inspected admin override structure for the next Forge slice.
- Residual: most admin router procedures are `publicProcedure` plus internal `requireAdmin`; converting to `protectedProcedure` would reduce accidental unauthenticated surface, but the internal guard is present.

Verdict: PARTIAL/SOUND for current guarded-MVP admin override structure.

## First Forge slice recommendation

First Forge slice: `TM1 Contract signing protection`.

Narrow acceptance for Forge:
1. Make newly created contracts non-signable by default or verify every creation path explicitly sets a safe draft status before signature rows exist.
2. In `apps/web/src/server/routers/contract.ts`, block signing unless contract status is in an explicit signable allowlist.
3. Enforce signer-party correctness: buyer-side users can only satisfy buyer signature rows; seller-side users can only satisfy seller signature rows; event managers must not be able to sign the opposite party's slot by broad `canManageEvent` alone.
4. Make repeated signing/idempotency behavior explicit and safe.
5. Add targeted tests to `apps/web/tests/contract-router-access.test.ts` or a new focused file for draft-not-signable, wrong-party blocked, correct buyer/seller accepted, already-signed behavior, and status transition.

Recommended second slice after TM1: invite/signup token protection. The `getInvites` public token exposure and invite email/token mismatch are concrete high-risk blockers and should not wait long.

## Steward verdict

PARTIAL/RISK.

Payment creation/confirmation/release guardrails have strong already-green evidence from targeted tests. Contract signing, invite/signup protection, Google token storage, and dispute-refund placeholder behavior remain concrete trust-money blockers before private-pilot credibility.
