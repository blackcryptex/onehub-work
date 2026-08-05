# OneHub UI MVP Phase 2: Pilot Path and Navigation Model

Date: 2026-08-04
Owner route: Atlas
Worker: Steward
Scope: read-only Phase 2 analysis of private-pilot user journey and navigation shape, using Phase 1 report plus current route/component inspection.

Verdict: PARTIAL

## Scope reviewed

Reviewed the private-pilot path requested by Atlas:

create event -> details -> matched/shortlisted providers -> proposal -> contract -> payment-readiness/status -> admin oversight/intervention.

This was analysis only. No product code was changed.

## Evidence examined

Phase 1 source:

- `reports/stabilization/ui-dashboard-mvp/PHASE1_ROLE_DASHBOARD_INVENTORY_2026-08-04.md:25-49` documents the route/component inventory inspected upstream.
- `reports/stabilization/ui-dashboard-mvp/PHASE1_ROLE_DASHBOARD_INVENTORY_2026-08-04.md:180-210` recommends the MVP dashboard set and surfaces to hide/simplify.
- `reports/stabilization/ui-dashboard-mvp/PHASE1_ROLE_DASHBOARD_INVENTORY_2026-08-04.md:225-233` gives the Phase 1 PARTIAL verdict and next action.

Current route/navigation evidence:

- Role sidebar maps DIY, Pro, Vendor, Venue, Admin, and default dashboard links in `apps/web/src/components/layout/Sidebar.tsx:11-43`.
- Topbar still exposes a generic `Dashboard -> /app` for all roles, with only a DIY-specific extra button in `apps/web/src/components/layout/Topbar.tsx:19-26`.
- `/app` redirects admins, providers, DIY/event-dreamer/pro roles toward role dashboards or provider onboarding in `apps/web/src/app/app/page.tsx:33-63`.
- Canonical dashboard helper maps roles to `/admin/overview`, `/diy-planner`, `/pro/planner`, `/vendor/dashboard`, `/venue/dashboard`, and `/app` for CLIENT/default in `apps/web/src/lib/routes.ts:132-153`.
- DIY event detail renders the real `EventManagementSection` after event selection in `apps/web/src/components/diy-planner/Dashboard.tsx:282-360`, but direct standalone planning route states still render placeholder copy in `apps/web/src/components/diy-planner/Dashboard.tsx:396-406`.
- Event action tabs are Vendors, Proposals, Contracts, Budget, Guests, Tasks, and Milestones in `apps/web/src/components/EventActionBar.tsx:21-31`.
- Vendor shortlisting and generation actions exist in `apps/web/src/components/panes/VendorsPane.tsx:43-58` and `apps/web/src/components/panes/VendorsPane.tsx:76-115`.
- Proposal generation from shortlist, preview-before-send, and approval/rejection actions exist in `apps/web/src/components/panes/ProposalsPane.tsx:38-65` and `apps/web/src/components/panes/ProposalsPane.tsx:111-205`.
- Contract generation from accepted proposals and preview-before-e-sign actions exist in `apps/web/src/components/panes/ContractsPane.tsx:24-56` and `apps/web/src/components/panes/ContractsPane.tsx:58-120`.
- Shared proposal, contract, and funding detail pages enforce read guards and role-aware vault return paths in `apps/web/src/app/(app)/proposals/[id]/page.tsx:60-85`, `apps/web/src/app/(app)/contracts/[id]/page.tsx:61-112`, and `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx:40-58`.
- Seller Stripe Connect readiness shows details submitted, charges enabled, payouts enabled, and payout readiness in `apps/web/src/app/(app)/billing/connect/page.tsx:75-120`.
- Vendor dashboard exposes real leads and payments panels, with placeholder calendar/messages/settings in `apps/web/src/components/vendor/Dashboard.tsx:93-271` and `apps/web/src/components/vendor/Dashboard.tsx:275-296`.
- Venue dashboard is mostly setup/placeholder, with hardcoded zero stats and placeholder leads/calendar/messages/settings in `apps/web/src/components/venue/Dashboard.tsx:41-139`.
- Pro planner overview supports event creation and event vault entry, while business tabs are mostly `coming soon` in `apps/web/src/components/pro-planner/Dashboard.tsx:111-190` and `apps/web/src/components/pro-planner/Dashboard.tsx:287-324`.
- Admin overview and verification surfaces cover org/user/event/open-dispute metrics plus refund/dispute/holdback/payout/override queues in `apps/web/src/app/(app)/admin/overview/page.tsx:7-45` and `apps/web/src/app/(app)/admin/verification/page.tsx:126-149`.
- Client-safe event summary is share-gated and includes deposit status, but messages are placeholder in `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:75-102`, `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:201-229`.

## Clean private-pilot path

### 1. Create event

Primary entry:

- DIY Planner: `/diy-planner` empty state or overview CTA should lead into the in-dashboard event wizard.
- Pro Planner: `/pro/planner` should make `Create Event` one of the first visible actions.
- Admin: should not create events as the primary path except through explicit impersonation/support.

Evidence:

- DIY empty state calls `Launch event wizard` in `apps/web/src/components/diy-planner/Dashboard.tsx:235-245`.
- DIY no-event detail state also offers `Create Event` in `apps/web/src/components/diy-planner/Dashboard.tsx:363-385`.
- Pro planner event list exposes `Create Event` in `apps/web/src/components/pro-planner/Dashboard.tsx:111-126`.
- `/events/new` posts to `/api/events/create` then routes to `vaultDetail(session.user.role, slug)` in `apps/web/src/app/events/new/page.tsx:124-170`.

Navigation model:

- First visible CTA for planner roles should be `Create event` when no event exists.
- Once event exists, first visible CTA should become `Open event details` / `Event Vault`.
- Hide duplicate create routes from normal navigation; keep `/events/new` as a linked action, not a competing destination.

### 2. Event details

Primary entry:

- DIY: `/diy-planner/vault/:eventSlug` or in-dashboard selected event detail.
- Pro: `/pro/planner/vault/:eventSlug`.
- Shared fallback: `/app/vault/:eventSlug` only when role-specific route is unavailable.

Evidence:

- Role helper supports role-aware vault detail routing via proposal/contract return logic in `apps/web/src/app/(app)/proposals/[id]/page.tsx:65-75` and `apps/web/src/app/(app)/contracts/[id]/page.tsx:64-73`.
- Event detail should anchor around `EventManagementSection`, which renders the real workflow tabs in `apps/web/src/components/EventManagementSection.tsx:31-41`.

Navigation model:

- Treat event detail as the center of the pilot, not the generic `/app` dashboard.
- Event detail top tabs should be the workflow sequence: Providers -> Proposals -> Contracts -> Budget/Payments -> Guests/Tasks/Milestones.
- For MVP, prefer labels that describe user outcomes: `Find providers`, `Build proposal`, `Contract`, `Payments`, `Tasks`.

### 3. Matched / shortlisted providers

Primary entry:

- Event detail `Vendors` tab.
- Public marketplace/discovery can remain secondary, but the pilot journey should start from the event context.

Evidence:

- Vendor pane can generate vendor suggestions from event context in `apps/web/src/components/panes/VendorsPane.tsx:43-49`.
- Vendor pane supports shortlist toggling and a primary `Use Shortlist in Proposals` action in `apps/web/src/components/panes/VendorsPane.tsx:52-58` and `apps/web/src/components/panes/VendorsPane.tsx:83-89`.

Navigation model:

- Primary action: `Generate provider matches`.
- Secondary action: `Add other provider`.
- Next action after at least one shortlisted provider: `Use shortlist in proposals`.
- Avoid sending users first to broad `/marketplace/manage`, `/requests`, or provider dashboard surfaces before the event-specific shortlist exists.

### 4. Proposal

Primary entry:

- Event detail `Proposals` tab after provider shortlist.
- Shared proposal detail `/proposals/:id` only after a proposal exists.

Evidence:

- Proposal pane can generate from shortlisted vendors in `apps/web/src/components/panes/ProposalsPane.tsx:38-65`.
- Proposal pane requires preview before send in `apps/web/src/components/panes/ProposalsPane.tsx:80-99`.
- Proposal pane supports approve/reject in `apps/web/src/components/panes/ProposalsPane.tsx:101-109` and visible action buttons in `apps/web/src/components/panes/ProposalsPane.tsx:176-200`.
- Manual proposal creation route is explicitly placeholder and points users back to Event Vault in `apps/web/src/app/(app)/events/[eventSlug]/proposals/new/page.tsx:7-14` and `apps/web/src/app/(app)/events/[eventSlug]/proposals/new/page.tsx:30-44`.

Navigation model:

- Primary action: `Generate proposal from shortlist`.
- Secondary actions: `Preview`, then `Send`.
- Decision action: `Approve` / `Reject`.
- Hide or de-emphasize manual proposal creation route until implemented; it is not the clean pilot path.

### 5. Contract

Primary entry:

- Event detail `Contracts` tab after proposal acceptance.
- Shared contract detail `/contracts/:id` after a contract exists.

Evidence:

- Contracts pane filters accepted proposals and generates contracts from them in `apps/web/src/components/panes/ContractsPane.tsx:10-30`.
- Contracts pane requires preview before send for e-sign in `apps/web/src/components/panes/ContractsPane.tsx:44-56`.
- Contract detail page computes buyer-side payment entry and seller-side signing context in `apps/web/src/app/(app)/contracts/[id]/page.tsx:75-112`.

Navigation model:

- Primary action: `Generate contract` only when an accepted proposal exists.
- Secondary action: `Preview`.
- Next action: `Send for e-sign`.
- Contract detail should be the durable status page, while event detail remains the workflow hub.

### 6. Payment-readiness / status

Primary entry:

- Buyer/planner side: proposal funding or event payment plan after accepted proposal/contract.
- Seller/provider side: `/app/billing/connect` for payout readiness plus vendor payment panel for held funds/milestones.
- Admin side: `/admin/verification` for exceptions, refunds, disputes, holdbacks, payouts, and overrides.

Evidence:

- Funding page shows amount to fund but still says Stripe Elements would be embedded in `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx:44-58`.
- Seller Connect page shows `Seller payout readiness: Ready / More Stripe onboarding required` in `apps/web/src/app/(app)/billing/connect/page.tsx:89-120`.
- Vendor payment panel shows total, funds held, paid, milestone statuses, and `Mark Complete` for held funds in `apps/web/src/components/payments/VendorPaymentPanel.tsx:52-63` and `apps/web/src/components/payments/VendorPaymentPanel.tsx:100-175`.
- Payment plan client includes accepted-proposal payment plan construction and deposit/payout actions in `apps/web/src/components/payments/PaymentPlanPageClient.tsx:179-197`.

Navigation model:

- Do not present live payment as fully ready where the UI is still placeholder.
- Label buyer-side as `Payment status` or `Payment readiness` until Stripe Elements and real settlement path are confirmed.
- Keep seller-side `Connect Stripe` / `Payout readiness` visible for vendors and venues.
- Keep admin verification visible because it preserves OneHub trust/payment differentiation.

### 7. Admin oversight / intervention

Primary entry:

- `/admin/overview` for founder/admin operating dashboard.
- `/admin/verification` for money/trust exception queues.
- `/admin/users` for role control and break-glass support.
- `/admin/abuse` as secondary queue, not first-level pilot user nav.

Evidence:

- Admin overview shows organizations, users, events, open disputes, GMV trend, and links to verification/users in `apps/web/src/app/(app)/admin/overview/page.tsx:20-45`.
- Admin verification aggregates refunds, disputes, holdbacks, payouts, and overrides in `apps/web/src/app/(app)/admin/verification/page.tsx:145-149`.

Navigation model:

- Admin nav should be: `Overview`, `Verification`, `Users`, `Abuse/Trust` secondary.
- Remove the duplicate Admin sidebar item that points to the same route as Dashboard.
- Admin access to role dashboards should remain explicit through impersonation/support context, not normal top-level nav.

## Role-first primary actions

### DIY Planner

Show first:

1. Create event.
2. Open event vault / event details.
3. Generate provider matches.
4. Build proposal from shortlist.
5. Review contract/payment status.

Hide or move later:

- Standalone DIY planning tab states that render `Content for {uiRoute} goes here`.
- Settings/help menu items that do not route.
- Legacy `/event-vault` and generic `/app/vault` links in user-facing nav when role-specific vault is available.

### Professional Planner

Show first:

1. Create event.
2. Open client/event vault.
3. Manage provider shortlist/proposals/contracts inside the event.
4. Share client-safe summary/deposit status when applicable.
5. Review payment readiness/status.

Hide or move later:

- Services, availability, payments/contracts, portfolio, and settings tabs until they stop rendering `coming soon`.
- Client Management card until it has a real destination/action.
- Manual proposal creation placeholder route.

### Vendor

Show first:

1. Complete provider onboarding/profile.
2. View leads / booking requests.
3. Review proposal or contract detail when linked.
4. Connect Stripe / check payout readiness.
5. Mark milestone complete / view held-funds status when applicable.

Hide or move later:

- Calendar, messages, settings tabs because they are placeholders.
- Marketplace/manage creation affordances unless the listing create flow is truly wired.
- Generic event vault unless vendors have a clear event-specific reason to open it.

### Venue

Show first:

1. Complete venue onboarding/profile.
2. Review venue profile/listing/availability setup.
3. Connect Stripe / check payout readiness.
4. Review booking request only when real data exists.

Hide or move later:

- Leads, calendar, messages, settings tabs while they render placeholder copy.
- Hardcoded zero metric cards as proof of activity.
- `Availability -> /marketplace/manage` label/path mismatch until clarified.

### Client / invited stakeholder

Show first:

1. Open shared event summary.
2. Review date/location/guest/objective summary.
3. View deposit/payment status.
4. See clear `Nothing shared yet` if summary is not shared.

Hide or move later:

- Generic `/app` dashboard as a primary client destination.
- Placeholder messages block.
- Planner/admin/provider operational surfaces.

### Founder/Admin

Show first:

1. Overview metrics: orgs, users, events, open disputes, GMV trend.
2. Verification queues: refunds, disputes, holdbacks, payouts, overrides.
3. User/role control and break-glass support.
4. Abuse/trust queue as secondary.
5. Explicit intervention path into a user/event/payment issue.

Hide or move later:

- Duplicate `Dashboard` and `Admin` sidebar labels pointing to `/admin/overview`.
- Normal role-dashboard nav unless invoked through explicit support/impersonation.

## Confusing, duplicative, or dead-end navigation items

1. Generic Topbar `Dashboard -> /app` remains too broad for private pilot.
   - Evidence: `apps/web/src/components/layout/Topbar.tsx:24-26`.
   - Risk: role users bounce through redirects instead of learning their canonical dashboard.
   - Narrow correction: compute the topbar dashboard href from role using the same canonical dashboard model as `dashboard(role)`.

2. Admin sidebar duplicates `/admin/overview` as both `Dashboard` and `Admin`.
   - Evidence: `apps/web/src/components/layout/Sidebar.tsx:35-40`.
   - Risk: admin nav looks unfinished and reduces trust.
   - Narrow correction: keep `Overview`, `Verification`, `Users`; move `Abuse` secondary if included.

3. Vendor and Venue global sidebar both route provider secondary items to `/marketplace/manage` under different labels.
   - Evidence: `apps/web/src/components/layout/Sidebar.tsx:23-34`.
   - Risk: `Listings` vs `Availability` vs `Manage Listings` creates label/contract mismatch.
   - Narrow correction: use `Listings` for both or hide venue item until an availability-specific page exists.

4. DIY standalone planning states compete with the real event-detail panes.
   - Evidence: real event panes at `apps/web/src/components/EventManagementSection.tsx:31-41`; placeholder direct states at `apps/web/src/components/diy-planner/Dashboard.tsx:396-406`.
   - Risk: users can click a promising label and hit stub content.
   - Narrow correction: surface planning tabs only inside selected event detail.

5. Pro Planner business/profile cards look clickable but land in `coming soon` panes.
   - Evidence: `apps/web/src/components/pro-planner/Dashboard.tsx:193-264` and `apps/web/src/components/pro-planner/Dashboard.tsx:287-324`.
   - Risk: pro users conclude onboarding/payment readiness is incomplete.
   - Narrow correction: collapse these into a non-clickable onboarding checklist or hide until wired.

6. Vendor and Venue role dashboards show placeholder secondary tabs.
   - Evidence: vendor placeholders at `apps/web/src/components/vendor/Dashboard.tsx:275-296`; venue placeholders at `apps/web/src/components/venue/Dashboard.tsx:110-139`.
   - Risk: pilot users hit dead ends after the first successful action.
   - Narrow correction: keep vendor Overview/Leads/Payments; keep venue Setup/Profile/Payout readiness only.

7. Proposal manual creation route is a visible dead-end if surfaced.
   - Evidence: `apps/web/src/app/(app)/events/[eventSlug]/proposals/new/page.tsx:7-14`.
   - Risk: breaks the clean proposal path.
   - Narrow correction: do not expose it in MVP nav; keep proposal creation through event vault shortlist flow.

8. Funding page copy overclaims readiness if presented as live checkout.
   - Evidence: `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx:49-57` says Stripe Elements would be embedded.
   - Risk: payment trust issue.
   - Narrow correction: label as payment-readiness/status unless live Stripe funding path is fully wired and approved.

9. Client messages section is placeholder.
   - Evidence: `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:214-223`.
   - Risk: invited stakeholders expect messaging support that is not present.
   - Narrow correction: hide messages block or label it as future support outside primary path.

10. `/requests` copy says booking requests from vendors appear here, while data is org/listing scoped.
    - Evidence: `apps/web/src/app/(app)/requests/page.tsx:50-55` and `apps/web/src/app/(app)/requests/page.tsx:29-42`.
    - Risk: unclear audience and provider/client direction.
    - Narrow correction: keep it secondary; prefer vendor dashboard Leads for provider-facing requests.

## Recommended MVP navigation shape

Topbar:

- OneHub home/logo.
- Role-aware primary dashboard link:
  - ADMIN -> `/admin/overview`
  - DIY_PLANNER -> `/diy-planner`
  - PRO_PLANNER -> `/pro/planner`
  - VENDOR -> `/vendor/dashboard`
  - VENUE -> `/venue/dashboard`
  - CLIENT -> client event summary when deep-linked, otherwise `/app` fallback only.
- Notifications only if functional enough for the role.
- Sign out.

Planner event hub:

- Overview.
- Event Vault / Event Details.
- Providers.
- Proposals.
- Contracts.
- Payment status/readiness.
- Guests/Tasks/Milestones as secondary planning operations.

Provider hub:

- Onboarding/Profile setup.
- Leads/Requests.
- Contract/Payment status.
- Stripe Connect/Payout readiness.

Admin hub:

- Overview.
- Verification.
- Users.
- Abuse/Trust secondary.
- Explicit intervention/impersonation support only.

## Correctness verdict

PARTIAL

OneHub has enough route and component structure to support a clean private-pilot path, but the current visible navigation is not yet clean enough to expose as-is. The structural spine exists: event creation, event detail, provider shortlist, proposal generation, contract generation, seller payout readiness, vendor payment status, and admin verification. The risk is overexposure of duplicate dashboards, placeholder role tabs, and payment surfaces whose copy can imply more live readiness than the code demonstrates.

## Exact risk / blocker

No founder-only blocker was found for Phase 2 analysis. The primary blocker for MVP navigation confidence is structural clarity, not missing core surfaces:

- generic `/app` remains a visible detour despite canonical role dashboards;
- several role nav items lead to placeholders;
- proposal/contract/payment path mixes real workflow panes with placeholder/manual/deferred routes;
- payment-readiness must be named carefully until live funding and payout behavior is verified by the backend/payment owner;
- admin oversight must stay visible so trust/payment intervention remains differentiated.

## Narrow next action for Atlas

Atlas should route a navigation-cut implementation card, not a broader redesign. Scope it to: role-aware topbar dashboard destination, simplified role sidebars, hidden placeholder tabs/routes from primary nav, event-detail workflow labels aligned to the pilot path, seller `Payout readiness` link preservation, and admin `Overview/Verification/Users` preservation.

FOUNDER ESCALATION REQUIRED only if Atlas wants to change role strategy, expose live payment collection publicly, remove admin intervention surfaces, or alter production/payment credentials. Otherwise, the next step is inside approved OneHub MVP stabilization scope.
