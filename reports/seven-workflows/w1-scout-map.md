# W1 Scout map — Vendor/Venue Reliability full user workflow

Task: `t_0a2eeb6f`
Date: 2026-08-28
Owner lane: Scout
Scope: read-only product/UX map for Workflow 1 Vendor/Venue Reliability.

Boundary: No source edits were made. This report does not approve public launch, production changes, live payments, billing, credentials, public exposure, legal claims, or final QA. Sentinel retains veto.

## 1. Scope inspected

Business loop requested by Atlas:

1. Provider profile is created or updated.
2. Provider profile becomes a real marketplace listing.
3. Planner/DIY searches in event context.
4. Planner/DIY compares trust, availability, price, and reviews.
5. Planner/DIY shortlists or requests the provider/venue.
6. Provider/venue sees the lead.
7. Evidence is recorded.

## 2. Evidence reviewed

Code/routes/components:

- `apps/web/src/app/providers/onboarding/page.tsx` — provider profile wizard and publish redirect behavior.
- `apps/web/src/app/api/providers/profile/route.ts` — provider profile save/publish and primary listing sync.
- `apps/web/src/lib/marketplace-profile.ts` — marketplace category normalization, trust labels, selected-event fit labels, starting-price labels, and listing sync helper.
- `apps/web/src/app/marketplace/page.tsx` — canonical marketplace discovery, filters, selected-event context, listing card output.
- `apps/web/src/app/marketplace/[slug]/page.tsx` — listing detail trust/readiness fields, packages/spaces/policies, availability, shortlist/request actions.
- `apps/web/src/components/shortlist/AddToShortlistButtonClient.tsx` and `apps/web/src/app/api/shortlist/route.ts` — shortlist read/write UX and persistence.
- `apps/web/src/app/api/shortlist/add/route.ts` — AI sourcing shortlist add path.
- `apps/web/src/components/bookings/BookingRequestButtonClient.tsx`, `BookingRequestModal.tsx`, and `apps/web/src/app/api/bookings/request/route.ts` — event-attached booking request UX and persistence.
- `apps/web/src/app/(app)/requests/page.tsx` — buyer/provider request list visibility.
- `apps/web/src/app/vendor/dashboard/page.tsx`, `apps/web/src/components/vendor/Dashboard.tsx` — vendor lead dashboard.
- `apps/web/src/app/venue/dashboard/page.tsx`, `apps/web/src/components/venue/Dashboard.tsx` — venue inquiry dashboard.
- `apps/web/src/server/routers/bookingRequest.ts` — tRPC booking request status and quote/proposal handoff mutations.
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx` and `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx` — event workspace marketplace/shortlist/request entry points.
- `apps/web/src/app/explore/vendors/page.tsx` and `apps/web/src/app/api/vendors/search/route.ts` — alternate vendor search surface.
- `apps/web/prisma/schema.prisma` — `ShortlistItem`, `Activity`, `Listing`, `BookingRequest`, `Proposal`, and related workflow models.

Tests/reports:

- `apps/web/tests/marketplace-provider-actionability.test.tsx` — provider publish -> listing sync, event-attached marketplace, listing detail, unauthorized event stripping, booking request payload.
- `apps/web/tests/vendor-dashboard-workflow.test.tsx` — vendor dashboard lead/readiness UI behavior.
- `apps/web/tests/venue-dashboard-workflow.test.tsx` — venue dashboard inquiry/readiness UI behavior.
- `apps/web/tests/booking-request-provider-proposal.test.ts` — tRPC quote -> provider-backed proposal/activity handoff.
- `reports/preview/ONEHUB_PROTECTED_PREVIEW_FINAL_SMOKE_AA6694D_2026-08-28.json` — protected preview route smoke evidence.
- `reports/preview/ONEHUB_PROTECTED_PREVIEW_RUNTIME_SMOKE_2026-08-28.md` and `reports/stabilization/ONEHUB_PHASE11_PRIVATE_PILOT_FOUNDER_PACKET_2026-08-28.md` — build/test/preview context and remaining release-gate caveats.
- `docs/plans/2026-08-28-seven-pain-points-full-workflow-completion-plan.md` — W1 acceptance statement.

## 3. Current workflow map

### Step 1 — Provider creates/updates profile

Status: PARTIAL but materially improved.

Confirmed:

- Provider onboarding captures business identity, category, contact, website/social, address, about, services/spaces, availability, payment policy, media, and notification preferences in `ProviderProfileDraft`.
- Publishing an authenticated provider profile calls `/api/providers/profile` and then routes vendors to `/vendor/dashboard` or venues to `/venue/dashboard`.
- The profile API validates provider type and key fields, stores rich organization profile JSON, sets role/profile status, and updates or creates the provider organization.

Gap causing revisits:

- Provider onboarding has no visible post-publish confirmation that shows the exact marketplace listing URL or what is buyer-visible versus stored-only. Users may revisit onboarding/manage listings to understand whether they are actually listed.
- `/marketplace/manage` has a visible `Create Listing` button with no link or action. If automatic primary listing sync fails or a provider wants to add a second listing/package, this is a dead end.

User-facing impact:

A provider can complete the profile path, but the next step is not self-evident. The provider cannot clearly verify “my profile is live as this listing” from the management surface.

### Step 2 — Profile becomes real marketplace listing

Status: COHERENT for primary synced listing; PARTIAL for management and evidence.

Confirmed:

- `syncPrimaryListingFromProfile` creates/updates the first listing for a provider org and maps business name/type/category/contact/location/about/capacity/media into `Listing` fields.
- `primaryListingDataFromProfile` normalizes vendor/venue categories and capacity from services/spaces.
- `marketplace-provider-actionability.test.tsx` verifies publish creates a real on-platform listing with `listingSynced: true` and expected `Listing` data.

Gaps causing revisits:

- Listing sync does not record an `Activity` row such as `PROVIDER_PROFILE_PUBLISHED` or `LISTING_SYNCED_FROM_PROFILE` in the inspected route, so the “evidence recorded” loop is incomplete at publish/listing-sync time.
- Primary sync updates the earliest existing listing. There is no user-facing explanation for providers with multiple services/spaces that OneHub currently exposes one primary listing plus profile-derived services/spaces.
- `/marketplace/manage` lists provider-owned listings but only provides `View`; it does not provide edit, publish/draft state, readiness, or create-listing completion.

User-facing impact:

The buyer can see the synced listing, but providers have weak control/confirmation over how their profile maps into marketplace supply.

### Step 3 — Planner/DIY searches in event context

Status: PARTIAL.

Confirmed:

- Pro planner event workspace builds `/marketplace?eventId=...&eventSlug=...&eventName=...&location=...&returnTo=...`.
- DIY event workspace links to `/marketplace` with event id/slug/name/returnTo.
- `/marketplace` authorizes `eventId` against the current user before treating query context as real event context.
- Unauthorized event context is stripped from marketplace links by test.
- Canonical marketplace now has basic filters for type, category, location, and on-platform profile trust.

Gaps causing revisits:

- The richer `/explore/vendors` surface is still parallel to canonical `/marketplace`; its internal cards link to `/marketplace/[slug]` without preserving event id/slug/name/returnTo, and it attempts `/api/vendors/search-external`, which was not found under `apps/web/src/app/api`. This creates a tempting search path that can lose event continuity or silently fail external search.
- `/marketplace` only filters by type/category/location/on-platform status. It does not filter by event date, capacity, budget, service area radius, availability status, response signal, or contract/payment readiness even though event/listing/org data exists.
- DIY marketplace entry omits event location/budget in the inspected link, while Pro includes location.

User-facing impact:

The canonical marketplace can preserve event context, but users can still land in a richer-looking search path that is not event-continuous. They may repeat searches or reopen listings from the event workspace to regain shortlist/request actions.

### Step 4 — Planner/DIY compares trust, availability, price, reviews

Status: PARTIAL.

Confirmed:

- Marketplace cards now render more than a thin directory card: type/category, verification label/description, selected-event fit label, response label, starting price label, contract-readiness label, rating/review count via `ListingCard` props, and event-context CTA copy.
- Listing detail shows trust/request readiness, verification explanation that avoids overclaiming license/insurance/payment guarantees, contact, last updated, packages/services/spaces, availability rules indicator, selected-event availability/capacity fit label, policies, reviews, and request/shortlist actions.
- `marketplace-provider-actionability.test.tsx` covers card trust/fit/response/review count and listing detail trust/readiness/package/policy/default request content.

Gaps causing revisits:

- Selected-event fit is a label, not a decision gate. The booking API does not enforce availability slots, blackout dates, min notice, max events/day, capacity, service area, or budget before creating a request.
- Marketplace card/detail still do not expose how response SLA was measured; `responseSignal` can display provider-entered notification JSON, otherwise “Response SLA not yet measured.” That is honest, but users may need more proof before trusting response reliability.
- Listing detail shows policy JSON entries with raw-ish key labels, which may be understandable for proof but not yet polished enough for pilot users comparing vendors quickly.
- Reviews are displayed when present, but there is no explicit “no reviews yet / new on OneHub” trust explanation when empty.

User-facing impact:

OneHub now gives useful comparison signals, but users can still request a provider that is probably unavailable or unfit. That can force provider rejection and planner re-sourcing.

### Step 5 — Planner/DIY shortlists or requests

Status: COHERENT for event-linked shortlist/request persistence; PARTIAL for closure after submit.

Confirmed:

- `AddToShortlistButtonClient` fetches `/api/shortlist?eventId=...`, detects existing item state, posts `eventId + listingId`, disables after add, and refreshes.
- `/api/shortlist` validates authenticated user, event manage permission, real listing, and upserts/deletes `ShortlistItem` by unique `(eventId, listingId)`.
- Listing detail shows shortlist only when authorized event context is present.
- `BookingRequestModal` pre-fills start/end/guest/message from event context and blocks submit without event context.
- `/api/bookings/request` validates authenticated user, manageable event, real listing, required contact/start/end, date order, and positive guest count, then creates `BookingRequest`.
- `/requests` shows sent/received direction labels, event link, date, contact, phone, guest count, quote, message, and requested timestamp.

Gaps causing revisits:

- Request submit success shows a transient modal with “Back to event” when `returnTo` is present, then closes after 1.5 seconds and refreshes the page. It does not provide a durable request ID/detail link, “View request,” “Back to event requests,” or “Track provider response” action.
- Booking request creation via the inspected REST route does not record `BOOKING_REQUEST_CREATED` activity or notify provider org members. The separate tRPC `bookingRequestRouter.create` does record activity and notifications, but the current modal uses `/api/bookings/request`, not that router.
- The request form still requires manual contact name/email even for authenticated planners/DIY users whose profile/session likely contains this information.
- No selected package/space/offer is captured with the request; the provider sees listing-level interest but not the specific package/space that drove the request.

User-facing impact:

The request is persisted, but the user is not clearly handed to the next tracking surface and the provider may not be proactively notified from the REST path. That creates “did it go anywhere?” revisits.

### Step 6 — Provider sees lead

Status: PARTIAL.

Confirmed:

- Vendor dashboard queries booking requests for owned listings and displays lead counts, recent requests, event/listing/contact/date/status, calendar, messages, and readiness panels.
- Venue dashboard does the same for venue listings and additionally surfaces phone/guest count in inquiry messages.
- Preview smoke confirms `/vendor/dashboard` and `/venue/dashboard` load for seeded roles on protected preview.
- Unit tests cover dashboard first-screen lead response copy, routing to internal panels, and useful empty states.

Gaps causing revisits:

- Vendor/venue dashboard UI has no inspected persistent actions to set lead status, quote, hold, decline, request more info, or create a provider-backed proposal from the lead. Buttons route to local panels only.
- `bookingRequestRouter.setStatus` and `bookingRequestRouter.quote` exist server-side and `booking-request-provider-proposal.test.ts` verifies quote -> provider-backed `Proposal` + `PROVIDER_PROPOSAL_SUBMITTED` activity, but no inspected vendor/venue dashboard component calls these mutations.
- Provider lead rows do not link to a durable booking request detail page. Messages panel is a display surface, not a real thread/reply flow for this lead.
- The vendor dashboard `recentRequests` slice is limited to the latest five after fetching all requests; older but urgent leads can be hidden from the immediate queue with no pagination/filtering.

User-facing impact:

Providers can see that a lead arrived, but cannot complete the response loop from the dashboard. This is the largest remaining workflow gap because it stops short of OneHub’s “reliable provider commitment” differentiator.

### Step 7 — Evidence recorded

Status: PARTIAL.

Confirmed:

- `ShortlistItem` persists shortlist evidence by event/listing.
- `BookingRequest` persists request evidence by event/listing/org/contact/date/status.
- `Proposal` and `Activity` can record provider-submitted proposal evidence through `bookingRequestRouter.quote`.
- `hasProviderSubmittedEvidence` gates provider-backed proposal approval/contract paths by looking for `PROVIDER_PROPOSAL_SUBMITTED` activity.

Gaps causing revisits:

- The modal request path does not record `Activity`, so event history can miss `BOOKING_REQUEST_CREATED` evidence even though the request row exists.
- No provider dashboard UI was found that invokes provider quote/status mutations; therefore provider-backed proposal evidence exists in tests/server router but is not reachable from the visible provider lead workflow.
- Preview evidence proves routes load and selected tests pass, but current reports do not contain a full protected Preview browser proof of the exact W1 loop: provider publish -> marketplace listing -> event search -> shortlist/request -> provider sees lead -> evidence/activity recorded.

User-facing impact:

The database has partial proof rows, but the user-facing path does not yet produce a complete auditable workflow trail end to end.

## 4. Exact missing UX/user-flow gaps that would cause revisits

1. Provider management dead end: `Create Listing` in `/marketplace/manage` is inert and the management page lacks edit/readiness/publish-state actions.
2. Provider post-publish confirmation gap: after onboarding publish, provider lands on dashboard without a clear listing URL, buyer-visible field preview, or “what changed” evidence.
3. Parallel discovery path gap: `/explore/vendors` looks richer but is not event-continuous and references an external search endpoint not found in inspected API files.
4. Search/filter gap: canonical marketplace does not filter by actual event date availability, guest capacity, budget, service area, response reliability, or contract/payment readiness.
5. Availability/capacity enforcement gap: selected-event fit is displayed but not enforced by `/api/bookings/request`; unavailable/unfit requests can still be created.
6. Request completion gap: successful booking request does not give a durable request/detail/tracking link or route user back to the event request area.
7. Provider notification/activity gap: REST booking request creation does not record `Activity` or notify provider org members, while the unused tRPC create path does.
8. Lead response action gap: provider/venue dashboards display leads but do not expose visible actions wired to `setStatus` or `quote`.
9. Provider-backed proposal reachability gap: server/test evidence exists for quote -> proposal -> provider-submitted activity, but no visible provider dashboard path triggers it from an incoming lead.
10. Lead detail/thread gap: provider lead rows only expose local dashboard panels; no durable lead detail page, real message thread, status history, or response SLA timer is visible.
11. Request specificity gap: requests do not capture selected package/space/offer, budget/range, or authenticated contact defaults.
12. Evidence-proof gap: protected Preview evidence confirms route loads, but not the full W1 business loop with persisted shortlist/request/activity and provider dashboard readback.

## 5. User-facing impact

Current W1 is a credible partial workflow, not just component proof. A provider profile can become a real marketplace listing; planner/DIY can browse with event context; cards/details provide honest trust/fit/readiness signals; shortlist and booking request rows persist; provider/venue dashboards can show leads.

The remaining product risk is the response/evidence close. Users may revisit because OneHub does not yet clearly answer: “Was my provider profile really published?”, “Did my request notify the provider?”, “Where do I track this request?”, “Can the provider respond or quote inside OneHub?”, and “Is this provider actually available for my event?”

## 6. Verdict

PARTIAL.

Reason: the browse/compare/shortlist/request/read-lead path is present and materially stronger than the prior audit baseline, but the full reliability loop is not closed because provider response actions, provider-backed proposal reachability, request notifications/activity, availability enforcement, and full Preview proof remain incomplete.

## 7. Narrow next action for Atlas

Route Forge for one W1 closure slice, not a redesign:

1. Wire provider/venue dashboard lead rows to persistent actions: hold/decline/quote/request-more-info, using the existing `bookingRequestRouter.setStatus` and `bookingRequestRouter.quote` behavior or a matching App Router API.
2. Make the visible quote action create the provider-backed proposal and `PROVIDER_PROPOSAL_SUBMITTED` evidence from the lead.
3. Add `BOOKING_REQUEST_CREATED` activity/provider notification to the REST request path used by the modal.
4. Add durable request success CTAs: “View request,” “Back to event requests,” and “Track provider response” before the modal auto-closes.
5. Either integrate `/explore/vendors` into the canonical event-attached marketplace or mark it non-canonical until it preserves event context and its missing external endpoint is resolved.
6. Add a focused W1 Preview smoke that proves provider publish -> event marketplace -> shortlist/request -> provider dashboard readback -> quote/proposal/activity evidence.

No founder escalation is required for the read-only findings or for this narrow guarded workflow-closing implementation. FOUNDER ESCALATION REQUIRED before any public launch claim, live Stripe/payment activation, production credential/env/billing/domain/public-exposure change, legal approval claim, or live outbound email/SMS activation.
