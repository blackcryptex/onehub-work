# W4 Scout Map — Scheduling + Logistics full user workflow

Date: 2026-08-28
Task: t_d1b31998
Inspector: Scout
Verdict: BROKEN

## 1. Scope inspected

Read-only product/UX map for Workflow 4: Scheduling + Logistics.

Required business loop:

timeline/tasks/calendar -> provider/venue availability/status -> changes update plan -> affected roles see next action

Acceptance target:

Scheduling/logistics has a real coordination loop, not only dates and calendar UI.

Guardrails honored:

- No production, env, credential, billing, infra, domain, public exposure, live-payment, legal, or destructive DB changes.
- No source-code edits were made.
- This report is the only deliverable file added for this task.

## 2. Evidence reviewed

Planning/workflow requirement evidence:

- `docs/plans/2026-08-28-seven-pain-points-full-workflow-completion-plan.md:62-66`

Current code/routes inspected:

- `apps/web/src/app/(app)/events/[eventSlug]/page.tsx`
- `apps/web/src/app/(app)/events/[eventSlug]/tasks/page.tsx`
- `apps/web/src/app/(app)/events/[eventSlug]/checklists/page.tsx`
- `apps/web/src/app/(app)/calendar/page.tsx`
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx`
- `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx`
- `apps/web/src/app/marketplace/[slug]/page.tsx`
- `apps/web/src/components/bookings/BookingRequestModal.tsx`
- `apps/web/src/components/vendor/Dashboard.tsx`
- `apps/web/src/components/venue/Dashboard.tsx`
- `apps/web/src/app/(app)/messages/page.tsx`
- `apps/web/src/app/(app)/admin/overview/page.tsx`
- `apps/web/src/server/routers/task.ts`
- `apps/web/src/server/routers/calendar.ts`
- `apps/web/src/server/routers/availability.ts`
- `apps/web/src/server/routers/bookingRequest.ts`
- `apps/web/src/server/routers/crisis.ts`
- `apps/web/src/lib/google.calendar.ts`
- `apps/web/prisma/schema.prisma`

Tests/evidence inspected:

- `apps/web/tests/events-create-security.test.ts`
- `apps/web/tests/diy-planner-route-continuity.test.tsx`
- `apps/web/tests/pro-planner-event-workspace-polish.test.tsx`
- `apps/web/tests/availability.test.ts`
- `apps/web/tests/google-calendar-mapping.test.ts`
- Preview evidence:
  - `reports/preview/ONEHUB_PROTECTED_PREVIEW_RUNTIME_SMOKE_2026-08-28.md`
  - `reports/preview/ONEHUB_PROTECTED_PREVIEW_FINAL_SMOKE_AA6694D_2026-08-28.json`

## 3. Confirmed current workflow map

### A. Event timeline / tasks / calendar creation exists, but is split

Confirmed:

- Event creation tests prove a new event creates related budget, milestone, checklist, and checklist-item records inside one transaction (`apps/web/tests/events-create-security.test.ts:156-169`).
- The event overview renders status, event dates, budget used, countdown, next milestone, timeline, and recent activity (`apps/web/src/app/(app)/events/[eventSlug]/page.tsx:27-115`).
- The checklists page renders checklist items and useful empty states (`apps/web/src/app/(app)/events/[eventSlug]/checklists/page.tsx:10-49`).
- The tasks page renders a Kanban board with TODO, IN_PROGRESS, BLOCKED, and DONE columns from persisted `Task` records (`apps/web/src/app/(app)/events/[eventSlug]/tasks/page.tsx:10-27`).
- The calendar page can create a manual calendar item, optionally link it to an event, and sync mapped OneHub calendar records to Google when connected (`apps/web/src/app/(app)/calendar/page.tsx:66-147`, `241-369`).

Gap:

- These are parallel surfaces, not one logistics loop. The event timeline uses `Milestone`; checklists use `ChecklistItem`; the tasks page uses `Task`; calendar uses `CalendarEvent`. I did not find a user-facing combined schedule that merges task due dates, checklist items, milestones, booking requests, availability holds/bookings, and calendar items into one prioritized logistics view.

User-facing result:

A planner can see dates and lists, but still has to reconstruct “what happens next, who owns it, and whether the schedule changed” by jumping between Overview, Checklists, Tasks, Calendar, Marketplace, provider dashboards, and messages.

### B. Provider/venue availability and status exist, but do not feed event logistics

Confirmed:

- `AvailabilitySlot` stores listing availability windows with `AVAILABLE`, `HOLD`, `BOOKED`, and `UNAVAILABLE` statuses (`apps/web/prisma/schema.prisma:546-555`, `1357-1362`).
- Listing profiles show an availability calendar and event-fit context when opened with an event (`apps/web/src/app/marketplace/[slug]/page.tsx:226-260`).
- Booking requests carry event, listing, start/end dates, guests, status, quote, and notes (`apps/web/prisma/schema.prisma:568-588`).
- Booking request creation records activity and notifies provider-side org owners/admins (`apps/web/src/server/routers/bookingRequest.ts:20-39`).
- Vendor and venue dashboards expose lead/inquiry queues, upcoming dated work, calendar panels, and “check date” actions (`apps/web/src/components/vendor/Dashboard.tsx:204-256`, `292-399`; `apps/web/src/components/venue/Dashboard.tsx:205-257`, `293-378`).

Gaps:

- `availabilityRouter.holdSlot` can set a listing slot to HOLD, but it does not require a user or link the hold to the event/booking request/task/calendar logistics plan (`apps/web/src/server/routers/availability.ts:18-21`).
- Booking status changes record activity against the listing org only and do not attach `eventId`; the planner event activity/timeline may not show the status change in context (`apps/web/src/server/routers/bookingRequest.ts:55-64`).
- Booking request quote creates a provider-backed proposal and records provider-submitted activity, but it does not create/update a calendar event, milestone, task, or conflict/risk item (`apps/web/src/server/routers/bookingRequest.ts:66-125`).

User-facing result:

Provider/venue availability can be viewed and request status can change, but the event logistics plan does not automatically become clearer. A planner still has to manually translate “venue put this on hold” or “vendor quoted this date” into event timeline/calendar/tasks.

### C. Changes/crisis can create impact records, but do not update the schedule plan

Confirmed:

- Crisis issues can link listing, booking request, proposal, contract, and payment milestone context (`apps/web/prisma/schema.prisma:1193-1225`).
- Crisis creation builds an impact summary, may create a replacement booking request, creates a follow-up task, and records activity (`apps/web/src/server/routers/crisis.ts:47-81`, `190-289`).
- Pro Planner event workspace shows crisis issues, replacement request IDs, impact summary, and a manual-review next action without promising refund, payout, cancellation, or legal outcomes (`apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1017-1048`).
- Pro Planner workspace tests verify crisis impact/replacement-start copy (`apps/web/tests/pro-planner-event-workspace-polish.test.tsx:166-187`).

Gaps:

- Crisis creation adds a generic `Task` assigned to the current user, but it does not update affected milestones, checklist items, calendar events, vendor/venue booking status, or conflict/late state (`apps/web/src/server/routers/crisis.ts:263-272`).
- The Pro Planner timeline explicitly says it shows upcoming event milestones and does not route to payments/held funds (`apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1298-1317`). It also does not list crisis-created tasks or changed booking/calendar impacts in the same timeline.
- I did not find a visible “schedule changed” diff or affected-role notification path after a crisis or provider status change.

User-facing result:

A crisis can be recorded, but affected users still need to manually revisit the event timeline, tasks, calendar, provider dashboard, messages, contracts, and payment pages to understand what changed and what to do next.

### D. Next action exists on the Pro Planner workspace, but it is commerce-spine based rather than logistics-state based

Confirmed:

- Pro Planner selected-event navigation has a “Next real action” derived from sourcing/shortlist/request/proposal/contract/payment/execution state (`apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:385-397`, `857-910`).
- Operation cards include Execution checklist and Event timeline (`apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:699-744`).
- The side rail shows Next actions from the commerce spine and open checklist items (`apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:1350-1368`).
- Admin overview includes execution accountability counts for blocked, critical, overdue task/milestone items and crisis issues (`apps/web/src/app/(app)/admin/overview/page.tsx:123-128`, `166-175`, `212-218`).

Gaps:

- The Pro Planner next action ignores calendar conflicts, booking availability holds/bookings, overdue milestone dates, provider response status changes, and crisis-created logistics tasks.
- The Admin execution accountability card counts global tasks/milestones/crises, but does not show event-specific logistics impact, affected role, owner, due date, or direct schedule-recovery next action.
- Client-facing event view was not found in this W4 path as a schedule-impact recipient; the Preview smoke covers role dashboards but not a client seeing affected next action after a logistics change.

User-facing result:

A planner sees a useful commercial next action, but W4 requires affected roles to see logistics next action. Current UX can say “review proposals” while the actual event-day risk is “venue hold expires,” “walkthrough moved,” “vendor status changed,” or “replacement request affects setup timeline.”

### E. Calendar sync has useful mechanics but not full logistics semantics

Confirmed:

- Calendar page copy promises “Upcoming bookings, availability holds, planning milestones, and organization calendar items you can access” (`apps/web/src/app/(app)/calendar/page.tsx:241-246`).
- Calendar item creation links to an optional event and syncs to Google if a calendar account exists (`apps/web/src/app/(app)/calendar/page.tsx:66-147`).
- Google mapping tests cover stable private properties and all-day mapping (`apps/web/tests/google-calendar-mapping.test.ts:4-43`).
- Google pull updates mapped OneHub calendar records (`apps/web/src/lib/google.calendar.ts:244-290`).

Gaps:

- The calendar page only queries `CalendarEvent`; it does not actually merge `Milestone`, `Task`, `ChecklistItem`, `BookingRequest`, or `AvailabilitySlot` records into the view despite the broader copy (`apps/web/src/app/(app)/calendar/page.tsx:223-231`, `360-378`).
- Pulled Google changes update calendar records, but I did not find downstream logic that updates affected event timeline tasks, owner next actions, provider/venue holds, or conflict/late warnings.
- There is no inspected test proving a provider availability or booking status change appears in the calendar/logistics view.

User-facing result:

Calendar is useful as a calendar-record page, but it is not yet the logistics command surface implied by the W4 acceptance language.

## 4. Exact missing UX/user-flow gaps that would cause revisits

1. No unified logistics timeline.
   - Evidence: Overview timeline uses milestones; Tasks uses `Task`; Checklists uses `ChecklistItem`; Calendar uses `CalendarEvent`; provider/venue status uses `BookingRequest`/`AvailabilitySlot`.
   - Impact: users must manually reconcile multiple screens to know the real schedule.

2. Provider/venue availability holds are not event-plan objects.
   - Evidence: `AvailabilitySlot` has listing/time/status only; `holdSlot` updates slot status without event, booking request, task, calendar, or owner linkage.
   - Impact: a hold/booking can exist on provider-side availability without automatically creating a planner-visible logistics next action.

3. Booking status changes do not update event activity/timeline in context.
   - Evidence: `bookingRequest.setStatus` records `BOOKING_REQUEST_STATUS_SET` with listing org and no `eventId`.
   - Impact: planner event overview/recent activity can miss the provider status change that should drive the schedule.

4. Quote/status changes do not create schedule artifacts.
   - Evidence: provider quote creates proposal/payment milestone and provider-submitted activity, but no calendar item, task, milestone update, hold, conflict, or late-warning object.
   - Impact: users still have to turn a quote or hold into the event plan manually.

5. Calendar copy over-promises logistics aggregation.
   - Evidence: page copy mentions bookings, availability holds, and milestones, but the query renders only `CalendarEvent` records.
   - Impact: users may expect the calendar to be the coordination source and then miss task/availability/booking changes.

6. Crisis/replacement flow does not update the schedule plan.
   - Evidence: crisis creation can create a review task and replacement request, but does not move/flag milestones, checklists, calendar events, booking statuses, or conflict state.
   - Impact: after a disruption, roles know there is a crisis but not which timeline item changed or what schedule action is due next.

7. Next actions are not logistics-risk aware.
   - Evidence: Pro Planner `nextCommerceAction` is derived from commerce-spine state; side-rail risks are blocked commerce steps and open checklist items.
   - Impact: next action can miss late tasks, availability conflicts, moved calendar items, or venue/vendor response deadlines.

8. Provider/venue dashboards are local command centers, not event-plan feedback loops.
   - Evidence: vendor/venue dashboards show leads, upcoming dated work, calendar, messages, and readiness, but status/calendar actions do not write a shared event logistics artifact.
   - Impact: providers can respond locally while planners/clients still need to revisit messages or dashboards to see whether the plan changed.

9. Affected-role visibility is incomplete.
   - Evidence: messages are thread-based and dashboard previews loaded, but no inspected source/test proves that client/planner/provider/venue/admin each see the same changed schedule next action after a provider status or crisis update.
   - Impact: handoff gaps remain between roles; support/revisit pressure stays high.

10. Test coverage proves components and route health, not the W4 loop.
    - Evidence: tests cover event creation atomicity, event overview rendering, Pro Planner workspace copy, availability overlap logic, and Google calendar mapping; Preview smoke confirms dashboard routes load with no failures.
    - Impact: regressions in the full W4 handoff would not be caught: event timeline -> provider availability/status -> change -> updated plan -> affected-role next action.

## 5. User-facing impact

Current OneHub has useful W4 ingredients:

- event dates, milestones, checklists, tasks, and activity;
- a calendar page with manual OneHub records and Google sync mapping;
- listing availability slots;
- booking requests with provider/venue status;
- provider/venue dashboards with leads and dated work;
- crisis impact records and replacement-start support;
- Pro Planner selected-event cards and next-action copy;
- Admin execution-risk counts.

But the full scheduling/logistics workflow is still broken because these ingredients do not close the coordination loop. A real user still cannot reliably answer from one role-appropriate flow:

- What is the current event logistics plan?
- Which tasks, milestones, booking requests, holds, vendor statuses, and calendar items are connected?
- Did a provider/venue availability/status change affect the plan?
- What conflict, late item, or blocked handoff exists now?
- Which role owns the next action?
- Did every affected role see the changed schedule next action?

That is the revisit risk: dates and dashboards exist, but schedule truth is still fragmented.

## 6. Verdict

BROKEN

Reason: W4 has dates, milestones, tasks, calendar records, availability slots, booking requests, dashboards, and crisis records, but the required logistics loop is not closed. Provider/venue availability/status changes do not automatically update a unified event plan, conflict/late state, or affected-role next action.

## 7. Narrow next action for Atlas

Route Forge a narrow W4 implementation card to create a canonical event logistics summary that unifies schedule evidence without expanding into public launch, live payments, production changes, or legal claims.

Minimum acceptance for that Forge card:

1. Event workspace shows one logistics timeline combining milestones, tasks/checklist items, calendar items, booking requests, provider/venue holds/bookings, and crisis-created review/replacement tasks.
2. Booking request status/quote updates record event-scoped activity and surface in the planner event timeline.
3. Availability holds/booked slots can be linked to an event/request and shown as logistics evidence, not only provider listing state.
4. Calendar copy matches actual data, or the calendar view truly includes milestones/tasks/booking/availability overlays.
5. Crisis/replacement creation marks affected timeline items and creates a clear schedule next action with owner/due state.
6. Role surfaces show affected next action for planner, provider/venue, client/stakeholder where relevant, and admin oversight.
7. Tests cover the full W4 loop: event created -> provider/venue availability/status changes -> logistics summary updates -> conflict/late/changed state appears -> affected-role next action is visible.
8. Protected Preview smoke should walk a seeded W4 object flow across planner plus at least one provider/venue role; route-health-only evidence is not enough.

FOUNDER ESCALATION REQUIRED only if Atlas wants production data mutation, public Preview/domain exposure changes, credentials/env/billing/infra changes, legal/public-launch claims, live calendar-account changes outside protected test scope, or live-payment behavior.
