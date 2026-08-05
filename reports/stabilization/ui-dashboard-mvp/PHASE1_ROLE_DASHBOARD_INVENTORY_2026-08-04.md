# OneHub UI MVP Phase 1: Role Dashboard Inventory

Date: 2026-08-04
Owner route: Atlas
Worker: Scout
Scope: read-only inspection of current worktree routes, dashboard components, navigation, and admin surfaces for private-pilot MVP dashboard direction.

Verdict: PARTIAL

## Scope inspected

Inspected OneHub web UI route inventory and role-facing dashboard surfaces in:

- `apps/web/src/app/**/page.tsx`
- `apps/web/src/app/(app)/layout.tsx`
- `apps/web/src/app/app/layout.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/Topbar.tsx`
- `apps/web/src/lib/routes.ts`
- `apps/web/src/lib/rbac.ts`
- Role dashboards/components for DIY Planner, Pro Planner, Vendor, Venue, Client, and Admin.

This was analysis only. No product code was changed.

## Evidence reviewed

Confirmed route/navigation evidence:

- Global authenticated shell renders `Topbar` + role-aware `Sidebar`: `apps/web/src/app/(app)/layout.tsx:14-23` and legacy `/app` shell at `apps/web/src/app/app/layout.tsx:18-26`.
- Role sidebar mapping exists in `apps/web/src/components/layout/Sidebar.tsx:11-43`.
- Topbar always exposes `/app` Dashboard, and adds `/diy-planner` only for DIY users: `apps/web/src/components/layout/Topbar.tsx:19-26`.
- Canonical route helper maps dashboards by role: `apps/web/src/lib/routes.ts:132-153`.
- Dashboard RBAC allows matching role or admin for non-admin dashboards, admin only for admin dashboard: `apps/web/src/lib/rbac.ts:607-625`.
- `/app` redirects admins, vendors/venues, DIY, event dreamer, and pro planner to role dashboards where possible: `apps/web/src/app/app/page.tsx:33-63`.
- Route tree includes parallel canonical and legacy-looking surfaces: `/diy-planner`, `/pro/planner`, `/vendor/dashboard`, `/venue/dashboard`, `/admin/*`, `/client/events/:eventSlug`, `/app/*`, `/event-vault/*`, and duplicate `/app/*` wrappers.

Confirmed role surface evidence:

- DIY dashboard and side nav: `apps/web/src/app/diy-planner/page.tsx`, `apps/web/src/components/diy-planner/Dashboard.tsx`, `apps/web/src/components/diy-planner/DIYSidebar.tsx`.
- DIY server vault list: `apps/web/src/app/diy-planner/vault/page.tsx`.
- Pro dashboard and side nav: `apps/web/src/app/pro/planner/page.tsx`, `apps/web/src/components/pro-planner/Dashboard.tsx`, `apps/web/src/components/pro-planner/Sidebar.tsx`.
- Pro server vault list: `apps/web/src/app/pro/planner/vault/page.tsx`.
- Vendor dashboard and side nav: `apps/web/src/app/vendor/dashboard/page.tsx`, `apps/web/src/components/vendor/Dashboard.tsx`, `apps/web/src/components/vendor/Sidebar.tsx`.
- Venue dashboard and side nav: `apps/web/src/app/venue/dashboard/page.tsx`, `apps/web/src/components/venue/Dashboard.tsx`, `apps/web/src/components/venue/Sidebar.tsx`.
- Client-safe shared event view: `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx`.
- Admin overview, verification, users, abuse: `apps/web/src/app/(app)/admin/overview/page.tsx`, `apps/web/src/app/(app)/admin/verification/page.tsx`, `apps/web/src/app/(app)/admin/users/page.tsx`, `apps/web/src/app/(app)/admin/abuse/page.tsx`.
- Provider onboarding: `apps/web/src/app/providers/onboarding/page.tsx`.
- Professional planner setup: `apps/web/src/app/professional-planner/setup/page.tsx`.
- Event dreamer create: `apps/web/src/app/event-dreamer/create/page.tsx`.

## Role/dashboard map

### Founder/Admin

| Surface | Status | Reason |
|---|---:|---|
| `/admin/overview` | KEEP | Needed for founder oversight: orgs, users, events, open disputes, GMV trend entry point. |
| `/admin/verification` | KEEP | Preserves OneHub differentiation around refunds, disputes, holdbacks, payouts, and admin overrides. |
| `/admin/verification/detail` and detail routes for refunds/disputes/holdbacks/payouts/overrides | KEEP | Required for private-pilot money-readiness and dispute/exception review, even if UI stays sparse. |
| `/admin/users` | KEEP | Needed for founder role control and break-glass impersonation. |
| `/admin/abuse` | SIMPLIFY | Useful trust surface, but pilot can expose it as a secondary admin queue rather than top-level primary nav. |
| `/app/admin/overview` | HIDE | It only redirects to `/admin/overview`; showing both would create duplicate admin paths. |
| Admin role access to non-admin dashboards | SIMPLIFY | RBAC permits admins into role dashboards; useful for inspection, but founder pilot nav should keep admin primary and role impersonation explicit. |

### Client / DIY Planner

| Surface | Status | Reason |
|---|---:|---|
| `/diy-planner` | KEEP | Main DIY dashboard gives clear event creation, overview, selected event detail, AI assist, and event management entry. |
| `/diy-planner/vault` | KEEP | Strong MVP event list: progress, budget, contacts, upcoming milestones, recent activity, empty-state CTA. |
| `/diy-planner/vault/:eventSlug` | KEEP | Canonical detail route for DIY event vault continuity. |
| DIY in-dashboard tabs: Overview, Event Vault, Calendar | KEEP | These are core private-pilot planning surfaces and coherent enough for first-use orientation. |
| DIY in-dashboard Planning tabs: Vendors, Proposals, Contracts, Budget, Guests, Tasks | SIMPLIFY | Labels preserve OneHub differentiation, but current in-dashboard fallback says `Content for {uiRoute} goes here`; keep as event-detail tabs or deep links, not empty standalone panes. |
| DIY Account tabs: Settings, Help | HIDE | Sidebar click only closes menu and does not route; confusing for MVP until wired or removed. |
| `/events/new` and EventWizard entry | KEEP | Required to create event/vault and seed planner workflow. |
| `/event-dreamer/create` | HIDE | Useful acquisition/idea route, but not a required private-pilot dashboard and redirects signup as CLIENT, not a current dashboard role. |
| `/event-vault` and `/event-vault/:eventSlug` | HIDE | Legacy redirect to `/app/vault`; keep internal redirect but do not surface in MVP navigation. |

### Professional Planner

| Surface | Status | Reason |
|---|---:|---|
| `/pro/planner` | KEEP | Main pro dashboard lists events, allows event creation, and anchors planner business onboarding. |
| `/professional-planner/setup` | KEEP | Required onboarding gate when a pro planner lacks an org. |
| `/pro/planner/vault` | KEEP | Role-specific event vault mirrors DIY list and preserves planner isolation. |
| `/pro/planner/vault/:eventSlug` | KEEP | Canonical pro event detail route; aligns with route helper. |
| Pro nav: Overview | KEEP | Useful primary pilot home. |
| Pro nav: Services, Availability, Payments, Portfolio, Settings | HIDE | These render `coming soon` panels; expose later or collapse into onboarding checklist until real actions exist. |
| Pro overview cards for services/availability/payments/portfolio/settings | SIMPLIFY | They explain future business profile direction, but clickable cards currently lead to placeholder panels. |
| Pro Client Management card | HIDE | Card is not wired with an `onClick`; creates false affordance. |

### Vendor

| Surface | Status | Reason |
|---|---:|---|
| `/vendor/dashboard` | KEEP | Main vendor dashboard shows leads, upcoming events, unread messages, recent booking requests, and payment panel path. |
| `/providers/onboarding?providerType=vendor` | KEEP | Required vendor org/profile gate with services, availability, payment/contract policy, media, and notification setup. |
| Vendor nav: Overview | KEEP | Clear provider home. |
| Vendor nav: Leads | KEEP | Uses real booking requests and clear empty state. |
| Vendor nav: Payments | KEEP | Preserves milestone/payment-readiness differentiation via `VendorPaymentPanel`. |
| Vendor nav: Calendar, Messages, Settings | HIDE | They are visible but only render `coming soon` messages. |
| `/marketplace/manage` / Listings | SIMPLIFY | Sidebar labels this as Listings, but page has a non-functional `Create Listing` button and only a view link; keep as read/manage list if needed, hide creation affordance. |
| `/app/billing/connect` | KEEP | Required seller payout-readiness and Stripe Connect status surface for vendors/venues. |
| `/billing/payouts` | SIMPLIFY | Useful for seller visibility, but not linked in vendor dashboard nav and should be secondary to payment panel/connect state. |

### Venue

| Surface | Status | Reason |
|---|---:|---|
| `/venue/dashboard` | SIMPLIFY | Main venue dashboard exists, but stats are hardcoded zeros and most tabs are placeholders. Keep only if labeled as setup/overview. |
| `/providers/onboarding?providerType=venue` | KEEP | Required venue profile gate with space, availability, policies, and media setup. |
| Venue nav: Overview | SIMPLIFY | Good orientation, but should not imply live bookings until data is wired. |
| Venue nav: Leads, Calendar, Messages, Settings | HIDE | All render `coming soon`; visible tabs create pilot confusion. |
| `/app/billing/connect` | KEEP | Same payout-readiness requirement as vendors. |
| `/marketplace/manage` / Availability | SIMPLIFY | Sidebar calls the same page `Availability` for venues, while the page is `Manage Listings`; label/path mismatch should be reduced for pilot. |

### Client / invited event stakeholder

| Surface | Status | Reason |
|---|---:|---|
| `/client/events/:eventSlug` | KEEP | Clear client-safe event summary with sharing guard and deposit panel. |
| Client `Nothing shared yet` state | KEEP | Good trust-preserving empty state when stakeholder exists but summary is not shared. |
| Client messages section | HIDE | Page comments mark it as placeholder; keep copy minimal until messaging is real. |
| `/app` for CLIENT fallback | SIMPLIFY | `/app` acts as a generic dashboard with orgs/events/activity; client route is more specific and safer for invited clients. |

### Shared/private-pilot operational surfaces

| Surface | Status | Reason |
|---|---:|---|
| `/proposals/:id`, `/contracts/:id`, `/proposals/:id/fund` | KEEP | Core contract/payment flow differentiators; route helpers keep proposal/contract detail shared across roles. |
| `/disputes` | SIMPLIFY | Important trust/admin review path, but form asks for raw proposal/milestone IDs and amount cents; too operator-like for normal pilot users. |
| `/requests` | SIMPLIFY | Real booking request list, but route copy says booking requests from vendors appear here while the page is org/listing scoped; clarify audience before surfacing broadly. |
| `/notifications`, `/messages/:threadId`, `/calendar` | HIDE | Shared nav exists in route tree, but these are not primary MVP dashboard inventory items and should not compete with role dashboards unless explicitly wired in nav. |
| `/marketplace`, `/marketplace/:slug`, `/explore/vendors` | KEEP | Discovery/vendor selection supports OneHub’s marketplace side; keep outside dashboard simplification. |
| Legal pages for payments/fees/refunds/disputes/booking-classification | KEEP | Preserve trust/payment/legal context for private pilot. |

## Findings

1. The MVP has a real role-dashboard skeleton, but it is split across both canonical role routes and legacy `/app` wrappers.
   - Confirmed canonical dashboard helper maps ADMIN, DIY_PLANNER, PRO_PLANNER, VENDOR, VENUE, EVENT_DREAMER, and CLIENT in `apps/web/src/lib/routes.ts:132-153`.
   - `/app` tries to normalize role users into canonical dashboards in `apps/web/src/app/app/page.tsx:33-63`.
   - User-facing risk: the user sees multiple possible dashboard URLs, especially `/app`, `/diy-planner`, `/pro/planner`, `/vendor/dashboard`, and `/venue/dashboard`.

2. Global navigation still sends every authenticated user to `/app` even when role-specific dashboards are canonical.
   - `Topbar` always shows Dashboard -> `/app` at `apps/web/src/components/layout/Topbar.tsx:24-26`.
   - User-facing risk: users may bounce through redirects or land on generic dashboards instead of understanding their role home.

3. The role sidebar mapping is mostly useful but has two confusing admin/provider labels.
   - Admin sidebar maps both `Dashboard` and `Admin` to `/admin/overview` in `apps/web/src/components/layout/Sidebar.tsx:35-40`.
   - Vendor sidebar sends Listings to `/marketplace/manage`; Venue sidebar sends Availability to the same `/marketplace/manage` page in `apps/web/src/components/layout/Sidebar.tsx:23-34`.
   - User-facing risk: duplicate admin label and mismatched Venue Availability vs Manage Listings reduce trust in navigation.

4. DIY is the strongest MVP dashboard candidate, but it currently mixes real event-detail capability with placeholder standalone tab copy.
   - Empty state is strong and actionable in `apps/web/src/components/diy-planner/Dashboard.tsx:235-247`.
   - Event detail uses `EventManagementSection` in `apps/web/src/components/diy-planner/Dashboard.tsx:355-360`.
   - But the direct `vendors/proposals/contracts/budget/guests/tasks` route switch renders `Content for {uiRoute} goes here` in `apps/web/src/components/diy-planner/Dashboard.tsx:396-407`.
   - User-facing risk: a DIY pilot user can click prominent planning labels and hit stub content.

5. Pro Planner has a useful event hub, but business/profile sub-tabs are mostly future promises.
   - Overview and event list are real in `apps/web/src/components/pro-planner/Dashboard.tsx:101-191`.
   - Services, availability, payments/contracts, portfolio, settings all render `coming soon` in `apps/web/src/components/pro-planner/Dashboard.tsx:287-325`.
   - User-facing risk: professional planners may think business setup/payment readiness is incomplete or abandoned.

6. Vendor dashboard has more usable MVP value than Venue dashboard.
   - Vendor reads booking requests, stats, and contracts/payment milestones in `apps/web/src/app/vendor/dashboard/page.tsx:31-171` and `apps/web/src/components/vendor/Dashboard.tsx:93-273`.
   - Vendor calendar/messages/settings are still `coming soon` in `apps/web/src/components/vendor/Dashboard.tsx:275-297`.
   - Venue dashboard currently hardcodes zero stats and has `coming soon` tabs in `apps/web/src/components/venue/Dashboard.tsx:51-139`.
   - User-facing risk: vendor can pilot marketplace/payment flows; venue looks less ready unless simplified to onboarding/profile only.

7. Admin oversight is strong enough for MVP and should not be stripped.
   - Admin overview, user management, impersonation, verification, disputes, refunds, holdbacks, payouts, and overrides are present.
   - These surfaces preserve OneHub differentiation: trust, verification, payment-readiness, disputes/refunds, and admin authority.
   - User-facing risk if hidden too aggressively: OneHub becomes a generic event/request app instead of a controlled private-pilot operating system.

8. Client/stakeholder experience exists but should remain narrow.
   - `/client/events/:eventSlug` is role-specific, share-guarded, and contains deposit panel support.
   - The client messages section is explicitly placeholder.
   - User-facing risk: exposing broader `/app` or generic event vault surfaces to clients may confuse the intended limited-summary/client-payment lane.

## MVP dashboard recommendation

Recommended private-pilot dashboard set:

1. Founder/Admin
   - Keep `/admin/overview`, `/admin/users`, `/admin/verification`, verification detail routes, `/admin/abuse` as secondary.
   - Do not expose `/app/admin/overview`.

2. DIY Planner
   - Keep `/diy-planner`, `/diy-planner/vault`, `/diy-planner/vault/:eventSlug`, `/events/new`.
   - Simplify/hide stub standalone tabs; keep trust/payment/planning functions through real event-detail sections.

3. Professional Planner
   - Keep `/professional-planner/setup`, `/pro/planner`, `/pro/planner/vault`, `/pro/planner/vault/:eventSlug`.
   - Hide business sub-tabs until real, or collapse into checklist copy.

4. Vendor
   - Keep `/providers/onboarding?providerType=vendor`, `/vendor/dashboard`, vendor Leads, vendor Payments, `/app/billing/connect`, and marketplace public/detail pages.
   - Hide vendor Calendar/Messages/Settings for MVP.

5. Venue
   - Keep `/providers/onboarding?providerType=venue` and a simplified `/venue/dashboard` overview only if it is clearly a setup/profile dashboard.
   - Hide venue Leads/Calendar/Messages/Settings until wired.

6. Client / invited stakeholder
   - Keep `/client/events/:eventSlug` and deposit panel.
   - Keep generic `/app` as fallback only, not as the primary client dashboard.

7. Shared trust/payment surfaces
   - Keep proposals, contracts, funding, disputes/refund admin policy, and legal pages.
   - Simplify `/disputes` user form before broader pilot exposure because raw IDs/cents are operator-facing.

## User-facing impact

Current dashboard inventory is viable for a private-pilot MVP if navigation is narrowed. Without simplification, users will encounter duplicate dashboard entry points, visible placeholder tabs, and label/path mismatches. The biggest risk is not missing differentiation; the biggest risk is overexposing incomplete secondary surfaces before the core trust/payment/admin loop feels coherent.

The strongest MVP spine is:

- Founder/Admin oversight and verification.
- DIY/Pro event vaults.
- Vendor lead/payment readiness.
- Venue onboarding/profile readiness, simplified.
- Client safe event summary/deposit lane.
- Proposal/contract/payment/dispute/legal trust surfaces preserved.

## Verdict

PARTIAL

The role-dashboard map exists and supports OneHub private-pilot differentiation, but several visible pages should be hidden or simplified before MVP because they are placeholders, duplicate routes, or confusing labels.

## Narrow next action for Atlas

Route a Phase 2 navigation-cut task to reduce visible MVP navigation to the recommended dashboard set: fix `/app` topbar destination by role, remove duplicate Admin sidebar label, hide placeholder role tabs, and align Venue `Availability` vs `Manage Listings` labeling. This is inside approved OneHub scope and does not require founder escalation unless Atlas wants to change role strategy or expose live payments publicly.
