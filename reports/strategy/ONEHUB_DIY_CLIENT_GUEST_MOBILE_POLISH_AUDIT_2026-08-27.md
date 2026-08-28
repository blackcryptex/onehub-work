# OneHub DIY, client, guest, and mobile polish audit

Date: 2026-08-27
Owner lane: Scout, Phase 9 read-only UX audit
Scope: DIY planner cockpit, DIY event vault, client summary view, event sharing/client intake, guest list/RSVP flow, and mobile layout polish.

Boundary: Read-only product/UX/source audit. This report is the only file written. No source code was edited, no production data was touched, no final QA/release approval is implied, and no public launch/payment/legal/credential decision is included.

## Verdict

PARTIAL.

OneHub has the right pilot-facing bones for the DIY/client/guest path: DIY planners can create an event, see a guided cockpit, access event vault context, shortlist/request providers, attach clients, share a client-safe summary, expose a client summary route, show manual-safe payment/crisis copy, and support a public RSVP token page.

The polish gap is flow continuity. Several surfaces are real but not connected cleanly enough for a pilot user: the SPA DIY cockpit and server-rendered vault pages duplicate concepts, client sharing is wired in one route but says "not connected" in another, guest editing/inviting/RSVP flows split between local-only panes and server tables, public RSVP posts to a missing API handler, and mobile layouts still have overflow/overlap risks on core setup and event-management screens.

## Evidence reviewed

Source routes and components inspected:

- `apps/web/src/app/diy-planner/page.tsx` — DIY role gate and dashboard entry.
- `apps/web/src/components/diy-planner/Dashboard.tsx` — DIY SPA cockpit, loading/empty/error states, route tabs, mobile menu, share/messages/help/settings placeholders.
- `apps/web/src/components/diy-planner/Header.tsx` — mobile menu/header/sign-out layout.
- `apps/web/src/components/diy-planner/DIYSidebar.tsx` — desktop sidebar and mobile drawer navigation.
- `apps/web/src/app/diy-planner/vault/page.tsx` — server-rendered DIY vault list and empty state.
- `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx` — server-rendered DIY event vault detail, client management, proposals/shortlist actions, quick links.
- `apps/web/src/components/EventManagementSection.tsx` and `apps/web/src/components/EventActionBar.tsx` — in-cockpit event-management tabs and sticky tab bar.
- `apps/web/src/components/panes/VendorsPane.tsx` — generated vendors, shortlist, email/chat buttons.
- `apps/web/src/components/panes/ProposalsPane.tsx` — local proposal generation/status actions.
- `apps/web/src/components/panes/ContractsPane.tsx` — local contract generation/e-sign placeholder.
- `apps/web/src/components/panes/BudgetPane.tsx`, `GuestsPane.tsx`, `TasksMilestonesPane.tsx` — in-cockpit budget, guest, task, milestone panes.
- `apps/web/src/app/events/new/page.tsx` — event wizard, validation, client intake step, mobile form layout.
- `apps/web/src/app/api/events/create/route.ts` — event creation, client attachment and auto-share persistence.
- `apps/web/src/app/api/diy/events/route.ts` — DIY event API mapping into legacy EventItem data.
- `apps/web/src/components/events/ManageStakeholders.tsx`, `ShareEventButton.tsx`, `StakeholdersSectionClient.tsx` — planner-side client add/invite/share controls.
- `apps/web/src/app/api/events/[eventSlug]/share/route.ts` — share/unshare API, email notification attempt.
- `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx` — client-safe event summary, waiting state, deposits, crisis issue copy, messages CTA.
- `apps/web/src/components/client/DepositPanel.tsx` — client payment copy and deposit history surface.
- `apps/web/src/app/(app)/events/[eventSlug]/guests/page.tsx` — server guest list table/empty state.
- `apps/web/src/app/rsvp/[token]/page.tsx` and `rsvp-form.tsx` — public RSVP token page/form.
- `apps/web/src/server/routers/guest.ts` — guest CRUD/invite/RSVP tRPC router.
- `apps/web/src/lib/routes.ts` — role-aware vault/client routes and safe return prefixes.
- `apps/web/src/app/(app)/requests/page.tsx` — buyer/provider booking request list and role-confusing empty state.
- Parent Sentinel Phase 7 handoff — crisis workflow passed with safe client-facing manual-review/payment/legal copy.
- Prior Scout provider/marketplace audit — event-attached marketplace and request path is PARTIAL but useful context for DIY provider-discovery continuity.

## Confirmed strengths

1. DIY dashboard is role-gated before rendering the cockpit.
   - Evidence: `/diy-planner/page.tsx` redirects unauthenticated or non-DIY dashboard users to `/app`.
   - User impact: the core DIY cockpit is not casually exposed to client/provider roles.

2. DIY event creation has useful client-intake and validation shape.
   - Evidence: `/events/new/page.tsx` validates event name, event type, date, city, state, zip, headcount, budget, and style before POSTing to `/api/events/create`; pro planners get a client intake step.
   - Evidence: `/api/events/create/route.ts` persists event, baseline budget lines, checklist, milestone, optional client stakeholders, and optional summary shares.
   - User impact: a real pilot event can start with enough data for follow-up surfaces instead of a blank project shell.

3. Client summary sharing is persisted and access-checked in the canonical event vault/detail path.
   - Evidence: `DIYVaultDetailPage` renders `ShareEventButton` when clients/stakeholders are present; `/api/events/[eventSlug]/share/route.ts` requires planner/admin role, event manage permission, and stakeholder membership before creating `EventShare`.
   - User impact: the planner/client visibility gate is safer than a raw link-share model.

4. Client view has a strong waiting state and safe issue/payment copy.
   - Evidence: `/client/events/[eventSlug]/page.tsx` shows "Waiting on your planner" when a client is attached but summary is not shared, and crisis copy explicitly says no refund, payment release, cancellation, or legal outcome is automatic.
   - User impact: clients see a clear reason for blocked content instead of a generic 404 or overclaim.

5. Mobile drawer mechanics exist for the DIY cockpit.
   - Evidence: `DIYSidebar` hides desktop nav at `md`, opens a fixed mobile drawer, and closes it after route selection.
   - User impact: the cockpit is not desktop-only, though polish risks remain below.

## Findings

### P0-1. Public RSVP form posts to a missing API route

Status: BROKEN
Area: Guest / RSVP
Evidence:

- `apps/web/src/app/rsvp/[token]/rsvp-form.tsx:17-23` contains a TODO and posts to `/api/trpc/guest.rsvp`.
- `apps/web/src/server/routers/guest.ts:173-193` defines a `guest.rsvp` mutation, but `search_files` found no `apps/web/src/app/api/trpc` route and no guest API route under `apps/web/src/app/api`.

User-facing impact:

Invited guests can open the RSVP token page, but Accept/Decline has no confirmed handler. In a real pilot this blocks a core guest journey: guests think they responded, while the event guest list may never update.

Narrow correction:

Add a focused RSVP POST handler or wire the existing tRPC router through the app API route, then smoke-test Accept and Decline from `/rsvp/[token]` through persisted guest status, invitation `respondedAt`, and guest-list RSVP count.

### P0-2. In-cockpit DIY guest edits are local-only and can create fake confidence

Status: BROKEN/PARTIAL
Area: DIY / Guests
Evidence:

- `apps/web/src/components/panes/GuestsPane.tsx:15-24` auto-seeds a sample guest via `aiGuestSeed` when empty and `addGuest()` creates an in-memory `g-${Date.now()}` row.
- `apps/web/src/components/panes/GuestsPane.tsx:23-24` only calls `onUpdate`; no inspected API call persists add/edit changes.
- `apps/web/src/lib/ai.service.ts:232-235` returns `Alex Johnson / alex@example.com` as the guest scaffold.
- The server guest page at `apps/web/src/app/(app)/events/[eventSlug]/guests/page.tsx` is read-only table/empty-state rendering from Prisma, not the same editable cockpit state.

User-facing impact:

A DIY planner may add or edit guests in the cockpit and believe the event guest list is real, but those edits are not proven persisted to the event record. This also risks showing a sample guest as if it were event data.

Narrow correction:

Replace local-only guest mutation with a persisted guest-list API path, remove or clearly label sample scaffolding, and align the cockpit guest pane with the server guest list/RSVP source of truth.

### P0-3. DIY share/client flow is route-incoherent

Status: PARTIAL
Area: DIY / Client
Evidence:

- `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx:466-482` renders real client management through `StakeholdersSectionClient`.
- `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx:250-255` also renders `ShareEventButton` when manageable clients exist.
- `apps/web/src/components/diy-planner/Dashboard.tsx:503-549` sends the SPA `shareAccess` view to a placeholder: "Sharing is not connected yet" and "No private share or access-control flow is wired for DIY events in this cockpit yet."

User-facing impact:

The same DIY user can encounter two conflicting truths: one path says client sharing is available, another says it is not connected. That erodes trust and makes pilots unsure where client access should be managed.

Narrow correction:

Make the SPA Share action route to the existing vault detail client/share controls, or embed the same `StakeholdersSectionClient`/`ShareEventButton` flow in the cockpit. Do not leave contradictory placeholder copy once the server route is wired.

### P1-4. DIY cockpit actions generate proposals/contracts locally while canonical commercial flow has stricter gates

Status: PARTIAL
Area: DIY / Proposals / Contracts
Evidence:

- `apps/web/src/components/panes/ProposalsPane.tsx:36-64` generates proposal objects client-side and calls `onUpdate`, not a persisted provider-backed proposal API.
- `apps/web/src/components/panes/ProposalsPane.tsx:80-104` marks proposals sent/accepted/rejected in local state and optionally sends email when a vendor email exists.
- `apps/web/src/components/panes/ContractsPane.tsx:24-33` generates contract objects client-side from accepted proposals; `sendForESign` at lines 44-55 marks local status and calls a stub service.
- Parent Sentinel verified provider-backed/payment gates elsewhere, so this local cockpit path should not imply booking, payment, contract, or vendor commitment.

User-facing impact:

DIY planners can see proposal/contract actions that feel operational even when the system is not yet persisting provider-backed evidence or real contract readiness. This is a pilot trust risk because UI progress can outrun the safe canonical commercial gates.

Narrow correction:

Reframe these panes as draft planning aids, or route them into the canonical provider-backed proposal/contract records with safe statuses and clear "not sent / not provider-confirmed / no payment movement" copy.

### P1-5. Client summary is useful but too passive after share

Status: PARTIAL
Area: Client
Evidence:

- `/client/events/[eventSlug]/page.tsx:167-300` shows date/time, location, guest count, event type, description, objective, deposits, crisis issues, messages CTA, and a note that more may be shared later.
- `/client/events/[eventSlug]/page.tsx:278-292` points clients to `/messages`, but there is no event-specific thread link or status of what changed since last share.
- `DepositPanel` says payments are handled through signed contracts and approved schedules, but does not link to a contract/deposit detail route.

User-facing impact:

A client can view a safe summary, but they are not guided to approve, ask a question, review a change, or understand what is newly shared. For a pilot, this can feel like a static read-only page rather than a collaborative client workspace.

Narrow correction:

Add a "what your planner shared" section, event-specific message thread/deep link, latest change/activity summary, and clear next action states: waiting on planner, review summary, ask question, review deposit/contract when available.

### P1-6. Event cockpit and server vault split the same user journey

Status: PARTIAL
Area: DIY / Route coherence
Evidence:

- `/diy-planner` is a client SPA with internal `uiRoute` state and query `?view=` synchronization (`Dashboard.tsx:72-151`).
- `/diy-planner/vault` and `/diy-planner/vault/[eventSlug]` are separate server-rendered pages with a different layout and richer real data sections.
- `Dashboard.tsx:540-550` quick actions jump to `/events/${eventSlug}/guests`, `/events/${eventSlug}/budget`, and `/events/${eventSlug}/checklists`, which leave the DIY cockpit layout for generic event subpages.

User-facing impact:

DIY users can move between three patterns for the same event: cockpit tabs, DIY vault pages, and generic `/events` subpages. This raises cognitive load and makes it unclear which page is the source of truth.

Narrow correction:

Choose one canonical DIY event workspace path for pilot use, then make every cockpit/sidebar/quick action deep-link into that path or intentionally label secondary read-only subpages.

### P2-7. Mobile event wizard has small-screen squeeze points on required setup fields

Status: PARTIAL
Area: Mobile / Event creation
Evidence:

- `apps/web/src/app/events/new/page.tsx:329-438` uses `md:grid-cols-2` for main columns, which stacks correctly below `md`.
- The city/state/zip group at `apps/web/src/app/events/new/page.tsx:391` uses `grid grid-cols-3 gap-4` with no `sm:`/`md:` breakpoint.
- Submit controls at `apps/web/src/app/events/new/page.tsx:557-564` and back/create controls at `580-592` do not switch to full-width stacked mobile layout.

User-facing impact:

The first real DIY setup flow may feel cramped on phones, especially with validation errors under City/State/Zip. This is not a blocker on desktop, but it is a pilot polish gap for mobile-first DIY users.

Narrow correction:

Change the city/state/zip group to stack on base and split at `sm`/`md`; make primary wizard actions full-width or stacked on base screens.

### P2-8. Sticky mobile/header offsets are likely inconsistent

Status: UNCLEAR/PARTIAL
Area: Mobile / Navigation
Evidence:

- `Header.tsx:8-27` uses a sticky header with `py-6`, centered title/subtitle, a left hamburger, and right sign-out control.
- `EventActionBar.tsx:22` uses `sticky top-[64px]`, but the header height appears larger than 64px because of `py-6`, `text-3xl`, and subtitle.
- `DIYSidebar.tsx:233` pins desktop sidebar at `top-0 h-[100dvh]` underneath the sticky header's document flow.

User-facing impact:

On mobile and tablet scrolling, the tab bar can sit under or overlap the sticky header, and the sign-out control can crowd the centered header text. This is a polish risk that should be verified in browser at 390px/430px widths before pilot.

Narrow correction:

Define a shared header height/offset token or avoid nested sticky bars on mobile; verify the header, drawer, and event tab bar at common mobile widths.

### P2-9. Requests page copy still confuses sent versus received requests

Status: PARTIAL
Area: DIY / Client / Provider request visibility
Evidence:

- `apps/web/src/app/(app)/requests/page.tsx:32-39` lists requests where the user's org sent the request or owns the listing.
- Empty state at `apps/web/src/app/(app)/requests/page.tsx:50-55` says "Booking requests from vendors will appear here," which is backwards for buyer-created requests and ambiguous for provider leads.

User-facing impact:

DIY/client/provider users may not know whether this page is for requests they sent, leads they received, or vendor replies. That weakens the marketplace-to-booking feedback loop.

Narrow correction:

Split or label the page by role: "Sent booking requests" for planners/clients and "Lead queue" for providers, with separate empty-state CTAs and row actions.

### P3-10. Server guest list table is readable but not action-oriented for pilot guest management

Status: PARTIAL
Area: Guests
Evidence:

- `apps/web/src/app/(app)/events/[eventSlug]/guests/page.tsx:31-81` renders guest lists and a table with name/email/phone/group/status/+1s.
- Empty state at lines 82-89 tells users to create a list when ready, but provides no CTA or import/add action.
- The guest router supports `createMany`, `update`, `remove`, `invite`, and `rsvp`, but the inspected server page does not expose those actions.

User-facing impact:

A planner can inspect guest state but cannot obviously import, edit, send invites, or resolve RSVP issues from the server guest page. The flow is not yet pilot-ready as a real guest-management workspace.

Narrow correction:

Add narrow CTAs for add/import guests and send/prep invitations; keep outbound email copy honest when delivery is not configured.

## Prioritized Forge slice list

### P0 — Make guest RSVP and guest-list persistence real

Goal: Protect the first external guest journey.

Narrow work:

- Wire `/rsvp/[token]` Accept/Decline to a real API handler or working tRPC app route.
- Persist RSVP status, dietary notes, invitation `respondedAt`, and guest-list RSVP count.
- Replace local-only `GuestsPane` mutations with persisted guest-list create/update/remove paths.
- Remove or label the `Alex Johnson` sample scaffold so it cannot be mistaken for real event data.
- Add focused tests for token not found, Accept, Decline, repeat response, and count update.

Why first: A broken guest RSVP is directly visible to non-authenticated external users and blocks pilot credibility.

### P1 — Reconcile DIY client sharing into one canonical path

Goal: Stop contradictory client/share UX.

Narrow work:

- Decide whether `/diy-planner` cockpit or `/diy-planner/vault/[eventSlug]` owns client management for pilot.
- Route the cockpit Share action to the existing persisted share controls or embed those controls in the cockpit.
- Remove the "Sharing is not connected yet" copy from any path where sharing is actually available.
- Add a post-share confirmation that names the client, summary scope, and client route.

Why next: Client collaboration is one of the visible OneHub differentiators; conflicting copy makes the system feel unfinished.

### P2 — Mark DIY proposal/contract cockpit actions as drafts or connect them to canonical records

Goal: Keep commercial UX aligned with Phase 7/Sentinel guardrails.

Narrow work:

- If these remain planning aids, label generated proposal/contract objects as local drafts and avoid "sent", "accepted", or "send for e-sign" wording that implies external commitment.
- If they become real, persist them through canonical proposal/contract APIs with provider-backed/payment gates intact.
- Add no-money/no-legal/no-provider-confirmation copy where needed.

Why next: DIY pilots must not confuse internal planning progress with vendor/provider commitment.

### P3 — Mobile event creation and cockpit navigation polish

Goal: Make first-run DIY creation and event management usable on phones.

Narrow work:

- Stack city/state/zip fields on base mobile and split only at safe breakpoints.
- Make wizard primary/back buttons stack and fill width on base screens.
- Verify sticky header + event tab bar offset at 390px, 430px, 768px.
- Consider disabling sticky tab bar on mobile if overlap remains.

Why next: DIY planners are likely to start or check events on mobile; setup friction blocks adoption.

### P4 — Unify DIY event workspace routing

Goal: Reduce source-of-truth confusion.

Narrow work:

- Pick the canonical pilot route for an event workspace.
- Make dashboard cards, vault list, quick actions, guest/budget/checklist links, marketplace return URLs, and client-share actions all preserve that route.
- Keep generic `/events/[eventSlug]/*` subpages as read-only/details routes only if clearly labeled.

Why next: The current product can work, but users must learn too many page patterns for one event.

### P5 — Upgrade client summary from static view to guided client workspace

Goal: Make shared event summaries useful after the first view.

Narrow work:

- Add latest shared changes/activity and "what your planner wants you to review" copy.
- Link to an event-specific message thread when available.
- Link deposits/contracts/proposals from client-visible cards only when safe and shared.
- Preserve current waiting/manual-review/payment/legal guardrails.

Why next: Clients need a reason to return and a clear next action.

### P6 — Clarify booking requests by role

Goal: Make sent/received booking status understandable.

Narrow work:

- Rename buyer empty state to "No sent booking requests yet" with a marketplace CTA.
- Rename provider view as "Lead queue" with provider actions once available.
- Add role-aware row labels and status explanations.

Why later: Important for marketplace conversion, but less externally broken than RSVP/share continuity.

## Recommended smokes for Sentinel after Forge implementation

1. Guest RSVP smoke:
   - Open `/rsvp/[token]` for a seeded pending invitation.
   - Accept with dietary notes.
   - Confirm guest status becomes ACCEPTED, invitation `respondedAt` is set, and guest-list RSVP count updates.
   - Repeat with Decline on a separate token.

2. DIY guest persistence smoke:
   - Add a guest in the DIY cockpit or canonical guest page.
   - Refresh and confirm the row persists.
   - Edit email/status/plus-one and confirm server-rendered guest list matches.

3. Client share coherence smoke:
   - Attach a client to an event.
   - Share summary from the canonical DIY route.
   - Confirm client sees `/client/events/[eventSlug]` summary.
   - Unshare and confirm client sees the waiting state, not event details.

4. DIY cockpit route coherence smoke:
   - From `/diy-planner`, open event detail, guests, budget, checklist, proposals, contracts, marketplace return link, and client share.
   - Confirm every path preserves event context and does not contradict the canonical workspace.

5. Mobile polish smoke:
   - At 390px and 430px widths, run event wizard validation, city/state/zip entry, mobile drawer, event tab bar, guest list, proposals, and client summary.
   - Confirm no hidden primary CTAs, horizontal body overflow, sticky overlap, or unreachable drawer controls.

6. Commercial copy smoke:
   - Generate DIY proposals/contracts.
   - Confirm UI either persists canonical records through provider-backed gates or clearly labels the output as draft planning only.
   - Confirm no automatic payment, signature, vendor acceptance, or legal claim is implied.

## User-facing impact summary

If fixed, OneHub's DIY/client/guest path will feel pilot-real: a planner can create an event, manage real guests, send working RSVPs, share a clear client summary, and use mobile screens without route confusion.

If left as-is, OneHub risks failing at the first external pilot touchpoints: guests may not be able to RSVP, clients may see contradictory share states, and DIY planners may mistake local planning scaffolds for persisted booking/proposal/guest state.

## Narrow next action for Atlas

Route Forge for P0 first: working RSVP handler plus persisted guest-list mutations. Then route Forge for P1/P2 as a single UX safety pass: reconcile client-share routing and relabel or canonicalize DIY proposal/contract draft actions.

No founder escalation is required for these read-only audit findings or the recommended UI/API polish slices. FOUNDER ESCALATION REQUIRED if the scope expands into live outbound email/SMS enablement, production credential changes, billing/payment activation, legal copy approval, public launch claims, or irreversible production data changes.
