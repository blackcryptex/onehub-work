# Gate 6A Scout notification and admin UX gap map

Task: t_3cf42da8
Scope: read-only/local source and UX continuity review of OneHub workspace `/root/.hermes/workspaces/onehub/repo`.
Constraints followed: no Oracle, no live payments, no credentials/API keys, no billing, no production/public launch, no infrastructure, no destructive DB/schema/migration actions, no source code edits.
Verdict: PARTIAL

## 1. Flow under review

Gate 6A user-facing continuity for:

- in-app notification intake, dropdown display, read-state handling, and click-through
- email/SMS/in-app notification preference and delivery touchpoints
- admin oversight surfaces for verification, refunds, disputes, holdbacks, payouts, overrides, abuse, and users
- route handoffs from notification/admin UI to actionable detail pages

## 2. Evidence produced

Evidence directory:
`reports/production/acceleration/gate6a-scout-notification-admin-gap-map/`

Files:

- `gap-map.md` — this Scout UX continuity map
- `route-inventory.md` — current admin/notification route inventory
- `screenshots/admin-overview-localhost3001.png` — existing local screenshot evidence from this Gate 6A evidence folder
- `screenshots/admin-verification-localhost3001.png` — existing local screenshot evidence from this Gate 6A evidence folder
- `screenshots/notification-dropdown-empty-localhost3001.png` — existing local screenshot evidence from this Gate 6A evidence folder

Live-browser note: port 3000 is currently served from the migrated OpenClaw path, not the authoritative Hermes workspace, and port 3001 is not currently responding. I therefore treated source inventory plus the existing Gate 6A evidence screenshots in the required reports folder as the authoritative evidence set for this run.

## 3. Current notification implementation map

What exists:

1. Notification schema exists.
   - Source: `apps/web/prisma/schema.prisma`, model `Notification`
   - Fields include `userId`, `orgId`, `type`, `title`, `body`, `read`, `link`, `createdAt`.

2. REST notification list route exists.
   - Source: `apps/web/src/app/api/notifications/route.ts:7-20`
   - Behavior: authenticated GET returns the latest 20 notifications for the current user, ordered newest first.

3. REST mark-read route exists.
   - Source: `apps/web/src/app/api/notifications/[id]/read/route.ts:5-21`
   - Behavior: authenticated POST marks the current user’s notification as read.
   - UX note: errors return generic failure text; the dropdown does not visibly recover or explain failures.

4. Topbar notification dropdown exists.
   - Topbar source: `apps/web/src/components/layout/Topbar.tsx:24-28`
   - Dropdown source: `apps/web/src/components/notifications/NotificationDropdown.tsx:26-45`, `64-75`, `77-168`
   - Behavior: polls `/api/notifications` every 30 seconds, shows unread badge, opens a dropdown, marks an item read when its link is clicked, shows `No notifications yet` when empty.

5. tRPC notification helper/router exists.
   - Source: `apps/web/src/server/routers/notification.ts:6-24`
   - `notify()` creates notification records.
   - `listMy` returns unread notifications only.
   - `markRead` updates by notification id without scoping the update `where` clause to `userId`; this is a Steward/Sentinel security review concern, not a Scout implementation task.

6. Real/user-triggered producers found.
   - Booking request creation notifies listing org owners/admins: `apps/web/src/server/routers/bookingRequest.ts:35-38`.
   - Booking request response API creates booking response notifications: `apps/web/src/app/api/bookings/respond/route.ts`.
   - Reminder script creates task/checklist due notifications: `scripts/reminders.ts:11-29`.

7. Demo/seed producers found.
   - Seed data creates demo proposal/deposit/payout/contract notifications: `scripts/seed.ts:741-783`.

8. Email/SMS touchpoints are preference/stub-level, not delivery-complete.
   - User/settings preference fields: `apps/web/prisma/schema.prisma:167-169` (`marketingEmails`, `smsAlerts`).
   - Provider onboarding collects Email/SMS/In-App preferences: `apps/web/src/app/providers/onboarding/page.tsx`.
   - Guest invitations log a TODO/stub email and mark `sentAt`: `apps/web/src/server/routers/guest.ts:136-138`.
   - Contract signature send has TODO email stub: `apps/web/src/server/routers/contract.ts:198-199`.
   - Org invite logs a Resend stub: `apps/web/src/server/routers/invite.ts:21-24`.
   - No real outbound mailer/SMS delivery status UX was found in the reviewed source.

## 4. Current admin oversight implementation map

What exists:

1. Admin overview route exists at `/admin/overview`.
   - Source: `apps/web/src/app/(app)/admin/overview/page.tsx`
   - Shows KPI counts for organizations, users, events, open disputes, GMV trend, and admin onboarding.
   - Screenshot evidence exists: `screenshots/admin-overview-localhost3001.png`.

2. Admin verification route exists at `/admin/verification`.
   - Source: `apps/web/src/app/(app)/admin/verification/page.tsx`
   - Shows refund requests, dispute cases, holdbacks, payouts, and override history.
   - Filter inputs exist for query/refund/dispute/holdback/payout status.
   - Screenshot evidence exists: `screenshots/admin-verification-localhost3001.png`.

3. Admin verification detail routes exist.
   - `/admin/verification/refunds/[id]`
   - `/admin/verification/disputes/[id]`
   - `/admin/verification/holdbacks/[id]`
   - `/admin/verification/payouts/[id]`
   - `/admin/verification/overrides/[id]`
   - `/admin/verification/detail`

4. Other admin pages exist.
   - `/admin/users`
   - `/admin/abuse`

5. Admin APIs exist.
   - `/api/admin/holdbacks`
   - `/api/admin/holdbacks/verification`
   - `/api/admin/impersonate`
   - `/api/admin/override-history`
   - `/api/admin/stop-impersonate`

## 5. Continuity observed

Coherent:

- A global notification bell is visible in the authenticated topbar.
- The dropdown has a simple empty state and unread badge behavior.
- Notifications can carry links and can be marked read through the REST path.
- Admin overview and verification page sources exist and are guarded by auth/RBAC checks.
- Core admin trust queues are represented: refunds, disputes, holdbacks, payouts, overrides.
- Admin verification list rows link to detail routes in source.

Partial:

- Notification producers are sparse relative to OneHub’s trust/payment/contract milestones.
- Notification link targets are not normalized; some source uses valid `(app)` route URLs while other producer/demo paths still use stale `/app/events/...` targets.
- Email/SMS is visible as preference/stub language but not backed by clear live delivery UX or delivery status.
- Admin verification rows expose IDs/status fragments but weak scan-level context.
- No notification center/history/preferences route was found.
- Admin navigation has route-group confusion: actual pages are `/admin/...`, but several helpers/links still point to `/app/admin/...`.

## 6. Exact friction or dead end

1. Admin route handoffs can dead-end.
   - Actual route-group URL is `/admin/...`, not `/app/admin/...`.
   - Current stale sources:
     - `apps/web/src/app/(app)/admin/overview/page.tsx:25` links `Verification →` to `/app/admin/verification`.
     - `apps/web/src/components/layout/Sidebar.tsx:37-39` points admin sidebar links to `/app/admin/overview` and `/app/admin/verification`.
     - `apps/web/src/lib/routes.ts:117-118` returns `/app/admin/overview` for `dashboard("ADMIN")`.
     - `apps/web/src/app/(app)/admin/verification/actions.ts:36-76` revalidates stale `/app/admin/verification...` paths.
   - User-visible impact: admins can hit a 404 or stale navigation path instead of the oversight queue.
   - Severity: High.

2. Notification click-through policy is split and partly stale.
   - `scripts/seed.ts:756` and `764` use `/app/events/demo-wedding/milestones`, but event milestone pages are under `/events/[eventSlug]/milestones` in the authoritative route inventory.
   - `scripts/reminders.ts:17` and `29` use `/app/events/${ev.slug}/tasks` and `/app/events/${ev.slug}/checklists`, but route inventory found `/events/[eventSlug]/tasks` and `/events/[eventSlug]/checklists`, not `/app/events/...`.
   - `scripts/seed.ts:748` and `772` use `/app/proposals/...` and `/app/contracts/...`; those legacy pages exist, while canonical helpers point to `/proposals/[id]` and `/contracts/[id]`.
   - User-visible impact: some notifications may click to 404; others land on inconsistent legacy/canonical pages.
   - Severity: High.

3. Notification dropdown is isolated.
   - No full `/notifications` or `/app/notifications` page was found.
   - No mark-all-read, type filter, delivery status, preference handoff, or notification recovery/history path was found.
   - User-visible impact: users can see a transient dropdown but cannot audit older alerts or manage notification behavior.
   - Severity: Medium.

4. Gate-critical notification producers are incomplete.
   - Current producers cover booking request/response, reminders, and demo seed records.
   - Most trust-critical state changes do not clearly create user-facing notifications in the reviewed source: proposal approved/rejected, contract sent/signed, deposit/payment confirmed, payout status changed, refund requested/updated, dispute opened/frozen/resolved, holdback created/decided, admin override decided.
   - User-visible impact: users/admins may need to manually inspect pages to discover important trust/payment state changes.
   - Severity: High.

5. Email/SMS preference UI overstates current continuity.
   - Preferences/stubs exist, but deliverability/status/retry UX was not found.
   - User-visible impact: users may believe email/SMS alerts are active when the implementation is stub-level.
   - Severity: High.

6. Admin verification rows are weak for triage.
   - Rows show status/IDs/amount fragments, but not consistently event name, client/provider name, age/SLA, severity, assigned reviewer, last activity, or explicit primary action.
   - Empty state is generic `No records found.` at `apps/web/src/app/(app)/admin/verification/page.tsx:158-159`.
   - User-visible impact: admins cannot quickly tell whether queues are safe, filtered empty, permission-blocked, or data-failed; real triage requires clicking into records one by one.
   - Severity: Medium.

## 7. Gap map

| Area | Current state | Gap | User-visible impact | Severity |
|---|---|---|---|---|
| Admin routing | Admin pages exist at `/admin/...` | Stale `/app/admin/...` links/helpers/revalidation paths | Admin nav can 404 or feel broken | High |
| Notification routing | Dropdown link support exists | Some producer/demo/reminder links use stale `/app/events/...`; proposals/contracts split legacy/canonical paths | Notification click-through can fail or feel inconsistent | High |
| In-app producers | Schema/API/dropdown/helper exist | Producers cover only a subset of OneHub trust/payment events | Users miss critical state changes | High |
| Email/SMS | Preferences and stubs exist | No clear live delivery/status UX | Promised channels may not notify | High |
| Notification history | Dropdown only | No inbox/history/preferences route | Users cannot recover/audit prior alerts | Medium |
| Admin triage | Verification list exists | Weak row context and generic empty states | Slow/error-prone admin review | Medium |
| Admin oversight | Overview has KPIs | No prioritized “needs action now” queue summary on overview | Admin must know where to inspect manually | Medium |

## 8. Recommended narrow Forge implementation slices

1. Admin route continuity slice.
   - Replace stale `/app/admin/...` URLs with `/admin/...` in admin overview, sidebar, dashboard helper/tests, and admin revalidation paths.
   - Acceptance: admin dashboard/sidebar/helper links open `/admin/overview` and `/admin/verification` without 404.

2. Notification link normalization slice.
   - Normalize all notification links through route helpers for events, tasks, checklists, milestones, proposals, contracts, and requests.
   - Update seed/reminder/demo links away from stale `/app/events/...` paths.
   - Acceptance: every generated notification link maps to an existing page route in `route-inventory.md`.

3. Gate 6A minimum producer slice.
   - Add in-app notification creation for the smallest trust-critical set: contract sent/signed, proposal approved, payment/deposit confirmed, payout state changed, refund requested/updated, dispute opened/resolved, holdback created/decided, admin override decided.
   - Use existing `notify()`/Notification model first; do not build a new messaging system in this slice.
   - Acceptance: each selected state transition writes one user-facing in-app notification with a valid link.

4. Notification center slice.
   - Add `/notifications` under the authenticated app shell.
   - Include all notifications, unread filter, type label, timestamp, target link, mark read/all read.
   - Add dropdown handoff: `View all notifications`.
   - Acceptance: older notifications are recoverable outside the transient dropdown.

5. Delivery honesty slice.
   - If email/SMS remains stubbed, label those channel choices as `coming soon` or disable them with explanatory copy.
   - If delivery is implemented, add delivery status/failure/retry indicators where users/admins expect them.
   - Acceptance: UI no longer implies active email/SMS delivery unless it exists.

6. Admin triage readability slice.
   - Add queue counts, age/SLA, amount where present, human-readable related event/proposal/org/user where already queryable, and explicit `Review →` affordance.
   - Improve empty states to distinguish no work, filters hid work, failed load, and permission denial.
   - Acceptance: admin can identify oldest/highest-risk items without opening every record.

## 9. Coherence verdict

PARTIAL

The Gate 6A foundation exists: notification schema/API/dropdown and admin oversight pages are present. The user flow is not production-coherent yet because admin navigation can dead-end, notification click-through targets are inconsistent, email/SMS delivery is stub-level, and trust-critical notification producers are incomplete.

## 10. Narrow next action

Return this map to Atlas/Sentinel. Suggested Sentinel verification focus: route existence, stale link reproduction, and no live-side effects. Suggested first Forge slice: fix admin route continuity plus notification link normalization before expanding producers.
