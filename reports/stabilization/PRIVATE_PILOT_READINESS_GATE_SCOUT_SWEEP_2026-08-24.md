# Private Pilot Readiness Gate — Scout Sweep

Date: 2026-08-24
Auditor: Scout
Canonical URL: https://www.1hubevents.com
Task: `t_7d42ce67`

Boundary: Read-only authenticated pilot-readiness sweep. No code, config, env, DB data, billing, live payment, domain, infrastructure, credential, legal/release, or public-exposure changes were made. Seeded/demo role credentials from repo documentation were used only to authenticate and inspect rendered route text; credential values are not repeated here.

## Verdict

PARTIAL.

All six pilot roles could authenticate on canonical production and at least one role-specific surface rendered for each. The strongest current surfaces are Pro Planner command/event workspace, Client pending-share event page, Vendor/Venue dashboards, and Admin trust-risk oversight. The gate is not clean enough for an unsupervised private pilot because several observed surfaces still create route/role confusion, expose commercial detail pages too broadly to authenticated pilot roles by known ID, and leave invite/payment truth dependent on narrow language rather than clear product boundaries.

Forge implementation is needed for the high-priority defects below. Sentinel/security review is also needed for the cross-role proposal/contract detail behavior because Scout can observe the UX and source shape, but does not own backend security final QA.

## Scope inspected

Authenticated role journeys on https://www.1hubevents.com for:
- Admin
- Pro Planner
- DIY Planner
- Client
- Vendor
- Venue

Read-only route probes included:
- `/app`
- `/pro/planner`, `/pro/planner/vault`, `/pro/planner/vault/demo-wedding`
- `/diy-planner`, `/diy-planner/vault`, `/diy-planner/vault/diy-sample-event`
- `/client/events/demo-wedding`, `/app/vault/demo-wedding`
- `/vendor/dashboard`, `/venue/dashboard`, `/marketplace/manage`
- `/requests`, `/app/requests`
- `/messages`, `/notifications`
- `/admin/overview`, `/admin/users`, `/admin/verification`
- known proposal/contract detail URLs discovered from the Pro event workspace
- `/billing/connect`, `/app/billing/connect`

## Evidence reviewed

Runtime probe artifacts:
- `reports/stabilization/private_pilot_probe_2026-08-24.json`
- `reports/stabilization/private_pilot_deep_probe_2026-08-24.json`

Source files inspected for route/auth/truth context:
- `scripts/seed.ts:13-20` — seeded role users.
- `apps/web/src/app/(app)/requests/page.tsx:23-140` — canonical booking request surface is `/requests`, not `/app/requests`.
- `apps/web/src/app/(app)/proposals/[id]/page.tsx:18-86` — proposal detail fetch/render path.
- `apps/web/src/components/proposals/ProposalPageClient.tsx:39-41`, `72-75`, `182-188` — provider-backed/draft labels and approval lock copy.
- `apps/web/src/app/(app)/contracts/[id]/page.tsx:7-144` — contract detail fetch/render path.
- `apps/web/src/components/contracts/ContractPageClient.tsx:34-82`, `118-151`, `198-204`, `219-240` — contract/payment readiness copy and payment entry conditions.
- `apps/web/src/components/payments/ContractPaymentPanel.tsx:151-180` — payment panel copy and acceptance gating.
- `apps/web/src/components/invites/InviteVendorModal.tsx:120-131` — UI says “Invite Queued”.
- `apps/web/src/app/api/invites/vendor/route.ts:29-36` — API response says “Invite queued (email sending not yet implemented)”.

Browser note: Browser Use/Chrome failed to start in this worker (`chrome-not-running`). Scout used authenticated HTTP route probes and source inspection as the fallback evidence path. No screenshots were captured.

## Role journey results

| Role | Sign-in | Landing / useful next action | Observed result |
| --- | --- | --- | --- |
| Admin | PASS | PASS | `/admin/overview` rendered “Admin trust & risk command center,” trust/risk item, role roster, verification/user/abuse links, and payment oversight metrics. `/admin/verification` listed refunds, disputes, holdbacks, payouts, and overrides with guarded-review copy. |
| Pro Planner | PASS | PASS with defects | `/pro/planner` rendered agency command deck, active events, client/vendor follow-ups, money alerts, and “OneHub will not send messages, approve contracts, or move money automatically.” `/pro/planner/vault/demo-wedding` rendered sourcing → shortlist → requests → proposals → contracts → payments continuity and clear draft/provider-backed warnings. |
| DIY Planner | PASS | PARTIAL | `/diy-planner/vault` rendered many event cards and activity; `/diy-planner` rendered a loading-focused shell (“Loading events… Please wait while we fetch your events.”). `/diy-planner/vault/diy-sample-event` returned 200 but the HTTP-rendered text body was mostly global shell, so usefulness could not be confirmed without a live browser. |
| Client | PASS | PASS | `/app` now used client-specific copy: “No planner organization is connected to your client workspace yet.” `/client/events/demo-wedding` rendered planner contact, “Open Message Inbox,” and “Back to dashboard.” Direct `/app/vault/demo-wedding` redirected back to `/app`, preserving planner route isolation. |
| Vendor | PASS | PASS with defects | `/vendor/dashboard` rendered profile/payment readiness and “Safe vendor response path.” `/marketplace/manage` rendered existing listing management. `/requests` rendered booking requests; `/app/requests` was 404. |
| Venue | PASS | PASS with defects | `/venue/dashboard` rendered booking readiness and safe response path. `/marketplace/manage` rendered venue listings. `/billing/connect` rendered “Connect your Stripe account to receive payments,” which is risky unless the private-pilot payment boundary is explicit. `/requests` rendered booking requests; `/app/requests` was 404. |

## Findings

### D1 — HIGH — Proposal/contract detail pages render commercial records for every authenticated pilot role when the ID is known

Route(s): `/proposals/[id]`, `/contracts/[id]`
Roles observed: Pro Planner, DIY Planner, Vendor, Venue, Client, Admin

Observed behavior:
- Using known proposal/contract IDs discovered from `/pro/planner/vault/demo-wedding`, Scout fetched the same proposal and contract detail pages as every authenticated seeded role.
- The detail pages returned HTTP 200 for Pro Planner, DIY Planner, Vendor, Venue, Client, and Admin.
- Example rendered text included “Vendor Co. - Event Services Proposal for Demo Wedding Event,” “Event Services Agreement,” “Status: Partially signed,” and “Status: Fully signed — payment-ready.”
- Source inspection shows the proposal detail page fetches by ID and renders via `ProposalPageClient` (`apps/web/src/app/(app)/proposals/[id]/page.tsx:18-86`). The contract detail page fetches by ID and renders via `ContractPageClient` (`apps/web/src/app/(app)/contracts/[id]/page.tsx:7-144`). Scout did not find an obvious not-found/forbidden branch before render in those inspected files.

Why it matters:
- In a private pilot, users may share or guess IDs through links, browser history, messages, support screenshots, or copied URLs. Commercial proposals/contracts/payment state must not appear to unrelated authenticated roles.
- Even if later action buttons are guarded, read visibility of contract/proposal details is user-facing trust damage and likely security-sensitive.

Smallest recommended fix:
- Add explicit server-side authorization before rendering proposal/contract detail pages. Only event buyer-side members, provider-side listing org members, attached client/stakeholder users with intended access, and admins should see the record.
- Return 404/403 with safe copy for non-participants.
- Route Sentinel/security review after Forge because this is access-control adjacent.

### D2 — HIGH — Private-pilot request route has a canonical/legacy mismatch: `/requests` works, `/app/requests` is 404

Route(s): `/requests`, `/app/requests`
Roles observed: Pro Planner, DIY Planner, Vendor, Venue, Client, Admin

Observed behavior:
- `/requests` returned 200 and rendered “Booking Requests” for all inspected authenticated roles.
- `/app/requests` returned 404 for Pro Planner, DIY Planner, Vendor, and Venue in the first probe.
- Source confirms the request page lives under `(app)` routing (`apps/web/src/app/(app)/requests/page.tsx`) and therefore maps to `/requests`, not `/app/requests`.
- Existing documentation/runbook material previously referenced `/app/requests` as a fallback path.

Why it matters:
- Booking request visibility is one of the private-pilot handoff points between planner and provider. A stale route in docs, messages, support scripts, or remembered user flows leads directly to a broken 404.

Smallest recommended fix:
- Add a compatibility redirect from `/app/requests` to `/requests`, or update every user-facing/internal reference to the canonical `/requests` path.
- Prefer the redirect during private pilot to protect old links.

### D3 — MEDIUM-HIGH — Authenticated marketplace sourcing shows public “Sign in / Create account” navigation

Route(s): `/marketplace?eventSlug=demo-wedding`, `/marketplace?eventSlug=diy-sample-event`
Roles observed: Pro Planner, DIY Planner

Observed behavior:
- Authenticated Pro Planner and DIY Planner marketplace probes returned 200 with marketplace listings.
- The rendered text included public navigation copy: “OneHub Events Features More Sign in Create account” while the user was already authenticated.

Why it matters:
- Marketplace sourcing is central to the pilot provider journey. Showing sign-in/create-account CTAs to an authenticated planner creates role-state confusion and makes the route feel public/generic instead of event-attached.

Smallest recommended fix:
- Render authenticated navigation state on marketplace pages when a session exists: Dashboard / role workspace / messages / sign out, not Sign in / Create account.
- Preserve event context in the visible page title or breadcrumb.

### D4 — MEDIUM-HIGH — Venue billing connect copy can imply payment enablement before pilot/live-payment approval

Route(s): `/billing/connect`, `/app/billing/connect`
Role observed: Venue

Observed behavior:
- Venue user saw “Stripe Connect Setup” and “Connect your Stripe account to receive payments.”
- Pro/DIY/Client/Admin saw a denial-style message (“You need to be an admin or owner of a vendor…”), which is safe for those roles.
- Contract/payment surfaces elsewhere are better guarded: contract pages say payment is locked until accepted provider-backed proposal and signatures, and payment panel copy says Stripe confirmation/payout/held-funds remain explicit guarded states.

Why it matters:
- The task explicitly forbids live Stripe activation/payment attempts and asks whether gates imply live money/payment availability incorrectly. “Connect your Stripe account to receive payments” may be true as a setup step, but on canonical production it is too strong without private-pilot guardrail copy.

Smallest recommended fix:
- Add private-pilot readiness copy to Connect: “Setup only; this does not enable live charges, payouts, or release without OneHub approval/manual review.”
- If live Connect onboarding is not approved for pilot users, hide or disable the CTA behind admin/founder approval state.

### D5 — MEDIUM — Invite truth is mostly safe, but the UI still hides the key truth that email sending is not implemented

Route/source: invite vendor modal and `/api/invites/vendor`
Role context: Planner sourcing unverified vendor/venue leads

Observed behavior:
- UI success state says “Invite Queued” and “The invite has been queued for {email}.” That avoids claiming delivery.
- API response is more explicit: `message: "Invite queued (email sending not yet implemented)"`.
- The modal email template says it is an automated invitation and describes joining OneHub, but the user-facing success copy does not reveal that no email was actually sent.

Why it matters:
- The private-pilot requirement is strict: do not claim invite/email/SMS/message delivery unless the app/source proves it. “Queued” is safer than “sent,” but a pilot planner can still reasonably believe OneHub has queued an actual outbound delivery.

Smallest recommended fix:
- Change success copy to “Invite draft queued — email sending is not active yet” or “Invite copy prepared; no email was sent by OneHub.”
- If the intended action is copy-only, make Copy Email the primary action and avoid any send/queued implication.

### D6 — MEDIUM — DIY canonical event detail could not be confirmed useful by HTTP-rendered evidence

Route: `/diy-planner/vault/diy-sample-event`
Role observed: DIY Planner

Observed behavior:
- The route returned HTTP 200.
- The HTTP-rendered text captured mostly global shell/navigation and did not expose the same rich event detail text observed on `/pro/planner/vault/demo-wedding`.
- Browser harness was unavailable, so Scout could not visually confirm whether the client-rendered DIY detail becomes useful after hydration.

Why it matters:
- DIY Planner is in scope for the private pilot. A route returning 200 is not enough if the initial user-visible experience depends on hydration or stalls behind a blank/global shell.

Smallest recommended fix:
- Have Forge/Sentinel run a live browser check of `/diy-planner/vault/diy-sample-event`; if it remains sparse/blank after hydration, add server-rendered fallback/empty-state content matching the Pro workspace standard.

## Payment/proposal/contract gate assessment

Confirmed safe signals:
- Pro event workspace says “No live-payment shortcut is added here.”
- Pro Planner dashboard says money/contract alerts are “Private-pilot status only; this does not enable live charges or payouts.”
- Proposal detail labels draft/generated proposals as “not provider-backed” and locks approval until provider/venue submits a non-draft proposal with listing context.
- Contract detail states payment is locked until accepted proposal and both signatures are complete; payment entry is only shown when the signed/provider-backed gate passes.
- Payment panel copy says OneHub is not marking anything paid until Stripe confirmation is persisted and that held-funds/payout status is internal readiness/review state, not public escrow/legal approval.

Risk signals:
- Known fully signed contract detail rendered “Fully signed — payment-ready” to all authenticated tested roles by direct ID. Even if payment buttons remain hidden for non-buyer roles, this is too visible for private pilot until access control is verified.
- Venue Connect setup copy can read as live payment availability unless a pilot guardrail is added.

## Invite/notification truth assessment

Confirmed safe signals:
- `/notifications` rendered “0 unread,” “No notifications match this view,” and “New account, client, vendor, contract, and task alerts will appear here when they are created.” It did not claim any notification was delivered.
- `/messages` clearly showed either existing seeded threads or “No message threads need your attention.” It did not claim new messages were sent during this sweep.
- Invite API truth says email sending is not implemented.

Risk signals:
- Invite UI says “Invite Queued” but does not surface “email sending not yet implemented.” This should be tightened before private-pilot planner/vendor use.

## Admin/founder oversight assessment

PASS for small private-pilot visibility.

Observed admin surfaces provide:
- trust/risk command center with disputes, refunds, holdbacks, payouts, abuse reports, users, roles, and verification routes;
- role roster/users view;
- verification queues for refunds, disputes, holdbacks, payouts, and override history;
- safe copy stating no live money movement or credential changes from the dashboard.

Limit:
- This was visibility/read-only inspection only. It does not approve manual override/release correctness, live payment activation, legal approval, or public launch.

## Prioritized defect/risk list

1. HIGH — Cross-role commercial detail visibility by known proposal/contract ID.
   - Route: `/proposals/[id]`, `/contracts/[id]`.
   - Roles: all authenticated pilot roles tested.
   - Smallest fix: server-side authorization before render; Sentinel security verification.

2. HIGH — `/app/requests` 404 despite request flow relevance and historical references.
   - Route: `/app/requests`.
   - Roles: planners/providers.
   - Smallest fix: redirect `/app/requests` → `/requests` or update all references; redirect is safest for pilot.

3. MEDIUM-HIGH — Authenticated marketplace still shows public sign-in/create-account navigation.
   - Route: `/marketplace?...`.
   - Roles: Pro Planner, DIY Planner.
   - Smallest fix: authenticated nav state plus visible event context.

4. MEDIUM-HIGH — Venue Stripe Connect copy implies receiving payments without explicit pilot guardrail.
   - Route: `/billing/connect`.
   - Role: Venue.
   - Smallest fix: setup-only/manual-approval copy or hide CTA until approved.

5. MEDIUM — Invite UI says queued but hides “email sending not yet implemented.”
   - Route/source: invite vendor modal/API.
   - Role: planner sourcing unverified leads.
   - Smallest fix: “draft/copy prepared; no email sent by OneHub” language until outbound delivery exists.

6. MEDIUM — DIY selected-event detail needs browser confirmation; HTTP evidence was too thin.
   - Route: `/diy-planner/vault/diy-sample-event`.
   - Role: DIY Planner.
   - Smallest fix: Sentinel browser check; add server-rendered useful fallback if needed.

## PASS / FAIL / PARTIAL

Result: PARTIAL.

Private pilot is close enough to show a supervised role-flow demo, but not ready for unsupervised pilot users until the high/medium-high defects above are fixed or explicitly mitigated.

Forge implementation needed: YES.

Recommended Atlas next action:
Route Forge for a narrow “private-pilot readiness hardening” slice covering D1-D5, with D1 first. Then route Sentinel for authenticated browser verification across Admin, Pro Planner, DIY Planner, Client, Vendor, and Venue, including direct proposal/contract unauthorized cases, `/requests` route compatibility, marketplace authenticated nav, Connect copy, and invite truth. No founder escalation is required for copy/route/access hardening unless Atlas expands into live Stripe activation, production billing changes, legal approval, public launch, or real outbound email/SMS delivery.
