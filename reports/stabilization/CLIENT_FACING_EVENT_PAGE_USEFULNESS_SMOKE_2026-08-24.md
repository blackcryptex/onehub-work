# Client-Facing Event Page Usefulness Smoke

Date: 2026-08-24
Auditor: Scout
Scope: Read-only UX smoke of the canonical client-facing event route and adjacent client surfaces on `https://www.1hubevents.com`.
Canonical source: `/root/.hermes/workspaces/onehub/repo`, branch `atlas/slice7-canonical-deploy`.

Important boundary: No code, DB data, secrets, billing, infrastructure, domains, production settings, live payments, or destructive schema/migration state were changed. Seeded client/demo credentials were used only for authenticated read-only smoke; no credential values are recorded in this report.

## Verdict

BROKEN for the “nothing shared yet” client usefulness requirement.

The canonical client event route exists and is role-gated, but the empty/no-shared-content experience is not useful enough for a real client. Authenticated CLIENT users can reach `/client/events/demo-wedding` and see the event name, but the page only says “Nothing shared yet” and “Your planner hasn’t shared any information about this event yet.” It does not explain what the client can do next, who is waiting on whom, how to contact the planner, or provide a back link to the client dashboard/message inbox. The CLIENT dashboard compounds the confusion by saying “No events yet. Create your first event to get started!” even though the client is attached to an event that has not been shared.

## Scope inspected

Routes and surfaces inspected:
- Public/unauthenticated: `/client/events/demo-wedding`.
- Authenticated CLIENT: `/app`.
- Authenticated CLIENT: `/client/events/demo-wedding`.
- Authenticated CLIENT direct probes: `/client/events/agency-sample-event`, `/events/demo-wedding`, `/app/vault/demo-wedding`, `/messages`, `/proposals`, `/contracts`.

Route/source inspection:
- `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:13-18` identifies `/client/events/[eventSlug]` as the client-safe event summary view.
- `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:76-103` handles the stakeholder-without-share case and returns the current “Nothing shared yet” empty state.
- `apps/web/src/app/app/page.tsx:74-89` fetches CLIENT recent events only when both stakeholder and `SUMMARY` share exist.
- `apps/web/src/app/app/page.tsx:155-182` renders the CLIENT dashboard “Recent Events” empty text.
- `apps/web/src/lib/routes.ts:64-74` maps `CLIENT` event detail links to `/client/events/[eventSlug]`.
- `apps/web/src/lib/routes.ts:134-152` maps the CLIENT dashboard to `/app`.
- `apps/web/src/components/layout/Sidebar.tsx:11-43` has no CLIENT-specific nav case; CLIENT users fall through to the default Dashboard-only sidebar.
- `scripts/seed.ts:13-20` identifies seeded demo users, including a CLIENT user.
- `scripts/seed.ts:104-128` identifies `demo-wedding` as a stable demo event slug.

## Evidence reviewed

Safe production probes:
- Unauthenticated `https://www.1hubevents.com/client/events/demo-wedding` returned HTTP 200 after redirect to `https://www.1hubevents.com/signin?callbackUrl=%2Fclient%2Fevents%2Fdemo-wedding`.
- Authenticated CLIENT `/app` returned HTTP 200 and rendered: “Dashboard”, “CLIENT”, “Organizations”, “No organizations yet. Create one to get started!”, “Recent Events”, “No events yet. Create your first event to get started!”, “Getting Started”, “Quick Links”, “Dashboard”, “Sign In”, and “System Status”.
- Authenticated CLIENT `/client/events/demo-wedding` returned HTTP 200 and rendered: “Demo Wedding Event”, “Nothing shared yet.”, and “Your planner hasn’t shared any information about this event yet.”
- Authenticated CLIENT `/app/vault/demo-wedding` redirected to `/app`, matching the source guard that keeps CLIENT users out of planner/vault routes.
- Authenticated CLIENT `/messages` returned HTTP 200 and rendered an empty message inbox with useful copy: “No message threads need your attention. Client, vendor, venue, proposal, and internal planning conversations will appear here once they are attached to your organization records.”
- Authenticated CLIENT `/proposals` and `/contracts` returned 404; only id-based proposal/contract detail routes are present in source.

Browser note:
- The Browser Use harness failed to start Chrome twice with `chrome-not-running`; Scout used read-only HTTP/authenticated route probes as the fallback. No screenshot was captured because the browser harness was unavailable. The observed page text is recorded above.

## Findings

### D1 — No-shared-content event page is a dead-end empty state

Severity: HIGH
Category: UX / Client flow continuity
Route: `/client/events/demo-wedding`
Role: authenticated CLIENT

Expected:
- When a client is attached to an event but the planner has not shared content yet, the page should explain:
  - what is happening,
  - who is expected to act next,
  - what the client can do now,
  - how to contact the planner or return to their dashboard.

Actual:
- The page renders only the event name plus:
  - “Nothing shared yet.”
  - “Your planner hasn’t shared any information about this event yet.”
- There is no back link, dashboard link, message link, planner contact context, waiting-on-planner label, or suggested next action.

Reproduction:
1. Sign in on `https://www.1hubevents.com` as the seeded CLIENT user.
2. Open `/client/events/demo-wedding`.
3. Observe the event name and two-line empty state.

User-facing impact:
- A real client can confirm they reached an event, but cannot tell whether they need to wait, message the planner, refresh later, or go somewhere else. This makes the client-facing page feel unfinished and undermines confidence before any shared content exists.

Recommended Forge slice:
- Replace the stakeholder-without-share branch in `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx:82-98` with a client-ready empty state card that includes:
  - “Waiting on your planner” status language,
  - “You are attached to this event, but no summary has been shared yet,”
  - a primary `Open Message Inbox` or `Contact planner` action when available,
  - a secondary `Back to dashboard` link,
  - planner/org name if safe to show from the existing event include.

### D2 — CLIENT dashboard empty state tells clients to create events they cannot create

Severity: HIGH
Category: UX / Role clarity
Route: `/app`
Role: authenticated CLIENT

Expected:
- CLIENT users with zero shared events should see role-specific copy such as “No shared events yet” and “Your planner will share event details here when ready.”
- The dashboard should not tell CLIENT users to create an event unless CLIENT event creation is intentionally supported.

Actual:
- `/app` renders CLIENT role badge, but dashboard panels still say:
  - “No organizations yet. Create one to get started!”
  - “No events yet. Create your first event to get started!”
  - Quick Links includes “Sign In” even while authenticated.

Reproduction:
1. Sign in as CLIENT.
2. Open `/app`.
3. Read the Organizations, Recent Events, and Quick Links panels.

User-facing impact:
- The client is pushed toward actions that do not match the CLIENT role. This is especially confusing when the client is attached to an unshared event: the event page says the planner has not shared content, while the dashboard says there are no events and suggests creating one.

Recommended Forge slice:
- Add CLIENT-specific dashboard empty-state copy in `apps/web/src/app/app/page.tsx:137-166` and remove/replace authenticated CLIENT `Sign In` quick link behavior in the relevant quick-links component. For CLIENT, copy should distinguish “no shared events yet” from “no events exist.”

### D3 — CLIENT has no clear event list or client workspace entry when attached-but-unshared

Severity: MEDIUM
Category: Route coherence / Flow continuity
Routes: `/app`, `/client/events/[eventSlug]`
Role: authenticated CLIENT

Expected:
- If a client is attached to an event but content is not shared, there should still be a stable client workspace entry or dashboard card that says the event is pending planner share.

Actual:
- Source requires both stakeholder and `SUMMARY` share before listing a CLIENT recent event (`apps/web/src/app/app/page.tsx:74-89`).
- Direct route access proves the attached-but-unshared state exists, but `/app` says “No events yet.”

Reproduction:
1. Sign in as CLIENT.
2. Open `/client/events/demo-wedding`; observe attached/no-share empty state.
3. Open `/app`; observe no event entry.

User-facing impact:
- The only way to reach the pending event is by direct URL. A client who navigates back to Dashboard loses the context and cannot find the pending event again.

Recommended Forge slice:
- For CLIENT dashboard recent events, consider fetching event stakeholder records separately from shared events and rendering pending entries as locked/waiting cards. If privacy requires hiding unshared event details, show a generic “Planner invitation pending” card tied to safe org/planner context.

## PASS / PARTIAL / FAIL matrix

| Check | Result | Evidence |
| --- | --- | --- |
| Canonical client route exists | PASS | `/client/events/[eventSlug]` exists and `vaultDetail(CLIENT, slug)` maps to it. |
| Unauthenticated client route behavior | PASS | Public probe redirects to sign-in with callback URL. |
| Authenticated CLIENT can reach attached/no-share event page | PASS | `/client/events/demo-wedding` returns HTTP 200 and shows the event name plus no-share message. |
| Empty/no-shared-content usefulness | FAIL | Empty state has no next action, waiting status, back link, or message/contact path. |
| CLIENT dashboard usefulness when nothing shared | FAIL | Dashboard says “No events yet. Create your first event to get started!” and “No organizations yet. Create one to get started!” |
| CLIENT direct planner vault access | PASS | `/app/vault/demo-wedding` redirects to `/app`. |
| Message inbox empty state | PASS | `/messages` has useful empty copy explaining when threads will appear. |
| Proposal/contract list surfaces for CLIENT | PARTIAL | `/proposals` and `/contracts` are 404; id-based detail routes exist, but no list/discovery surface was found in this smoke. |
| Payment-readiness surface for no-share CLIENT | UNCLEAR | `DepositPanel` exists for shared client event summaries, but the tested no-share state never reaches it. |

## Narrow next Forge slice

Implement “CLIENT pending-share workspace usefulness.”

Acceptance target:
1. `/client/events/[eventSlug]` stakeholder-without-share branch has a useful waiting state, not just “Nothing shared yet.”
2. The waiting state includes one safe primary action and one safe escape hatch: `Open Message Inbox`/`Contact planner` and `Back to dashboard`.
3. CLIENT `/app` empty states use CLIENT-specific language and do not tell clients to create organizations/events unless that role intentionally supports it.
4. CLIENT dashboard can distinguish “no shared events yet” from “no event relationship exists”; if an attached-but-unshared event can be shown safely, render it as pending/waiting.
5. Authenticated Quick Links do not show “Sign In” to signed-in CLIENT users.
6. Keep all planner/vault edit surfaces inaccessible to CLIENT.

## Recommended Atlas next action

Route a narrow Forge implementation card for the CLIENT pending-share workspace usefulness slice above. After Forge, route Sentinel for focused read-only verification of CLIENT `/app`, `/client/events/demo-wedding`, `/messages`, and direct planner-vault denial. No founder escalation is required for this copy/navigation polish unless Atlas expands the slice into production data changes, public exposure, payment behavior, or legal/client communications.
