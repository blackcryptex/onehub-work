# OneHub provider profile and marketplace actionability audit

Date: 2026-08-27
Owner lane: Scout, Phases 3-4 read-only audit
Scope: Vendor/venue profile, provider onboarding, marketplace discovery, listing detail, shortlist, booking request, and vendor/venue dashboard lead flows.

Boundary: Read-only product/UX audit. This does not approve public launch, live payments, legal/payment claims, outbound messaging, credentials, production changes, or final QA.

## Verdict

PARTIAL.

OneHub has a recognizable event-attached marketplace path: a planner can browse marketplace listings from an event, open a listing with event context preserved, shortlist a real listing, send a booking request, and have that request appear in vendor/venue lead dashboards. That is the right direction for beating generic directories.

The current product is not yet strong enough to beat directories on trust/actionability. Provider onboarding captures richer business/profile data than marketplace listing pages expose. Marketplace cards are too thin, discovery has almost no filters on the main marketplace, listing detail does not display packages/offers, response SLA, verification semantics, contract/payment readiness, or provider-submitted proof, and dashboard leads are visible but not yet actionable enough to quote, decline, hold, message, or convert into provider-backed proposals.

## Evidence reviewed

Source routes and components inspected:

- `apps/web/src/app/marketplace/page.tsx` — marketplace listing grid, event query preservation, empty state.
- `apps/web/src/app/marketplace/[slug]/page.tsx` — listing detail, event context banner, shortlist and booking request actions.
- `packages/ui/src/components/ListingCard.tsx` — card fields rendered.
- `packages/ui/src/components/AvailabilityCalendar.tsx` — listing availability rendering.
- `apps/web/src/components/shortlist/AddToShortlistButtonClient.tsx` — shortlist client action/state.
- `apps/web/src/components/bookings/BookingRequestButtonClient.tsx` and `BookingRequestModal.tsx` — booking request CTA/form/success/error UX.
- `apps/web/src/app/api/shortlist/route.ts` and `apps/web/src/server/routers/shortlist.ts` — event/listing authorization and persistence.
- `apps/web/src/app/api/bookings/request/route.ts` — booking request creation and validation.
- `apps/web/src/app/providers/start/page.tsx` and `apps/web/src/app/providers/onboarding/page.tsx` — provider role selection and profile onboarding.
- `apps/web/src/app/api/providers/profile/route.ts` — provider profile save/publish fields.
- `apps/web/src/app/vendor/dashboard/page.tsx`, `apps/web/src/components/vendor/Dashboard.tsx` — vendor leads/readiness dashboard.
- `apps/web/src/app/venue/dashboard/page.tsx`, `apps/web/src/components/venue/Dashboard.tsx` — venue inquiries/readiness dashboard.
- `apps/web/src/components/vault/AiSourceVendorsVenuesPanel.tsx` and `apps/web/src/app/api/ai/source-vendors-venues/route.ts` — event workspace sourcing and verified/unverified result semantics.
- `apps/web/src/app/explore/vendors/page.tsx` and `apps/web/src/app/api/vendors/search/route.ts` — separate richer vendor search surface.
- `apps/web/prisma/schema.prisma` — Listing, AvailabilitySlot, Offer, BookingRequest, ShortlistItem, Review, VendorRelationship fields.
- `reports/strategy/ONEHUB_BEAT_THE_MARKET_SCORECARD_2026-08-27.md` — Phase 0 promise/acceptance baseline.

## 1. Current user journey and broken/thin points

### Current event-attached journey

1. Pro/DIY event workspace builds marketplace URLs with `eventId`, `eventSlug`, `eventName`, and `returnTo` query context.
2. `/marketplace` reads that context and shows a banner: browsing for the selected event.
3. Each marketplace card links to `/marketplace/[slug]` while preserving the same query string.
4. Listing detail repeats selected-event context, offers `Add to shortlist` when `eventId` exists, and enables `Request booking for this event`.
5. `AddToShortlistButtonClient` persists a real `eventId` + `listingId` through `/api/shortlist` and changes to `Added to shortlist`.
6. `BookingRequestModal` requires contact name/email, start/end datetime, and optional phone/guests/message; `/api/bookings/request` persists `BookingRequest` after event manage authorization.
7. Vendor and venue dashboards query requests for their listing IDs and show recent leads/inquiries, calendar, message copy, and readiness checklists.

### Confirmed strengths

- Event context is intentionally preserved from event workspace to marketplace to listing detail.
- Shortlisting requires a real listing ID and selected event; unverified fallback leads do not get a shortlist button in the AI sourcing panel.
- Booking request creation requires authenticated user, manageable event, real listing, valid start/end dates, and contact details.
- Vendor/venue dashboards show lead queues and safe private-pilot language instead of live checkout claims.
- Provider onboarding captures useful trust material: business contact, category, social links, address, about copy, services/spaces, availability, deposit/final-due/cancellation/reschedule policies, media URLs, notification preferences, and response time label.

### Broken or thin points

1. Main marketplace discovery is too thin for actionability.
   - Evidence: `/marketplace` fetches latest 20 listings and renders only title, city, rating average, and price tier through `ListingCard`.
   - Missing user-visible filters: category, vendor vs venue type, location/state, event date/availability, guest capacity, budget range, verified/on-platform status, response time, and contract/payment readiness.
   - User impact: planners cannot quickly answer “is this real, relevant, available, and requestable for my event?” They must click every card.

2. Marketplace card lacks trust and requestability signals.
   - Evidence: `ListingCard` displays only title, city, optional star rating, and price tier.
   - Missing fields: type/category, provider org, review count, availability status, package starting price, response SLA, verified/pilot-ready badge, contract-ready/payment-ready state, shortlist/request affordance, and event fit indicator.
   - User impact: cards behave more like a generic directory list than a decision surface.

3. Listing detail hides much of the provider onboarding data.
   - Evidence: listing detail displays title, city/state, stars, cover image, gallery, description, tags, availability, shortlist/request buttons, and reviews. It includes `offers` in the query but does not render offers/packages. Provider profile API saves `servicesJson`, `spacesJson`, `paymentsJson`, `notificationsJson`, and `mediaJson` on the organization, but listing detail does not fetch or expose these organization trust fields.
   - User impact: a provider can enter meaningful pilot-use details, but buyers do not see enough of them to trust or compare the provider.

4. Provider onboarding publishes an organization but does not clearly create/request-ready marketplace listings.
   - Evidence: provider profile route creates or updates `Organization` data. Marketplace reads `Listing` records, and listing management shows “Create Listing” as a non-linked button.
   - User impact: a newly onboarded vendor/venue may believe the profile is visible and bookable, while marketplace actionability still depends on a separate listing path that appears incomplete from inspected source.

5. Booking request form is functional but not event-smart enough.
   - Evidence: modal asks the user to manually enter contact name/email/start/end/guests/message. It receives only `eventId`, not event date, event name, guest count, location, budget, or selected service/package.
   - User impact: planners re-enter context OneHub already has, and providers receive thin leads without enough event scope to quote confidently.

6. Provider dashboards show leads but do not let providers actually move the lead forward.
   - Evidence: vendor/venue dashboard lead cards can route to client-side `messages` and `calendar` panels. There is no inspected action to accept, decline, hold, quote, ask a question, attach terms, or create a provider-backed proposal from a request.
   - User impact: the system can collect leads, but the “beat directories” advantage stops before the provider can prove commitment on-platform.

7. Response and verification semantics are not yet enforceable.
   - Evidence: onboarding has `responseTimeLabel`, notification preferences, and profile status, but marketplace cards/details do not display a verified definition or enforce response history. AI sourcing labels verified as “on-platform account,” not necessarily licensed, insured, responsive, available, or contract-ready.
   - User impact: “Verified” can be misunderstood as stronger trust proof than current evidence supports.

8. Availability is present but shallow.
   - Evidence: listing detail renders raw `AvailabilitySlot` rows and says “No availability set” when empty. Booking request API does not check requested date against availability slots, blackout dates, min notice, max events per day, capacity, or service area.
   - User impact: users may request providers that are not actually available or fit for the event.

9. `/explore/vendors` has richer search UI but is not integrated with the event-attached marketplace path.
   - Evidence: `/explore/vendors` supports keyword, location, city/state, event date, min/max budget, category chips, and sorting. Internal vendor cards link to marketplace profiles, but they do not preserve `eventId/eventSlug/returnTo` context.
   - User impact: the richer discovery surface risks becoming a parallel path that loses event continuity.

10. Shared buyer-side booking requests page copy is role-confusing.

- Evidence: `/requests` empty state says “Booking requests from vendors will appear here,” even though buyer/planner-created requests are sent to vendors/venues and provider dashboards also use “booking requests.”
- User impact: users may not understand whether the page is for sent requests, received leads, or provider replies.

## 2. Exact provider/venue profile fields needed for trusted pilot use

### Core identity and verification

Required for pilot trust:

- Provider display name / legal business name.
- Provider type: Vendor or Venue.
- Category/subcategory with consistent enum labels.
- OneHub status: Draft, Published, Pilot Verified, Not Verified, Suspended/Needs Review.
- Verification meaning text: what OneHub has and has not verified.
- Owner/org identity and listing ownership.
- Contact email and phone, with visibility controls.
- Website and social links.
- Business address or service-area location.
- Last updated timestamp.

Current evidence:

- Onboarding captures business name, provider category, contact email/phone, website, Instagram, Facebook, address, city/state/postal, country, about.
- API stores these on `Organization`.
- Listing detail currently exposes only listing-level city/state/description/media/tags/reviews, not the full provider organization trust profile.

### Vendor-specific service fields

Needed:

- Service/package name.
- Service category and event types served.
- What is included/excluded.
- Starting price or range.
- Add-ons/upgrades.
- Guest/capacity range, if relevant.
- Service area radius and travel fees/constraints.
- Minimum notice.
- Max events per day/time-slot capacity.
- Blackout dates and available windows.
- Required deposit/final payment schedule.
- Cancellation and reschedule policy.
- Insurance/license/certification indicators where relevant.
- Portfolio/gallery proof.
- Response SLA and preferred contact method.

Current evidence:

- Onboarding captures service packages with category, name, starting price, description, and add-ons type support, plus availability/payment/media/notifications JSON.
- Listing schema supports `Offer`, `AvailabilitySlot`, tags, media, reviews, min/max guests, price tier, contact, website, and address fields.
- Listing detail does not render offers/packages or org JSON policies.

### Venue-specific profile fields

Needed:

- Venue type/subtype.
- Spaces/rooms with names.
- Min/max capacity per space.
- Indoor/outdoor/both.
- Ceremony/reception/tour/hold rules.
- Amenities and restrictions.
- Accessibility notes.
- Service area/address/map-friendly location.
- Blackout dates/available holds.
- Minimum notice and max events per day.
- Deposit, final due, cancellation, and reschedule rules.
- Required insurance/vendor restrictions, if applicable.
- Gallery/hero images.
- Response SLA and tour contact method.

Current evidence:

- Onboarding captures spaces with name, min/max capacity, indoor/outdoor, notes, plus availability/payment/media/notifications JSON.
- Venue dashboard readiness checks for spaces/contact/availability/payment setup.
- Public listing detail does not expose spaces, venue policy detail, or capacity/actionability enough for pilot trust.

### Lead/conversion fields providers need to see

Needed in dashboard lead cards:

- Event name and date/time.
- Event location and venue/location context.
- Guest count.
- Requested listing/package/space.
- Client/planner contact and role.
- Message/scope.
- Requested budget/range if available.
- Current status with allowed next actions.
- SLA age/time since request.
- Quote/proposal/contract/payment readiness state.

Current evidence:

- Vendor dashboard lead card displays contact name/email, listing title, event name, request date, event start/end date, and status.
- Venue dashboard additionally displays phone and guest count when present.
- Neither dashboard provides explicit provider actions to quote/hold/decline/respond/convert.

## 3. Marketplace card/detail requirements

Marketplace must make each result feel real, available, requestable, responsive, and contract-ready.

### Card requirements

Each card should show:

- Title and provider/venue type.
- Category/subcategory.
- City/state or service area.
- Verified/on-platform/pilot-ready badge with tooltip/copy.
- Availability fit for selected event: available, no availability set, conflict unknown, hold/booked.
- Capacity fit for selected guest count when known.
- Starting price/package range or price tier with clear meaning.
- Review average and review count, not just average.
- Response SLA/last response indicator.
- Contract/payment readiness badge: can receive request, can submit proposal, contract-ready, payment setup manual-safe.
- Primary CTA: View details / Add to shortlist / Request booking, depending on event context.
- If unverified: copy-only lead, invite/copy action, no shortlist/request CTA until real listing exists.

Current state:

- Card only shows title, city, optional rating average, and price tier.
- Event context is preserved into detail but no card-level selected-event fit is displayed.

### Detail requirements

Listing detail should show:

- Header: name, category/type, location/service area, verified definition, last updated.
- Trust: OneHub status, profile completeness, response SLA, response history once available, org/provider identity.
- Media: hero, gallery, captions.
- About: provider/venue story, specialties, event types served.
- Packages/offers/spaces: names, included scope, price/range, capacity, notes.
- Availability: selected event date fit, raw availability slots, blackout/notice rules, max events/day.
- Policies: deposit, final due, cancellation, reschedule, travel/service area.
- Reviews: rating average + count + selected reviews, with no overclaiming when empty.
- Actions: add/remove shortlist, request booking, return to event, invite provider if unverified, save notes.
- Guardrails: if no event context, explain that user must select/create event and provide deep link to event creation/workspace.

Current state:

- Detail shows basic media/about/tags/availability/reviews plus shortlist/request buttons.
- Detail does not render offers even though queried.
- Detail does not fetch provider org profile JSON/policies/response preferences.
- No selected-event fit computation is visible.

### Requestable requirements

A request should include or prefill:

- Event id/name/date/location/guest count.
- Selected listing/package/space.
- Requested start/end with event date default.
- Planner/client contact prefilled when authenticated.
- Budget or requested quote range, if available.
- Message/scope prompt with event context summary.
- A clear “provider will respond in/next step” expectation only when supported by provider SLA.

Current state:

- Request form is generic and manually entered.
- API validates event ownership and date order but does not check provider availability/capacity/policies.

### Responsive requirements

Provider dashboard should support:

- Accept/decline/hold/quote/request-more-info actions.
- Message thread creation or link to the correct thread.
- Status transitions persisted on `BookingRequest`.
- SLA indicators and overdue follow-up state.
- Provider-backed proposal creation from a booking request.
- Buyer-side notification/visibility of provider response.

Current state:

- Dashboards display recent requests and safe copy.
- No inspected provider action persists lead status or proposal response.

### Contract-ready requirements

Before OneHub can beat directories, provider detail/lead flow must show:

- Provider can submit provider-backed proposal from request.
- Proposal includes scope, line items, milestones, payment schedule, policy terms, provider/listing/event context, and submitted timestamp.
- Buyer approval remains blocked for draft/planner-generated proposals.
- Accepted provider-backed proposal can generate contract without losing context.
- Payment remains setup/readiness/manual-safe until approved gates are met.

Current state:

- Existing scorecard and prior commercial audit identify provider-backed proposal handoff as the weakest point.
- Marketplace/request flow currently stops at `BookingRequest` creation and dashboard display.

## 4. Event-context preservation requirements

Must preserve across every discovery/action route:

- `eventId` for authorization and persistence.
- `eventSlug` for return route.
- `eventName` for visible user confidence.
- `returnTo` sanitized through `safeInternalReturnTo`.
- Event date/start/end.
- Event venue city/state/location.
- Guest count.
- Event type.
- Budget/range if known.
- Source path: pro planner, DIY planner, client, admin impersonation where applicable.

Current confirmed preservation:

- Marketplace and listing detail preserve `eventId`, `eventSlug`, `eventName`, and `returnTo`.
- Detail page gates shortlist/request action on `eventId`.
- Request API binds created request to the authorized event.

Current gaps:

- `/marketplace` ignores any `location` query added by Pro event workspace URL construction; `searchParams` type accepts only eventId/eventSlug/eventName/returnTo.
- Date, guest count, event type, budget, and selected package/space are not carried into listing cards/detail/request modal.
- `/explore/vendors` richer search does not preserve selected-event context into marketplace profile links.
- Request success closes modal and refreshes, but does not route user back to event request list or show a durable request detail link.

## 5. Tests/smokes needed

Read-only recommended smokes for Sentinel/Forge after implementation:

1. Event-attached marketplace continuity smoke.
   - Start at Pro event workspace.
   - Click Source vendors.
   - Confirm marketplace banner names selected event.
   - Open listing.
   - Confirm detail banner, Back to event, shortlist, and request CTAs preserve event context.

2. Main marketplace actionability smoke.
   - With listings present, confirm cards show type/category/location/verified/availability/price/review count/response signal.
   - With no listings, confirm empty state offers narrow next action without false marketplace scale claims.

3. Listing detail trust smoke.
   - Seed vendor and venue records with services/spaces/payments/availability/media/notifications JSON.
   - Confirm detail renders packages/spaces, policies, availability fit, response SLA, and verification copy.

4. Shortlist persistence smoke.
   - Add real listing to selected event shortlist.
   - Refresh detail and event workspace.
   - Confirm Added state and event shortlist row survive refresh.
   - Confirm unverified/copy-only leads cannot be shortlisted.

5. Booking request smoke.
   - Submit request with event context.
   - Confirm required validation, date-order validation, and success state.
   - Confirm request appears in buyer `/requests` and provider dashboard with correct event/listing/contact/message/guest/date fields.

6. Provider lead action smoke.
   - Provider opens lead dashboard.
   - Accept/decline/hold/quote/request-info actions persist status.
   - Buyer sees provider response.
   - Provider can create provider-backed proposal from request.

7. Availability/capacity guard smoke.
   - Request unavailable date, too-low notice, over-capacity event, or outside service area.
   - Confirm UI warns before submit or server blocks with useful copy.

8. Event context regression smoke for `/explore/vendors`.
   - Launch richer vendor search from an event.
   - Confirm search filters initialize from event context and View Profile preserves event return context.

9. Role/access smoke.
   - Buyer can manage own event request.
   - Unrelated authenticated user cannot create request for someone else’s event.
   - Provider sees only leads for owned/admin-accessible listings.

10. Contract-readiness gate smoke.

- Booking request alone must not show as vendor-ready proposal.
- Provider-submitted proposal becomes non-draft/provider-backed.
- Buyer cannot approve non-provider-backed drafts.
- Payment remains locked until provider-backed proposal -> accepted -> contract -> required signatures.

## 6. Prioritized Forge slice list

### P0 — Connect provider profile to marketplace listing truth

Goal: Make provider onboarding produce buyer-visible trust detail instead of hidden organization JSON.

Narrow work:

- Decide whether provider onboarding also creates/updates a primary `Listing`, or whether listing management must be completed as a required post-onboarding step.
- Render provider org profile fields on listing detail: contact, about, services/spaces, availability rules, policies, media, response preference.
- Make `Create Listing` in `/marketplace/manage` an actual route/action or clearly mark listing creation as not yet available.

Why first: Without this, provider profile work does not make marketplace results more trustworthy.

### P1 — Upgrade marketplace cards from directory cards to actionability cards

Goal: Cards answer “real, relevant, available, requestable?” before click.

Narrow work:

- Add type/category, review count, verified/on-platform badge, starting offer/price range, selected-event availability fit, response SLA, and requestability state.
- Add basic filters/sort on `/marketplace`: category, type, location/state, price, availability/event date, verified status.
- Reuse or merge useful `/explore/vendors` filters into the canonical event-attached marketplace path.

### P2 — Render offers/packages/spaces and selected-event fit on detail

Goal: Listing detail should support pilot buying confidence.

Narrow work:

- Render `offers` already included by listing detail query.
- Fetch org profile JSON needed for vendor services or venue spaces.
- Show selected-event fit: date, location, guest count/capacity, service area, blackout/min notice warnings.

### P3 — Make booking request event-smart

Goal: Stop asking planners to re-enter known event context and send providers richer leads.

Narrow work:

- Pass event name/date/location/guest count into the modal.
- Prefill start/end from event dates when available.
- Show selected package/space if chosen.
- Include event context summary in provider dashboard lead cards.
- Add request success link back to event workspace/request list.

### P4 — Add provider lead actions and provider-backed proposal handoff

Goal: Convert discovery/request into the differentiator OneHub can beat directories on.

Narrow work:

- Add provider actions: accept/decline/hold/quote/request-more-info.
- Persist status changes on `BookingRequest` with audit/activity.
- Add “Create provider-backed proposal” from request with listing/event/provider context.
- Ensure buyer approval is blocked until provider-submitted evidence exists.

### P5 — Harden verification and response semantics

Goal: Avoid overclaiming trust.

Narrow work:

- Define badges: On-platform, Profile complete, Pilot verified, Response SLA, Contract-ready, Payment setup/manual-safe.
- Add copy explaining what each badge means and does not mean.
- Track/display last updated and response SLA source.
- Keep unverified leads copy-only with invite/copy actions only.

### P6 — Buyer/provider request visibility cleanup

Goal: Make sent/received booking states understandable.

Narrow work:

- Rename/copy separate buyer “Sent booking requests” from provider “Lead queue.”
- Update `/requests` empty state and row actions.
- Add detail/status page or drawer for a booking request.
- Link vendor/venue lead rows to the same durable request record.

## User-facing impact summary

If fixed, users will see a marketplace that feels materially better than a directory because every provider card/detail can answer fit, trust, availability, requestability, provider responsiveness, and contract readiness in context of the active event.

If left as-is, OneHub risks looking like a thin directory plus a request form: promising event-context continuity, but not yet proving provider reliability, availability, or commitment enough to justify “beat-the-market” positioning.

## Narrow next action for Atlas

Route Forge for P0 + P1 as the smallest useful Phase 3-4 slice: connect provider profile data to public listing detail and upgrade marketplace cards/filters to show trust/actionability signals while preserving selected-event context.

Then route Forge for P4 provider-backed proposal handoff before expanding into payment/live operations. Route Sentinel only after implementation for focused smokes listed above.

No founder escalation is required for these read-only audit findings or the proposed profile/marketplace UI/data-display hardening. FOUNDER ESCALATION REQUIRED if scope expands into public launch, live Stripe/payment activation, legal claims, real outbound email/SMS, production credential changes, billing settings, or irreversible production data changes.
