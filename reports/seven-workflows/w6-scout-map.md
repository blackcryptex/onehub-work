# W6 Scout Map — Tasks + Accountability full user workflow

Date: 2026-08-28
Owner lane: Scout
Task: `t_d8273f7f`
Scope: read-only product/UX map for Workflow 6 Tasks + Accountability.
Verdict: PARTIAL

## Scope inspected

Business loop under inspection:

`task -> owner -> dependency/deadline/blocker -> escalation -> completion proof -> dashboard/admin visibility`

I inspected only current code, routes, tests, and Preview evidence for user-facing Tasks + Accountability continuity. No source implementation files were changed; this report is the only intended artifact.

## Evidence reviewed

Current workflow definition and Preview evidence:
- `docs/plans/2026-08-28-seven-pain-points-full-workflow-completion-plan.md:78-82` defines W6 as task creation, owner assignment, dependency/deadline/blocker visibility, notification/escalation, completion proof, dashboard/admin visibility, and role safety.
- `reports/preview/ONEHUB_PROTECTED_PREVIEW_RUNTIME_SMOKE_2026-08-28.md:12-16` records protected Preview route smoke passing for core dashboard routes after login.
- `reports/preview/ONEHUB_PROTECTED_PREVIEW_FINAL_SMOKE_AA6694D_2026-08-28.json:65-100` records `/pro/planner`, `/pro/planner/vault`, `/messages`, `/events/new`, and a selected pro planner event route returning 200.
- `reports/preview/ONEHUB_PROTECTED_PREVIEW_FINAL_SMOKE_AA6694D_2026-08-28.json:27-55` records admin overview/users/messages/event wizard returning 200.

Data and route evidence:
- `apps/web/prisma/schema.prisma:430-443` defines persisted `Task` with `eventId`, `title`, `description`, `status`, `priority`, optional `assigneeId`, optional `dueAt`, timestamps, assignee, and event relation.
- `apps/web/prisma/schema.prisma:386-394` defines persisted `Milestone` with event, title, due date, done flag, and order.
- `apps/web/src/server/routers/task.ts:11-89` exposes canonical task create/update/delete/list procedures with manage/read guards, assignee boundary validation, activity on create/update/status changes, and status values including `BLOCKED` and `DONE`.
- `apps/web/src/server/routers/milestone.ts:7-78` exposes milestone create/update/delete/list/bulkGenerate with event access/manage guards and activity on milestone creation/completion.
- `apps/web/src/app/(app)/events/[eventSlug]/tasks/page.tsx:6-26` loads event tasks into four status columns after `requireAuthorizedEventBySlug(..., "manage")`, but only renders each task title.
- `packages/ui/src/components/KanbanBoard.tsx:5-22` renders static columns and card content supplied by callers; no empty-state, actions, or status movement are built into the board.

Planner dashboard/workspace evidence:
- `apps/web/src/app/api/pro-planner/clients/tasks/route.ts:21-102` creates real client follow-up tasks after authenticated pro planner/admin checks, event/org lookup, `canManageEvent`, client-stakeholder validation, persisted task creation, and audit logging.
- `apps/web/src/components/pro-planner/Dashboard.tsx:882-919` calls `/api/pro-planner/clients/tasks`, appends the returned persisted task into local event state, and tells the user: “Client follow-up task created and added to the event task queue.”
- `apps/web/src/components/pro-planner/Dashboard.tsx:1440-1499` provides a client follow-up form with event, client contact, need, due date, and a “Client follow-ups needing action” queue.
- `apps/web/src/components/pro-planner/Dashboard.tsx:570-578` builds timeline risks from every open task, open milestone, and near-term event-day readiness.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1613-1633` displays event date, open milestones, open tasks, run-of-show readiness, and timeline risks.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:453-468` includes a selected-event tab labelled “Tasks” that anchors to `#workspace-operations`.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:699-705` labels operations with checklist completion and milestone count, but the action target is `/events/${eventSlug}/checklists`, not the tasks board.

Legacy/local UI evidence:
- `apps/web/src/lib/types.event.ts:82-101` defines local UI `Task`/`Milestone` shapes with `due`, `done`, string assignee, lowercase priority, `linkedTo`, `linkedId`, checklist items, `targetDate`, `status`, and `linkedTaskIds`; these do not match the Prisma task/milestone records.
- `apps/web/src/components/panes/TasksMilestonesPane.tsx:29-50` auto-generates local AI tasks/milestones when none exist, then toggles tasks only in component/local event state.
- `apps/web/src/components/tasks/TaskList.tsx:123-204` presents filters, checkboxes, due dates, assignees, priority, overdue labels, milestone chips, and checklist toggles, but all changes are local callbacks rather than proven persisted task status/proof changes.
- `apps/web/src/components/milestones/MilestoneList.tsx:20-23` computes milestone progress from `linkedTaskIds` and local task `done` values, while the persisted schema has no task-milestone link relation.

Admin visibility evidence:
- `apps/web/src/app/(app)/admin/overview/page.tsx:69-73` gates admin overview to admin dashboard access.
- `apps/web/src/app/(app)/admin/overview/page.tsx:123-126` counts blocked tasks, critical open tasks, overdue tasks, and overdue milestones.
- `apps/web/src/app/(app)/admin/overview/page.tsx:166-175` surfaces an “Execution accountability” card, but the CTA routes to `/admin/verification` rather than a task/milestone drill-down.
- `apps/web/src/app/(app)/admin/overview/page.tsx:212-218` includes an “Execution risk” KPI.

Regression evidence:
- `apps/web/tests/phase5-comms-accountability.test.ts:119-146` tests task create manage-access rejection, out-of-bound assignee rejection, and client stakeholder task assignment activity.
- `apps/web/tests/phase5-comms-accountability.test.ts:148-158` tests milestone completion activity.

## Findings

### 1. Task creation and owner assignment exist, but the user-facing path is narrow

Confirmed:
- Pro planners can create a persisted client follow-up task from the dashboard with event, client contact, title, due date, and high priority.
- The API enforces pro planner/admin role, event/org match, manage permission, and client stakeholder boundary.
- The persisted task can hold assignee, due date, priority, status, and description.

Gap:
- The visible creation path is framed as “client follow-up,” not a general event accountability record for assistant, vendor, venue, internal planner, contract, payment, guest, or milestone owners.
- The selected-event “Tasks” tab in the pro planner event workspace anchors to operations, but the visible action at `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:699-705` routes to checklists, not the status-board task page.

User-facing impact:
A planner can assign a client reminder, but cannot confidently use OneHub as the full accountable-work ledger for every owner in the event without revisiting checklists, dashboard cards, and separate routes.

### 2. The dedicated tasks board is too thin to prove accountability

Confirmed:
- `/events/[eventSlug]/tasks` loads persisted tasks by `TODO`, `IN_PROGRESS`, `BLOCKED`, and `DONE` after manage-level event authorization.
- The board separates blocked work from other statuses.

Gap:
- Each card only renders `task.title`; owner, deadline, priority, blocker reason/description, overdue state, dependency links, last update, completion note/proof, and activity history are absent from the page.
- The shared `KanbanBoard` has no empty-state copy, no status movement controls, no create/edit affordance, and no completion/proof UI.

User-facing impact:
A planner sees columns, but not enough context to know who owns the task, why it is blocked, what is late, what depends on it, or what proof closed it. This causes revisits to dashboard queues, messages, notes, and manual memory.

### 3. Deadline visibility exists, but dependency and blocker visibility are not complete

Confirmed:
- Persisted tasks support `dueAt`, `status`, and `description`.
- Admin counts blocked, critical, and overdue tasks.
- Planner timeline risks list open tasks and milestones with due dates.

Gap:
- There is no persisted dependency model between tasks, milestones, vendors, proposals, contracts, guests, payments, files, or crisis issues.
- “Blocked” is a status only; there is no structured blocker reason, blocked-by record, escalation level, blocked-at timestamp, or owner acknowledgment.
- Local UI types include `linkedTo`/`linkedId` and milestones include `linkedTaskIds`, but those are not backed by the persisted schema.

User-facing impact:
OneHub can say something is blocked or overdue, but cannot yet explain the exact dependency chain that caused the block. A planner/admin still has to reconstruct “why” from task descriptions or separate context.

### 4. Escalation is visible as risk queues, not a closed notification/escalation loop

Confirmed:
- Planner dashboard builds waiting-on-client, follow-up reminders, timeline risks, and next actions from open tasks/milestones.
- Admin overview counts execution risks.
- Notification primitives exist elsewhere in the app.

Gap:
- Creating a task does not appear to create an in-app notification for the assignee in the inspected client task API.
- Status changes to `BLOCKED`, `DONE`, or overdue state are recorded as activity in the generic router, but there is no user-facing escalation ladder: assignee notified, owner notified, admin surfaced, or escalation acknowledged.
- Existing Preview evidence proves route load, not end-to-end notification or escalation behavior.

User-facing impact:
A task can be saved and displayed, but OneHub cannot yet prove the assigned owner is alerted or that a missed/blocking task escalates to the right party without manual checking.

### 5. Completion proof/note is missing from both data and UI

Confirmed:
- Persisted task status can become `DONE`.
- Activity records task status changes in the generic task router.

Gap:
- The `Task` model has no `completedAt`, `completedById`, `completionNote`, `proofUrl`, attachment link, or completion evidence field.
- The dedicated task board does not expose a “mark complete with note/proof” path.
- Legacy `TaskList` has a checkbox, but it toggles local `done` state and does not capture proof.

User-facing impact:
Done can mean “checked off,” not “proved.” For private-pilot accountability, this is the highest revisit risk: users may close work without evidence and later need to reopen conversations, documents, or admin records to verify what actually happened.

### 6. Dashboard/admin visibility exists, but admin drill-down is incomplete

Confirmed:
- Pro planner dashboard surfaces client follow-ups, timeline risks, open task counts, milestone counts, and run-of-show readiness.
- Admin overview includes execution accountability counts for blocked, critical, and overdue work.

Gap:
- Admin execution-accountability CTA points to `/admin/verification`, which is money/trust oriented, not a task-specific drill-down.
- Admin can see counts, but not the exact event, task owner, blocker reason, due date, escalation path, or proof from the admin card.
- Preview smoke only proves `/admin/overview` loads; it does not prove admin can investigate a specific blocked/overdue task to completion evidence.

User-facing impact:
Admin oversight can tell that risk exists, but not resolve or audit it from the visible execution card. This creates a revisit loop from admin overview back to planner/event pages.

### 7. Persisted and local task/milestone UI contracts still diverge

Confirmed:
- The canonical Prisma task uses `status`, `priority`, `dueAt`, `assigneeId`, and optional description.
- Older UI task components use `done`, `due`, string assignee, lowercase priority, local checklist, and link fields.
- Older milestone UI computes progress from `linkedTaskIds`, which has no persisted relation.

Gap:
- If these local components are reused in W6 without a mapping/persistence pass, they can display local/AI generated task progress as if it were durable accountability.

User-facing impact:
Users could see task/milestone progress that looks real but does not survive as the canonical workflow record. That would directly violate the “accountable work records, not checklist rows” acceptance bar.

## Business-loop map

| Loop step | Current state | User-flow verdict | Exact revisit risk |
| --- | --- | --- | --- |
| Task created | Persisted client follow-up route and generic task router exist. | PARTIAL | Creation is narrow and not clearly available as the universal event task workflow. |
| Owner assigned | Client stakeholder assignment is validated; generic assignee validation exists. | PARTIAL | UI mostly exposes client contact assignment, not all owner classes or role-specific responsibility. |
| Dependency visible | Local UI has conceptual links; persisted schema does not. | BROKEN | Users must reconstruct dependencies from context outside the task record. |
| Deadline visible | Due dates exist in model/dashboard/timeline risk. | PARTIAL | Board cards hide due date; admin counts do not drill down. |
| Blocker visible | `BLOCKED` status exists and admin counts blocked tasks. | PARTIAL | No structured blocker reason/source/escalation state. |
| Escalation triggered | Planner/admin risk summaries exist. | PARTIAL | No proof assignees/admins are notified or escalation is acknowledged. |
| Completion proof recorded | Status can become `DONE`. | BROKEN | No completion note/proof/attachment/completed-by evidence path. |
| Dashboard visibility | Planner dashboard queues exist. | PARTIAL | Planner sees queues, but selected-event task workflow routes back to checklist/operations fragments. |
| Admin visibility | Execution risk counts exist. | PARTIAL | Admin sees counts, not inspectable task records/proof from the execution card. |
| Wrong-role mutation blocked | Tests cover create/access and assignee boundary; routes use guards. | PARTIAL | Current evidence is mostly unit-level; Preview evidence does not prove role mutation denial end-to-end. |

## Preview evidence assessment

Preview evidence is useful but not sufficient for W6 closure.

Confirmed from Preview artifacts:
- Core authenticated role routes load for admin and pro planner.
- Pro planner event detail loads.
- Admin overview loads and includes trust/risk command center copy.

Not proven by Preview artifacts:
- Create a task from UI, refresh, and see it persist in the selected event task board.
- Assign a real owner and prove that owner can see the assignment.
- Trigger/see notification or escalation for assignment, blocked, critical, or overdue state.
- Mark a task blocked with a reason and see admin/planner drill-down.
- Mark a task done with completion proof/note and see dashboard/admin proof.
- Deny wrong-role task mutation in browser/API smoke.

## User-facing impact

Workflow 6 is not a dead route; it has meaningful primitives and visible planner/admin signals. But it is not yet a closed accountability workflow. Today it behaves like a mixture of client reminders, task columns, timeline risk summaries, and local checklist-style UI. The missing proof, dependency, structured blocker, and escalation surfaces are exactly the gaps that would make OneHub revisit the same event work later.

## Verdict

PARTIAL

Reason: OneHub has persisted task/milestone primitives, guarded creation paths, planner queues, admin execution-risk counts, and Preview route-load evidence. It does not yet prove the full user workflow from owner assignment through dependency/blocker escalation to completion proof and admin drill-down.

## Narrow next action for Atlas

Route Forge to close the W6 accountability spine in the smallest useful slice:

1. Extend the selected-event task board to show persisted owner, due date, priority, description/blocker context, and empty states.
2. Add a persisted completion-proof path: completed-by, completed-at, note/proof/attachment reference, and visible done evidence.
3. Add structured blocker/dependency fields or a small link model before claiming dependency visibility.
4. Create in-app notifications/activity for assignment, blocked, overdue/critical escalation, and completion.
5. Add admin/planner drill-down from execution risk counts to the exact event tasks/milestones and proof.
6. Add browser/API smoke that proves create -> assign -> block/escalate -> complete with proof -> dashboard/admin visibility -> wrong-role denial.

Sentinel should not pass W6 until Preview proves the full loop, not only dashboard route loads.
