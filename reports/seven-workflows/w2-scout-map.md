# W2 Communication — Scout full user workflow map

Task: t_72c825ad
Date: 2026-08-28
Owner lane: Scout
Scope type: read-only product/UX map
Verdict: PARTIAL

## 1. Scope inspected

Assigned workflow:

planner/client/vendor/venue starts event-linked conversation -> participants receive notification -> thread detail works -> reply persists -> context stays tied to event/proposal/listing/contract/task/payment/crisis -> wrong roles blocked.

Acceptance target:

No scattered dead-end contact cards; real in-app thread path works for every role needed in private pilot.

Inspected, read-only:

- Communication data model: `apps/web/prisma/schema.prisma`
- Thread/message/notification routers: `apps/web/src/server/routers/thread.ts`, `apps/web/src/server/routers/message.ts`, `apps/web/src/server/routers/notification.ts`
- Shared access helper: `apps/web/src/server/lib/access.ts`
- User-facing message routes: `apps/web/src/app/(app)/messages/page.tsx`, `apps/web/src/app/(app)/messages/[threadId]/page.tsx`
- Notification UI/API: `apps/web/src/components/notifications/NotificationDropdown.tsx`, `apps/web/src/app/(app)/notifications/page.tsx`, `apps/web/src/app/api/notifications/route.ts`, `apps/web/src/app/api/notifications/[id]/read/route.ts`
- Pro/client/vendor/venue communication-adjacent surfaces: `apps/web/src/app/pro/planner/page.tsx`, `apps/web/src/components/pro-planner/Dashboard.tsx`, `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx`, vendor/venue dashboard search evidence
- Proposal thread context: `apps/web/src/app/(app)/proposals/[id]/page.tsx`, `apps/web/src/components/proposals/ProposalPageClient.tsx`
- UI thread panel: `packages/ui/src/components/ThreadPanel.tsx`
- Tests and Preview evidence: `apps/web/tests/phase5-comms-accountability.test.ts`, `apps/web/tests/dashboard-core-routes.test.tsx`, `apps/web/tests/proposal-provider-handoff.test.tsx`, `reports/preview/ONEHUB_PROTECTED_PREVIEW_RUNTIME_SMOKE_2026-08-28.md`, `reports/preview/ONEHUB_PROTECTED_PREVIEW_RESMOKE_F0497A8_2026-08-28.json`, `reports/preview/ONEHUB_PROTECTED_PREVIEW_FINAL_SMOKE_AA6694D_2026-08-28.json`

No production, env, credential, billing, infra, domain, public exposure, live payment, destructive DB, legal, or public-launch settings were changed. No source implementation files were edited.

## 2. Evidence reviewed

### Durable communication primitives exist

Confirmed:

- `Thread` persists `orgId`, optional `eventId`, optional `proposalId`, optional `listingId`, `subject`, `visibility`, `purpose`, `messages`, and `participants` at `apps/web/prisma/schema.prisma:893-909`.
- `ThreadParticipant` persists optional `userId`, required `email`, optional `roleHint`, and `lastReadAt` at `apps/web/prisma/schema.prisma:914-921`.
- `ThreadVisibility` supports `INTERNAL`, `CLIENT_VISIBLE`, `PROVIDER_VISIBLE`, and `ALL_PARTIES` at `apps/web/prisma/schema.prisma:924-929`.
- `ThreadPurpose` supports `EVENT_COORDINATION`, `PROPOSAL`, `BOOKING_REQUEST`, `INTERNAL_NOTE`, `DOCUMENT_REVIEW`, and `ADMIN_REVIEW` at `apps/web/prisma/schema.prisma:931-938`.
- `Message` persists `threadId`, optional `senderId`, `bodyMd`, optional JSON `attachments`, and `createdAt` at `apps/web/prisma/schema.prisma:940-948`.
- `Notification` persists `userId`, `orgId`, `type`, `title`, optional `body`, boolean `read`, optional `link`, and `createdAt` at `apps/web/prisma/schema.prisma:473-485`.

### Backend can persist threads/messages/notifications, but user flow is not fully exposed

Confirmed:

- `threadRouter.create` is protected and can create a thread with optional first message, participants, event/proposal/listing context, visibility, purpose, activity, and in-app notifications for participant `userId`s at `apps/web/src/server/routers/thread.ts:30-105`.
- `messageRouter.send` is protected, calls `requireThreadAccess`, creates a persisted message, updates thread timestamp, creates in-app notifications for other participant `userId`s, and records event activity at `apps/web/src/server/routers/message.ts:8-53`.
- `requireThreadAccess` authorizes admin, explicit participants by userId or email, thread org members/owners, and listing org members/owners at `apps/web/src/server/lib/access.ts:122-150`.
- `phase5-comms-accountability.test.ts` covers unauthenticated message rejection, outsider read rejection, persisted authenticated message send, notification creation, and activity creation at `apps/web/tests/phase5-comms-accountability.test.ts:80-117`.

### Message inbox/detail routes exist and load on Preview

Confirmed:

- `/messages` lists recent accessible threads and has a real empty state instead of a placeholder at `apps/web/src/app/(app)/messages/page.tsx:26-105`.
- `/messages/[threadId]` loads a thread by id with access conditions, renders organization/context/participants, renders `ThreadPanel`, and links back to an event workspace when `thread.event.slug` exists at `apps/web/src/app/(app)/messages/[threadId]/page.tsx:15-95`.
- `dashboard-core-routes.test.tsx` verifies `/messages`, `/messages/[threadId]`, admin/list/detail parity, outsider isolation, and `/notifications` empty state at `apps/web/tests/dashboard-core-routes.test.tsx:91-190`.
- Protected Preview final smoke shows `/messages` HTTP 200 for ADMIN, PRO_PLANNER, VENDOR, and VENUE at `reports/preview/ONEHUB_PROTECTED_PREVIEW_FINAL_SMOKE_AA6694D_2026-08-28.json:41-47`, `:80-86`, `:165-171`, and `:197-203`.
- Protected Preview re-smoke shows `/messages` HTTP 200 for ADMIN, PRO_PLANNER, VENDOR, and VENUE at `reports/preview/ONEHUB_PROTECTED_PREVIEW_RESMOKE_F0497A8_2026-08-28.json:50-60`, `:110-120`, `:241-250`, and `:286-295`.

### Notification surfaces exist

Confirmed:

- `NotificationDropdown` fetches `/api/notifications`, shows unread count, opens linked notifications, and POSTs `/api/notifications/[id]/read` when a linked notification is clicked at `apps/web/src/components/notifications/NotificationDropdown.tsx:24-82` and `:84-175`.
- `/notifications` lists current-user notifications, can filter by status/type, displays link/read/type metadata, and has a truthful empty state at `apps/web/src/app/(app)/notifications/page.tsx:13-76`.
- `/api/notifications` returns the current user's latest 20 notifications at `apps/web/src/app/api/notifications/route.ts:7-28`.
- `/api/notifications/[id]/read` marks a notification read for the current user only at `apps/web/src/app/api/notifications/[id]/read/route.ts:5-29`.

### Event/proposal/client dashboard surfaces point to messages but do not complete compose/reply

Confirmed:

- The Pro Planner dashboard loads event threads and notifications for the active planner org at `apps/web/src/app/pro/planner/page.tsx:82-95` and `:153-158`.
- The Pro Planner communication hub shows event threads, visibility labels, latest message metadata, message templates, and follow-up reminders at `apps/web/src/components/pro-planner/Dashboard.tsx:1693-1724`.
- Pro Planner internal notes persist to an internal event `Thread` through `/api/pro-planner/files/notes`, but the copy states those notes do not become client/vendor messages at `apps/web/src/components/pro-planner/Dashboard.tsx:1668-1677` and `apps/web/src/app/api/pro-planner/files/notes/route.ts:43-89`.
- The client event page links clients to `/messages` when an event summary is withheld and from the shared summary view at `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:126-139` and `:278-292`.
- Proposal detail can render a proposal-linked thread as context, but passes no send handler at `apps/web/src/app/(app)/proposals/[id]/page.tsx:63-95` and `apps/web/src/components/proposals/ProposalPageClient.tsx:229-233`.
- `ThreadPanel` only enables a reply form when `onSend` is supplied; otherwise it tells users replies are handled elsewhere at `packages/ui/src/components/ThreadPanel.tsx:10-40`.
- Repository search found `ThreadPanel` used in app-facing routes without an `onSend` implementation, and no user-facing caller of `messageRouter.send` / `trpc.message.send` / API message send.

## 3. Findings

### Finding 1 — Reply persists in backend tests, but not in the visible message detail UX

Status: confirmed.
Severity: HIGH.
User-facing gap: thread detail is readable but not a working conversation.

Evidence:

- Backend send exists and is tested: `messageRouter.send` at `apps/web/src/server/routers/message.ts:8-53`; test at `apps/web/tests/phase5-comms-accountability.test.ts:100-117`.
- The actual `/messages/[threadId]` page renders `<ThreadPanel messages={messages} />` with no `onSend` at `apps/web/src/app/(app)/messages/[threadId]/page.tsx:86`.
- `ThreadPanel` hides the reply form without `onSend` and displays: "Replies are handled from the connected event or proposal workflow in this MVP" at `packages/ui/src/components/ThreadPanel.tsx:31-39`.
- Proposal detail also passes no `onSend` at `apps/web/src/components/proposals/ProposalPageClient.tsx:229-233`.

Impact:

A planner/client/vendor/venue can open an inbox and read a thread, but cannot complete the core action "reply persists" from the thread view. This causes revisits because the user must leave the conversation, guess which connected workflow owns reply, and may still find no send surface there.

Narrow correction:

Wire a guarded reply form on `/messages/[threadId]` to the existing `message.send` path, then refresh or append the persisted message and show notification/read state. Keep proposal detail read-only only if `/messages/[threadId]` is the canonical send path and the proposal page links there clearly.

### Finding 2 — Conversation start is not user-facing for the full private-pilot role loop

Status: confirmed.
Severity: HIGH.
User-facing gap: starter routes/cards exist as links or backend APIs, but not as a complete start-conversation action for planner/client/vendor/venue.

Evidence:

- `threadRouter.create` can create contextual threads with first message at `apps/web/src/server/routers/thread.ts:30-105`.
- Pro Planner internal notes can create a planner-only event thread at `apps/web/src/app/api/pro-planner/files/notes/route.ts:43-89`.
- Client event page points to Message Inbox instead of starting an event-linked thread at `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:278-292`.
- Pro Planner communication hub lists event threads but does not provide a "start client/vendor thread" compose action; it provides internal notes, templates, and reminders at `apps/web/src/components/pro-planner/Dashboard.tsx:1668-1724`.
- Vendor and venue dashboards have "Messages" nav/sections, but the inspected evidence shows lead/request message copy rather than a thread create/reply path.

Impact:

A user can land on communication surfaces, but the business loop can only start reliably through internal notes or unseen/server-side creation. A private-pilot user may revisit the dashboard, marketplace, event page, and inbox looking for where to initiate a real event-linked conversation.

Narrow correction:

Add one canonical "Start message" / "Start thread" entry point from event workspace, client event page, provider/venue lead/request detail, and proposal detail. Each should prefill event/proposal/listing context and participants, then create through the existing guarded thread API.

### Finding 3 — Notifications are in-app rows only and only notify participants with `userId`

Status: confirmed.
Severity: MEDIUM.
User-facing gap: participants do not all necessarily receive an actionable alert.

Evidence:

- Thread create and message send derive notification recipients from `participants.map(participant.userId)` and filter out blank user IDs at `apps/web/src/server/routers/thread.ts:72-85` and `apps/web/src/server/routers/message.ts:26-39`.
- `ThreadParticipant.email` is required while `userId` is optional at `apps/web/prisma/schema.prisma:914-921`.
- Notification model has no delivery channel/status fields at `apps/web/prisma/schema.prisma:473-485`.
- Notification dropdown and center are in-app surfaces only at `apps/web/src/components/notifications/NotificationDropdown.tsx:24-82` and `apps/web/src/app/(app)/notifications/page.tsx:13-76`.

Impact:

If a thread participant is stored by email before account binding, no in-app notification row is created for that participant. Users may believe participants were notified because the thread was created, but those people may receive no actionable OneHub alert unless they already have user IDs.

Narrow correction:

Keep copy explicit: "in-app notification sent to registered participants". For full workflow, either require/bind participant `userId` before showing "notified" success or add a safe outbound/email invitation status path that does not imply external delivery when outbound is not configured.

### Finding 4 — Context attachment covers event/proposal/listing, but not contract/task/payment/crisis as first-class thread context

Status: confirmed.
Severity: MEDIUM.
User-facing gap: communication cannot yet stay attached to every context named in the workflow.

Evidence:

- `Thread` has nullable `eventId`, `proposalId`, and `listingId`, but no `contractId`, `taskId`, `paymentIntentId`, `milestoneId`, `crisisIssueId`, or polymorphic resource fields at `apps/web/prisma/schema.prisma:893-909`.
- `ThreadPurpose` includes high-level purpose labels, but not a concrete target relation beyond event/proposal/listing at `apps/web/prisma/schema.prisma:931-938`.
- Message detail displays Organization, Event/listing, and Workflow, but no contract/task/payment/crisis target metadata at `apps/web/src/app/(app)/messages/[threadId]/page.tsx:71-83`.

Impact:

Messages can remain tied to broad event/proposal/listing context, but a user handling contract signatures, payment readiness, task accountability, or crisis recovery cannot see or prove the exact record the conversation belongs to. This creates revisit risk when users must cross-check which payment, contract, task, or crisis issue the thread was about.

Narrow correction:

For the W2 slice, add a minimal resource context contract to thread creation/display: either explicit nullable IDs for the next approved workflow targets or a guarded `resourceType/resourceId` with server-side validation and detail links.

### Finding 5 — Wrong-role blocking exists for outsider access, but visibility/send policy is not yet user-complete

Status: confirmed/partial.
Severity: MEDIUM.
User-facing gap: unauthorized outsiders are blocked, but role visibility semantics are not fully proven through the UX.

Evidence:

- `requireThreadAccess` blocks unrelated users by participant/org/listing access at `apps/web/src/server/lib/access.ts:122-150`.
- Tests verify outsider thread detail rejection at `apps/web/tests/phase5-comms-accountability.test.ts:90-98` and UI route not-found behavior at `apps/web/tests/dashboard-core-routes.test.tsx:160-179`.
- The same helper allows any thread org member to access the thread regardless of `Thread.visibility` at `apps/web/src/server/lib/access.ts:122-135`.
- Pro Planner dashboard labels visibility using stored `thread.visibility` when present, with fallback heuristics using subject/body/roleHint at `apps/web/src/components/pro-planner/Dashboard.tsx:307-312` and `:1699-1707`.

Impact:

The system has a real access boundary for unrelated users, but users still do not get an obvious, proven rule that internal, client-visible, provider-visible, and all-party threads map to exactly the correct reader/sender set. This matters because communication mistakes are high-trust failures: the wrong role seeing internal notes, or the right role missing a thread, would cause immediate private-pilot friction.

Narrow correction:

Promote `Thread.visibility` from display label to enforced read/send policy. Add role-matrix tests for internal/client/provider/all-party threads and expose a clear recipient/visibility summary before thread creation.

### Finding 6 — Preview evidence proves route availability, not the closed communication workflow

Status: confirmed.
Severity: MEDIUM.
User-facing gap: Preview smoke has route proof but not end-to-end conversation proof.

Evidence:

- Preview smoke confirms `/messages` returns 200 for several roles, with empty inbox copy, in the final smoke artifact at `reports/preview/ONEHUB_PROTECTED_PREVIEW_FINAL_SMOKE_AA6694D_2026-08-28.json:41-47`, `:80-86`, `:165-171`, and `:197-203`.
- Re-smoke confirms the same route is not a server error at `reports/preview/ONEHUB_PROTECTED_PREVIEW_RESMOKE_F0497A8_2026-08-28.json:50-60`, `:110-120`, `:241-250`, and `:286-295`.
- The earlier runtime smoke explicitly recorded `/messages` as previously failing with a Server Component error, then locally fixed and requiring protected Preview re-smoke at `reports/preview/ONEHUB_PROTECTED_PREVIEW_RUNTIME_SMOKE_2026-08-28.md:18-36`.
- No inspected Preview artifact shows: create event-linked thread -> notify another role -> open linked notification -> reply -> persisted reply visible to both parties.

Impact:

The current Preview evidence is useful route-health proof, but it cannot close W2 acceptance. Atlas/Sentinel would still need to revisit W2 because the artifact does not prove the business loop under real role sessions.

Narrow correction:

After implementation, add a protected Preview smoke script/artifact that seeds or uses a known event thread, sends a message as one role, verifies the recipient notification link, opens thread detail as recipient, sends a reply, reloads as sender, and verifies both messages plus wrong-role denial.

## 4. User-facing impact summary

Current state is better than a placeholder: OneHub has durable thread/message/notification models, guarded backend send logic, role-aware inbox/detail routes, notification UI, and protected Preview proof that `/messages` no longer crashes for key roles.

But W2 is not yet a closed user workflow. The user can see where communication should happen, but cannot reliably start and reply to an event-linked conversation from the visible surfaces. Notifications are in-app only and registered-user-only. Context is broad for event/proposal/listing, not precise for contract/task/payment/crisis. Wrong-role denial is partly proven, but visibility-specific role policy is not fully enforced or Preview-proven.

This will cause revisits because private-pilot users will click "Messages", read or find an empty inbox, then have to hunt for the real action elsewhere. Atlas should not accept W2 as complete until start/reply/notify/context/wrong-role are proven in one workflow artifact.

## 5. Verdict

PARTIAL

Reason: The infrastructure and route availability are real, and outsider blocking is partially tested. The full user-facing communication loop is incomplete because visible compose/reply paths and full-context/thread visibility proof are missing.

## 6. Narrow next action for Atlas

Route a narrow Forge implementation card for W2 Communication closure:

1. Make `/messages/[threadId]` the canonical persisted reply surface using existing `message.send`.
2. Add a canonical start-thread action from event/client/provider/venue/proposal contexts using existing `thread.create` or focused wrappers.
3. Enforce `Thread.visibility`/role send-read policy server-side and add role matrix tests.
4. Make notification success copy honest for registered in-app recipients versus unbound email participants.
5. Add a protected Preview smoke artifact for: create/start thread -> recipient notification -> recipient opens linked thread -> reply persists -> sender sees reply -> wrong role blocked.

No founder escalation is required for source/test work inside these guardrails. FOUNDER ESCALATION REQUIRED only if Atlas wants protected Preview access changes, outbound email/SMS delivery, public exposure, production data, billing, legal, or domain/infra changes.
