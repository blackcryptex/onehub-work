# W4 Steward Map — Scheduling + Logistics backend/data/security workflow

Date: 2026-08-28
Task: t_96d80770
Inspector: Steward
Verdict: PARTIAL / RISK

## 1. Backend or structural scope reviewed

Read-only backend/data/security/payment map for Workflow 4: Scheduling + Logistics.

Required business loop:

timeline/tasks/calendar -> provider/venue availability/status -> changes update plan -> affected roles see next action

Inspected structural surfaces:

- Prisma persistence model for event schedules, tasks, checklists, calendar records, listings, availability slots, booking requests, crisis issues, notifications, activity/audit logs, proposals/contracts/payments.
- tRPC routers for task, calendar, availability, booking request, crisis, notifications.
- Next API routes for planner availability slots, planner milestones, planner client tasks, crisis issues, booking requests, Google calendar overlay, and payment gates.
- RBAC helpers and event-access wrappers that gate event, listing, provider, client, and payment operations.
- Role-facing pages that consume or expose scheduling/logistics state: planner event workspace, general event tasks/checklists/milestones/calendar, client event summary, vendor dashboard, venue dashboard.
- Existing tests that prove component behavior versus full loop closure.

No production, env, credential, billing, infrastructure, public exposure, live-payment, or destructive database change was made. No source files were edited; this report is the deliverable.

## 2. Evidence examined

Primary schema evidence:

- `apps/web/prisma/schema.prisma:291-339` — `Event` owns milestone, checklist, task, calendar, booking request, proposal, contract, crisis, and activity relations.
- `apps/web/prisma/schema.prisma:386-443` — `Milestone`, `Checklist`, `ChecklistItem`, and `Task` are separate event planning objects.
- `apps/web/prisma/schema.prisma:473-485` — `Notification` has user/org/type/title/body/link, but no required event/object/audience contract.
- `apps/web/prisma/schema.prisma:487-588` — `Listing`, `AvailabilitySlot`, and `BookingRequest` store provider/venue availability and booking status; availability slots are listing/time/status only.
- `apps/web/prisma/schema.prisma:626-814` — proposals/contracts/payment milestones/payment intents persist commerce and payment state separately from event logistics.
- `apps/web/prisma/schema.prisma:1026-1088` — calendar account/mapping/sync/calendar-event records exist, but `CalendarEvent` is its own object.
- `apps/web/prisma/schema.prisma:1193-1225` — `CrisisIssue` can link listing/request/proposal/contract/payment milestone context and stores impact/next-action fields.

Backend/API evidence:

- `apps/web/src/server/trpc.ts:7-28` — `publicProcedure` is unauthenticated by default; `protectedProcedure` injects current user into `ctx`.
- `apps/web/src/server/routers/availability.ts:7-27` — set/list/hold/release/book availability slots; `holdSlot` is unauthenticated publicProcedure and does not verify listing ownership or event/request context.
- `apps/web/src/server/routers/bookingRequest.ts:10-40` — request creation requires auth and event/org match, records event activity, and notifies provider org owners/admins.
- `apps/web/src/server/routers/bookingRequest.ts:41-54` — `listForListing` enforces provider org admin/owner access; `listForOrg` is publicProcedure and returns all booking requests for any org slug with no auth/member check.
- `apps/web/src/server/routers/bookingRequest.ts:55-65` — provider status changes require provider org admin/owner but record activity on listing org only and omit `eventId`.
- `apps/web/src/server/routers/bookingRequest.ts:66-125` — provider quote creates a provider-backed proposal and event activity, but no canonical logistics/timeline/calendar/task update.
- `apps/web/src/server/routers/calendar.ts:9-36` — calendar list is publicProcedure and returns org calendar records by orgSlug with no auth/member check.
- `apps/web/src/server/routers/calendar.ts:38-98` — calendar create/update/delete authenticate and require org member, but permit any org member to mutate calendar records.
- `apps/web/src/server/routers/task.ts:10-89` — task create/update/delete/list are protected and event-scoped; create/update require manage access and assignee validation.
- `apps/web/src/server/routers/crisis.ts:84-103` — crisis listing requires event manage access.
- `apps/web/src/server/routers/crisis.ts:105-289` — crisis creation validates linked event commercial context, may create a replacement booking request and review task, and records event activity without moving money/legal state.
- `apps/web/src/server/routers/notification.ts:6-28` — notifications are simple user/org records; mark-read is user-scoped.
- `apps/web/src/server/lib/activity.ts:29-49` — activity can be event-scoped but `eventId` is optional.
- `apps/web/src/server/lib/audit.ts:4-23` — audit records actor/org/action/target/metadata, but no required event reference.
- `apps/web/src/app/api/pro-planner/availability/slots/route.ts:17-72` — planner/provider slot creation authenticates and checks listing edit permission, but creates listing availability only, not event-linked logistics evidence.
- `apps/web/src/app/api/pro-planner/timeline/milestones/route.ts:16-71` — planner milestone creation checks event manage access and writes `Milestone`, not a unified schedule item.
- `apps/web/src/app/api/pro-planner/clients/tasks/route.ts:21-102` — planner client task creation checks role/event access and validates selected client stakeholder.
- `apps/web/src/app/api/pro-planner/crisis/issues/route.ts:6-21` — Next API delegates to crisis router caller.
- `apps/web/src/app/api/google/events/overlay/route.ts:7-24` — Google overlay requires auth and lists user overlay events.
- `apps/web/src/app/api/bookings/request/route.ts:6-130` — direct booking request API requires event manager access but does not reserve/hold availability, notify provider org, or record event/provider activity.
- `apps/web/src/app/api/payments/create-intent/route.ts:19-22`, `89-111`, `125-155`, `175-234` — payment intent creation has contract/proposal/provider evidence and server-derived amount gates.
- `apps/web/src/app/api/payments/confirm/route.ts:62-81`, `94-122` — only payer can confirm an active local Stripe-backed payment intent.
- `apps/web/src/app/api/payments/release-milestone/route.ts:117-160`, `241-250` — release requires guarded platform admin plus refund/dispute/holdback/Stripe Connect gates.
- `apps/web/src/app/api/payments/mark-milestone-complete/route.ts:62-126` — seller-side milestone completion records activity but does not change milestone status or logistics next-action state.
- `apps/web/src/app/api/payments/auto-build/route.ts:21-54`, `63-87`, `94-122` — auto-build is Pro Planner only, event-manage gated, provider-evidence gated, and creates payout lines from accepted proposals.

RBAC and role-surface evidence:

- `apps/web/src/lib/rbac.ts:179-193` — `canManageEvent` permits admin, org owner, planner owner, or non-planner org member.
- `apps/web/src/lib/rbac.ts:423-451` — `canViewEvent` permits admin/org owner/planner-owned event and client stakeholder with shared summary; vendors/venues cannot view planner events by default.
- `apps/web/src/lib/rbac.ts:579-599` — provider/vendor/venue listing edit access is org/member based.
- `apps/web/src/lib/rbac.ts:607-645` — proposal/contract detail access can include seller listing org and intended signers.
- `apps/web/src/lib/rbac.ts:714-730` — client deposit permission is stakeholder/share based.
- `apps/web/src/lib/event-access.ts:8-65` — event slug pages rely on `canViewEvent`, `canManageEvent`, or `canEditEvent`.
- `apps/web/src/app/(app)/calendar/page.tsx:223-231`, `360-378` — calendar page queries and renders only `CalendarEvent` records despite copy promising bookings/holds/milestones.
- `apps/web/src/app/(app)/events/[eventSlug]/tasks/page.tsx:10-26` — tasks page renders only `Task` records.
- `apps/web/src/app/(app)/events/[eventSlug]/checklists/page.tsx:10-49` — checklists page renders only checklist items.
- `apps/web/src/app/(app)/events/[eventSlug]/milestones/page.tsx:25-63` — event milestones page is payment-plan milestone oriented through proposals, not the simple event `Milestone` logistics timeline.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:385-397` — planner next action is commerce-spine derived.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1017-1048` — crisis issues render impact and recommended next action, guarded against automatic refund/payment/legal claims.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1160-1171` — requests panel shows booking request status only.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1298-1317` — timeline panel shows upcoming event milestones and explicitly not payment/held-funds routing.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1350-1423` — planner next actions/risk blocks are commerce-spine/checklist based, not logistics-conflict aware.
- `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:36-83`, `260-275` — client summary includes crisis issue updates but not full logistics changed-state or task/calendar impacts.
- `apps/web/src/app/vendor/dashboard/page.tsx:47-70`, `81-96`, `101-158` — vendor dashboard pulls booking requests/contracts by provider listing/org, then local notification/payment summaries.
- `apps/web/src/components/vendor/Dashboard.tsx:105-127`, `204-288`, `292-398` — vendor UI exposes lead action, upcoming work, calendar, payments, and readiness, but no write-back to canonical event logistics.
- `apps/web/src/app/venue/dashboard/page.tsx:44-90`, `94-150` — venue dashboard pulls venue booking requests and booking contracts.
- `apps/web/src/components/venue/Dashboard.tsx:106-129`, `205-290`, `293-378` — venue UI exposes inquiry/hold action, upcoming dates, calendar, and readiness, but no shared event-plan update.

Test evidence:

- `apps/web/tests/availability.test.ts:3-17` — tests only basic overlap arithmetic, not router auth, slot linking, hold booking, or event-plan propagation.
- `apps/web/tests/booking-request-provider-proposal.test.ts:71-98` — tests quote-to-provider-backed proposal handoff and activity metadata.
- `apps/web/tests/phase7-crisis-workflow.test.ts:75-116` — tests crisis issue/replacement request/review task creation without automatic money effects.
- `apps/web/tests/payment-auto-build-provider-evidence.test.ts:63-103` — tests payout auto-build requires provider-submitted evidence.
- `apps/web/tests/google-calendar-mapping.test.ts:4-43` — tests Google mapping payloads, not W4 loop propagation.
- Existing Scout map confirms the product workflow remains broken at full-loop level: `reports/seven-workflows/w4-scout-map.md:228-247`.

## 3. Correctness verdict

PARTIAL / RISK

OneHub has structurally useful W4 primitives: events, event milestones, checklist items, tasks, calendar events, provider listings, availability slots, booking requests, provider quotes/proposals, crisis issues, notifications, activities, and payment guardrails. However, the required scheduling/logistics business loop is not structurally closed.

The backend currently persists separate component records. It does not define a canonical event logistics plan or state machine that joins timeline/tasks/calendar with provider/venue availability/status, detects changed/blocked/late/conflict state, writes durable event-scoped activity/audit/notifications, and exposes the same role-appropriate next action to planner, provider/venue, client/stakeholder, and admin surfaces.

Because W4 acceptance is full workflow proof, not component proof, this is not safe to mark SOUND.

## 4. Exact risks and blockers

### RISK 1 — No canonical logistics aggregate or source of schedule truth

Evidence:

- `Milestone`, `ChecklistItem`, `Task`, `CalendarEvent`, `BookingRequest`, `AvailabilitySlot`, and `CrisisIssue` are separate models.
- Event workspace and calendar screens query/render those records separately (`tasks/page.tsx:10-26`, `checklists/page.tsx:10-49`, `calendar/page.tsx:223-231`, `pro/planner/vault/[eventSlug]/page.tsx:1298-1317`).

Risk:

A status/date/availability change can be locally true but not become part of the event logistics plan. Users still must reconcile state manually across screens.

Constraint:

Implement a canonical server-side event logistics summary/read model that derives from all schedule sources and returns normalized items with: `eventId`, source type/id, title, start/due window, status, owner/role, severity, change reason, visibility audience, and next action. Do not let UI-only aggregation become the source of truth.

### RISK 2 — Availability holds/bookings are not event/request linked

Evidence:

- `AvailabilitySlot` stores only `listingId`, `startAt`, `endAt`, `status`, and `note` (`schema.prisma:546-555`).
- `availabilityRouter.holdSlot` sets a slot to `HOLD` by listing/time overlap but accepts no event/request id and performs no auth/ownership check (`server/routers/availability.ts:18-21`).
- Planner slot API creates listing slots but no event-linked logistics evidence (`api/pro-planner/availability/slots/route.ts:48-72`).

Risk:

A hold can exist on a provider/venue listing without proving which event or booking request it protects. It also cannot safely drive planner/client next action or conflict detection.

Constraint:

Availability mutations that affect a booking must be authenticated, listing-authorized, and link to either `bookingRequestId` or an explicit event-linked logistics object. Holds/booked states should not be accepted as W4 closure unless they can be traced from listing slot -> booking request/event -> planner timeline/calendar/next action.

### RISK 3 — Public tRPC read/mutation surfaces leak or mutate schedule data by org slug/id

Evidence:

- `calendarRouter.list` is publicProcedure and returns calendar records for any `orgSlug` (`server/routers/calendar.ts:9-36`).
- `bookingRequestRouter.listForOrg` is publicProcedure and returns booking requests for any `orgSlug` (`server/routers/bookingRequest.ts:50-54`).
- `availabilityRouter.holdSlot` is publicProcedure and can mutate slot status to `HOLD` without current-user authorization (`server/routers/availability.ts:18-21`).
- `availabilityRouter.releaseSlot` and `markBooked` are protected but update by slot id without verifying the caller can edit that slot’s listing (`server/routers/availability.ts:23-26`).

Risk:

Before W4 is exposed as a workflow, org calendar/booking data can be enumerated by slug, and availability status can be mutated or released/booked without object-level listing authorization. This is a backend safety blocker for any role-facing scheduling/logistics closure claim.

Constraint:

Convert schedule/logistics tRPC reads and mutations to `protectedProcedure` where tenant data is returned or changed, and enforce object-level access with `requireOrgMembership`, `requireEventAccess`, `requireEventManageAccess`, or `canEditListing` after loading the target listing/org/event. Public marketplace availability reads may remain public only if they expose intentionally public availability fields and no event/request/contact/org-private context.

### RISK 4 — Booking request creation/status paths are split and inconsistent

Evidence:

- tRPC booking request creation records event activity and provider notification (`server/routers/bookingRequest.ts:20-39`).
- Direct `/api/bookings/request` creates a booking request but does not notify provider org, record event activity, reserve/hold availability, or reuse the tRPC creation contract (`app/api/bookings/request/route.ts:114-130`).
- Provider `setStatus` records activity against listing org and omits `eventId` (`server/routers/bookingRequest.ts:55-65`).

Risk:

Two creation paths can produce different downstream effects. Status changes may be invisible in the planner event activity/timeline even though they are the business event that should update the plan.

Constraint:

Collapse booking request creation and status/quote transitions behind one service function/transaction. Every provider/venue status transition must write: booking request row, event-scoped activity, provider org activity/audit if needed, affected-role notifications, and logistics summary invalidation/update. Direct API and tRPC routes should call the same service.

### RISK 5 — Calendar copy/API promises broader logistics aggregation than the backend delivers

Evidence:

- Calendar page copy promises bookings, availability holds, planning milestones, and organization calendar items (`calendar/page.tsx:241-246`).
- Calendar page query renders only `CalendarEvent` records (`calendar/page.tsx:223-231`, `360-378`).
- `calendarRouter.list` also returns only `CalendarEvent` (`server/routers/calendar.ts:9-36`).
- Google mapping tests cover only `CalendarEvent` mapping (`google-calendar-mapping.test.ts:4-43`).

Risk:

Users may treat Calendar as the logistics source while bookings/holds/milestones/tasks are absent. That creates missed-provider-change and late-action risk.

Constraint:

Either narrow Calendar copy to “calendar records only” or implement a read-only overlay endpoint that merges `CalendarEvent`, event milestones, task/checklist due dates, booking request dates, and linked availability holds/bookings. Google sync should remain limited to explicit `CalendarEvent` records unless user/admin approval exists for exporting derived logistics records.

### RISK 6 — Crisis creates impact context but does not update affected plan items

Evidence:

- Crisis creation validates linked event commercial context and can create replacement booking request/review task (`server/routers/crisis.ts:141-209`, `227-272`).
- It records event-scoped activity and preserves no automatic money movement (`server/routers/crisis.ts:274-287`).
- Planner/client surfaces show crisis next action, but not schedule diff or affected task/calendar/milestone changes (`pro/planner/vault/[eventSlug]/page.tsx:1017-1048`, `client/events/[eventSlug]/page.tsx:260-275`).

Risk:

The system knows “there is a crisis,” but not which timeline item moved, which role is blocked, which date changed, or whether provider replacement affects the plan. Users still manually reconcile the schedule.

Constraint:

Crisis creation must create or update event logistics impacts with explicit affected entities, changed windows/status, owner role, due date, and visibility. It must not alter refunds, payment release, contracts, cancellations, or legal conclusions without existing guarded payment/legal flows.

### RISK 7 — Role visibility is not guaranteed by a shared audience contract

Evidence:

- Client event view only shows event summary/deposits/crisis updates after stakeholder/share checks (`client/events/[eventSlug]/page.tsx:36-83`, `260-275`).
- Vendors/venues cannot view planner events by default (`rbac.ts:423-451`) but can view provider-specific booking requests from their dashboard (`vendor/dashboard/page.tsx:47-70`, `venue/dashboard/page.tsx:44-70`).
- Notifications carry only user/org/type/title/body/link (`schema.prisma:473-485`, `server/routers/notification.ts:6-28`).

Risk:

“affected roles see next action” cannot be proven because logistics items do not declare their intended role audiences and notification records are not tied to event/logistics object visibility.

Constraint:

Each canonical logistics item needs an explicit audience/visibility computation: planner/org staff, provider/venue org, client stakeholder/share, and admin. Notifications should reference event/logistics source IDs in metadata/link and must never grant data visibility beyond RBAC; notification recipients should be derived server-side, not trusted from client input.

### RISK 8 — Payment/commercial milestones can be confused with logistics milestones

Evidence:

- Event `Milestone` and `PaymentMilestone` are separate models (`schema.prisma:386-394`, `669-682`).
- Event milestones page under `/events/[eventSlug]/milestones` loads proposal payment milestones and payout/payment lock state (`events/[eventSlug]/milestones/page.tsx:25-180`).
- Payment gates require provider evidence, legal acceptance, contract/payment states, and admin release (`create-intent/route.ts:89-111`, `release-milestone/route.ts:117-160`).

Risk:

A “timeline/milestone” implementation could accidentally treat payment milestones as logistics tasks or vice versa, creating unsafe payment readiness or release expectations.

Constraint:

Canonical logistics summaries may display payment milestones only as non-mutating commercial context with locked labels. They must not create, release, refund, mark paid, or promise payment state. Payment actions must remain behind existing payment/legal routes and guards.

### RISK 9 — Task/checklist/calendar updates lack a change/version/audit contract for schedule diffs

Evidence:

- Task changes record activity but no old/new due/status/version snapshot beyond lightweight metadata (`server/routers/task.ts:55-69`).
- Calendar create/update/delete from tRPC do not record event activity/audit (`server/routers/calendar.ts:38-98`).
- `CalendarEvent` lacks updatedAt/version fields in schema (`schema.prisma:1073-1088`).

Risk:

The backend cannot prove “changes update plan” with a reliable before/after schedule diff. Affected users may see latest state but not know what changed.

Constraint:

Schedule-impacting writes should produce durable activity/audit with source id, before/after status/date/assignee, actor, eventId, and notification fanout result. Add version/updatedAt or equivalent derived change tracking before claiming changed-plan correctness.

### RISK 10 — Tests prove ingredients, not full W4 workflow closure

Evidence:

- Availability test only checks overlap arithmetic (`availability.test.ts:3-17`).
- Booking quote test checks proposal handoff, not logistics timeline/calendar/notifications (`booking-request-provider-proposal.test.ts:71-98`).
- Crisis test checks replacement request/task creation and no automatic money effects, not schedule diff propagation (`phase7-crisis-workflow.test.ts:75-116`).
- Calendar mapping test checks Google payload shape, not merged logistics view (`google-calendar-mapping.test.ts:4-43`).

Risk:

A regression could pass current tests while the W4 loop remains broken.

Constraint:

Add backend/service tests for the exact W4 loop: event plan seeded -> provider availability hold/status/quote changes -> event logistics summary changes -> activity/audit/notification generated -> planner/provider/client/admin role-filtered next actions are returned -> payment/legal state remains guarded.

## 5. Exact implementation constraints to avoid partial closure

Minimum backend constraints for a Forge implementation card:

1. Do not add another isolated UI panel as W4 closure. Build a server-side logistics summary/service first.
2. Normalize all W4 evidence into a canonical read model or service result:
   - event milestones;
   - tasks and checklist due items;
   - manual calendar records;
   - booking request dates/statuses;
   - linked availability holds/bookings;
   - crisis issue/replacement request impacts;
   - commercial/payment milestones only as guarded context.
3. Every logistics item must include source type/id, event id, owner/role, status, date window/due date, risk severity, stale/late/conflict flags, and next action text.
4. Every provider/venue booking status update must be event-scoped and write event activity; listing-org activity alone is insufficient.
5. Every booking-status or availability-hold mutation must be object-authorized and must not rely on org slug alone.
6. Booking request create/status/quote paths must share one service/transaction and not diverge between direct API and tRPC routes.
7. If availability slots are held/booked for an event, persist the event/request link or an auditable logistics-impact row; free-floating listing slots cannot close W4.
8. Calendar aggregation must match copy. Either show only `CalendarEvent` and say so, or derive a safe overlay that includes task/milestone/request/availability evidence.
9. Role visibility must be computed server-side from RBAC and explicit event stakeholder/share/provider org relationships; never rely on client-selected recipients.
10. Client/stakeholder visibility must remain summary-safe. Do not expose provider financials, internal notes, or unshared proposal/contract/payment detail through logistics summaries.
11. Vendor/venue visibility must be provider-specific. Do not grant vendors/venues planner event access just to show next actions.
12. Notifications must reference the logistics source/event and must not leak hidden data in title/body/link.
13. Payment milestones may appear only as read-only guarded context. All money movement, release, refund, holdback, dispute, and legal acceptance flows stay in the existing payment/legal guarded routes.
14. Schedule-impacting writes need durable activity/audit with before/after state sufficient to explain what changed.
15. Tests must prove the full loop across services and role filters, not just route rendering.

## 6. Safe assumptions vs unsafe assumptions

Safe assumptions based on inspected evidence:

- OneHub has persisted primitives required to assemble a W4 logistics read model.
- Provider/venue dashboards can already see their own booking request dates/statuses.
- Planner event workspace can already show event-scoped crisis issues and some request/proposal/contract/payment state.
- Payment release is guarded by platform admin/Stripe/holdback/dispute/refund checks and should not be widened for W4.

Unsafe assumptions:

- That calendar equals logistics. Current calendar renders `CalendarEvent` only.
- That a provider status change updates the planner event plan. `setStatus` omits event-scoped activity.
- That availability hold means event hold. Slots do not persist event/request linkage.
- That affected roles see the same next action. There is no canonical logistics audience contract.
- That existing tests prove workflow closure. They prove isolated ingredients.
- That W4 can safely launch while public tRPC schedule/booking reads and availability mutation surfaces remain object-authorization weak.

## 7. Narrow next action for Atlas

Route Forge a narrow backend-first W4 implementation card before any final W4 closure/QA claim.

Recommended Forge acceptance:

1. Create a canonical event logistics summary service/endpoint with role-filtered output.
2. Harden `calendarRouter.list`, `bookingRequestRouter.listForOrg`, `availabilityRouter.holdSlot`, `releaseSlot`, and `markBooked` with authentication plus object-level access.
3. Link availability holds/bookings to booking requests/events or persist a logistics-impact row that gives equivalent traceability.
4. Consolidate booking request create/status/quote side effects through one service and require event-scoped activity/notification/logistics updates.
5. Add a read-only logistics overlay that includes tasks, checklists, event milestones, calendar records, booking requests, availability, and crisis impacts.
6. Keep payment/legal behavior unchanged except for read-only status context; do not introduce live payments, refunds, release, billing, or legal claims.
7. Add service tests that prove the W4 loop and role-filtered next actions.

FOUNDER ESCALATION REQUIRED only if Atlas wants production data mutation, public Preview/domain exposure changes, credentials/env/billing/infra changes, legal/public-launch claims, live calendar-account changes outside protected test scope, or live-payment behavior.

Sentinel retains veto on final workflow proof.
