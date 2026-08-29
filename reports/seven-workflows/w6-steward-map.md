# W6 Steward Map — Tasks + Accountability backend/data/security workflow

Date: 2026-08-28
Owner lane: Steward
Task: `t_68c9d1b7`
Scope: read-only backend/data/security/payment map for Workflow 6 Tasks + Accountability.
Verdict: RISK

## 1. Backend or structural scope reviewed

Business loop under review:

`task -> owner -> dependency/deadline/blocker -> escalation -> completion proof/note -> dashboard/admin visibility -> wrong-role mutation denial`

This review inspected persisted schema, task/milestone routers, event access/RBAC helpers, notification/activity/audit primitives, admin execution-risk visibility, planner task creation surfaces, payment milestone boundaries, and existing regression evidence. No production, environment, credential, billing, infrastructure, public exposure, live payment, or destructive database action was taken.

## 2. Evidence examined

Workflow definition:
- `docs/plans/2026-08-28-seven-pain-points-full-workflow-completion-plan.md:78-82` defines W6 as accountable tasks, not checklist rows.
- `reports/seven-workflows/w6-scout-map.md:11-13` maps the same full loop from task creation through wrong-role mutation denial.

Prisma/data model evidence:
- `apps/web/prisma/schema.prisma:291-339` defines `Event` with relations to activities, checklists, crisis issues, milestones, proposals, tasks, stakeholders, shares, and org.
- `apps/web/prisma/schema.prisma:354-368` defines event stakeholders with unique `(eventId, userId)` and event/user indexes.
- `apps/web/prisma/schema.prisma:386-394` defines `Milestone` with `eventId`, `title`, `dueAt`, `done`, and `order` only.
- `apps/web/prisma/schema.prisma:407-428` defines checklist/checklist items separately from canonical tasks.
- `apps/web/prisma/schema.prisma:430-443` defines `Task` with `eventId`, `title`, optional `description`, `status`, `priority`, optional `assigneeId`, optional `dueAt`, timestamps, assignee, and event relation.
- `apps/web/prisma/schema.prisma:457-471` defines generic `Activity` with optional event, actor, target, and JSON meta.
- `apps/web/prisma/schema.prisma:473-485` defines `Notification` with user/org/type/title/body/read/link, but no enforced task/escalation type enum.
- `apps/web/prisma/schema.prisma:669-682` defines `PaymentMilestone` separately from operational `Milestone` and `Task`.
- `apps/web/prisma/schema.prisma:1313-1325` limits `TaskStatus` to `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE` and priority to `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

Task and milestone API evidence:
- `apps/web/src/server/routers/task.ts:11-42` creates persisted tasks after `requireEventManageAccess` and `requireAllowedEventAssignee`, then records `TASK_CREATED` activity.
- `apps/web/src/server/routers/task.ts:43-71` updates tasks after manage access and assignee validation, recording `TASK_STATUS_*` or `TASK_UPDATED` activity.
- `apps/web/src/server/routers/task.ts:72-89` deletes and lists tasks, with list gated by event access.
- `apps/web/src/server/routers/milestone.ts:7-78` creates/updates/deletes/lists event milestones with access guards and activity recording, but completion is a boolean only.
- `apps/web/src/app/api/pro-planner/clients/tasks/route.ts:21-110` creates client follow-up tasks for pro planners/admins with event/org validation, `canManageEvent`, client-stakeholder validation, persisted task creation, and audit logging.
- `apps/web/src/app/api/pro-planner/timeline/milestones/route.ts:16-72` creates timeline milestones with manage checks and audit logging.

RBAC/access evidence:
- `apps/web/src/server/lib/access.ts:50-74` centralizes event read/manage authorization for tRPC through org membership and `canManageEvent`.
- `apps/web/src/server/lib/access.ts:76-92` allows task assignees only if they are event creator, org owner, org member, or event stakeholder.
- `apps/web/src/lib/event-access.ts:8-65` protects selected event pages by slug and hides unauthorized events with `notFound()`.
- `apps/web/src/lib/rbac.ts:179-193` allows event management to admins, org owners, planner creators, and non-planner org members.
- `apps/web/src/lib/rbac.ts:423-451` allows event viewing to admins, org owners, planner creators, and explicitly shared client stakeholders; vendors/venues are denied by default.
- `apps/web/src/lib/rbac.ts:653-666` gates dashboard access by role, with admin dashboard limited to admins.

Notification/activity/audit evidence:
- `apps/web/src/server/routers/notification.ts:6-28` exposes reusable notification create/list/read primitives.
- `apps/web/src/server/routers/bookingRequest.ts:37` and message/thread routes use notification creation, proving the notification model is usable.
- `apps/web/src/server/routers/task.ts:33-40` and `apps/web/src/server/routers/task.ts:62-69` record activity for task create/update/status changes, but do not notify assignees or escalate.
- `apps/web/src/server/lib/activity.ts:29-49` writes generic `Activity` rows.
- `apps/web/src/server/lib/audit.ts:4-23` writes generic `AuditLog` rows.

Dashboard/admin visibility evidence:
- `apps/web/src/app/(app)/events/[eventSlug]/tasks/page.tsx:6-28` loads four persisted task columns after manage authorization but renders only each task title.
- `packages/ui/src/components/KanbanBoard.tsx:5-22` renders columns and caller-supplied cards only; it has no built-in movement, empty state, audit, or proof affordance.
- `apps/web/src/components/pro-planner/Dashboard.tsx:882-919` posts client follow-up tasks and appends returned persisted task state locally.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1435-1499` presents client follow-up assignment and waiting-on-client queue.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1613-1633` shows open milestones/tasks and timeline risk cards.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:453-468` labels a selected-event tab as `Tasks`.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:699-705` routes the operations card to `/events/${eventSlug}/checklists`, not the persisted task board.
- `apps/web/src/app/(app)/admin/overview/page.tsx:69-73` gates admin overview.
- `apps/web/src/app/(app)/admin/overview/page.tsx:123-126` counts blocked, critical, and overdue tasks/milestones.
- `apps/web/src/app/(app)/admin/overview/page.tsx:166-175` surfaces an execution accountability card but links to `/admin/verification`, not task drill-down.

Legacy/local UI contract evidence:
- `apps/web/src/lib/types.event.ts:82-101` defines local `Task`/`Milestone` shapes with `done`, `due`, string assignee, `linkedTo`, `linkedId`, checklist items, and `linkedTaskIds`; this diverges from Prisma `Task` and `Milestone`.
- `apps/web/src/components/tasks/TaskList.tsx:23-51` filters/toggles local task state and milestone links.
- `apps/web/src/components/tasks/TaskList.tsx:131-199` displays due date, assignee, priority, overdue label, milestone chip, and checklist toggles locally, not as a proven persisted accountability contract.

Payment boundary evidence:
- `apps/web/src/app/api/payments/mark-milestone-complete/route.ts:31-88` gates payment milestone completion through payment milestone, contract, event, and seller/planner authorization.
- `apps/web/src/app/api/payments/mark-milestone-complete/route.ts:90-126` records `MILESTONE_MARKED_COMPLETE` activity but does not release funds; release remains separate.
- `apps/web/src/server/routers/crisis.ts:20-37` and `apps/web/src/server/routers/crisis.ts:105-167` allow crisis records to link listing, booking request, proposal, contract, and payment milestone context, but tasks are not part of that linked commercial context.

Regression evidence:
- `apps/web/tests/phase5-comms-accountability.test.ts:119-146` tests task create manage-access denial, assignee-boundary denial, and valid stakeholder assignment.
- `apps/web/tests/phase5-comms-accountability.test.ts:148-158` tests milestone completion activity.

## 3. Correctness verdict

RISK

Backend primitives exist, but OneHub cannot safely claim W6 is a closed accountability workflow yet. The current implementation can persist tasks, assign allowed users, record generic activity, count admin execution risk, and create narrow client follow-up tasks. It does not yet persist dependency/blocker semantics, escalation state, notification delivery proof, completion proof, or admin drill-down required to prove the business loop end to end.

## 4. Exact risks and blockers

### R1 — Task rows are structurally too thin for accountable work records

Current `Task` only has title/description/status/priority/assignee/due timestamps. That supports a task list, not a proof-grade accountability record.

Missing fields or relations:
- `createdById` or equivalent accountable creator.
- `completedAt`.
- `completedById`.
- `completionNote`.
- proof/evidence reference, preferably a relation to an event file/media/proof artifact rather than a raw URL-only field.
- `blockedAt`.
- `blockedById`.
- structured `blockerReason` / `blockerType`.
- escalation state and escalation timestamps.
- dependency/link relation to other tasks, milestones, crisis issues, contracts, proposals, payment milestones, guests, files, or booking/provider context.

Risk: `DONE` can mean a silent status flip rather than verified completion. `BLOCKED` can mean an unexplained state rather than an auditable blocker.

### R2 — Dependency visibility is not persisted

Legacy/local task UI has conceptual `linkedTo`, `linkedId`, and milestone `linkedTaskIds`, but Prisma has no equivalent persisted relation. Operational `Milestone` also has no relation back to `Task`.

Risk: any UI that shows dependencies from local state can mislead users into trusting non-durable links. Refresh, dashboard aggregation, admin drill-down, and API smoke cannot prove the dependency chain.

### R3 — Blocker semantics are a status, not an accountable state machine

`TaskStatus.BLOCKED` exists, and admin counts blocked tasks, but there is no structured blocker source, reason, blocking entity, acknowledged-by, last-escalated-at, or resolved-by state.

Risk: planner/admin can see that work is blocked but cannot know why, who owns the unblock, when it escalated, or what proof resolved it. This is the exact partial-closure risk in W6.

### R4 — Task notifications/escalations are not wired to assignment/status changes

Notification infrastructure exists and is used elsewhere, but `taskRouter.create`, `taskRouter.update`, and `/api/pro-planner/clients/tasks` do not create notifications for assignees or admin/planner escalations. `findDueItems` only returns due items; it is not evidence of delivery or escalation.

Risk: a persisted assignment can be invisible to the owner. Overdue/blocked/critical work can exist without proof that the responsible owner or admin was notified.

### R5 — Activity/audit is generic and incomplete for W6 proof

Task router records `Activity` for create/update/status changes. The client task route records `AuditLog`. The two paths are inconsistent: generic router activity is not admin audit log, and client task creation audit is not user-facing event activity. Neither path stores notification delivery or completion proof.

Risk: downstream dashboards may see inconsistent audit trails depending on which route created or changed the task.

### R6 — Selected-event task page requires manage access and renders insufficient data

`/events/[eventSlug]/tasks` requires manage authorization and renders only task titles. It does not surface assignee, due date, priority, blocker reason, dependencies, completion proof, or activity history.

Risk: valid owners/stakeholders may be assigned tasks but lack an appropriate read-only owner view. Managers can open a board but cannot use it as an accountability command center.

### R7 — Admin execution visibility is count-level only

Admin overview counts blocked, critical, and overdue task/milestone items but links execution accountability to `/admin/verification`. That route is payment/trust oriented and not a task-specific drill-down.

Risk: admin can detect execution risk but cannot inspect exact event/task/owner/blocker/proof from the admin accountability card.

### R8 — Payment milestone and execution milestone names can create false coupling

Operational `Milestone` and commercial `PaymentMilestone` are separate models. Payment completion has separate permissions and does not release funds automatically. W6 implementation must not treat task/milestone completion as payment readiness, payout approval, refund acceptance, dispute resolution, or legal signoff.

Risk: if Forge links W6 completion directly to payment state, users may infer money movement or trust/legal readiness from operational task status.

### R9 — Role model needs explicit owner-facing task permissions before broad owner assignment

Assignee validation allows event creator, org owner, org members, and event stakeholders. Event viewing/editing rules are stricter: clients need explicit shared summary to view, vendors/venues are denied by default, and task page requires manage access.

Risk: OneHub can assign a user who cannot see or update their own task through the current selected-event task surface. Adding task-owner update capability without a dedicated policy could over-grant event management rights.

### R10 — Tests prove primitives, not the full closed workflow

Existing tests cover manage denial, assignee-boundary denial, valid stakeholder assignment, and milestone completion activity. They do not prove create -> notify assignee -> owner sees task -> block with reason/dependency -> escalate -> complete with proof -> admin drills into proof -> wrong role denied.

Risk: Sentinel cannot pass W6 on current backend tests without accepting component proof instead of workflow proof.

## 5. Exact implementation constraints for Forge

### Data model constraints

1. Keep `Task` as the canonical persisted W6 work record. Do not treat `ChecklistItem` or legacy local `Task` types as canonical accountability.
2. Add creator and completion evidence fields before claiming accountable completion:
   - `createdById String?` relation to `User`.
   - `completedAt DateTime?`.
   - `completedById String?` relation to `User`.
   - `completionNote String?` with bounded length.
   - a structured proof relation or proof table, not only free text. Minimum safe shape: `TaskProof(id, taskId, uploadedById, label, urlOrMediaId, createdAt)` or a relation to existing event media/document primitives if those already enforce event access.
3. Add blocker fields or a blocker child model before treating `BLOCKED` as actionable:
   - minimum: `blockedAt`, `blockedById`, `blockerReason`, `blockerType`, `blockerResolvedAt`, `blockerResolvedById`.
   - better: `TaskBlocker` table if multiple blockers per task are expected.
4. Add a persisted dependency/link model rather than overloading `description`:
   - minimum: `TaskDependency(id, taskId, dependsOnTaskId, createdById, createdAt)` for task-to-task dependencies.
   - if W6 must link broader workflow objects, use typed links with strict enums, e.g. `TaskLink(type: MILESTONE | CRISIS_ISSUE | CONTRACT | PROPOSAL | PAYMENT_MILESTONE | GUEST | FILE, targetId)`, plus runtime validation that the target belongs to the same event/org.
5. Add indexes for dashboard/admin scans:
   - `(eventId, status)`.
   - `(assigneeId, status, dueAt)`.
   - `(status, priority, dueAt)` for admin execution risk.
   - dependency/link indexes by `taskId` and target.
6. Do not add money-side effects to task completion. W6 completion may create activity/notification/audit only. It must not mutate `PaymentMilestone`, `PaymentIntent`, `EscrowAccount`, refund, dispute, holdback, payout, contract signature, or legal state.

### API constraints

1. Keep manager-level mutations behind `requireEventManageAccess`/`canManageEvent`.
2. Add a separate task-owner permission for narrow owner actions:
   - assignee can view assigned task details without gaining event manage rights.
   - assignee can mark their own task in progress/blocked/done only under safe rules.
   - client/vendor/venue assignees must not gain unrelated event budget, contract, payment, guest, or planner-only visibility.
3. Every task mutation must validate object boundaries from the loaded task/event, never trust `eventId`, `orgId`, or target IDs supplied by the client.
4. Assignment must remain bounded to event creator, org owner/member, or event stakeholder unless Atlas explicitly broadens the policy.
5. If task links can target payment/commercial records, the route must verify same event/org ownership and must not reveal payment amounts or contract details to roles that cannot already view them.
6. Status transition rules should be explicit:
   - `TODO`/`IN_PROGRESS` can move to `BLOCKED` only with structured blocker reason.
   - `DONE` requires completion note or proof according to the workflow acceptance bar.
   - completed tasks should not silently accept mutation to remove proof without manager/admin authority.
7. Write `Activity` and `AuditLog` consistently for create, assignment, status change, blocker set/resolve, proof attach, completion, and deletion. Deletion should preserve audit metadata sufficient to know what was deleted.
8. Prefer transactional writes for mutations that combine task update + notification + activity + audit. Partial writes would create false closure.
9. Use existing `Notification` primitives or a typed notification helper for assignment, due-soon, overdue, blocked, escalation, and completion events. Store enough metadata/link to reach the exact task.
10. Avoid generic `Error` responses in public-facing REST routes where the route already returns status codes; keep 401/403/404/400 semantics explicit.

### RBAC constraints

1. Distinguish these capabilities rather than reusing one broad event permission:
   - task read for manager/admin.
   - task read for assignee/stakeholder with redacted event context.
   - task manage for event manager/admin.
   - task owner update for assigned user.
   - admin execution-risk read.
2. Admin views may aggregate all orgs, but non-admin dashboard/task queries must be scoped to accessible orgs/events or explicit assignments.
3. Client stakeholders require explicit share policy for event content. Assignment alone should not leak full planner workspace context.
4. Vendor/venue task assignment needs a safe owner-facing surface because current `canViewEvent` denies vendors/venues by default.
5. Wrong-role tests must cover create/update/delete/read/proof/admin drill-down, not only task creation.

### Dashboard/admin constraints

1. The selected event `Tasks` tab should route to the persisted task board, not the checklist page, once W6 is implemented.
2. The persisted task board must show owner, due date, priority, blocker state/reason, dependencies, completion proof, and activity trail.
3. Admin execution accountability should link to task/milestone drill-down with exact event, owner, due date, blocker/dependency, escalation state, and proof.
4. Dashboard counts must be backed by the same canonical task model and not mixed with local UI task/checklist state unless clearly labeled.
5. Any local/legacy task UI reuse requires a mapper that reads/writes canonical Prisma `Task` fields and refuses unsupported local-only links.

### Payment/security constraints

1. W6 may reference payment milestones as dependencies or blockers, but must not mutate live-money or payment readiness state.
2. Task completion must never imply payment release, payout approval, refund/dispute decision, holdback release, signature completion, or legal readiness.
3. If a payment milestone blocks a task, expose only role-appropriate summary/status. Do not leak amounts, Stripe identifiers, refund/dispute details, or admin notes to unauthorized task owners.
4. Any future escalation involving payment/trust state must route to existing verification/admin controls, not task-owner mutation.

### Test/verification constraints

Minimum backend/API tests before Sentinel can pass W6:
1. Manager can create task with valid assignee; activity, audit, and assignment notification are written transactionally.
2. Invalid assignee outside event org/stakeholder boundary is rejected.
3. Assignee can read only assigned task summary and cannot read unrelated event details.
4. Wrong-role user cannot create/update/delete another event's task.
5. Block task requires structured reason and records blocker metadata/activity/notification.
6. Dependency/link creation rejects target records from another event/org.
7. Completion requires note/proof and records completed-by/completed-at/proof metadata.
8. Task completion does not mutate payment milestone/payment intent/escrow/refund/dispute/holdback/payout/contract state.
9. Overdue/blocked/critical escalation creates expected notification/audit records and admin drill-down can fetch exact task.
10. Browser/API smoke proves create -> assign -> notify/read -> block/dependency/escalate -> complete with proof -> dashboard/admin visibility -> wrong-role denial.

## 6. Safe assumptions vs unsafe assumptions

Safe assumptions:
- A persisted task table exists and is the right canonical starting point for W6.
- Existing event access helpers are the right base for manager/admin task mutation.
- Existing notification/activity/audit primitives can support W6 if wired transactionally.
- Payment/commercial state is separate and should stay separate from operational task closure.

Unsafe assumptions:
- That `DONE` means completion proof exists.
- That `BLOCKED` means a blocker reason/dependency/escalation exists.
- That assignees can see assigned tasks through current event task UI.
- That admin execution counts are sufficient admin visibility.
- That checklist/local task components represent durable accountability.
- That task completion can safely unlock payment, trust, legal, contract, or payout state.

## 7. Narrow next action for Atlas

Route Forge to implement the W6 accountability spine in a constrained backend-first slice:

1. Extend Prisma with task creator/completion/blocker/dependency/proof fields or small child tables, plus dashboard indexes.
2. Add task-owner read/update policies separate from event manage access.
3. Update task mutations transactionally for task row + activity + audit + notification.
4. Add admin/task drill-down APIs scoped by admin/manager/assignee permissions.
5. Keep all payment/legal/trust state read-only from W6.
6. Add the workflow tests listed above before any Sentinel pass.

FOUNDER ESCALATION REQUIRED only if Atlas wants production notification delivery, live payment/billing behavior, credential/env changes, public exposure, legal readiness claims, or broader role/visibility policy beyond existing event org/stakeholder boundaries.

Sentinel should veto W6 closure until completion proof, structured blockers/dependencies, notification/escalation evidence, admin drill-down, and wrong-role denial are all proven from the canonical persisted task model.
