# OneHub communication, milestone, task, and accountability implementation map

Date: 2026-08-27
Owner lane: Steward
Scope: read-only backend/data implementation map for real in-app communication, notifications, milestones, tasks, accountability, and admin risk queues for Phases 5-6.
Verdict: PARTIAL/RISK

## Scope reviewed

Assigned backend/data surfaces inspected:
- `apps/web/prisma/schema.prisma`
- `apps/web/src/server/routers/thread.ts`
- `apps/web/src/server/routers/message.ts`
- `apps/web/src/server/routers/notification.ts`
- `apps/web/src/server/routers/milestone.ts`
- `apps/web/src/server/routers/task.ts`
- `apps/web/src/server/routers/activity.ts`
- `apps/web/src/server/lib/access.ts`
- `apps/web/src/server/lib/activity.ts`
- `apps/web/src/lib/outbound.ts`
- `apps/web/src/server/routers/guest.ts`

Assigned role/dashboard surfaces inspected:
- `apps/web/src/app/(app)/messages/page.tsx`
- `apps/web/src/app/(app)/messages/[threadId]/page.tsx`
- `apps/web/src/app/pro/planner/page.tsx`
- `apps/web/src/components/pro-planner/Dashboard.tsx`
- `apps/web/src/app/pro/planner/vault/page.tsx`
- `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx`
- `apps/web/src/components/panes/TasksPane.tsx`
- `apps/web/src/components/panes/TasksMilestonesPane.tsx`
- `apps/web/src/components/tasks/TaskList.tsx`
- `apps/web/src/components/milestones/MilestoneList.tsx`
- `packages/ui/src/components/ThreadPanel.tsx`
- `packages/ui/src/components/ActivityList.tsx`
- `packages/ui/src/components/MilestoneTimeline.tsx`

Admin risk surfaces inspected:
- `apps/web/src/app/(app)/admin/overview/page.tsx`
- `apps/web/src/app/(app)/admin/verification/page.tsx`
- `apps/web/src/app/(app)/admin/verification/disputes/[id]/page.tsx`
- `apps/web/src/app/(app)/admin/verification/refunds/[id]/page.tsx`
- `apps/web/src/app/(app)/admin/verification/holdbacks/[id]/page.tsx`
- `apps/web/src/app/(app)/admin/verification/payouts/[id]/page.tsx`

No source implementation files were changed. This report is the only intended artifact.

## Evidence examined

### Prisma model structure

`apps/web/prisma/schema.prisma` has usable but incomplete primitives:
- `Thread`: `orgId`, optional `eventId`, optional `proposalId`, optional `listingId`, `subject`, relation to messages and participants.
- `ThreadParticipant`: `threadId`, optional `userId`, required `email`, optional `roleHint`.
- `Message`: `threadId`, optional `senderId`, `bodyMd`, optional `attachments`, `createdAt`.
- `Notification`: `userId`, `orgId`, arbitrary `type`, `title`, optional `body`, boolean `read`, optional `link`, `createdAt`.
- `Milestone`: `eventId`, `title`, `dueAt`, boolean `done`, `order`.
- `Task`: `eventId`, `title`, optional `description`, `status`, `priority`, optional `assigneeId`, optional `dueAt`.
- `Activity`: `orgId`, optional `eventId`, optional `actorId`, string `action`, optional `target`, optional JSON `meta`.
- `Checklist`/`ChecklistItem`: event-scoped checklist structure with optional assignee and due date.

### Thread/message API structure

`apps/web/src/server/routers/thread.ts` currently exposes `thread.create`, `thread.listByContext`, and `thread.get` as `publicProcedure` without authentication, object access checks, participant normalization, or event/proposal/listing ownership validation.

`apps/web/src/server/routers/message.ts` exposes `message.send` as `publicProcedure`. It reads the auth session only to set optional `senderId`, then creates a message for any supplied `threadId`. Unauthenticated writes are possible at the router level unless this route is unreachable elsewhere.

`apps/web/src/server/lib/access.ts` already defines `requireThreadAccess(user, threadId)` and `canAccessThread(user, thread, userOrgIds)`. The helper allows admin, participant by `userId` or email, thread org members, and listing org members for listing-targeted threads. This is the safest existing access primitive for Forge to reuse, but the active `thread.ts`/`message.ts` routers are not using it.

### Message UI structure

`apps/web/src/app/(app)/messages/page.tsx` lists up to 50 threads where `thread.org.members` contains the current user. It does not include org owner access unless owner also has membership, does not include explicit thread participants outside org membership, and does not include listing/provider-side participants unless they are in the thread org.

`apps/web/src/app/(app)/messages/[threadId]/page.tsx` fetches a thread by id where `thread.org.members` contains the current user. It renders `ThreadPanel` read-only and links back to the event workspace when an event slug exists. It does not use `requireThreadAccess`, so page access does not match the helper and can falsely deny legitimate participants or listing-org readers while still being stricter than the current tRPC routers.

`packages/ui/src/components/ThreadPanel.tsx` supports rendering messages and an optional `onSend`; current app usage for message detail passes no `onSend`, so replies are not wired from this page.

### Notification structure

`apps/web/src/server/routers/notification.ts` has:
- `notify(userId, data)` helper that only creates an in-app `Notification` row.
- `listMy` returns unread notifications for the current authenticated user, take 20.
- `markRead` uses `updateMany({ id, userId })`, so read marking is user-scoped.

Notifications currently represent in-app unread state, not external delivery. They have no `deliveredAt`, `deliveryStatus`, `channel`, `provider`, `providerMessageId`, `actionRequired`, `severity`, `actorId`, or `resource` contract. The `type` field is stringly typed.

`apps/web/src/lib/outbound.ts` has explicit delivery status values: `NOT_CONFIGURED`, `FAILED`, `SENT`. The guest invitation flow in `apps/web/src/server/routers/guest.ts` uses these states correctly: invitation `sentAt` is only written when status is `SENT`; activity says `INVITATIONS_PREPARED` when no real send happened; returned user copy explicitly avoids claiming email was sent when outbound is missing or failed.

### Milestone/task API structure

`apps/web/src/server/routers/milestone.ts` has `create`, `update`, `delete`, `list`, and `bulkGenerate`. `create` checks authentication, loads the event, and records `MILESTONE_CREATED`, but does not enforce `requireEventAccess` or `canManageEvent`. `update`, `delete`, `list`, and `bulkGenerate` do not perform a user/session authorization check.

`apps/web/src/server/routers/task.ts` has `create`, `update`, `delete`, and `listByEvent` as `publicProcedure` with no authentication, org membership, event access, or manage permission checks.

The stronger planner-specific route `apps/web/src/app/api/pro-planner/clients/tasks/route.ts` does enforce current user, `PRO_PLANNER`/`ADMIN`, event/org match, `canManageEvent`, and validates selected client stakeholder before creating a real task. It writes audit action `pro_planner.client_task.created`.

The stronger planner-specific route `apps/web/src/app/api/pro-planner/timeline/milestones/route.ts` enforces current user, event/org match, `canManageEvent`, date validation, and writes audit action `pro_planner.timeline.milestone.created` before returning a persisted milestone.

### Dashboard/accountability structure

`apps/web/src/app/pro/planner/page.tsx` loads real persisted events, tasks, milestones, stakeholders, media, threads, booking requests, proposals, contracts, notifications, memberships, invites, and vendor relationships for the active planner org. For non-admin planners it filters events by `createdById = user.id`.

`apps/web/src/components/pro-planner/Dashboard.tsx` already has real sections for:
- Team and assistant operations.
- Client follow-up center with persisted task creation through `/api/pro-planner/clients/tasks`.
- Vendor and venue relationship hub with persisted vendor relationship notes/follow-ups.
- Timeline, milestones, and readiness with persisted milestone creation through `/api/pro-planner/timeline/milestones`.
- Files/documents with internal planner notes persisted as an internal `Thread` through `/api/pro-planner/files/notes`.
- Communication hub showing event threads and labeling subjects containing `internal` as planner-only.
- Next safe planner actions derived from waiting client tasks, proposals missing contract movement, payment milestones, vendor follow-ups, and week-of readiness.

`apps/web/src/components/pro-planner/Dashboard.tsx` also has no-fake-send language in visible copy: assistant invite creation says email delivery is not automatic yet, internal notes do not become client/vendor messages, availability holds do not charge or confirm bookings, and next safe action says OneHub will not send messages, approve contracts, or move money automatically.

Older/shared dashboard components still use local `EventItem` types in `apps/web/src/lib/types.event.ts` with task fields (`due`, `done`, lowercase priority, `linkedTo`, `linkedId`, checklist) and milestone fields (`targetDate`, `status`, `critical`, `linkedTaskIds`) that do not match the Prisma `Task`/`Milestone` models. `TasksPane`, `TasksMilestonesPane`, `TaskList`, and `MilestoneList` currently operate as local/UI abstractions and should not be treated as canonical persistence contracts without a mapping change.

### Admin risk queue structure

`apps/web/src/app/(app)/admin/overview/page.tsx` provides an admin-only trust/risk command center using `canAccessDashboard(user, "ADMIN")`. It counts open disputes, open refund requests, active holdbacks, pending payouts, and open abuse reports. Its command copy states oversight only and no live money movement or credential changes.

`apps/web/src/app/(app)/admin/verification/page.tsx` lists refund, dispute, holdback, payout, and override queues behind admin-only access. Detail pages for disputes, refunds, holdbacks, and payouts load related fee snapshots, acceptance proof, refund status, dispute status, holdback state, payout/release state, and override history.

## 1. Current models/routes that can be reused

Reusable now, with constraints:

1. `Thread`, `ThreadParticipant`, `Message`
   - Reuse as the durable in-app communication record for event, proposal, listing, and internal planner threads.
   - Constraint: add explicit visibility/purpose semantics before public role rollout. Today `roleHint` and subject-name checks are too soft for client/vendor boundaries.

2. `requireThreadAccess` / `canAccessThread`
   - Reuse as the baseline read/write guard for thread detail, message send, and context lists.
   - Constraint: update page and tRPC routers to call the same helper so API and UI access cannot drift.

3. `Notification` and `notificationRouter`
   - Reuse for in-app notification rows and unread state.
   - Constraint: keep it as in-app state unless delivery fields are added. Do not imply email/SMS/push delivery from row existence.

4. `notify(userId, data)`
   - Reuse for server-created in-app alerts after real events: message created, task assigned, milestone due/changed, proposal response, admin risk item created.
   - Constraint: notification creation must happen inside the same transaction or post-commit path as the underlying persisted event to avoid orphaned alerts.

5. `Task`
   - Reuse as the canonical event accountability item for client follow-ups, assistant work, vendor follow-ups, and owner tasks.
   - Constraint: base `taskRouter` is unsafe. Use the stronger pro-planner route pattern or replace with guarded procedures.

6. `Milestone`
   - Reuse as the event readiness gate/date contract.
   - Constraint: it lacks owner/status/progress detail beyond `done`; Phase 5-6 can start minimal but should not pretend it stores linked task progress without a link model.

7. `Activity` and `recordActivity`
   - Reuse as event/org audit timeline for user-visible event history.
   - Constraint: `Activity.action` is stringly typed and cannot be the only source of truth for permission-sensitive state.

8. `Audit`/`recordAudit` patterns in planner API routes
   - Reuse for backend trust/accountability changes, especially pro-planner task/milestone creation and admin risk queue movement.
   - Constraint: do not expose audit payloads broadly; they can include internal operational metadata.

9. Admin verification pages
   - Reuse as the destination for communication/accountability risk escalation when message/task/milestone state affects money release, refund/dispute, holdback, payout, or abuse review.

## 2. Minimal APIs/UI surfaces needed for event/provider/client threads

### Canonical thread API slices

Forge should implement the smallest safe API set around the existing models:

1. `thread.listMy` or guarded `thread.listByContext`
   - Input: optional `eventId`, `proposalId`, `listingId`, optional `visibility`/`purpose` filter once added.
   - Auth: `protectedProcedure`.
   - Guard: require event/proposal/listing/thread access; use org membership, explicit participant, and listing org logic from `requireThreadAccess`/commercial access helpers.
   - Output: thread id, subject, context labels, participant display summaries, latest message metadata, unread count when available.

2. `thread.createForEvent`
   - Input: `eventId`, `subject`, participant identifiers, `visibility` (`INTERNAL`, `CLIENT_VISIBLE`, `PROVIDER_VISIBLE`, `ALL_PARTIES`), optional first message.
   - Auth: protected.
   - Guard: `canManageEvent` for planner-created operational threads; client/provider self-start should require explicit event share/proposal/listing relationship.
   - Persistence: create thread, participants, optional message, activity, and in-app notifications in one transaction.

3. `thread.createForProposal`
   - Input: `proposalId`, subject, participant set, first message.
   - Guard: `canViewCommercialProposal` to read; stricter send/manage rules for who can invite participants.
   - Purpose: provider/client proposal questions and proposal-response audit trail.

4. `message.send`
   - Input: `threadId`, `bodyMd`, optional attachment references.
   - Auth: protected only; no anonymous message creation.
   - Guard: `requireThreadAccess(ctx.user, threadId)` plus participant/send policy.
   - Persistence: create message with non-null `senderId` for authenticated app users, update thread timestamp if added, create unread notifications for other participants, and record activity when the thread is event/proposal scoped.

5. `thread.markRead` or per-participant read receipt
   - Current schema has only notification read state. If unread thread counts are needed, add `ThreadParticipant.lastReadAt` instead of inferring from notifications alone.

### Minimal schema additions for real communication

Required for structural safety:
- `Thread.visibility` enum: `INTERNAL`, `CLIENT_VISIBLE`, `PROVIDER_VISIBLE`, `ALL_PARTIES`.
- `Thread.purpose` enum/string union: `EVENT_COORDINATION`, `PROPOSAL`, `BOOKING_REQUEST`, `INTERNAL_NOTE`, `DOCUMENT_REVIEW`, `ADMIN_REVIEW`.
- `Thread.updatedAt` for stable inbox ordering independent of initial creation.
- `ThreadParticipant.lastReadAt` for thread unread state.
- `ThreadParticipant.role` enum or constrained value instead of loose `roleHint`.
- `Message.visibility` only if message-level redaction is required; otherwise keep visibility at thread-level to avoid accidental mixed-visibility conversations.
- Attachment references should point to persisted `Media`/document records or a guarded attachment model, not raw unvalidated JSON strings.

### UI surfaces

Minimal UI surfaces:

1. Event workspace communication panel
   - Shows threads scoped to the event.
   - Separates internal planner-only threads from client/vendor visible threads.
   - Allows send only when backend says the user has `canSend` for that thread.

2. Proposal/booking request thread panel
   - Shows provider/client conversation tied to proposal or booking request.
   - Must display real persisted messages only; do not display draft proposal status as if provider replied.

3. Global message inbox
   - Replace current org-members-only query with guarded `listMy` semantics so explicit participants and provider listing org readers can see their threads.

4. Notification center/bell
   - Shows in-app notification rows and read state.
   - Labels notifications as in-app unless tied to a verified external delivery record.

5. Admin review communication context
   - Admin verification detail should link relevant proposal/event/thread context when disputes/refunds/holdbacks/payouts are affected by unread messages or task/milestone blockers.

## 3. Notification truth states and no-fake-send rules

### Required truth states

Keep these state categories separate:

1. In-app notification state
   - `CREATED`: notification row exists.
   - `READ` / `UNREAD`: user interaction state.
   - This is all current `Notification` can truthfully represent.

2. External delivery state
   - `NOT_CONFIGURED`: provider credentials/channel are absent; no send occurred.
   - `FAILED`: provider attempt failed; no sent claim.
   - `SENT`: provider accepted the message; store provider/channel/message id when available.
   - These states already exist in `apps/web/src/lib/outbound.ts` and are used properly by guest invitation email.

3. Business/action state
   - `ACTION_REQUIRED`, `INFO`, `WARNING`, `RISK`, `BLOCKER` should be explicit notification/severity fields if dashboards depend on them.
   - Do not infer business severity from free-text title.

### No-fake-send rules

1. Creating a `Notification` row is not an email, SMS, push, or webhook send.
2. `sentAt`, `deliveredAt`, provider message id, or `SENT` copy may be written only after provider result status is `SENT`.
3. If provider config is absent, persist/return `NOT_CONFIGURED` and say the message or invitation was prepared, not sent.
4. If provider returns an error, persist/return `FAILED` and say delivery failed; keep the in-app thread/message record if it was saved.
5. UI buttons must say `Save note`, `Create in-app notification`, `Prepare invite`, or `Send email` based on the exact backend behavior.
6. Test/mock providers may only return `SENT` in test mode (`ONEHUB_OUTBOUND_TEST_MODE === "true"` pattern already exists). Do not allow production mock-sent claims.
7. Real messages must be persisted before user copy says a reply was sent in-app.
8. External channel setup, credential changes, SMS activation, or live provider wiring is outside this task and requires Atlas/Marlon approval.

## 4. Milestone/task ownership and persistence requirements

### Canonical persistence requirements

Tasks:
- Every task must belong to an event.
- Every mutation must enforce authenticated user and object-level event manage permissions.
- Assignee must be either an org member, event stakeholder, or explicitly allowed external/client participant for that event.
- Client follow-up tasks should retain the current guarded route invariant: selected client must be an `EventStakeholder(role: CLIENT)` on the same event.
- Add or derive `createdById` if accountability needs owner/source history beyond audit logs.
- If tasks must link to milestones, vendors, proposals, contracts, guests, or documents, add typed link fields/model instead of relying on local UI-only `linkedTo`/`linkedId` types.
- Status changes must record activity/audit, especially `BLOCKED` and `DONE`.

Milestones:
- Every milestone must belong to an event.
- Every create/update/delete must enforce event manage permission.
- A milestone is not achieved unless persisted `done = true` or all required linked tasks are done under a defined link model.
- Current `Milestone` has no persisted `status`, `critical`, `targetDate`, or `linkedTaskIds`; those fields exist only in local UI types. Forge must either map UI fields to Prisma fields (`targetDate -> dueAt`, computed status from due/done) or add schema fields/relations before claiming persistent risk/progress.
- Milestone completion should record `MILESTONE_MARKED_COMPLETE` activity and, if money-related, trigger existing payment release guardrails rather than direct release.

Activity/audit:
- `Activity` should capture user-visible event timeline actions.
- `Audit` should capture backend/security/accountability actions.
- Do not use `Activity` alone for legal/payment/admin decisions; admin queues must reference the source records.

### Current gaps to fix before Phase 5-6 is structurally safe

1. Base `taskRouter` is unauthenticated and unguarded.
2. Base `milestoneRouter.update/delete/list/bulkGenerate` are unguarded; `create` authenticates but does not enforce event manage access.
3. Local UI task/milestone types diverge from Prisma persistence shape.
4. Internal thread visibility depends on subject text/`roleHint`, not a durable enum.
5. There is no read receipt or unread count model for threads.
6. There is no canonical transaction path that creates message + notifications + activity together.

## 5. Admin risk queue implications

The admin risk queue is already present for money/trust review and should be extended by reference, not duplicated.

Current reusable admin queues:
- Disputes: `OPEN`, `NEEDS_INFO`, `UNDER_ADMIN_REVIEW`, `ESCALATED` counted and routed in admin overview/verification.
- Refunds: `OPEN` refund requests counted/routed.
- Holdbacks: `ACTIVE` holdbacks counted/routed.
- Payouts: `PENDING` payouts counted/routed.
- Abuse reports and admin overrides also visible in admin overview/verification.

Phase 5-6 communication/accountability implications:

1. Message-driven risk
   - Unanswered provider/client messages should not automatically freeze money, but they can create action-required tasks or admin context when tied to disputes/refunds/holdbacks.
   - Admin verification detail should surface relevant event/proposal thread links, not copy message bodies into risk records unless needed.

2. Task/milestone-driven risk
   - Overdue client approval/signature/payment tasks should appear in planner timeline risks first.
   - Money-affecting milestone completion/release must route through payment guardrails and admin verification when refunds/disputes/holdbacks are present.

3. Internal note risk
   - Internal planner notes must remain internal. If an internal note flags payment, fraud, abuse, or legal concern, create/link a proper admin review record rather than relying on a private thread label.

4. No auto-outbound escalation
   - Admin queue entries may create in-app notifications for admins, but external outbound alerts must obey delivery status rules and provider configuration.

5. Audit trail
   - Admin decisions must keep using verification detail pages and `recordAudit`/override history. Communication features should add context links, not bypass admin decision surfaces.

## 6. Forge implementation slices

### Slice A — Lock thread/message routers to canonical access

Files:
- `apps/web/src/server/routers/thread.ts`
- `apps/web/src/server/routers/message.ts`
- `apps/web/src/server/lib/access.ts`
- tests under `apps/web/tests/`

Work:
1. Convert thread/message write/read procedures to `protectedProcedure` or equivalent authenticated guards.
2. Use `requireThreadAccess` for `thread.get` and `message.send`.
3. For context listing, require access to supplied event/proposal/listing and return only threads the user can access.
4. Block anonymous `message.send`.
5. Add transaction for message creation plus participant notifications/activity.

Acceptance:
- Stranger cannot list/get/send into a thread by id.
- Explicit participant can access their thread even if not org member when intended.
- Listing/provider org reader can access listing-scoped provider thread when intended.
- Message sender id is set for authenticated users.

### Slice B — Add explicit thread visibility/purpose and read receipts

Files:
- `apps/web/prisma/schema.prisma`
- migration
- thread/message UI surfaces
- tests

Work:
1. Add `ThreadVisibility`, `ThreadPurpose`, `Thread.updatedAt`, and `ThreadParticipant.lastReadAt`.
2. Replace subject-text internal detection with `visibility === INTERNAL`.
3. Keep visibility thread-level unless a hard product requirement demands message-level mixed visibility.

Acceptance:
- Internal planner notes cannot render as client/vendor visible by subject manipulation.
- Inboxes order by latest message/thread update.
- Unread counts derive from participant read state, not guessed from notification rows.

### Slice C — Guard canonical task/milestone APIs

Files:
- `apps/web/src/server/routers/task.ts`
- `apps/web/src/server/routers/milestone.ts`
- `apps/web/src/server/lib/access.ts` or shared event mutation helper
- tests

Work:
1. Convert base task and milestone procedures to protected access.
2. Enforce `canManageEvent` for create/update/delete/bulkGenerate and `requireEventAccess` for list.
3. Validate assignee belongs to allowed event/org/stakeholder scope.
4. Record activity/audit on create/update/status/done changes.

Acceptance:
- Unauthorized user cannot create/list/update/delete another event's tasks/milestones by id.
- Client-assigned task cannot target a user not attached to the event.
- Milestone completion records an activity event.

### Slice D — Align UI task/milestone contracts with Prisma

Files:
- `apps/web/src/lib/types.event.ts`
- `apps/web/src/components/panes/TasksPane.tsx`
- `apps/web/src/components/panes/TasksMilestonesPane.tsx`
- `apps/web/src/components/tasks/TaskList.tsx`
- `apps/web/src/components/milestones/MilestoneList.tsx`
- role event pages using these components

Work:
1. Map Prisma `Task.status` to checkbox/display state explicitly.
2. Map Prisma `Task.dueAt` to UI due date; handle null safely.
3. Map Prisma `Milestone.dueAt` and `done` to computed status.
4. Do not display `linkedTaskIds` progress unless a real relation exists.

Acceptance:
- UI cannot show locally generated AI tasks/milestones as persisted unless saved.
- Milestone progress copy matches stored state.
- No runtime assumptions on missing `due`, `targetDate`, or `linkedTaskIds` when records come from Prisma.

### Slice E — Notification truth contract

Files:
- `apps/web/src/server/routers/notification.ts`
- `apps/web/src/lib/outbound.ts`
- invitation/proposal/message notification call sites
- tests

Work:
1. Add typed notification categories/severity/action state if needed.
2. Keep external delivery status separate from in-app notification read state.
3. Reuse guest invitation no-fake-send pattern across any email/SMS-capable feature.
4. Ensure UI copy names exact behavior: in-app saved, email sent, email unavailable, or delivery failed.

Acceptance:
- Tests prove `sentAt`/`deliveredAt` is written only on `SENT`.
- In-app notification creation never claims email/SMS delivery.
- Production mock provider cannot claim real sent state.

### Slice F — Admin risk context integration

Files:
- `apps/web/src/app/(app)/admin/verification/page.tsx`
- admin verification detail pages
- risk creation/linking helpers if needed

Work:
1. Link relevant event/proposal threads, open tasks, and milestone blockers from admin detail pages.
2. Keep money movement actions inside existing guarded verification controls.
3. Add in-app admin notifications only for real risk records or status changes.

Acceptance:
- Admin can inspect communication/task/milestone context for disputes/refunds/holdbacks/payouts.
- No communication feature can directly release funds, approve refunds, or override holdbacks.

## 7. Sentinel checks

Sentinel should verify these before approving Phase 5-6 implementation:

1. Authorization checks
   - Thread/message/task/milestone APIs require authentication.
   - Object-level guards deny unrelated users by id.
   - Page access and router access use the same permission semantics.

2. Internal/client/provider visibility
   - Internal planner notes never appear in client/vendor inboxes.
   - Provider-visible threads do not leak planner-only client/accountability notes.
   - Client-visible threads do not leak provider-only commercial/admin context unless explicitly intended.

3. Persistence truth
   - Message send creates a real `Message` row before success response.
   - Task/milestone creation creates real rows, not only local UI state.
   - Activity/audit rows reference real source records.

4. Notification truth
   - In-app notifications are not external delivery claims.
   - `SENT` only follows a provider-accepted result.
   - `NOT_CONFIGURED` and `FAILED` copy is visible and tested.

5. Accountability integrity
   - Task assignees are scoped to the same event/org/stakeholder boundary.
   - Milestone completion cannot bypass payment release/refund/dispute/holdback guardrails.
   - Open tasks/milestones drive planner risk queues without automatically changing money state.

6. Admin queue safety
   - Communication/accountability context augments admin verification; it does not replace it.
   - Refund/dispute/holdback/payout actions remain admin-gated.
   - All admin decisions remain auditable.

7. Regression coverage
   - Add tests for unauthenticated/unauthorized access on thread, message, task, and milestone routers.
   - Add tests for internal vs client/provider thread visibility.
   - Add tests for no-fake-send delivery statuses.
   - Add tests for pro-planner task/milestone creation preserving current `canManageEvent` checks.

## Correctness verdict

PARTIAL/RISK.

OneHub has usable persistence primitives and some strong planner-specific API routes for client follow-up tasks, timeline milestones, internal planner notes, in-app notifications, and admin risk queues. However, the generic thread/message/task/milestone routers are currently too permissive for real client/provider communication and accountability. The safest Phase 5-6 path is not broad schema replacement; it is to guard and align the existing primitives, add explicit thread visibility/read state, preserve no-fake-send delivery truth, and keep all money/risk implications inside existing admin verification controls.

## Exact risks/blockers

1. `thread.ts`, `message.ts`, and `task.ts` expose public procedures without object-level guards; `message.send` can create a message without an authenticated sender.
2. `milestoneRouter.update/delete/list/bulkGenerate` lack user authorization; `create` lacks event manage authorization.
3. Message inbox pages use org-membership-only access, while `requireThreadAccess` has broader participant/listing-org semantics; UI/API contract drift is already present.
4. Internal planner thread visibility is inferred from subject/roleHint rather than durable visibility fields.
5. Current `Notification` rows prove only in-app unread state, not external delivery.
6. Local UI task/milestone types diverge from Prisma persistence and can overstate persisted progress if reused blindly.
7. Milestone/task accountability can affect money/risk decisions; those effects must route through admin verification and payment guardrails, not direct automation.

## Narrow next action for Atlas

Route Forge to Slice A first: lock thread/message APIs to authenticated canonical access and transactionally create messages with in-app notifications/activity. Then route Slice C for task/milestone router guards before any client/provider-visible Phase 5-6 communication launch. Sentinel should review authorization, visibility, no-fake-send, and admin queue safety after each slice.
