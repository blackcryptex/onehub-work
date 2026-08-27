# OneHub role privacy/access-control implementation map

Date: 2026-08-27
Owner lane: Steward
Scope: read-only backend/security/access-control map for proposal detail and contract detail privacy boundaries.
Verdict: PARTIAL/RISK

## Scope reviewed

Assigned files inspected:
- `apps/web/src/app/(app)/proposals/[id]/page.tsx`
- `apps/web/src/app/(app)/contracts/[id]/page.tsx`
- `apps/web/src/lib/rbac.ts`
- `apps/web/prisma/schema.prisma`
- `apps/web/tests/event-rbac-helper.test.ts`

Adjacent access surface inspected for implementation mapping:
- `apps/web/src/server/routers/proposal.ts`
- `apps/web/src/server/routers/contract.ts`

No source implementation files were changed.

## Evidence examined

### Proposal detail page

`apps/web/src/app/(app)/proposals/[id]/page.tsx`:
- Fetches proposal by id with event/org/members/stakeholders/shares and listing/org/members included.
- Calls `getCurrentUser()`.
- Fails closed with `notFound()` when `canViewCommercialProposal(user, proposal)` is false.
- Fetches proposal thread only after the authorization check.
- Edit authority is separate: `canManageEvent(user, proposal.event)` and status `DRAFT` or `SENT`.

### Contract detail page

`apps/web/src/app/(app)/contracts/[id]/page.tsx`:
- Fetches contract by id with proposal/event/org/members/stakeholders/shares, proposal/listing/org/members, and signatures included.
- Calls `getCurrentUser()` before fetch.
- Fails closed with `notFound()` when `canViewCommercialContract(user, contract)` is false.
- Edit authority is separate: `canManageEvent(user, contract.proposal.event)` and status `DRAFT`.
- Payment entry is buyer-side only using `contract.buyerId === contract.proposal.event.orgId` plus buyer org owner/member membership.

### RBAC helper

`apps/web/src/lib/rbac.ts`:
- `canViewCommercialProposal` allows: admin; event org member; `canViewEvent`; listing org member; `canEditListing`.
- `canViewEvent` allows: admin; event org owner; planner only if `event.createdById === user.id`; CLIENT only when both `EventStakeholder` and `EventShare(scope: SUMMARY)` match the user; denies vendors/venues by default.
- `canViewCommercialContract` allows everything `canViewCommercialProposal` allows, plus intended signature match by `signerId` or lowercase `signerEmail`.

### Prisma model structure

`apps/web/prisma/schema.prisma`:
- `Organization` owns users through `ownerId` and `members Membership[]`.
- `Membership` has unique `[userId, orgId]` and role metadata.
- `Event` belongs to `orgId`, has `createdById`, and has `stakeholders EventStakeholder[]` plus `shares EventShare[]`.
- `EventStakeholder` is unique by `[eventId, userId]`.
- `EventShare` is unique by `[eventId, viewerUserId, scope]`; current scope used by RBAC is `SUMMARY`.
- `Listing` belongs to `orgId` and links proposals to the seller/provider org.
- `Proposal` belongs to `orgId`, `eventId`, optional `listingId`, and has one optional `Contract`.
- `Contract` belongs to `proposalId`, `orgId`, `eventId`, optional `buyerId`, optional `sellerId`, and has `Signature[]`.
- `Signature` has optional `signerId` plus required `signerEmail`.

### Existing tests

`apps/web/tests/event-rbac-helper.test.ts` covers:
- planner event isolation by `createdById`.
- CLIENT event access requiring both stakeholder and summary share.
- default denial for vendor/venue/event dreamer event access.
- admin event access.
- commercial proposal detail access for buyer org owner/member, shared client, seller listing org member, admin; denies stranger.
- commercial contract detail access for seller owner and intended signer; denies stranger.

No dedicated page-level tests were found for proposal/contract `[id]` pages invoking `notFound()` on unauthorized users. No dedicated tRPC contract-router tests were found for parity with `canViewCommercialContract`.

## 1. Exact allowed readers for proposal detail

The intended proposal detail readers should be exactly:

1. Platform/admin users
   - `isAdmin(user) === true`.

2. Buyer/event-side organization participants
   - `proposal.event.org.ownerId === user.id`, or
   - `proposal.event.org.members` contains `user.id`.

3. Event owner/planner under event isolation
   - planner roles (`DIY_PLANNER` or `PRO_PLANNER`) only when `proposal.event.createdById === user.id`.
   - Note: org owner/member access above is broader than planner-created-by access. If buyer org membership includes multiple planners, current helper allows all buyer org members to proposal detail.

4. Explicitly shared client stakeholders
   - `user.role === CLIENT`, and
   - `proposal.event.stakeholders` contains `user.id`, and
   - `proposal.event.shares` contains `{ viewerUserId: user.id, scope: SUMMARY }`.

5. Seller/provider listing organization participants
   - `proposal.listing.org.ownerId === user.id`, or
   - `proposal.listing.org.members` contains `user.id`.

6. No listing proposal fallback
   - If `proposal.listing` is null, there is no seller-side reader path. Access is buyer/event/admin/client-share only.

Denied by default:
- unauthenticated users;
- unrelated authenticated users;
- vendors/venues that are not members/owners of the proposal listing org;
- clients that are only stakeholders but not shared;
- clients that are shared but not stakeholders;
- planners that are neither event creator nor event/buyer-org participant.

## 2. Exact allowed readers for contract detail

The intended contract detail readers should be exactly:

1. Every allowed proposal detail reader for `contract.proposal`
   - admin;
   - buyer/event org owner/member;
   - event-created planner where allowed by event isolation;
   - explicit CLIENT stakeholder plus `SUMMARY` share;
   - seller/provider listing org owner/member.

2. Intended contract signers
   - any user whose `id` matches a contract `Signature.signerId`, or
   - any user whose lowercase `email` matches lowercase `Signature.signerEmail`.

Denied by default:
- unauthenticated users;
- unrelated authenticated users;
- buyer/seller ids alone unless those ids resolve through org participation, proposal access, or signer identity;
- unsigned stranger users with no proposal-side access and no matching signer identity.

## 3. Current authorization gaps

### GAP 1 — Contract tRPC read/render helper is not aligned with page-level commercial contract access

`apps/web/src/server/routers/contract.ts` has private helper `assertCanAccessContract` for `contract.get` and `contract.render`.

Current helper allows:
- admin;
- `canViewEvent(user, contract.proposal.event)`;
- signer by exact-case email match.

It does not use `canViewCommercialContract` and therefore omits seller listing org owner/member access for `contract.get` and `contract.render`, even though the contract detail page allows seller listing org readers through `canViewCommercialContract`.

Risk type: contract/API contract mismatch and seller-side false denial.

### GAP 2 — Contract router signer email comparison is case-sensitive

`assertCanAccessContract` uses `s.signerEmail === user.email`; `canViewCommercialContract` lowercases both sides. `contract.sign` uses the same case-sensitive comparison.

Risk type: intended signer false denial when stored signer email case differs from auth email case.

### GAP 3 — Contract router auth helper does not include proposal listing org in its Prisma query

The contract router access helper includes signatures and proposal.event, but not proposal.listing.org. That prevents direct reuse of `canViewCommercialContract` until the include shape is expanded.

Risk type: implementation blocker for centralizing contract access checks.

### GAP 4 — Proposal totals endpoint is public and returns commercial amounts by proposal id

`apps/web/src/server/routers/proposal.ts` exposes `calculateTotals` as `publicProcedure`, reads `proposal.findUniqueOrThrow`, includes line items, and returns subtotal/tax/total without `getCurrentUser`, `protectedProcedure`, or `canViewCommercialProposal`.

Risk type: proposal amount disclosure by id outside the proposal detail page.

This is adjacent to the assigned proposal detail privacy boundary. It should be included in Forge's implementation slot because it leaks proposal commercial data even if the page is locked.

### GAP 5 — Proposal create remains publicProcedure with manual session check and membership-only event permission

`proposal.create` is `publicProcedure`, manually calls `auth()`, and checks only `Membership` on the event org rather than `canSendProposal` or `canManageEvent` with planner isolation.

Risk type: mutation permission drift. This is not a proposal-detail read leak, but it is in the same proposal router and should be handled separately if Forge touches proposal RBAC.

### GAP 6 — Page-level auth happens after fetching the full record

Both detail pages fetch full proposal/contract records before checking authorization. Because these are server components and return `notFound()` before rendering, this is not a direct response-body leak in the inspected code. It is still a safer implementation target to push authorization into shared guarded loaders if future logging, instrumentation, or data transformation expands.

Risk type: structural hardening, not current confirmed user-visible leakage.

## 4. Minimal implementation plan for Forge

### Task A — Centralize proposal and contract include shapes for commercial RBAC

File paths:
- `apps/web/src/lib/rbac.ts`
- Optional new server-only helper file if preferred: `apps/web/src/server/lib/commercial-access.ts`

Plan:
1. Keep `canViewCommercialProposal` and `canViewCommercialContract` as the canonical permission predicates.
2. Define reusable Prisma include/select shapes for:
   - proposal commercial access: event org owner/members, event createdById, event stakeholders, event shares, listing org owner/members.
   - contract commercial access: proposal commercial access shape plus signatures.
3. Do not widen readers beyond the explicit lists above.

Test names:
- Extend `apps/web/tests/event-rbac-helper.test.ts` with table tests for:
  - proposal denies client stakeholder without share;
  - proposal denies share without stakeholder;
  - proposal denies unrelated buyer-org stranger;
  - proposal allows seller listing org owner as well as member;
  - contract allows signer by lowercase email match;
  - contract allows signerId match even if email differs;
  - contract denies buyer/seller id with no org/signature relation.

### Task B — Align contract tRPC get/render access with page-level contract access

File paths:
- `apps/web/src/server/routers/contract.ts`
- `apps/web/src/lib/rbac.ts`
- New/updated test file: `apps/web/tests/contract-router-access.test.ts` or existing router test convention if one exists.

Plan:
1. Import and use `canViewCommercialContract` in `contract.ts` instead of local `canViewEvent` plus signer logic for `contract.get` and `contract.render`.
2. Expand the access helper Prisma include to include `proposal.listing.org.ownerId` and `proposal.listing.org.members`.
3. Normalize signer email matching through `canViewCommercialContract`; do not duplicate case-sensitive comparisons.
4. For `contract.sign`, lowercase both `signature.signerEmail` and `user.email` or reuse a narrow signer identity helper.

Test names:
- `contractRouter.get allows seller listing org owner/member`
- `contractRouter.get allows signer email case-insensitively`
- `contractRouter.get denies unrelated authenticated user`
- `contractRouter.render follows the same access matrix as get`
- `contractRouter.sign allows intended signer email case-insensitively`

### Task C — Lock proposal `calculateTotals` to commercial proposal readers

File paths:
- `apps/web/src/server/routers/proposal.ts`
- New/updated test file: `apps/web/tests/proposal-router-access.test.ts` or existing proposal router test convention.

Plan:
1. Change `calculateTotals` from `publicProcedure` to `protectedProcedure`.
2. Fetch proposal with line items plus the same event/listing relations required by `canViewCommercialProposal`.
3. Before returning totals, require `canViewCommercialProposal(ctx.user, proposal)`.
4. Return `FORBIDDEN` for authenticated users outside the allowed proposal reader set.

Test names:
- `proposalRouter.calculateTotals allows buyer org member`
- `proposalRouter.calculateTotals allows shared client stakeholder`
- `proposalRouter.calculateTotals allows seller listing org member`
- `proposalRouter.calculateTotals denies unauthenticated user`
- `proposalRouter.calculateTotals denies unrelated authenticated user`

### Task D — Add page-level denial tests if current test harness can import server components safely

File paths:
- `apps/web/tests/proposal-detail-access.test.tsx`
- `apps/web/tests/contract-detail-access.test.tsx`

Plan:
1. Mock `getCurrentUser`, `prisma`, and `next/navigation.notFound`.
2. Verify unauthorized users trigger `notFound()` before thread/client rendering for proposal detail.
3. Verify unauthorized users trigger `notFound()` before contract client rendering for contract detail.
4. Verify authorized seller listing org and shared client paths render the page clients.

Test names:
- `ProposalPage returns notFound for unrelated authenticated user`
- `ProposalPage does not load thread for unauthorized user`
- `ContractPage returns notFound for unrelated authenticated user`
- `ContractPage allows intended signer`

### Task E — Defer broader mutation cleanup unless Atlas explicitly includes it

File paths:
- `apps/web/src/server/routers/proposal.ts`
- `apps/web/src/server/routers/contract.ts`

Deferred items:
- `proposal.create` manual auth and membership-only permission.
- `contract.addChangeOrder` and `approveChangeOrder` buyer/seller identity semantics.

Reason:
- These are mutation/action boundaries, not the assigned proposal/contract detail read boundary. They are real structural risks, but Forge should not expand this privacy slot unless Atlas approves.

## 5. Hard guardrails and Sentinel acceptance checks

### Hard guardrails

1. Do not add any new allowed reader category without Atlas/Marlon approval.
2. Do not allow `CLIENT` proposal or contract detail access from share alone; require both `EventStakeholder` and `EventShare(scope: SUMMARY)`.
3. Do not allow vendor/venue event access by role alone; seller-side access must flow through listing org owner/member or signer identity.
4. Do not treat `contract.buyerId` or `contract.sellerId` as user ids unless the schema is changed and explicitly documented. Current schema also uses org ids in page logic.
5. Do not expose proposal totals, line items, milestones, contract body, signatures, or thread messages before the commercial access predicate passes.
6. Do not replace `notFound()` detail-page denial with a user-visible `403` unless Atlas approves the product/security disclosure tradeoff.
7. Do not mutate database schema, production data, credentials, billing, Stripe, Vercel, or infrastructure as part of this slot.
8. Do not collapse event access and commercial record access into one helper; seller-side listing org and intended signers need commercial-detail access without general event vault access.

### Sentinel acceptance checks

Sentinel should require:

1. `apps/web/src/lib/rbac.ts` remains the canonical predicate location for:
   - `canViewCommercialProposal`
   - `canViewCommercialContract`

2. Proposal detail readers match exactly:
   - admin;
   - event/buyer org owner/member;
   - event-created planner under planner isolation;
   - CLIENT stakeholder plus `SUMMARY` share;
   - seller listing org owner/member.

3. Contract detail readers match exactly:
   - all proposal detail readers;
   - signer by `signerId`;
   - signer by case-insensitive `signerEmail`.

4. `contract.get` and `contract.render` use the same access matrix as `ContractPage`.

5. `proposal.calculateTotals` is not public and cannot return totals to unrelated authenticated users.

6. Tests cover positive and negative cases for:
   - buyer org reader;
   - seller listing org reader;
   - shared client stakeholder;
   - stakeholder without share denied;
   - share without stakeholder denied;
   - intended signer by id;
   - intended signer by case-insensitive email;
   - unrelated authenticated user denied;
   - unauthenticated user denied.

7. Required verification commands pass:
   - `pnpm run test -- apps/web/tests/event-rbac-helper.test.ts`
   - new proposal router access tests
   - new contract router access tests
   - page tests if added
   - `pnpm run lint`
   - `pnpm run typecheck`
   - `pnpm run build`

## Forge implementability verdict

Forge can safely implement next: YES, with constraints.

Implementation is safe if Forge limits the slot to:
- centralizing/reusing commercial access predicates;
- aligning contract router read/render with contract page access;
- locking proposal totals behind proposal-detail read access;
- adding focused tests for the exact reader matrix.

Implementation is not safe if Forge broadens into payment movement, production settings, DB/schema migration, public exposure decisions, credential work, billing/Stripe changes, or broad proposal/contract workflow refactors without Atlas/Marlon approval.

Recommended next action for Atlas:
Route a narrow Forge implementation card for Tasks A-C plus tests, then route Sentinel to verify the acceptance matrix above before any preview/public exposure decision.
