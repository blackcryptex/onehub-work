# OneHub private-pilot operating-loop verification — Slice 1

Date: 2026-08-04
Task: t_9e3a0674
Worker: Scout
Canonical active deployment inspected: https://onehub-work-web-8kph-c5k4lki0d-one-hub2.vercel.app
Accepted commit: 4291fc1e11cdc1a9954fefaac4d3b2d865b347e2

## 1. Scope inspected

Read-only verification of the invite-only private-pilot operating loop as far as worker access allowed:

- founder/admin access posture;
- platform-admin oversight / View As readiness;
- user/provider oversight surfaces;
- event/provider discovery or selected event path;
- proposal -> contract -> payment-readiness path visibility;
- trust/admin intervention surfaces.

This report distinguishes private-pilot readiness from public launch readiness and live-payment readiness. No database, environment, credential, billing, infrastructure, schema, production, public-exposure, or live-payment mutation was performed.

## 2. Evidence reviewed

### Runtime evidence

Browser navigation to the canonical active deployment redirected to Vercel login/SSO, not the OneHub app:

- `/` -> `https://vercel.com/login?...`
- `/api/health` -> `https://vercel.com/login?...`
- `/signin` -> `https://vercel.com/login?...`
- `/app/admin/overview` -> `https://vercel.com/login?...`
- `/admin/overview` -> `https://vercel.com/login?...`

Exact access blocker: this worker does not have an approved Vercel session/protection bypass for `onehub-work-web-8kph-c5k4lki0d-one-hub2.vercel.app`. Therefore Scout could not browser-confirm the protected runtime operating loop on the canonical 8kph URL.

### Prior reports reviewed

- `reports/platform-admin/ONEHUB_PLATFORM_ADMIN_PHASE1_READINESS_2026-08-04.md`
- `reports/stabilization/ONEHUB_PREVIEW_ADMIN_ACCESS_VERIFICATION_2026-07-23.md`
- `reports/stabilization/ONEHUB_PREVIEW_DIY_PLANNER_EVENT_VAULT_VERTICAL_SMOKE_2026-07-23.md`

Accepted task context states Platform Admin was later Marlon browser-confirmed active after env activation and redeploy. Scout treats that as accepted context, not fresh worker-confirmed runtime evidence.

### Code evidence reviewed

Core files inspected:

- `apps/web/src/lib/auth-helpers.ts`
- `apps/web/src/lib/rbac.ts`
- `apps/web/src/lib/event-access.ts`
- `apps/web/src/lib/routes.ts`
- `apps/web/src/app/(app)/layout.tsx`
- `apps/web/src/app/(app)/admin/overview/page.tsx`
- `apps/web/src/app/(app)/admin/users/page.tsx`
- `apps/web/src/components/admin/ImpersonateButton.tsx`
- `apps/web/src/app/api/admin/impersonate/route.ts`
- `apps/web/src/app/(app)/admin/verification/page.tsx`
- `apps/web/src/app/(app)/admin/abuse/page.tsx`
- `apps/web/src/app/(app)/disputes/page.tsx`
- `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx`
- `apps/web/src/app/marketplace/page.tsx`
- `apps/web/src/app/marketplace/[slug]/page.tsx`
- `apps/web/src/app/explore/vendors/page.tsx`
- `apps/web/src/app/api/shortlist/route.ts`
- `apps/web/src/app/api/bookings/request/route.ts`
- `apps/web/src/app/(app)/proposals/[id]/page.tsx`
- `apps/web/src/components/proposals/ProposalPageClient.tsx`
- `apps/web/src/app/(app)/contracts/[id]/page.tsx`
- `apps/web/src/components/contracts/ContractPageClient.tsx`
- `apps/web/src/app/api/contracts/[id]/sign/route.ts`
- `apps/web/src/app/api/payments/release-milestone/route.ts`
- `apps/web/src/app/api/refund-requests/route.ts`
- `apps/web/src/app/api/events/[eventSlug]/stakeholders/route.ts`
- `apps/web/src/app/api/events/[eventSlug]/share/route.ts`

## 3. Findings

### F0 — Protected runtime verification blocked for this worker

Severity: private-pilot blocker for Scout verification, not a confirmed product blocker
Category: Access / evidence gap
Evidence:

- Browser and curl-style read-only requests to the canonical 8kph deployment reached Vercel login/SSO for app and health routes.
- No approved Vercel session/protection bypass was available to this worker.

Impact:

- Scout cannot truthfully claim a PASS posture for the active 8kph runtime operating loop.
- Atlas or Sentinel must run the protected smoke from a browser/session that has approved access, or provide a safe bypass/session path.

Narrow next action:

- Atlas should route protected runtime smoke to an approved operator/Sentinel with Vercel protection access. No code change is implied by this finding alone.

### F1 — Admin / Platform Admin posture is structurally present, but fresh worker runtime confirmation is unavailable

Severity: high evidence gap
Category: Founder/admin oversight
Evidence:

- `apps/web/src/lib/rbac.ts:14-24` defines guarded MVP Platform Admin authority as app `ADMIN` plus `GUARDED_MVP_PLATFORM_ADMIN_USER_IDS` containing the real OneHub `User.id`.
- `apps/web/src/app/(app)/admin/overview/page.tsx:8-18` gates admin overview with `canAccessDashboard(user, "ADMIN")` and loads org/user/event/open-dispute metrics.
- `apps/web/src/app/(app)/admin/users/page.tsx:23-31` gates the user list to `ADMIN`; founder role controls are scoped to Marlon's founder email.
- Prior report `reports/platform-admin/ONEHUB_PLATFORM_ADMIN_PHASE1_READINESS_2026-08-04.md` documented the required user-id allowlist path and task context now says Marlon browser-confirmed Platform Admin active after env activation/redeploy.

Impact:

- Private-pilot admin authority has a coherent code posture and accepted founder-confirmed activation context.
- It remains unverified by this Scout run on the active protected runtime because of F0.

Narrow next action:

- Protected smoke should confirm only behavior, not secrets: Marlon reaches admin overview, normal non-allowlisted admin is denied guarded Platform Admin-only actions, and no env values are printed.

### F2 — Break-glass View As readiness is structurally strong, but runtime behavior still needs protected smoke

Severity: medium evidence gap
Category: Platform-admin oversight / View As
Evidence:

- `apps/web/src/components/admin/ImpersonateButton.tsx:28-35` disables View As unless both break-glass reason and incident ticket are present and alerts if missing.
- `apps/web/src/app/api/admin/impersonate/route.ts:28-31` requires guarded MVP Platform Admin authority, not merely app `ADMIN`.
- `apps/web/src/app/api/admin/impersonate/route.ts:40-46` rejects missing reason or incident ticket.
- `apps/web/src/app/api/admin/impersonate/route.ts:63-77` records audit metadata including authority path, incident ticket, reason, target user ID/role, session start, and auditTrail.
- `apps/web/src/lib/auth-helpers.ts:66-97` resolves the effective user from impersonation session metadata.

Impact:

- View As is not a casual support toggle; it is visibly break-glass and audit-backed in code.
- Runtime readiness still depends on the active session, NextAuth update path, and deployed env being smoke-tested behind Vercel protection.

Narrow next action:

- Protected smoke should verify: missing reason blocked, missing incident ticket blocked, valid reason+ticket starts View As, banner/stop path is visible, and an audit row is created without exposing private user data.

### F3 — User/provider oversight surfaces exist for private-pilot inspection, with known public-launch limitations

Severity: medium
Category: Oversight surfaces / provider discovery
Evidence:

- Admin user oversight: `apps/web/src/app/(app)/admin/users/page.tsx:42-58` lists users with search/pagination; `FounderRoleControl` and `ImpersonateButton` are rendered per user at lines 106-111.
- Provider dashboards: `apps/web/src/app/vendor/dashboard/page.tsx:8-29` and `apps/web/src/app/venue/dashboard/page.tsx:7-30` gate provider dashboards by role and redirect users without provider orgs into onboarding.
- Marketplace listing discovery: `apps/web/src/app/marketplace/page.tsx:19-23` loads listings; `apps/web/src/app/marketplace/[slug]/page.tsx:43-109` preserves event context and shows Add to shortlist / Request booking controls when event context exists.
- Rich vendor search: `apps/web/src/app/explore/vendors/page.tsx:30-121` supports filters and internal/external search APIs.

Impact:

- For an invite-only pilot, operators have surfaces to inspect users, provider dashboards, listings, and selected event-linked marketplace paths.
- This is not public-launch complete because marketplace/explore pages are public-facing app routes and external vendor search behavior was not runtime-verified here.

Narrow next action:

- Protected smoke should use an approved seeded/rostered event to open marketplace from the event context, open one listing, confirm `Back to event`, `Add to shortlist`, and disabled/no-event request states. Do not submit booking requests unless explicitly approved because that mutates the database.

### F4 — Selected event path and client share posture are coherent in code

Severity: low / confirm in protected smoke
Category: Event access / client-safe surface
Evidence:

- `apps/web/src/lib/event-access.ts:8-49` centralizes slug-based event authorization and returns 404 for unauthorized event access.
- `apps/web/src/lib/rbac.ts:380-405` restricts CLIENT event viewing to stakeholder plus explicit `SUMMARY` share.
- `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:30-33` restricts the route to `CLIENT` role.
- `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:75-102` shows `Nothing shared yet` for a stakeholder without summary share, otherwise redirects unauthorized users.
- `apps/web/src/app/api/events/[eventSlug]/stakeholders/route.ts:52-83` requires event management permission and only adds CLIENT stakeholders that belong to the event organization.
- `apps/web/src/app/api/events/[eventSlug]/share/route.ts:60-72` requires event management permission and verifies the viewer is already a stakeholder before sharing.

Impact:

- Client-safe event visibility is appropriately narrow for private pilot: stakeholder relationship plus explicit share.
- The client surface still includes placeholders for messaging and limited payment context, so it is not a polished public-launch client portal.

Narrow next action:

- Protected smoke should inspect one approved client/stakeholder case in read-only mode: no share -> `Nothing shared yet`; share present -> event summary plus payment/messaging placeholders.

### F5 — Proposal -> contract -> payment-readiness path is visible, but detail pages need resource-specific read guard review before broader pilot confidence

Severity: high for private-pilot confidentiality confidence
Category: Proposal/contract visibility and authorization
Evidence:

- Proposal page is under authenticated `(app)` layout, but `apps/web/src/app/(app)/proposals/[id]/page.tsx:18-86` loads a proposal by ID and renders it without an explicit resource-level `canViewProposal`/relationship guard. It only uses `canManageEvent` to decide edit controls at line 68.
- Contract page is under authenticated `(app)` layout, but `apps/web/src/app/(app)/contracts/[id]/page.tsx:7-105` loads a contract by ID and renders it without an explicit resource-level viewer guard. It uses relationship checks for edit/payment affordances, not initial read access.
- Mutating APIs are stronger: proposal edit/delete/approve APIs use `canManageEvent`; contract sign API checks buyer-side event management or seller org membership; contract update/from-proposal APIs use `canManageEvent`.
- Payment readiness is visible but guarded: `apps/web/src/components/contracts/ContractPageClient.tsx:147-159` only shows payment entry when `canEnterPayment` and payable contract status match; `apps/web/src/app/api/payments/release-milestone/route.ts:117-132` restricts release to guarded MVP Platform Admin authority.
- `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx:5-29` displays a placeholder Stripe Elements funding page for a proposal by ID and should be reviewed for the same resource read/payment-entry guard posture before any live-payment confidence.

Impact:

- The proposal/contract commercial path is visible and action APIs appear guarded, but authenticated users may be able to view proposal/contract/funding details by known ID unless route-level authorization is added or verified elsewhere.
- This is acceptable only as a narrow code-inspection risk for private pilot if pilot IDs are not exposed broadly and protected smoke confirms real seeded access behavior. It is not acceptable for public launch or live-payment readiness without remediation/review.

Narrow next action:

- Forge should add or confirm explicit resource-level read guards for proposal, contract, and fund pages before expanding the pilot roster. Sentinel should include negative-access smoke: unrelated authenticated user cannot view another event's proposal/contract/funding page by ID.

### F6 — Trust/admin intervention surfaces exist, but several are review queues rather than complete ops workflows

Severity: medium
Category: Trust/admin intervention
Evidence:

- Admin verification queue: `apps/web/src/app/(app)/admin/verification/page.tsx:31-149` lists refunds, disputes, holdbacks, payouts, and override history with detail links.
- Abuse queue: `apps/web/src/app/(app)/admin/abuse/page.tsx:8-45` lists abuse reports and statuses.
- User dispute/refund surface: `apps/web/src/app/(app)/disputes/page.tsx:21-72` shows policy links, refund request form, refund request list, and disputes list.
- Refund request API: `apps/web/src/app/api/refund-requests/route.ts:31-49` checks proposal existence and org membership/admin before creating a review record.
- Payment release route checks open refund, dispute, and holdback blockers before release at `apps/web/src/app/api/payments/release-milestone/route.ts:134-160`.

Impact:

- The private-pilot trust loop has enough visible structure for manual/admin-mediated intervention.
- It is not a complete public-scale trust operation; several surfaces are queues or forms with manual admin follow-through.

Narrow next action:

- Protected smoke should inspect admin verification and abuse queues in read-only mode and confirm empty states or row counts only. Do not execute refund/dispute/holdback/release mutations.

## 4. Private-pilot readiness vs public/live-payment readiness

### Private-pilot posture

Verdict: PARTIAL.

The code and prior accepted context support a controlled, invite-only private-pilot posture if Atlas/Sentinel can run protected browser smoke with approved access. Core admin, View As, event access, provider discovery, proposal/contract, and trust-intervention surfaces are present.

### Public launch posture

Verdict: NOT READY from this inspection.

Reasons:

- Active runtime could not be worker-verified behind Vercel protection.
- Proposal/contract/fund detail pages need explicit resource-read guard review or remediation.
- Marketplace/external search and public-facing provider discovery were not runtime-verified on the canonical deployment.
- Client messaging/payment areas include placeholders or limited MVP copy.

### Live-payment readiness posture

Verdict: NOT READY from this inspection.

Reasons:

- Payment entry is visible in code but not runtime-tested.
- `/proposals/[id]/fund` is a placeholder Stripe Elements page and needs access/payment-entry guard review.
- Milestone release is guarded by Platform Admin and blocker checks, but no live-payment action was executed or approved.
- Any live-payment test would require founder-approved payment/billing scope and Sentinel-level verification.

## 5. Exact blocker list

1. Protected runtime access unavailable to Scout: canonical 8kph deployment redirects to Vercel login/SSO for app and health routes.
2. No approved authenticated app session or Vercel protection bypass was available to this worker.
3. Proposal/contract/fund resource-read guard posture is unresolved from code inspection and should be treated as a high pilot-confidence risk until remediated or negative-access smoke passes.
4. No database/user/provider row-level runtime evidence was available from the active protected deployment, so all role/count observations in this report are code/prior-report evidence, not fresh runtime counts.

## 6. User-facing impact

Confirmed from code/prior accepted context:

- Founder/admin and guarded Platform Admin authority paths are present.
- Break-glass View As requires reason and incident ticket and records audit metadata.
- Admin user, verification, abuse, dispute/refund, provider dashboard, marketplace, event sharing, proposal, contract, and payment-readiness surfaces exist.
- Client event viewing is designed as stakeholder plus explicit summary share.

Not confirmed in this run:

- Any active 8kph authenticated browser flow after Vercel protection.
- Any active 8kph console-error-free page render.
- Any seeded user/provider/event/proposal/contract record counts.
- Any real proposal -> contract -> payment screen continuity on the active deployment.

Main user-visible risk:

- The private pilot can be operated only if an approved operator can get through Vercel protection and if proposal/contract/fund detail visibility is either fixed or proven inaccessible to unrelated authenticated users.

## 7. Verdict

PARTIAL

Scout cannot issue PASS because protected runtime access was unavailable. The codebase shows a coherent invite-only private-pilot operating-loop skeleton, but the unresolved proposal/contract/fund read-authorization risk and absent protected runtime smoke prevent a full private-pilot readiness PASS.

## 8. Narrow next action for Atlas

Route Sentinel or an approved protected-access operator to run a read-only 8kph browser smoke covering:

1. Marlon/admin overview loads.
2. Platform Admin-only View As rejects missing reason/ticket and permits only the allowlisted founder/admin path.
3. Admin user/provider/verification/abuse surfaces render with safe counts or empty states.
4. One approved event opens through its canonical role route.
5. Marketplace listing opens with event context and returns to event.
6. Proposal and contract pages render only for related users; unrelated authenticated user gets redirect/404/403.
7. Contract payment-readiness panel appears only when status and buyer-side authorization allow it.
8. Refund/dispute/admin verification queues render without performing mutations.

Recommended Forge follow-up before broader pilot expansion: add or verify explicit resource-level read guards for `apps/web/src/app/(app)/proposals/[id]/page.tsx`, `apps/web/src/app/(app)/contracts/[id]/page.tsx`, and `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx`.

No founder escalation required for read-only protected smoke or route-guard code review. FOUNDER ESCALATION REQUIRED for any Vercel protection/env change, credential/session grant, DB mutation, production/public exposure change, billing/payment execution, or live-payment test.

## 9. Worktree status at report creation

Initial status before this report:

- Branch: `atlas/vercel-preview-current-main`
- HEAD: `4291fc1e11cdc1a9954fefaac4d3b2d865b347e2`
- Existing untracked item before this task's artifact: `reports/platform-admin/`

Intentional file mutation by this task:

- `reports/stabilization/private-pilot/ONEHUB_PRIVATE_PILOT_OPERATING_LOOP_SLICE1_2026-08-04.md`
