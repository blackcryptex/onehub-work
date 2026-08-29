# W2 Communication — Steward backend/data/security/payment map

Task: t_f5c2fc1d
Date: 2026-08-28
Owner lane: Steward
Scope type: read-only backend/data/security/payment map
Verdict: PARTIAL / RISK

## 1. Backend or structural scope reviewed

Assigned business loop:

event-linked thread -> notify participants -> reply persists -> context attached -> wrong roles blocked.

Read-only inspection covered:

- Communication persistence model: `apps/web/prisma/schema.prisma`
- Thread/message/notification routers: `apps/web/src/server/routers/thread.ts`, `apps/web/src/server/routers/message.ts`, `apps/web/src/server/routers/notification.ts`
- App router message and notification surfaces: `apps/web/src/app/(app)/messages/page.tsx`, `apps/web/src/app/(app)/messages/[threadId]/page.tsx`, `apps/web/src/app/api/notifications/route.ts`, `apps/web/src/app/api/notifications/[id]/read/route.ts`
- Shared object access and role policy: `apps/web/src/server/lib/access.ts`, `apps/web/src/lib/rbac.ts`
- Communication-adjacent proposal/internal-note/crisis surfaces: `apps/web/src/app/(app)/proposals/[id]/page.tsx`, `apps/web/src/components/proposals/ProposalPageClient.tsx`, `apps/web/src/app/api/pro-planner/files/notes/route.ts`, `apps/web/src/server/routers/crisis.ts`
- Payment-adjacent records/routes that may need communication context: `PaymentIntent`, `PaymentMilestone`, `Contract`, `RefundRequest`, `Dispute`, `PaymentHoldback`, `/api/payments/create-intent`, `/api/payments/confirm`, `/api/payments/release-milestone`, `billingRouter`
- Existing communication tests: `apps/web/tests/phase5-comms-accountability.test.ts`, `apps/web/tests/dashboard-core-routes.test.tsx`
- Scout W2 user workflow map: `reports/seven-workflows/w2-scout-map.md`

No source implementation files, production settings, env files, credentials, billing settings, infra/domain/public exposure settings, live payments, or destructive DB operations were changed.

## 2. Evidence examined

### Durable communication records exist

- `Notification` persists `userId`, `orgId`, `type`, `title`, optional `body`, `read`, optional `link`, and `createdAt` at `apps/web/prisma/schema.prisma:473-485`.
- `Thread` persists `orgId`, optional `eventId`, optional `proposalId`, optional `listingId`, `subject`, `visibility`, `purpose`, messages, participants, and relations at `apps/web/prisma/schema.prisma:893-912`.
- `ThreadParticipant` persists optional `userId`, required `email`, optional `roleHint`, and optional `lastReadAt` at `apps/web/prisma/schema.prisma:914-922`.
- `ThreadVisibility` is stored as `INTERNAL`, `CLIENT_VISIBLE`, `PROVIDER_VISIBLE`, or `ALL_PARTIES` at `apps/web/prisma/schema.prisma:924-929`.
- `ThreadPurpose` is stored as `EVENT_COORDINATION`, `PROPOSAL`, `BOOKING_REQUEST`, `INTERNAL_NOTE`, `DOCUMENT_REVIEW`, or `ADMIN_REVIEW` at `apps/web/prisma/schema.prisma:931-938`.
- `Message` persists `threadId`, optional `senderId`, `bodyMd`, optional JSON `attachments`, and `createdAt` at `apps/web/prisma/schema.prisma:940-948`.

### Thread creation and message persistence exist, but depend on broad access helpers

- `threadRouter.create` accepts `orgId`, optional event/proposal/listing IDs, `subject`, `visibility`, `purpose`, participants, and optional `firstMessage` at `apps/web/src/server/routers/thread.ts:30-41`.
- If `eventId` is present, creation requires `requireEventManageAccess`; otherwise it only requires org membership at `apps/web/src/server/routers/thread.ts:43-48`.
- Creation writes thread/participants, optional first message, notifications for participant `userId`s, and `THREAD_CREATED` activity inside one transaction at `apps/web/src/server/routers/thread.ts:50-105`.
- `messageRouter.send` requires `requireThreadAccess`, creates a message, updates thread timestamp, notifies other participant `userId`s, and records event activity at `apps/web/src/server/routers/message.ts:8-53`.
- Existing backend tests prove unauthenticated send rejection, outsider read rejection, persisted authenticated send, notification creation, and activity creation at `apps/web/tests/phase5-comms-accountability.test.ts:80-117`.

### Message UI can read but not reply

- `/messages` lists accessible threads by admin or broad org/participant/listing-org conditions at `apps/web/src/app/(app)/messages/page.tsx:26-61` and links to `/messages/[threadId]` at `apps/web/src/app/(app)/messages/page.tsx:84-99`.
- `/messages/[threadId]` loads thread detail using the same broad access pattern and renders context/participants/messages at `apps/web/src/app/(app)/messages/[threadId]/page.tsx:15-86`.
- `ThreadPanel` only enables a send form when `onSend` is passed at `packages/ui/src/components/ThreadPanel.tsx:10-40`.
- `/messages/[threadId]` passes `<ThreadPanel messages={messages} />` without `onSend` at `apps/web/src/app/(app)/messages/[threadId]/page.tsx:86`.
- Proposal detail also renders proposal-linked thread messages without a send handler at `apps/web/src/components/proposals/ProposalPageClient.tsx:229-233`.

### Notifications are safe for current-user reads, but delivery semantics are incomplete

- `/api/notifications` requires a current user and filters by `userId: user.id` at `apps/web/src/app/api/notifications/route.ts:7-20`.
- `/api/notifications/[id]/read` requires a current user and updates with compound ownership criteria `{ id, userId: user.id }` at `apps/web/src/app/api/notifications/[id]/read/route.ts:5-21`.
- tRPC `notificationRouter.markRead` uses `updateMany({ where: { id, userId } })` and throws if no row is updated at `apps/web/src/server/routers/notification.ts:17-27`.
- Thread create/send notification recipients are derived only from participant `userId`s and exclude participants represented only by email at `apps/web/src/server/routers/thread.ts:72-85` and `apps/web/src/server/routers/message.ts:26-39`.
- `Notification` has no delivery channel/status/audit fields, so the current backend can prove in-app row creation only, not outbound delivery.

### RBAC exists, but W2 thread visibility is not enforced as a role matrix

- `requireEventManageAccess` loads event org/members/stakeholders/shares and delegates to `canManageEvent` at `apps/web/src/server/lib/access.ts:66-73`.
- `canManageEvent` allows admins, org owners, planner creators, and non-planner org members at `apps/web/src/lib/rbac.ts:179-193`.
- `canViewEvent` is stricter for clients and vendors/venues: clients require stakeholder plus shared summary; vendors/venues cannot view planner events by default at `apps/web/src/lib/rbac.ts:423-452`.
- `canViewCommercialProposal` permits buyer-side event access and seller-side listing org access at `apps/web/src/lib/rbac.ts:607-627`.
- `canViewCommercialContract` extends proposal access to contract signers by signer id/email at `apps/web/src/lib/rbac.ts:629-646`.
- `canAccessThread` allows admin, explicit participant by userId/email, any member/owner of the thread org, or any member/owner of the listing org at `apps/web/src/server/lib/access.ts:122-135`.
- `canAccessThread` does not inspect `thread.visibility`, `thread.purpose`, event stakeholder/share state, proposal/contract/payment status, or sender role. `ThreadForAccess` only carries `orgId`, participants, and optional listing org at `apps/web/src/server/lib/access.ts:109-113`.

### Payment and crisis context are structurally richer than Thread context

- `Contract` has first-class `proposalId`, `orgId`, `eventId`, buyer/seller IDs, payment intents, refund requests, signatures, and change orders at `apps/web/prisma/schema.prisma:695-716`.
- `PaymentMilestone` has first-class proposal/payment/refund status context at `apps/web/prisma/schema.prisma:669-682`.
- `PaymentIntent` has first-class `contractId`, optional `milestoneId`, payer/payee IDs, amount/currency/status, Stripe reference, and transaction relation at `apps/web/prisma/schema.prisma:794-814`.
- `PaymentHoldback` has proposal/contract/milestone IDs, high-risk triggers, admin decision/release fields, and audit trail at `apps/web/prisma/schema.prisma:833-868`.
- `Dispute` and `RefundRequest` both carry proposal, optional contract/payment/milestone links, actor/role, acceptance capture, request context, state, and audit trail at `apps/web/prisma/schema.prisma:950-1024`.
- `CrisisIssue` carries event, listing, booking request, proposal, contract, payment milestone, replacement, manual-review, and audit fields at `apps/web/prisma/schema.prisma:1193-1225`.
- `Thread` only carries event/proposal/listing context and cannot directly point at contract, task, payment intent, payment milestone, holdback, refund request, dispute, or crisis issue at `apps/web/prisma/schema.prisma:893-909`.
- `/api/payments/create-intent` records payment acceptance and Stripe metadata with contract/proposal/milestone/payment intent identifiers, but does not create or link a communication thread at `apps/web/src/app/api/payments/create-intent/route.ts:236-314`.
- `/api/payments/confirm` confirms only payer-owned payment intents and logs/payment applies state, but does not link a thread at `apps/web/src/app/api/payments/confirm/route.ts:62-122`.
- `/api/payments/release-milestone` is guarded by platform-admin release permission, refund/dispute/holdback blocking checks, acceptance proof, and audit/fee context; no communication thread is linked in the inspected portion at `apps/web/src/app/api/payments/release-milestone/route.ts:117-208`.
- `crisisRouter.create` validates event-linked listing/booking/proposal/contract/payment milestone context and creates a crisis issue plus manual-review task/activity, but does not create or attach a thread at `apps/web/src/server/routers/crisis.ts:105-290`.

## 3. Correctness verdict

PARTIAL / RISK

Backend primitives are real: thread/message/participant/notification rows exist, create/send mutations are transactional, notification reads are current-user scoped, and outsider denial is partially tested.

W2 is not structurally safe to close because the current backend contract proves component persistence, not the full business loop. The visible thread detail cannot reply; the same broad thread-access predicate is used for read and send; `Thread.visibility` is stored but not enforced; notification delivery only proves in-app rows for already-bound users; and payment/crisis/task/contract contexts are not first-class thread targets.

## 4. Exact risks and blockers

### R1 — Reply persistence is not reachable from canonical thread detail

Risk: HIGH.

`messageRouter.send` can persist replies, but `/messages/[threadId]` renders `ThreadPanel` without `onSend`. A protected route can display messages while the user has no canonical persisted reply action.

Implementation constraint:

- Make `/messages/[threadId]` the canonical reply surface or explicitly route every role to another canonical reply surface.
- The reply path must call the same server-side authorization as backend send, persist `Message`, update `Thread.updatedAt`, create recipient notifications, record activity when event-linked, and re-read/refresh the persisted row before claiming success.
- Do not close W2 on backend mutation tests alone; close only on role-session proof that a reply appears after reload for both sender and recipient.

### R2 — Thread visibility is a label, not an enforced access/send policy

Risk: HIGH.

`ThreadVisibility` suggests INTERNAL / CLIENT_VISIBLE / PROVIDER_VISIBLE / ALL_PARTIES, but `canAccessThread` ignores that field. Any org member can read/send on any thread in the org, and listing-org members can read/send listing-linked threads regardless of `visibility`.

Implementation constraint:

- Introduce one canonical `canReadThread` and one canonical `canSendThread` policy that load `visibility`, `purpose`, participants, event org/stakeholder/share state, listing org, and commercial context as needed.
- Enforce at all entry points: tRPC `thread.get`, `thread.listByContext`, `message.send`, `/messages`, `/messages/[threadId]`, and any REST wrapper created for the app router.
- Required role matrix:
  - `INTERNAL`: planner/admin event-org authorized users only; no client/vendor/venue unless explicitly internal org member.
  - `CLIENT_VISIBLE`: planner/admin plus explicit client participants or event stakeholders with appropriate share; providers excluded unless also explicit participants and policy allows.
  - `PROVIDER_VISIBLE`: planner/admin plus seller-side listing org or explicit provider participants; clients excluded unless explicit participants and policy allows.
  - `ALL_PARTIES`: planner/admin plus explicit/bound participants across client/provider sides; no unrelated org/listing users.
- Add tests for read and send, not just read.

### R3 — Thread creation can bind mismatched proposal/listing context to an event/org

Risk: HIGH.

`threadRouter.create` validates event access and event org equality when `eventId` is present, but the inspected code does not validate that `proposalId` belongs to that same event/org or that `listingId` belongs to the proposal or intended seller context before writing the thread.

Implementation constraint:

- Before creating a thread, server-load every supplied context ID in one transaction or preflight step.
- Enforce invariant: `Thread.orgId` is the buyer/planner event org; `eventId` must belong to `orgId`; `proposalId`, if present, must belong to `eventId` and `orgId`; `listingId`, if present, must match the proposal listing or a listing legitimately connected through booking/proposal/crisis context.
- Reject context combinations that cannot be proven from database relationships.
- Add negative tests for cross-org proposal/listing attachment.

### R4 — Participant input can imply access/notification without verified membership or identity binding

Risk: HIGH.

`participantInput` accepts caller-supplied `email`, optional `userId`, and `roleHint`; notification rows are created for supplied `userId`s. The inspected code does not prove that a supplied `userId` owns the supplied email, belongs to the role implied by `roleHint`, or is allowed for the selected event/proposal/listing context.

Implementation constraint:

- Resolve participants server-side from canonical entities where possible: event stakeholders, org members, proposal seller listing org members, contract signers, payment payer/payee, or approved invite records.
- If free-form email participants remain allowed, mark them as unbound and do not claim they were notified.
- If `userId` is supplied, server-load the user and require email match or replace the email with the canonical user email.
- Deduplicate recipients by `userId` and normalized email.
- Do not rely on `roleHint` for authorization; it is display metadata only unless server-derived.

### R5 — Notification proof is only in-app and only for bound user IDs

Risk: MEDIUM.

Notification rows are current-user scoped for reads, which is good. But thread create/send only notify participants with `userId`; email-only participants receive no in-app row. The data model has no `channel`, `deliveryStatus`, `deliveredAt`, `failureReason`, or outbound provider reference.

Implementation constraint:

- Keep success copy precise: “in-app notification created for registered participants.”
- Do not claim email/SMS/push delivery unless a separate audited delivery model exists.
- Add notification assertions to W2 proof: row belongs to recipient user, link points to authorized thread, read action cannot mutate another user’s notification, and unbound email participants are reported as pending/unbound rather than notified.

### R6 — Notification read route has ownership intent but app-router implementation can turn not-found into 500

Risk: MEDIUM.

The app route calls `prisma.notification.update({ where: { id, userId } })`. Prisma compound non-unique `where` support depends on generated types/runtime semantics; if no row exists, the catch returns generic 500. The tRPC router uses safer `updateMany` plus explicit count check.

Implementation constraint:

- Prefer the tRPC `updateMany` pattern or `findFirst` then update by unique id after ownership is proven.
- Return 404 or 403 for missing/foreign notification, not 500.
- Add regression tests for “user A cannot mark user B notification read.”

### R7 — Payment/contract/task/crisis context is not first-class on Thread

Risk: MEDIUM.

The business loop names contract/task/payment/crisis context, but `Thread` can only attach event/proposal/listing. Payment, refund, dispute, holdback, contract, task, and crisis models carry richer identifiers than the thread can store.

Implementation constraint:

- Choose one narrow canonical context strategy before implementation:
  - explicit nullable columns for approved W2 targets (`contractId`, `taskId`, `paymentIntentId`, `paymentMilestoneId`, `refundRequestId`, `disputeId`, `crisisIssueId`), or
  - a guarded polymorphic `resourceType/resourceId` plus server-side validators per type.
- Display the exact linked record on thread detail with safe links and status labels.
- Require context validators to prove every linked record belongs to the same event/org/proposal chain.
- For payment contexts, never allow communication actions to change money state; communication can reference payment records only.

### R8 — Payment communication must not bypass guarded payment controls

Risk: HIGH if implemented loosely.

Payment routes contain guarded controls: buyer-side payer check, accepted/provider-backed/signed-contract gates, acceptance records, Stripe idempotency, platform-admin release authority, refund/dispute/holdback blockers, and manual override evidence. A W2 “message about payment” feature must not create an alternate path around those controls.

Implementation constraint:

- A payment-linked thread may read/display payment status but must not trigger create-intent, confirm, refund, release, holdback decision, dispute decision, or legal acceptance from message content.
- Payment thread creation must require the same or narrower access as the payment record’s view permission.
- Senders may discuss payment only if they can view the linked commercial/payment record or are explicit contract signers/participants under policy.
- All payment state changes must stay in canonical payment/admin routes and retain acceptance/audit/override requirements.

### R9 — Current tests prove component behavior, not full workflow closure

Risk: MEDIUM.

`phase5-comms-accountability.test.ts` covers backend send persistence and outsider rejection. `dashboard-core-routes.test.tsx` covers route rendering and outsider not-found behavior. Neither proves create -> notify -> open notification -> reply -> persisted reload -> wrong-role denial across real roles.

Implementation constraint:

- Add backend role-matrix tests for thread creation context validation, read policy, send policy, notification ownership, and cross-org rejection.
- Add app/integration proof for a bound sender/recipient path.
- Protected Preview proof must cover the whole loop under role sessions, not only `/messages` HTTP 200.

## 5. Safe assumptions vs unsafe assumptions

Safe assumptions from inspected evidence:

- OneHub has durable `Thread`, `ThreadParticipant`, `Message`, and `Notification` tables.
- Backend message send can persist a message and create in-app notifications for bound participant `userId`s.
- Notification list/read routes are intended to scope rows to the current user.
- Commercial/payment/crisis records have enough identifiers to support exact communication context if a thread-context contract is added.

Unsafe assumptions that must not be used for closure:

- A user can reply just because `messageRouter.send` exists.
- `Thread.visibility` enforces role privacy just because the enum is stored.
- A participant was notified when they were stored by email without `userId`.
- A thread linked to `eventId` plus `proposalId` is valid without server-side relationship validation.
- A payment-linked message can safely trigger payment/refund/release behavior.
- Preview route availability proves the W2 communication loop.

## 6. Narrow implementation constraints for Forge/Atlas

1. Define a canonical W2 thread policy module before wiring UI:
   - `canReadThread(user, thread)`
   - `canSendThread(user, thread)`
   - `validateThreadContext(input)`
   - `resolveThreadParticipants(input)`

2. Reuse the policy everywhere:
   - `thread.create`
   - `thread.get`
   - `thread.listByContext`
   - `message.send`
   - `/messages`
   - `/messages/[threadId]`
   - notifications’ linked-thread proof

3. Preserve payment control boundaries:
   - payment conversations can reference payment records;
   - payment conversations cannot move money;
   - all money movement remains in canonical payment/admin routes.

4. Make `/messages/[threadId]` the canonical reply path:
   - guarded server action or API route;
   - persisted message row;
   - post-send revalidation/reload;
   - recipient notification row;
   - event activity row where applicable.

5. Add precise context attachment:
   - event/proposal/listing today;
   - contract/task/payment/milestone/refund/dispute/crisis through explicit columns or a validated polymorphic resource contract;
   - display exact context and safe return links on thread detail.

6. Add full-loop proof:
   - seed or create event-linked thread;
   - notify bound recipient;
   - recipient opens notification link;
   - recipient replies;
   - sender sees persisted reply after reload;
   - unrelated role is denied read and send;
   - payment-linked thread cannot trigger payment state changes.

## 7. Correctness gates before W2 closure

Minimum backend/data/security gates:

- `thread.create` rejects unauthenticated, wrong-org, cross-event proposal, cross-listing, unauthorized participant, and invalid payment/crisis context inputs.
- `message.send` rejects unauthenticated users, readable-but-not-sendable users, wrong visibility users, and unrelated users.
- `thread.get` and `/messages/[threadId]` enforce the same read policy.
- `/messages` list cannot reveal subject/body/context for threads the user cannot read.
- Notifications are generated only for authorized recipient users, link only to authorized resources, and cannot be read/marked by other users.
- Payment-linked communication cannot create/confirm/refund/release/holdback/dispute money state.
- Tests cover at least planner, client, vendor, venue, admin, and unrelated authenticated user.

## 8. Final Steward verdict

PARTIAL / RISK

The backend foundation is credible, but W2 should not be accepted as closed. The primary structural blockers are enforced visibility/read-send policy, validated context attachment, registered-recipient notification semantics, canonical reply persistence in the visible route, and payment-boundary preservation.

## 9. Recommended next action for Atlas

Route a narrow Forge implementation card for W2 Communication backend closure with these exact acceptance constraints:

1. Add canonical thread read/send/context/participant policy.
2. Wire `/messages/[threadId]` as the canonical persisted reply path.
3. Validate event/proposal/listing/payment/crisis context relationships server-side before thread creation.
4. Enforce `Thread.visibility` as access policy, not display-only metadata.
5. Make notification semantics honest for registered vs unbound participants.
6. Add backend/app/Preview proof for the complete create -> notify -> open -> reply -> persisted reload -> wrong-role denied workflow.

No founder escalation is required for source/test/report work inside existing OneHub guardrails. FOUNDER ESCALATION REQUIRED only if Atlas wants outbound email/SMS/push delivery, production data changes, live payments, billing/Stripe changes, domain/infra/public exposure changes, credentials, legal commitments, or irreversible production actions.
