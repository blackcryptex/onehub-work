# OneHub UI MVP Phase 3: Dashboard Cleanup Decision Packet

Date: 2026-08-04
Owner route: Atlas
Worker: Scout
Scope: read-only founder-facing MVP UI/dashboard direction packet based on Phase 1 inventory, Phase 2 pilot path/navigation analysis, and spot-checks of current dashboard/navigation source evidence.

Verdict: PARTIAL

## Scope inspected

This packet answers what OneHub should keep, simplify, hide, block, add, and defer for the private-pilot MVP dashboard direction.

Inspected:

- Phase 1 report: `reports/stabilization/ui-dashboard-mvp/PHASE1_ROLE_DASHBOARD_INVENTORY_2026-08-04.md`
- Phase 2 report: `reports/stabilization/ui-dashboard-mvp/PHASE2_PILOT_PATH_NAVIGATION_2026-08-04.md`
- Current route/component evidence for role dashboards, global navigation, event workflow panes, seller payout readiness, client summary, and admin verification surfaces.

This is analysis only. No product code was changed.

## Evidence reviewed

Primary upstream reports:

- Phase 1 identifies the role-dashboard inventory, recommended MVP dashboard set, and visible placeholder/duplicate surfaces: `PHASE1_ROLE_DASHBOARD_INVENTORY_2026-08-04.md:25-49`, `:180-210`, `:225-233`.
- Phase 2 defines the clean private-pilot path: create event -> event details -> matched/shortlisted providers -> proposal -> contract -> payment-readiness/status -> admin oversight/intervention: `PHASE2_PILOT_PATH_NAVIGATION_2026-08-04.md:45-188`.
- Phase 2 recommends a narrow navigation-cut implementation card, not a broad redesign: `PHASE2_PILOT_PATH_NAVIGATION_2026-08-04.md:392-396`.

Spot-checked source evidence:

- Global topbar still sends all users to generic `/app`: `apps/web/src/components/layout/Topbar.tsx:24-26`.
- Role sidebar maps DIY, Pro, Vendor, Venue, Admin, and default nav; admin has duplicate `/admin/overview` labels and vendor/venue share `/marketplace/manage` under different labels: `apps/web/src/components/layout/Sidebar.tsx:11-43`.
- Canonical role dashboard helper exists for Admin, DIY, Pro, Vendor, Venue, Event Dreamer, and Client/default: `apps/web/src/lib/routes.ts:134-152`.
- `/app` redirects many roles to canonical dashboards or provider onboarding, but still exists as a visible detour: `apps/web/src/app/app/page.tsx:33-63`.
- Dashboard RBAC allows matching role plus admin for non-admin dashboards; admin dashboard is admin-only: `apps/web/src/lib/rbac.ts:607-625`.
- DIY event detail renders the real `EventManagementSection`, while direct DIY planning route states still render `Content for {uiRoute} goes here`: `apps/web/src/components/diy-planner/Dashboard.tsx:282-360`, `:396-406`.
- Pro planner dashboard has real event creation/event list but business sub-tabs render `coming soon`: `apps/web/src/components/pro-planner/Dashboard.tsx:111-190`, `:287-324`.
- Vendor dashboard has real leads and payment panel; calendar/messages/settings are placeholders: `apps/web/src/components/vendor/Dashboard.tsx:93-273`, `:275-296`.
- Venue dashboard has hardcoded zero stats and placeholder leads/calendar/messages/settings: `apps/web/src/components/venue/Dashboard.tsx:51-139`.
- Seller Stripe Connect payout readiness is visible and should be preserved: `apps/web/src/app/(app)/billing/connect/page.tsx:75-120`.
- Buyer-side funding page still says Stripe Elements would be embedded, so it should be labeled carefully as readiness/status unless payment owner verifies live checkout: `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx:49-57`.
- Admin verification aggregates refunds, disputes, holdbacks, payouts, and overrides: `apps/web/src/app/(app)/admin/verification/page.tsx:126-149`.
- Client event summary includes deposit panel but also a placeholder messages block: `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:201-229`.

## Dashboard inventory summary

Private-pilot OneHub already has the important dashboard spine:

1. Founder/Admin oversight
   - `/admin/overview`
   - `/admin/verification`
   - verification detail routes for refunds, disputes, holdbacks, payouts, overrides
   - `/admin/users`
   - `/admin/abuse` as a secondary trust queue

2. DIY Planner
   - `/diy-planner`
   - `/diy-planner/vault`
   - `/diy-planner/vault/:eventSlug`
   - in-dashboard event wizard and event detail workflow panes

3. Professional Planner
   - `/professional-planner/setup`
   - `/pro/planner`
   - `/pro/planner/vault`
   - `/pro/planner/vault/:eventSlug`

4. Vendor
   - `/providers/onboarding?providerType=vendor`
   - `/vendor/dashboard`
   - vendor leads
   - vendor payments panel
   - `/app/billing/connect`

5. Venue
   - `/providers/onboarding?providerType=venue`
   - `/venue/dashboard`, but only if presented as setup/profile readiness instead of live booking performance
   - `/app/billing/connect`

6. Client / invited stakeholder
   - `/client/events/:eventSlug`
   - deposit/payment status panel
   - narrow summary-only access

7. Shared trust/payment workflow
   - event detail workflow panes
   - `/proposals/:id`
   - `/contracts/:id`
   - `/proposals/:id/fund`, with readiness/status copy until live checkout is verified
   - `/disputes`, simplified or operator-only until user-friendly copy exists
   - legal/trust/payment policy pages

The structure is viable. The cleanup need is exposure control: users should see the shortest role-appropriate path, not every route that exists.

## Keep / simplify / hide / block table

| Area | Decision | Plain founder reason |
|---|---|---|
| Admin overview | KEEP | Founder needs one operating dashboard for orgs, users, events, disputes, and GMV trend. |
| Admin verification | KEEP | This is OneHub's trust/payment oversight advantage. Do not weaken it. |
| Admin users / role control | KEEP | Required for founder control, support, and break-glass operations. |
| Admin abuse/trust | SIMPLIFY | Keep as secondary; do not make it compete with Overview/Verification/Users for pilot. |
| Duplicate admin sidebar `Dashboard` + `Admin` | HIDE | Both point to `/admin/overview`; it makes admin look unfinished. |
| Generic topbar `Dashboard -> /app` | SIMPLIFY | Use role-aware dashboard destinations so users do not bounce through redirects. |
| `/app` generic dashboard | HIDE FROM PRIMARY NAV | Keep as fallback/redirect surface, not a destination users learn. |
| DIY dashboard and event vault | KEEP | Strongest planner MVP surface; supports create event, event list, and event detail workflow. |
| DIY event detail workflow panes | KEEP | This is the private-pilot center: providers, proposals, contracts, budget/payments, guests, tasks, milestones. |
| DIY standalone planning placeholder panes | HIDE | `Content for {uiRoute} goes here` will break confidence. Keep these actions inside real event detail only. |
| DIY Settings/Help side items that do not route | HIDE | Non-routing account items create friction. |
| Pro planner event dashboard/vault | KEEP | Good enough for event creation and event management. |
| Pro planner business cards/sub-tabs | SIMPLIFY | Convert to checklist or hide until real; current clicks land in `coming soon`. |
| Pro planner Client Management card | HIDE | It looks clickable but has no action. |
| Vendor dashboard Overview/Leads/Payments | KEEP | Vendor has real booking requests and payment/milestone visibility. |
| Vendor Calendar/Messages/Settings | HIDE | These are placeholders. |
| Vendor Stripe Connect / payout readiness | KEEP | Required for seller readiness and payment trust. |
| Vendor Listings / marketplace manage | SIMPLIFY | Keep read/manage capability if useful; hide create-listing affordances unless wired. |
| Venue onboarding/profile | KEEP | Venue can pilot as setup/profile readiness. |
| Venue dashboard live booking stats | SIMPLIFY | Hardcoded zeros should not be shown as proof of business activity. |
| Venue Leads/Calendar/Messages/Settings | HIDE | These are placeholders. |
| Venue `Availability -> /marketplace/manage` | SIMPLIFY | Label/path mismatch should be fixed or hidden. |
| Client event summary | KEEP | Safe narrow stakeholder view; deposit panel supports client payment/status lane. |
| Client messages block | HIDE | Placeholder messaging creates expectation OneHub cannot meet yet. |
| Proposal and contract details | KEEP | Core workflow differentiators. |
| Manual proposal creation placeholder route | HIDE | Clean proposal path should start from shortlist in event detail. |
| Buyer-side funding page | SIMPLIFY | Treat as payment readiness/status unless live Stripe checkout is verified and approved. |
| Seller payout readiness | KEEP | Preserve Stripe Connect status and readiness copy for vendors/venues. |
| `/disputes` user form | SIMPLIFY/BLOCK FROM NORMAL USERS | Raw IDs and amount cents are operator-facing; keep admin/trust path, not broad user nav. |
| Public marketplace/discovery | KEEP OUTSIDE DASHBOARD CLEANUP | Useful acquisition/discovery side; do not let it compete with event-specific pilot workflow. |
| Legacy `/event-vault` and duplicate `/app/vault` links | HIDE FROM PRIMARY NAV | Keep redirects/fallbacks, but role-specific vaults should be canonical. |
| Live payment/public exposure changes | BLOCK | Requires payment owner/founder approval; do not imply live checkout readiness from UI alone. |
| Removing admin verification/payment controls | BLOCK | Would weaken OneHub trust and operating-control differentiation. |

## Dashboards or panels to add for MVP if missing

These are narrow additions, not a redesign:

1. Role-aware dashboard destination in the topbar
   - One `Dashboard` link should send each role to its canonical dashboard.
   - Admin -> `/admin/overview`
   - DIY -> `/diy-planner`
   - Pro -> `/pro/planner`
   - Vendor -> `/vendor/dashboard`
   - Venue -> `/venue/dashboard`
   - Client -> shared client event summary when deep-linked; otherwise generic `/app` fallback.

2. Planner event workflow status strip
   - Add or expose a simple per-event status strip: Event details -> Providers -> Proposal -> Contract -> Payment readiness -> Admin review if needed.
   - Purpose: Marlon can look at one screenshot and know where the event is stuck.

3. Payment readiness label/panel for planner side
   - Buyer/planner side should say `Payment readiness` or `Payment status`, not `Pay now`, unless live Stripe collection is verified by the payment owner.
   - Seller side should keep `Connect Stripe` / `Seller payout readiness`.

4. Provider setup readiness card
   - For Vendor and Venue, show setup readiness: profile, services/spaces, availability/policies, Stripe Connect, media.
   - This replaces placeholder tabs with a truthful checklist.

5. Admin intervention link from workflow status
   - Admin should be able to see which event/payment/proposal needs verification or intervention.
   - Keep this admin-only; do not expose admin intervention controls to normal users.

6. Client shared-summary empty state
   - Keep or add clear copy when nothing is shared: `Your planner has not shared details yet.`
   - Do not show operational planner/provider/admin areas to client users.

## Role access and blocking recommendations

| Role | Primary allowed MVP destination | Block or hide from role | Notes |
|---|---|---|---|
| Founder/Admin | `/admin/overview`, `/admin/verification`, `/admin/users`, secondary `/admin/abuse` | Do not show normal role dashboards as standard nav | Admin may access role dashboards for support, but entry should be explicit through support/impersonation context. |
| DIY Planner | `/diy-planner`, `/diy-planner/vault`, event detail, event wizard | Admin surfaces, provider setup, venue/vendor dashboards, placeholder DIY standalone tabs | Keep DIY centered on event creation and event vault. |
| Pro Planner | `/professional-planner/setup`, `/pro/planner`, `/pro/planner/vault`, event detail | Admin surfaces, provider dashboards, pro `coming soon` business tabs | Show event/client workflow first; turn future business features into checklist copy or hide. |
| Vendor | Provider onboarding, `/vendor/dashboard`, Leads, Payments, Stripe Connect | Planner event creation, admin surfaces, vendor placeholder tabs | Vendor should see lead/payment readiness, not planner operations. |
| Venue | Provider onboarding, simplified `/venue/dashboard`, Stripe Connect | Planner event creation, admin surfaces, hardcoded activity stats, venue placeholder tabs | Treat venue as setup/profile/payout readiness until booking data is real. |
| Client | `/client/events/:eventSlug` only when shared | Generic `/app` as primary nav, admin/provider/planner operational surfaces, messages placeholder | Client access should remain narrow and trust-preserving. |
| Event Dreamer | Signup/create-event acquisition path only | Role dashboards unless upgraded to DIY/Pro role | Do not make Event Dreamer a dashboard role for private pilot unless Atlas changes role strategy. |

Hard blocks:

- Block normal users from admin verification, admin users, admin abuse, admin overrides, and break-glass controls.
- Block client users from planner/provider/admin operational surfaces.
- Block broad public/live payment collection exposure until payment owner/founder approval verifies live checkout behavior.
- Block any cleanup that removes admin verification, disputes, holdbacks, payout readiness, or override visibility.

## Top 10 UI changes for private pilot, ordered by impact

1. Make topbar `Dashboard` role-aware.
   - Impact: removes the biggest repeated detour and makes every role land on its real home.

2. Reduce admin nav to `Overview`, `Verification`, `Users`, with `Abuse/Trust` secondary.
   - Impact: preserves founder control while removing duplicate/confusing admin labels.

3. Hide placeholder role tabs from primary navigation.
   - Impact: prevents users from hitting `coming soon` or stub panes during pilot.

4. Center planner users on event detail workflow.
   - Impact: makes the private-pilot path obvious: event -> providers -> proposal -> contract -> payment status.

5. Rename event workflow labels to user outcomes.
   - Suggested labels: `Find providers`, `Build proposal`, `Contract`, `Payment status`, `Tasks`.
   - Impact: screenshots become decision-friendly for Marlon and easier for pilot users to understand.

6. Preserve seller `Connect Stripe` / `Payout readiness` as a visible provider action.
   - Impact: keeps payment-readiness trust without implying buyer checkout is fully live.

7. Change buyer funding copy to `Payment readiness/status` unless live checkout is verified.
   - Impact: avoids overclaiming payment functionality.

8. Simplify Vendor dashboard to Overview, Leads, Payments, Payout readiness.
   - Impact: vendor pilot feels functional instead of scattered across placeholders.

9. Simplify Venue dashboard to setup/profile readiness plus payout readiness.
   - Impact: avoids showing hardcoded zeros and placeholder booking features as if they are real.

10. Hide client messages placeholder and keep client event summary narrow.
   - Impact: invited stakeholders see a trustworthy summary/payment lane, not unfinished messaging.

## Items deferred until after private pilot

Defer these explicitly so they do not block MVP cleanup:

- Full calendar system for vendors, venues, pro planners, and DIY planners.
- Full in-app messaging and message-thread UX.
- Vendor/venue settings panels.
- Pro planner services/packages editor.
- Pro planner availability and booking management.
- Pro planner payments/contracts configuration panel.
- Pro planner portfolio/branding upload tools.
- Pro planner client management dashboard.
- Venue live leads dashboard until real venue lead data is wired.
- Venue live booking stats until real counts replace hardcoded zeros.
- Venue availability-specific route unless it is separate from generic marketplace manage.
- Marketplace listing creation from `/marketplace/manage` unless fully wired.
- Manual proposal creation route.
- Broad `/requests` exposure until audience/copy is clarified.
- Generic `/notifications` as primary MVP nav unless role-specific notifications are verified useful.
- Generic `/calendar` as primary MVP nav.
- Generic `/messages/:threadId` as primary MVP nav.
- Event Dreamer as a full dashboard role.
- Public/live payment collection UX beyond verified readiness/status surfaces.
- Public exposure of any admin intervention, override, verification, refund, dispute, holdback, or payout controls.

## Founder-facing MVP dashboard direction

For private pilot, OneHub should not look bigger than it is. It should look controlled, useful, and honest.

Recommended dashboard direction:

- Keep the role-dashboard spine.
- Simplify navigation before redesigning screens.
- Hide placeholders instead of explaining them.
- Preserve trust/payment/admin surfaces because they are part of OneHub's differentiation.
- Treat event detail as the center of the planner journey.
- Treat provider dashboards as setup + leads + payment readiness.
- Treat client access as a narrow shared summary.
- Treat admin as the operating-control layer, not just another dashboard.

## User-facing impact

If OneHub ships current dashboard exposure as-is, pilot users can hit duplicate dashboard routes, placeholder tabs, label/path mismatches, and payment copy that may imply more readiness than verified. That weakens trust even though the underlying product spine is promising.

If Atlas routes the narrow cleanup, private-pilot users should see fewer paths, clearer next actions, and fewer dead ends while Marlon keeps founder/admin control over verification, users, disputes, refunds, holdbacks, payouts, and overrides.

## Verdict

PARTIAL

The MVP dashboard structure is usable for private pilot, but only after navigation exposure is narrowed. The right next step is a cleanup cut, not a broad redesign and not payment/admin control removal.

## Narrow next action for Atlas

Atlas should route one implementation card for a narrow MVP dashboard cleanup cut:

1. Make topbar dashboard destination role-aware.
2. Simplify role sidebars to private-pilot actions only.
3. Hide placeholder tabs/routes from primary nav.
4. Align event-detail workflow labels to the pilot path.
5. Preserve seller payout readiness and admin verification/users oversight.
6. Change buyer payment copy to readiness/status unless live checkout is verified.

FOUNDER ESCALATION REQUIRED only if Atlas wants to change role strategy, expose live payment collection publicly, remove admin intervention surfaces, alter production/payment credentials, or make public/billing changes.
