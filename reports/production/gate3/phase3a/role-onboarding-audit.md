# OneHub Gate 3 Phase 3A — Role & Onboarding Clarity Audit

Status: review-required
Scope: read-only/product-flow audit plus this evidence document. No code edits, DB mutations, credential/billing/infra/production setting changes, live payment actions, or Oracle work performed.

## 1. Gate 3 source requirement

Gate 3 goal from `/root/ONEHUB_PRODUCTION_BUILD_PLAN.md` lines 397-453:

- Fix explicit role selection.
- Prove each user type routes correctly through the platform.
- Roles in scope: DIY Planner, Pro Planner, Vendor, Venue, Client, Admin.
- Phase 3A evidence must define roles, audit current implementation, identify gaps, and define testable success criteria.

## 2. Plain operational role definitions

These definitions preserve OneHub as a trust-centered event infrastructure platform, not a loose directory.

| MVP role | Operational meaning | Trust-engine responsibility | Primary success action |
|---|---|---|---|
| DIY Planner | A person planning their own event directly. They create and manage one or more events for themselves. | Owns event truth: event details, budget, guest/vendor choices, proposal acceptance, contract/payment decisions. | Create an event, source vendors/venues, request proposals, execute the event workflow. |
| Pro Planner | A professional planner or planning agency managing events for clients. | Acts as delegated operator for client events; must keep client-facing views scoped, vendor contracts traceable, and budgets/proposals separated by event/client. | Set up planning business, create/manage client events, invite clients, coordinate vendors/venues. |
| Vendor | A service provider such as caterer, DJ, photographer, florist, decorator, transportation, etc. | Publishes a provider profile/listing, responds to booking requests, sends proposals, signs contracts, fulfills milestones. | Publish a vendor profile and manage booking/proposal/payment workflow. |
| Venue | A space provider such as banquet hall, hotel, church, event center, or other event location. | Publishes venue profile/availability/booking terms and participates in proposal/contract/payment flow like a provider with space-specific constraints. | Publish a venue profile and manage venue booking requests. |
| Client | A customer represented by a pro planner or invited into a specific event. Not the general platform default for all signups. | Views only explicitly shared event information, approves/communicates/pays where permitted, and must not see planner/vendor/admin internals. | Access a client-safe event summary and take scoped approval/payment actions. |
| Admin | OneHub platform operator. | Oversees users, disputes, verification, abuse, payouts/holdbacks/refunds, impersonation, and trust enforcement with auditability. | Access admin surfaces and intervene only through guarded platform controls. |

## 3. Current implementation state

### 3.1 Role model exists, but includes one extra public role

Evidence:

- `apps/web/prisma/schema.prisma` lines 18 and 1194-1202 define `User.role Role @default(CLIENT)` and enum values: `DIY_PLANNER`, `PRO_PLANNER`, `VENDOR`, `VENUE`, `CLIENT`, `ADMIN`, `EVENT_DREAMER`.
- `packages/types/src/roles.ts` lines 4-11 mirrors those seven roles.
- `apps/web/src/lib/auth.ts` lines 157-164 propagates `DIY_PLANNER`, `PRO_PLANNER`, `VENDOR`, `VENUE`, `CLIENT`, `EVENT_DREAMER`, and `ADMIN` into session state.

Audit verdict: PARTIAL. The six MVP roles exist, but `EVENT_DREAMER` is a seventh public role that is outside Gate 3's six-role MVP surface and increases role-selection ambiguity.

### 3.2 Signup does not show explicit role selection

Evidence:

- `apps/web/src/app/(auth)/signup/page.tsx` lines 16-22 reads `role` from the URL and defaults to `DIY_PLANNER`.
- The signup form at lines 119-143 collects only name, email, and password. There is no visible required role selector and no role descriptions.
- The signup POST body at line 40 sends `role: defaultRole`, so the role is implicit from URL state or defaulted.
- `apps/web/src/app/api/auth/signup/route.ts` lines 23-28 defaults missing/invalid roles to `DIY_PLANNER`.
- `apps/web/src/app/api/auth/signup/route.ts` lines 5-12 allows public signup as `DIY_PLANNER`, `PRO_PLANNER`, `VENDOR`, `VENUE`, `CLIENT`, and `EVENT_DREAMER`; `ADMIN` is excluded.

Audit verdict: BROKEN for Gate 3A criterion “explicit role selection.” A user can create an account without seeing or choosing a role; the platform silently assigns DIY Planner unless upstream flow injects a role query param.

User-visible impact:

- Users who arrive from generic signin/signup do not know which OneHub identity they are creating.
- A vendor/venue/pro planner can become DIY by default if they reach `/signup` directly or via an incomplete callback.
- The trust engine starts with an unreliable `User.role`, so downstream dashboard routing and authorization can be correct technically while still based on a role the user never knowingly selected.

### 3.3 Landing page path selection is partial and not aligned to six MVP roles

Evidence:

- `apps/web/src/app/page.tsx` lines 27-85 shows “Choose Your Path” cards for DIY Planner, Professional Planner, Vendor/Venue, Event Dreamer, and Coming Soon.
- DIY links to `/events/new` (line 37), not to a signup/onboarding path that explicitly sets `DIY_PLANNER`.
- Professional Planner links to `/professional-planner/setup` (line 49), which later sends unauthenticated users to `/signup?role=PRO_PLANNER...`.
- Vendor/Venue is combined into one card and uses `VendorVenueLink`, which points signed-out users to `/signin?callbackUrl=/providers/start` rather than a role-aware signup path.
- `EVENT_DREAMER` is promoted on the landing page even though Gate 3 MVP defines six roles and excludes Event Dreamer.
- No Client or Admin role entry point is presented on the landing page; Client appears to be invite/event-scoped rather than a self-selected general role.

Audit verdict: PARTIAL. Landing-path intent exists, but it is not the same as explicit role selection at signup. Vendor and Venue are combined before later split. Client and Admin are absent from role selection, and Event Dreamer is extra.

### 3.4 Dashboard routing has a central helper, but Client falls back to generic `/app`

Evidence:

- `apps/web/src/lib/routes.ts` lines 115-134 maps roles to dashboards:
  - `ADMIN` -> `/app/admin/overview`
  - `DIY_PLANNER` -> `/diy-planner`
  - `PRO_PLANNER` -> `/pro/planner`
  - `VENDOR` -> `/vendor/dashboard`
  - `VENUE` -> `/venue/dashboard`
  - `EVENT_DREAMER` -> `/event-dreamer`
  - `CLIENT` -> `/app`
- `apps/web/src/app/app/page.tsx` lines 33-63 redirects admins, vendors/venues, DIY/event-dreamer/pro planners to their role surfaces.
- `apps/web/src/app/app/page.tsx` lines 65-195 renders a generic dashboard fallback for roles not redirected, including `CLIENT`.
- `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx` lines 29-32 enforces `CLIENT` for a specific event summary route.

Audit verdict: PARTIAL. Dashboard mapping exists for five of six MVP roles. Client has scoped event pages, but no clear client dashboard/onboarding landing; `/app` is a generic fallback, not a client-specific role destination.

### 3.5 Dashboard-level gates exist for main role surfaces

Evidence:

- `apps/web/src/lib/rbac.ts` lines 563-576 defines `canAccessDashboard`, allowing matching role or admin, and admin-only for admin dashboard.
- `/diy-planner`: `apps/web/src/app/diy-planner/page.tsx` lines 15-19 gates with `canAccessDashboard(user, "DIY_PLANNER")`.
- `/pro/planner`: `apps/web/src/app/pro/planner/page.tsx` lines 7-12 gates with `canAccessDashboard(user, "PRO_PLANNER")` and lines 17-29 require a planner org or redirect setup.
- `/vendor/dashboard`: `apps/web/src/app/vendor/dashboard/page.tsx` lines 7-12 gates with `canAccessDashboard(user, "VENDOR")` and lines 17-29 require a vendor org or redirect onboarding.
- `/venue/dashboard`: `apps/web/src/app/venue/dashboard/page.tsx` lines 6-11 gates with `canAccessDashboard(user, "VENUE")` and lines 15-28 require a venue org or redirect onboarding.
- `/app/admin/overview`: `apps/web/src/app/(app)/admin/overview/page.tsx` lines 7-12 gates with `canAccessDashboard(user, "ADMIN")`.

Audit verdict: COHERENT at individual page-entry level for DIY, Pro, Vendor, Venue, Admin. Client is event-scoped rather than dashboard-scoped.

### 3.6 Middleware protection is incomplete and comments are stale

Evidence:

- `apps/web/src/middleware.ts` lines 36-41 label the middleware as “Phase 7A” despite Gate 3 being the role-routing gate.
- Middleware matcher covers many protected paths at lines 129-150.
- Lines 100-120 only block `CLIENT` from planner routes and block planners from `/client/events`.
- Middleware does not enforce Vendor vs Venue dashboard separation, Admin-only route access, or Pro vs DIY dashboard separation. Those checks rely on server page-level gates.
- Lines 71-76 short-circuit all `/api/*` requests after setting headers, so role auth is entirely endpoint-specific for APIs.

Audit verdict: PARTIAL. Defense-in-depth exists for one client/planner boundary, but role protection is not centrally consistent across all six roles. Page/API checks may still protect critical paths, but Gate 3 cannot claim full role-based routing/authorization from middleware alone.

### 3.7 Pro Planner onboarding creates an organization but does not update role

Evidence:

- `apps/web/src/app/professional-planner/setup/page.tsx` lines 101-105 sends unauthenticated users to `/signup?role=PRO_PLANNER&...`, which creates a Pro Planner role during signup.
- Authenticated users can submit the setup form directly at lines 94-108.
- `apps/web/src/app/api/orgs/create/route.ts` lines 29-39 creates the organization and membership, but does not update `User.role` to `PRO_PLANNER`.

Audit verdict: PARTIAL. The unauthenticated Pro Planner path sets role correctly through signup. The authenticated “upgrade to Pro Planner” path can create a planner org without changing `User.role`, leaving the user unable to access `/pro/planner` if they started as another role.

User-visible impact:

- An existing DIY or Client user who sets up a planning business may be redirected to `/pro/planner` but then bounced back to `/app` because their role was not changed.
- This is a dead-end for role upgrade and onboarding continuity.

### 3.8 Provider onboarding updates role on publish, but session update is misleading

Evidence:

- `apps/web/src/app/providers/onboarding/page.tsx` lines 158-173 sends unauthenticated publishers to `/signup?role=VENDOR|VENUE...`.
- `apps/web/src/app/api/providers/profile/route.ts` lines 93-100 and 146-151 update `User.role` to `VENDOR` or `VENUE` when publishing a provider profile.
- `apps/web/src/app/providers/onboarding/page.tsx` lines 187-193 calls `updateSession?.({ role: nextRole })` after publish.
- `apps/web/src/lib/auth.ts` lines 97-100 explicitly says client-provided role updates are never trusted, so this `updateSession` call will not itself set the session role. Correct routing depends on router refresh / DB reload, not the client session update payload.

Audit verdict: PARTIAL but mostly coherent. Provider role upgrade is persisted server-side. The client session update call creates false implementation confidence; routing should be tested specifically after publish to ensure the fresh role is visible before dashboard redirect.

### 3.9 Client role exists but is not an open self-service onboarding path

Evidence:

- Public signup allows `CLIENT` via role param (`apps/web/src/app/api/auth/signup/route.ts` lines 5-12), but there is no visible Client signup choice in `apps/web/src/app/page.tsx`.
- Client creation/invitation exists through planner APIs:
  - `apps/web/src/app/api/users/invite-client/route.ts` lines 16-28 says only planners/admin can invite clients, and line 59 creates `role: "CLIENT"`.
  - `apps/web/src/app/api/users/search/route.ts` lines 8-23 supports planner-only client search.
- Client event view is scoped and guarded in `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx` lines 29-32 and 74-101.

Audit verdict: PARTIAL. If Client is intentionally invite/event-scoped, the role definition should state that plainly and signup should not present Client as a general self-service role. If Client is meant to self-select, the current flow is missing.

## 4. Implementation gaps and confusing flows

Priority order:

1. Missing visible required role selector on `/signup`.
   - Gate 3 cannot pass while role is assigned by hidden URL/default state.

2. Signup defaults to `DIY_PLANNER` in both frontend and API.
   - Safe fallback for demos, but wrong for production trust. Missing/invalid role should force explicit choice or return validation error, not silently pick DIY.

3. Extra `EVENT_DREAMER` role competes with the six-role MVP model.
   - It appears in schema/session/landing/dashboard mapping, but Gate 3 asks for six roles. Keep it as a feature mode under Client/DIY or explicitly mark it non-MVP/internal; do not present it as a seventh core role during Gate 3.

4. Client dashboard route is undefined.
   - `CLIENT` maps to generic `/app`, while the real client UX is `/client/events/[eventSlug]`. A client with no event share has no clear next action.

5. Existing-user role upgrades are inconsistent.
   - Provider publish updates user role. Pro Planner setup does not. DIY creation path should also be checked for existing non-DIY users.

6. Vendor/Venue are combined at the landing page before being split on `/providers/start`.
   - This is acceptable if the split is deliberate, but the combined label “Vendor/Venue” hides the operational distinction Gate 3 must prove.

7. Admin access is protected at page level, but admin onboarding/creation is not defined.
   - Public signup excludes Admin, which is correct. Gate 3B needs an explicit “admin is provisioned manually/seeded by ops, never public signup” criterion.

8. Role tests are absent.
   - Existing test files under `apps/web/src` are unrelated to role selection/routing/RBAC. No role matrix tests were found for signup, `/app` routing, dashboard gates, or cross-role route denial.

## 5. Route matrix for Phase 3B implementation/testing

| Role | Signup / creation source | Required onboarding after auth | Canonical dashboard / landing | Must allow | Must block |
|---|---|---|---|---|---|
| DIY_PLANNER | Explicit signup role selection or DIY event-start flow | First event creation if no events | `/diy-planner` | `/diy-planner`, own `/diy-planner/vault/*`, own event tools | `/pro/planner`, `/vendor/dashboard`, `/venue/dashboard`, `/app/admin/*`, `/client/events/*` unless explicitly supported as preview/admin |
| PRO_PLANNER | Explicit signup role selection or professional-planner setup | Planning org setup if none | `/pro/planner` | `/pro/planner`, `/pro/planner/vault/*`, client invite/search, own client events | `/diy-planner`, `/vendor/dashboard`, `/venue/dashboard`, `/app/admin/*`, client portal routes as client |
| VENDOR | Explicit provider selection as Vendor | Provider profile publish; vendor org required | `/vendor/dashboard` | Vendor dashboard, booking requests/proposals/contracts for own listings | Venue dashboard, planner dashboards, admin, unrelated vendor/venue org data |
| VENUE | Explicit provider selection as Venue | Provider profile publish; venue org required | `/venue/dashboard` | Venue dashboard, venue booking/proposal surfaces for own venue org | Vendor dashboard, planner dashboards, admin, unrelated org data |
| CLIENT | Planner invite OR explicit client role if product chooses self-service | Event share/invitation acceptance; no broad dashboard unless designed | `/client/events/[eventSlug]` or new `/client` dashboard | Shared client-safe event summaries, deposits/approvals/messages where invited | Planner dashboards, vendor/venue dashboards, admin, unshared events |
| ADMIN | Manual/ops provisioning only; never public signup | None in public flow; may require platform-admin config for guarded money actions | `/app/admin/overview` | Admin users, verification, abuse, disputes, audits as scoped by admin authority | Public signup; client/planner/vendor impersonation without audit; payment releases unless guarded platform admin |

## 6. Testable Phase 3 success criteria

Gate 3B should be considered complete only when these are demonstrable in tests and/or screenshots:

1. Signup role selection
   - `/signup` renders a required role selector with exactly the six MVP role choices or a clearly documented subset where Admin is marked “not public signup.”
   - User cannot submit signup without an explicit role decision.
   - Missing/invalid role in `POST /api/auth/signup` returns 400 or a “choose role” response; it does not silently default to DIY.
   - Admin cannot be created through public signup.

2. Role descriptions
   - Each visible role has plain-language copy matching this audit’s definitions.
   - Vendor and Venue are distinguishable before account creation.
   - Client is either explicitly invite/event-scoped or has a real self-service client path; no ambiguous generic “client” signup.

3. Routing after signup/signin
   - DIY Planner lands on `/diy-planner` or event creation continuation.
   - Pro Planner lands on `/professional-planner/setup` if no planner org, then `/pro/planner` after setup.
   - Vendor lands on `/providers/onboarding?providerType=vendor` if no profile, then `/vendor/dashboard` after publish.
   - Venue lands on `/providers/onboarding?providerType=venue` if no profile, then `/venue/dashboard` after publish.
   - Client lands on event invitation/share route or an explicit client dashboard/empty state.
   - Admin lands on `/app/admin/overview`.

4. Cross-role route denial
   - Each non-admin role is denied from the other role dashboards.
   - Client cannot access planner/provider/admin routes.
   - Planner cannot access client portal route unless acting through an approved preview/admin path.
   - Vendor cannot see venue-only dashboard data and Venue cannot see vendor-only dashboard data.
   - API authorization mirrors page authorization for role-sensitive operations.

5. Existing-user role transitions
   - Existing DIY/Client user can become Pro Planner only through an explicit confirmation and server-side role update.
   - Existing user can become Vendor/Venue only through provider onboarding publish and server-side role update.
   - Role changes refresh session/server state before dashboard redirect.
   - Role switching is audited or at least test-covered where it affects trust boundaries.

6. Evidence required for Sentinel
   - Automated tests covering signup role validation, route helper mapping, dashboard access, and key API role gates.
   - Screenshots or Playwright traces for all six role happy paths.
   - A matrix showing expected vs actual for 6 roles x protected dashboard routes.

## 7. Exact files inspected

External plan:

- `/root/ONEHUB_PRODUCTION_BUILD_PLAN.md`

Schema/types/auth/routing/RBAC:

- `apps/web/prisma/schema.prisma`
- `packages/types/src/roles.ts`
- `apps/web/src/lib/auth.ts`
- `apps/web/src/lib/auth-helpers.ts`
- `apps/web/src/lib/rbac.ts`
- `apps/web/src/lib/routes.ts`
- `apps/web/src/middleware.ts`

Public entry/signup/signin:

- `apps/web/src/app/page.tsx`
- `apps/web/src/components/layout/LandingHeader.tsx` (search evidence only)
- `apps/web/src/app/(auth)/signup/page.tsx`
- `apps/web/src/app/(auth)/signin/page.tsx`
- `apps/web/src/app/api/auth/signup/route.ts`

Role setup/onboarding/dashboard surfaces:

- `apps/web/src/app/app/page.tsx`
- `apps/web/src/app/diy-planner/page.tsx`
- `apps/web/src/components/diy-planner/Dashboard.tsx` (search evidence only)
- `apps/web/src/app/pro/planner/page.tsx`
- `apps/web/src/components/pro-planner/Dashboard.tsx` (search evidence only)
- `apps/web/src/app/professional-planner/setup/page.tsx`
- `apps/web/src/app/api/orgs/create/route.ts`
- `apps/web/src/components/vendor-venue/VendorVenueLink.tsx`
- `apps/web/src/components/vendor-venue/VendorVenueFooterLink.tsx` (search evidence only)
- `apps/web/src/app/providers/start/page.tsx`
- `apps/web/src/app/providers/onboarding/page.tsx`
- `apps/web/src/app/api/providers/profile/route.ts`
- `apps/web/src/app/vendor/dashboard/page.tsx`
- `apps/web/src/app/venue/dashboard/page.tsx`
- `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx`
- `apps/web/src/app/api/users/invite-client/route.ts` (search evidence only)
- `apps/web/src/app/api/users/search/route.ts` (search evidence only)
- `apps/web/src/app/(app)/admin/overview/page.tsx`
- `apps/web/src/app/event-dreamer/create/page.tsx`

Test inventory:

- `apps/web/src/lib/vendors/__tests__/category.test.ts`
- `apps/web/src/lib/parsers/__tests__/budget.test.ts`
- `apps/web/src/lib/parsers/__tests__/eventType.test.ts`
- `apps/web/src/lib/__tests__/maintenance.test.ts`
- `apps/web/src/lib/__tests__/budget-allocation.test.ts`

Repository/workspace state:

- `git status --short` showed a dirty shared workspace with many existing Gate 2/other changes before this report was written. This audit did not modify code.

## 8. Recommended next Forge/Steward implementation card body for Phase 3B

Title: Gate 3B — Implement explicit MVP role selection, onboarding routing, and role matrix tests

Assignee recommendation: Forge for UI/routing implementation, Steward for API/RBAC/server-side role transition review, Sentinel after implementation for verification.

Body:

Implement Gate 3B Role & Onboarding Clarity using `reports/production/gate3/phase3a/role-onboarding-audit.md` as the controlling Scout audit.

Scope:

- Add explicit required role selection to signup/onboarding entry points for the six Gate 3 MVP roles: DIY_PLANNER, PRO_PLANNER, VENDOR, VENUE, CLIENT, ADMIN.
- Admin must not be public-signupable; document/protect manual admin provisioning.
- Decide/product-lock whether Client is invite/event-scoped only or has self-service signup; implement the corresponding route/empty state.
- Remove or de-emphasize `EVENT_DREAMER` from core role selection during Gate 3, or remap it to a feature mode under an MVP role.
- Replace silent DIY defaults in signup with explicit validation/selection handling.
- Ensure Pro Planner existing-user setup updates role server-side when appropriate, matching provider publish behavior.
- Verify Vendor and Venue publish flows persist role and refresh routing/session correctly.
- Centralize or test role-to-dashboard mapping and cross-role denial for all six roles.

Acceptance criteria:

- `/signup` cannot create a user without an explicit allowed role decision, except approved invite/callback flows that carry a verified role.
- Public signup cannot create Admin.
- Missing/invalid signup role does not silently become DIY.
- All six role paths have defined post-auth routing and empty/onboarding states.
- Automated tests cover signup validation, `dashboard(role)`, `canAccessDashboard`, page/API role gates, and the 6-role route matrix.
- Evidence includes screenshots/Playwright traces or equivalent for each role happy path and blocked cross-role access.
- No DB destructive operations, no production settings, no credentials/billing/infra changes.

Blockers/decisions needed before coding:

1. Should Client be public self-service, invite-only, or both?
2. Should Event Dreamer remain as a stored user role, or become a feature mode under Client/DIY for MVP?
3. What is the approved manual/admin provisioning path for Admin users?

## 9. Scout coherence verdict

Flow under review: Gate 3A Role & Onboarding Clarity — role selection, signup/onboarding, dashboard routing, and trust-boundary handoffs for DIY Planner, Pro Planner, Vendor, Venue, Client, Admin.

Continuity observed: Role enum, session role propagation, dashboard helper, and most role dashboard gates exist. Vendor/Venue and Pro onboarding flows have recognizable paths. Client event access is scoped.

Exact friction/dead end: Role selection is not explicit at signup; missing roles silently default to DIY. Client has no clear dashboard/onboarding landing. Pro Planner existing-user setup can create a planner org without changing user role. `EVENT_DREAMER` adds seventh-role ambiguity outside the Gate 3 MVP model.

Coherence verdict: PARTIAL.

Narrow next action: Implement Phase 3B from the card body above, starting with explicit signup role selection and role matrix tests before additional onboarding polish.
