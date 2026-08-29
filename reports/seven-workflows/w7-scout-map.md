# W7 Scout Map — Crisis/Event-Day Recovery Full User Workflow

Date: 2026-08-28
Owner: Scout
Routed by: Atlas
Verdict: PARTIAL

## 1. Scope inspected

Read-only product/UX map for Workflow 7: Crisis/Event-Day Recovery.

Business loop checked:

1. issue reported
2. commercial context identified
3. notifications
4. replacement
5. timeline/task/budget/payment risk
6. admin oversight
7. resolution

Guardrails observed: no production, env, credential, billing, infrastructure, domain, public exposure, live-payment, destructive DB, legal, or public-launch changes. This report is the only file change.

## 2. Evidence reviewed

Primary workflow requirement:

- `docs/plans/2026-08-28-seven-pain-points-full-workflow-completion-plan.md:86-90` defines Workflow 7 as issue reported -> linked vendor/venue/contract/payment/task/milestone identified -> stakeholders notified -> replacement options/request started -> timeline/tasks/budget/payment risk updated -> admin oversight shows open risk -> resolution recorded.

Source evidence:

- `apps/web/src/server/routers/crisis.ts:20-37` accepts linked listing, booking request, proposal, contract, payment milestone, issue details, and optional replacement listing/message.
- `apps/web/src/server/routers/crisis.ts:84-103` lists crisis issues for users who can manage the event.
- `apps/web/src/server/routers/crisis.ts:105-167` validates event access and rejects booking/proposal/contract/payment milestone links that are not attached to the event.
- `apps/web/src/server/routers/crisis.ts:190-208` creates a replacement `BookingRequest` when a replacement listing is selected.
- `apps/web/src/server/routers/crisis.ts:227-260` persists the `CrisisIssue` with linked context, impact summary, recommended next action, replacement request ids, manual review notes, and audit trail.
- `apps/web/src/server/routers/crisis.ts:263-287` creates a manual review `Task` and records activity.
- `apps/web/src/app/api/pro-planner/crisis/issues/route.ts:6-22` exposes a POST route that calls the crisis router create mutation.
- `apps/web/prisma/schema.prisma:1193-1225` defines `CrisisIssue` with event, listing, booking request, proposal, contract, payment milestone, replacement, manual review, and audit fields.
- `apps/web/prisma/schema.prisma:1526-1532` defines issue status values: `OPEN`, `IMPACT_REVIEW`, `REPLACEMENT_STARTED`, `RESOLVED`, `CANCELED`.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1051-1093` implements the Pro Planner crisis form submit flow against `/api/pro-planner/crisis/issues`.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1553-1585` renders the dashboard crisis lane, issue form, active issues, impact summary, next action, and replacement request id.
- `apps/web/src/app/pro/planner/page.tsx:192-199` loads open crisis issues for the planner dashboard.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:292-296` loads up to 10 open/impact/replacement crisis issues for one event.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1017-1050` renders event-level crisis impact and replacement-start context, with a link back to `/pro/planner` to record/start replacement.
- `apps/web/src/app/(app)/admin/overview/page.tsx:127-128` counts open crisis issues and fetches the highest-priority open crisis issue.
- `apps/web/src/app/(app)/admin/overview/page.tsx:176-183` shows a crisis oversight next-safe-admin-action card when an urgent crisis exists.

Test evidence:

- `apps/web/tests/phase7-crisis-workflow.test.ts:75-116` proves issue creation, replacement booking request creation, no automatic money/legal effects, task creation, and activity recording for a vendor cancellation.
- `apps/web/tests/phase7-crisis-workflow.test.ts:118-129` proves unlinked proposals are rejected.
- `apps/web/tests/pro-planner-dashboard-buildout.test.tsx:188-207` seeds crisis issue data for dashboard rendering tests.
- `apps/web/tests/pro-planner-event-workspace-polish.test.tsx:166-187` verifies event workspace crisis copy and replacement-start display without legal/money promises.

Preview/report evidence:

- Existing reports search found protected Preview evidence for adjacent commercial trust work, not W7-specific protected Preview proof. `reports/stabilization/ONEHUB_PHASE1_COMMERCIAL_TRUST_SPINE_PROOF_2026-08-27.md:64-66` states Preview is deployed but protected and full authenticated smoke is blocked without credentials/session or approved access changes.
- No W7-specific Preview smoke report was found under `reports/` during this Scout map.

## 3. Findings

### Confirmed working pieces

1. Issue reporting exists for Pro Planner.
   - The Pro Planner dashboard has a crisis lane and form for event, issue type, severity, impacted listing/proposal/contract, replacement provider, title, and facts.
   - Evidence: `apps/web/src/components/pro-planner/Dashboard.tsx:1553-1577`.

2. Commercial context is partially identified and guarded.
   - The server accepts listing, booking request, proposal, contract, and payment milestone links, validates event ownership/management access, and rejects detached proposal/contract/milestone ids.
   - Evidence: `apps/web/src/server/routers/crisis.ts:141-167` and `apps/web/tests/phase7-crisis-workflow.test.ts:118-129`.

3. Replacement request start exists.
   - Selecting a replacement listing creates a real `BookingRequest` with event dates, guest target, replacement message, and manual-review notes.
   - Evidence: `apps/web/src/server/routers/crisis.ts:190-208` and `apps/web/tests/phase7-crisis-workflow.test.ts:88-95`.

4. Manual review task exists.
   - Every crisis issue creates a task assigned to the reporting user with critical/high priority.
   - Evidence: `apps/web/src/server/routers/crisis.ts:263-272` and `apps/web/tests/phase7-crisis-workflow.test.ts:108-110`.

5. Planner/event/admin visibility exists at a summary level.
   - Planner dashboard loads active crisis issues across events.
   - Event vault shows issue title, severity/status, issue type, impact summary, next action, and replacement request id.
   - Admin overview counts open crisis issues and can surface urgent crisis oversight copy.
   - Evidence: `apps/web/src/app/pro/planner/page.tsx:192-199`, `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1017-1050`, `apps/web/src/app/(app)/admin/overview/page.tsx:127-128`, and `apps/web/src/app/(app)/admin/overview/page.tsx:176-183`.

6. Legal/payment guardrail copy is present.
   - The crisis lane states OneHub does not auto-cancel contracts, move money, promise refunds, or make legal claims.
   - Evidence: `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1021-1024` and `apps/web/src/components/pro-planner/Dashboard.tsx:1582`.

### Missing UX/user-flow gaps that would cause revisits

1. No stakeholder notification is created by the crisis workflow.
   - Required loop step: stakeholders notified.
   - Current evidence: crisis create records activity and a task, but does not call `notify`, create `Notification` rows, send outbound email/SMS, or create/update a message thread.
   - Evidence: `apps/web/src/server/routers/crisis.ts:263-287`; notification creation exists elsewhere as `notify` in `apps/web/src/server/routers/notification.ts:6-8`, but is not used by `crisis.ts`.
   - User-facing revisit risk: after a cancellation is recorded, clients, vendors, venue contacts, assistants, or admins may not know anything changed unless the planner manually leaves the crisis lane and sends separate communication.

2. Event-level crisis lane is display-only and sends users back to the top-level planner page to act.
   - Required loop step: issue reported from the correct event workspace without dead ends.
   - Current evidence: event vault crisis card has `Record or start replacement` linking to `/pro/planner`, while the actual form lives in the top-level dashboard crisis panel.
   - Evidence: `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1017-1028` versus `apps/web/src/components/pro-planner/Dashboard.tsx:1553-1577`.
   - User-facing revisit risk: during event-day pressure, the planner sees the issue in the event command center but must jump back to a cross-event dashboard, reselect the event, and rebuild context instead of resolving the crisis inside the event workspace.

3. Impacted payment milestone exists in the API/schema but not in the visible crisis form.
   - Required loop step: linked vendor/venue/contract/payment/task/milestone identified.
   - Current evidence: server accepts `paymentMilestoneId`, schema persists it, and tests exercise it, but the dashboard form exposes listing/proposal/contract/replacement only.
   - Evidence: server fields in `apps/web/src/server/routers/crisis.ts:20-26`; test input in `apps/web/tests/phase7-crisis-workflow.test.ts:81-84`; form fields in `apps/web/src/components/pro-planner/Dashboard.tsx:1566-1574`.
   - User-facing revisit risk: payment/milestone risk can be linked only by code/API, not by the user operating the crisis form, so the commercial context is incomplete at the moment of reporting.

4. No budget or payment risk record is updated when crisis is created.
   - Required loop step: timeline/tasks/budget/payment risk updated.
   - Current evidence: crisis create builds an impact summary and manual task, but does not update budget lines, payment intents, payment milestones, refund/dispute/holdback queues, or a dedicated risk relation.
   - Evidence: `apps/web/src/server/routers/crisis.ts:211-247` and `apps/web/src/server/routers/crisis.ts:263-287`.
   - User-facing revisit risk: the issue can say “check payment state,” but money/budget surfaces remain independent and may not show a concrete crisis-derived risk item.

5. Timeline/task integration is too narrow.
   - Required loop step: timeline/tasks updated.
   - Current evidence: one manual review task is created, but there is no due date, dependency, affected milestone update, timeline event, run-of-show update, or owner routing beyond `assigneeId: ctx.user.id`.
   - Evidence: `apps/web/src/server/routers/crisis.ts:263-272`; timeline risk UI separately derives open tasks/milestones from existing records in `apps/web/src/components/pro-planner/Dashboard.tsx:570-580`.
   - User-facing revisit risk: the planner gets a generic manual task but not an actionable recovery checklist tied to event-day timing, affected milestone, replacement deadline, or responsible stakeholder.

6. Replacement request starts, but replacement options comparison is not a crisis-specific recovery flow.
   - Required loop step: replacement options/request started.
   - Current evidence: a selected replacement listing creates one booking request; if no listing is selected, next action says manually start provider discovery. The crisis issue does not preserve a list of replacement options, compare availability/price/trust, or route the user to an event-filtered replacement shortlist from the issue.
   - Evidence: `apps/web/src/server/routers/crisis.ts:72-81`, `apps/web/src/server/routers/crisis.ts:190-208`, and `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1052-1087` for generic sourcing below the crisis card.
   - User-facing revisit risk: OneHub can start a replacement request only if the planner already knows the replacement listing; it does not yet demonstrate fast event-day recovery selection inside one operating loop.

7. Admin oversight is summary-level, not actionable crisis oversight.
   - Required loop step: admin oversight shows open risk.
   - Current evidence: admin overview counts crisis issues and links to `/admin/verification`, but the evidence inspected did not show a crisis detail queue, crisis issue detail route, or admin action surface that opens the specific crisis context.
   - Evidence: `apps/web/src/app/(app)/admin/overview/page.tsx:176-183`.
   - User-facing revisit risk: admin sees that a crisis exists but cannot inspect the linked event/vendor/contract/payment/replacement context directly from the oversight surface.

8. No resolution flow is exposed or tested.
   - Required loop step: resolution recorded.
   - Current evidence: `CrisisIssueStatus` includes `RESOLVED` and `CANCELED`, but the router exposes only `listForEvent` and `create`; no update/resolve mutation, API route, UI button, resolution notes, closeout proof, or resolution test was found.
   - Evidence: statuses in `apps/web/prisma/schema.prisma:1526-1532`; router exports only list/create in `apps/web/src/server/routers/crisis.ts:84-291`.
   - User-facing revisit risk: issues can enter impact/replacement states but cannot be completed in-product, so active crisis issues become permanent open risk or require database/manual intervention.

9. Provider/vendor side visibility is not proven.
   - Required loop step: related parties see correct update/message/notification/status.
   - Current evidence: replacement request is created directly in the crisis router. The inspected crisis path does not show provider-facing notification/thread evidence for the replacement request created from crisis.
   - Evidence: `apps/web/src/server/routers/crisis.ts:190-208`.
   - User-facing revisit risk: the planner may believe recovery has started, while the replacement provider may not have an in-app lead notification or thread from this path.

10. No W7-specific Preview smoke evidence found.
    - Required completion rule: protected Preview browser smoke passes.
    - Current evidence: no W7-specific report under `reports/`; adjacent Preview evidence states protected Preview runtime smoke was blocked without credentials/session.
    - Evidence: `reports/stabilization/ONEHUB_PHASE1_COMMERCIAL_TRUST_SPINE_PROOF_2026-08-27.md:64-66`.
    - User-facing revisit risk: source/test proof exists, but the actual protected browser workflow remains unproven for W7.

## 4. Workflow coverage map

| Business-loop step | Current evidence | Scout status | Gap that causes revisit |
|---|---|---:|---|
| Issue reported | Pro Planner crisis form + POST API + `crisisRouter.create` | PARTIAL | Not reportable directly inside event-level crisis card; top-level dashboard reselect required |
| Commercial context identified | Listing/proposal/contract/payment milestone supported server-side | PARTIAL | Payment milestone not exposed in UI; no task/milestone selector; no visible context preview before submit |
| Stakeholders notified | No crisis notification/message evidence found | BROKEN | Planner must manually notify related parties elsewhere |
| Replacement started | Optional replacement listing creates `BookingRequest` | PARTIAL | No crisis-specific options comparison; provider notification/thread not proven |
| Timeline/tasks updated | Manual review task created | PARTIAL | No due date, owner routing, dependency, event-day checklist, or affected milestone update |
| Budget/payment risk updated | Impact summary mentions money/legal guardrails | BROKEN | No budget/payment/risk queue state mutation tied to crisis |
| Admin oversight | Admin overview count + next-action copy | PARTIAL | No crisis detail queue/action surface from admin oversight |
| Resolution recorded | Status enum includes resolved/canceled | BROKEN | No resolve/update UI/API/test |
| Persistence after refresh | Crisis issue persisted and dashboard/event queries reload open issues | PARTIAL | Resolution lifecycle and notification/read state not proven |
| Wrong roles blocked | `canManageEvent` enforced server-side | PARTIAL | Tests cover unlinked proposal; no wrong-role crisis route/UI test found in inspected W7 test |
| Preview proof | No W7 Preview smoke found | BROKEN | Protected browser end-to-end not proven |

## 5. User-facing impact

OneHub currently has the start of a crisis workflow: a planner can record a cancellation/problem, link some commercial context, start a replacement request if a replacement listing is already known, see the issue in planner/event/admin summaries, and avoid unsafe money/legal claims.

It does not yet prove the full competitor-killing event-day recovery loop. The biggest user-facing break is that the system records the problem but does not reliably coordinate everyone affected, update the operational/money risk surfaces, guide replacement option selection, or let the team close the incident. That would force revisits across messages, marketplace, payments, tasks, admin verification, and possibly manual database/admin action.

## 6. Verdict

PARTIAL

Reason: issue creation, linked commercial context, replacement request creation, manual review task, summary visibility, and guardrail copy are present. The full user workflow is not closed because stakeholder notifications, UI-exposed milestone/payment linkage, budget/payment risk updates, crisis-specific replacement comparison, admin detail oversight, resolution, wrong-role tests, and W7 Preview smoke evidence are missing or unproven.

## 7. Narrow next action for Atlas

Route Forge to close W7 as one thin workflow slice, not separate component patches:

1. Move/report crisis action into the event workspace or deep-link the Pro Planner crisis form with event preselected and context preserved.
2. Add visible selectors/pre-submit context for impacted payment milestone/task/milestone.
3. On create, generate in-app notifications and/or an event crisis thread for relevant planner/admin/client/vendor participants under existing role boundaries.
4. Attach crisis-derived risk to timeline/tasks and payment/budget/admin surfaces without moving money or making legal claims.
5. Add a resolve/cancel flow with resolution notes/proof and tests.
6. Add admin crisis detail/queue routing from the overview card.
7. Add W7 tests for wrong-role access, notifications, resolution, and refresh persistence.
8. After implementation, route Sentinel for protected Preview smoke of issue -> context -> notifications -> replacement -> task/timeline/payment risk -> admin oversight -> resolution.

FOUNDER ESCALATION REQUIRED only if Atlas wants protected Preview access settings changed, credentials/session shared, public exposure changed, or live payment/legal behavior enabled.
