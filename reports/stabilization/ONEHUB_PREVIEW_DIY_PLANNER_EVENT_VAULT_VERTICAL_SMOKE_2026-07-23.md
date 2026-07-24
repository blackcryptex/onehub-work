# OneHub Preview DIY Planner / Event Vault Vertical Smoke — 2026-07-23

## 1. Scope inspected

Objective: browser-smoke the DIY Planner / Event Vault path end-to-end on the verified Vercel Preview alias without mutating database, secrets, billing, infrastructure, production settings, or live payments.

Target Preview alias: `https://onehub-work-web-8kph-two.vercel.app`
Deployed commit in task scope: `09a30f1`
Role used: seeded `DIY_PLANNER` account (`diy@example.com`; password not recorded)

Routes exercised:

- `/api/health`
- `/signin?callbackUrl=/diy-planner/vault`
- `/diy-planner/vault`
- `/diy-planner/vault/sentinel-diy-routing-20260503181652-b36q`
- `/events/sentinel-diy-routing-20260503181652-b36q/guests`
- `/events/sentinel-diy-routing-20260503181652-b36q/budget`
- `/events/sentinel-diy-routing-20260503181652-b36q/checklists`
- `/diy-planner`
- `/event-vault`
- `/app/vault`

## 2. Evidence reviewed

Browser evidence:

- Health endpoint returned `success: true` through browser navigation.
- Sign-in with the DIY planner account redirected successfully to `/diy-planner/vault`.
- `/diy-planner/vault` rendered a populated Event Vault list with 7 DIY events and no console errors.
- Vault detail route rendered `Sentinel DIY Routing 20260503181652` with edit/delete controls, at-a-glance data, timeline/notifications, manage-clients card, quick actions, shortlist, and existing proposals.
- Quick-action hrefs on the vault detail were inspected in the live DOM:
  - `Manage Guest List` -> `/events/sentinel-diy-routing-20260503181652-b36q/guests`
  - `View Budget` -> `/events/sentinel-diy-routing-20260503181652-b36q/budget`
  - `Checklists` -> `/events/sentinel-diy-routing-20260503181652-b36q/checklists`
- `/events/.../budget` rendered a budget table with totals.
- `/events/.../guests` rendered the authenticated DIY shell and only the message `No guest lists yet.` in main content.
- `/events/.../checklists` rendered the authenticated DIY shell but no visible main content in the browser snapshot because there are no checklist records for the tested event.
- `/diy-planner` rendered the single-page DIY dashboard with sidebar and overview cards.
- Clicking dashboard `Open Sentinel DIY Routing...` and `View guests for Sentinel DIY Routing...` did not change the browser URL from `/diy-planner` or visibly move to a route-specific page during the smoke.
- Browser console showed no JavaScript errors on the tested pages. Dashboard logged expected `/api/diy/events` fetch messages with `200` and `count: 7`.

Code evidence for route-flow findings:

- `apps/web/src/components/diy-planner/Dashboard.tsx:242-247` maps `onNavigateToTab` to `setSelectedEventId(eventId); setUiRoute("eventDetail")` and explicitly notes the tab defaults to vendors in the future.
- `apps/web/src/components/EventManagementSection.tsx:16-18` owns internal tab state and defaults to `vendors` with no initial-tab prop.
- `apps/web/src/components/overview/EventVaultMini.tsx:52-89` labels buttons as opening events, budget, and guests, but they call in-page callbacks rather than route navigation.
- `apps/web/src/app/(app)/events/[eventSlug]/guests/page.tsx:70` returns only `No guest lists yet.` when there are no guest lists.
- `apps/web/src/app/(app)/events/[eventSlug]/checklists/page.tsx:26` returns only `No checklists yet.` when there are no checklists.
- `apps/web/src/app/(app)/events/[eventSlug]/budget/page.tsx:32-35` renders the budget table inside a card with no route-level heading/breadcrumb/context.

## 3. Findings

### F1 — Dashboard budget/guest shortcuts do not preserve the intended destination

Severity: High
Category: Product flow / route coherence
Route: `/diy-planner`

Steps to reproduce:

1. Sign in as DIY planner.
2. Open `/diy-planner`.
3. In `Upcoming Events`, click `View guests for Sentinel DIY Routing 20260503181652` or `View budget for Sentinel DIY Routing 20260503181652`.

Expected:

- The shortcut should take the user directly to the selected event's guest or budget surface, either as a real route or as a visibly selected tab with the correct content.

Actual:

- Browser smoke: the URL stayed on `/diy-planner` and no route-specific destination was visible after clicking the shortcut.
- Code confirms the shortcut callback currently ignores the target tab and only sets `eventDetail`; `EventManagementSection` then defaults to the vendors tab.

Impact:

- A DIY planner clicking a clear `View guests` or `View budget` control can land in the wrong context or see no obvious navigation result. This breaks the vertical path from dashboard overview into Event Vault work areas.

Recommended next Forge slice:

- Add an `initialTab`/controlled tab path from `Overview -> Dashboard -> EventManagementSection`, or convert these controls to canonical route links for budget/guests/checklists.

### F2 — Guest/checklist quick-action destinations have weak empty states and no event context

Severity: Medium
Category: UX / empty state
Routes:

- `/events/sentinel-diy-routing-20260503181652-b36q/guests`
- `/events/sentinel-diy-routing-20260503181652-b36q/checklists`

Steps to reproduce:

1. Sign in as DIY planner.
2. Open `/diy-planner/vault/sentinel-diy-routing-20260503181652-b36q`.
3. Click `Manage Guest List` or `Checklists`.

Expected:

- The destination should show the event name/context, the section title, a clear empty state, and a safe next action or return path.

Actual:

- Guests page shows the shell and only `No guest lists yet.` as main content.
- Checklists page shows the shell; browser snapshot did not expose meaningful main content for the empty checklist state.
- Neither destination provides the event name, breadcrumb/back link, or an in-flow CTA.

Impact:

- The route technically loads, but a DIY planner loses context immediately after using a quick action. This looks like an unfinished or blank work area rather than a useful Event Vault subflow.

Recommended next Forge slice:

- Wrap guest/checklist/budget route content with a consistent event subpage header: event name, section title, back-to-vault link, and stronger empty-state CTA text.

### F3 — Legacy/public Event Vault links leave DIY planner on `/app/vault` instead of the DIY canonical route

Severity: Medium
Category: Route coherence
Route: `/app/vault`

Steps to reproduce:

1. Sign in as DIY planner.
2. Navigate directly to `/app/vault` or click the footer `Event Vault` link.

Expected:

- DIY planner should land on or be redirected to canonical `/diy-planner/vault` so the URL matches the user role and flow.

Actual:

- `/app/vault` rendered the same DIY planner event list content, but the address remained `/app/vault`.
- Event cards generated role-aware detail links under `/diy-planner/vault/...`, creating a mixed legacy/canonical route journey.

Impact:

- The content is available, so this is not a blocker. But route state is inconsistent and can create confusing bookmarks, copied links, and breadcrumbs during Preview validation.

Recommended next Forge slice:

- Redirect authenticated DIY planners from `/app/vault` to `/diy-planner/vault`, or update global/footer `Event Vault` link resolution to be role-aware after auth.

### F4 — Vault detail right rail is crowded and truncates shortlist/proposal content on desktop

Severity: Low
Category: Visual / UX polish
Route: `/diy-planner/vault/sentinel-diy-routing-20260503181652-b36q`

Steps to reproduce:

1. Sign in as DIY planner.
2. Open the tested vault detail route.
3. Review the proposals/shortlist card in the right rail.

Expected:

- Vendor/venue names, verification chips, request-booking links, and generate-proposal buttons should be readable and visually separated.

Actual:

- Several shortlist cards compress long names into narrow stacked text. Purple `Generate AI Proposal` buttons crowd the card, while `Request booking` appears as plain text-like link beside it.

Impact:

- This does not block the smoke, but the main monetizable vendor/proposal area feels cramped and less trustworthy for DIY planners.

Recommended next Forge slice:

- Give shortlist/proposal cards a clearer two-column or stacked mobile-style layout in the right rail, with consistent button hierarchy.

## 4. User-facing impact

Confirmed working:

- Preview alias is reachable.
- DIY planner sign-in works.
- DIY Event Vault list loads with real seeded events.
- DIY Event Vault detail loads and exposes core event information, timeline, clients, quick actions, shortlist, and proposals.
- Budget route loads with data.
- No browser console errors appeared during the tested smoke.

Main friction:

- The vertical path is PARTIAL rather than end-to-end coherent because dashboard shortcuts and subpage empty states do not clearly carry a DIY planner into the intended Event Vault work area.
- No blocker was found that prevents viewing the vault list/detail, but route continuity needs a narrow Forge cleanup before calling this lane polished.

## 5. Verdict

PARTIAL

The DIY Planner / Event Vault Preview lane is usable at the list/detail level, but it is not fully coherent end-to-end. The highest-impact defects are route/shortcut continuity and weak contextual empty states for guest/checklist subflows.

## 6. Narrow next action for Atlas

Route Forge to a narrow Preview-fix slice:

1. Fix DIY dashboard `View budget` / `View guests` / `Open event` controls so they reliably land on the intended event section.
2. Add consistent event-context headers and stronger empty states to budget/guests/checklists subroutes.
3. Normalize authenticated DIY planner `/app/vault` access to `/diy-planner/vault` or make global Event Vault links role-aware.

No founder escalation required for this local Preview UX cleanup.
