# W1 Steward map — Vendor/Venue Reliability backend/data/security workflow

Task: `t_cb370ff4`
Date: 2026-08-28
Owner lane: Steward
Scope: read-only backend/data/security/payment map for Workflow 1 Vendor/Venue Reliability.

Boundary: No product source edits were made. This report does not approve public launch, production changes, live payments, billing, credentials, public exposure, legal claims, or final QA. Sentinel retains veto.

## 1. Backend or structural scope reviewed

Business loop requested by Atlas:

1. Provider profile -> provider org/profile persistence.
2. Provider profile -> canonical marketplace listing persistence.
3. Event-aware marketplace search -> only authorized event context may drive shortlist/request.
4. Shortlist/request -> event/listing/org/contact/date persistence.
5. Provider sees lead -> provider-side org/listing-scoped visibility.
6. Provider response -> quote/proposal/provider-backed evidence.
7. Contract/payment path -> provider evidence, acceptance, signature, Stripe/escrow/payment state gates.

## 2. Evidence examined

Primary schema and persistence:

- `apps/web/prisma/schema.prisma:71-121` — `Organization` stores provider profile fields, profile JSON, `profileStatus`, `stripeConnectAccountId`, listings, booking requests, proposals, notifications, and vendor relationships.
- `apps/web/prisma/schema.prisma:341-352` — `ShortlistItem` persists `(eventId, listingId)` with a unique constraint.
- `apps/web/prisma/schema.prisma:487-524` — `Listing` stores provider/venue marketplace records, contact, location, capacity, rating, availability, offers, proposals, and booking requests.
- `apps/web/prisma/schema.prisma:568-589` — `BookingRequest` stores lead/request data by buyer org, event, listing, contact, dates, status, quote, and notes.
- `apps/web/prisma/schema.prisma:626-682` — `Proposal`, line item, and milestone data support provider quotes and payment schedules.
- `apps/web/prisma/schema.prisma:695-831` — `Contract`, `PaymentIntent`, `Transaction`, `EscrowAccount`, and `Payout` support the guarded commercial path.
- `apps/web/prisma/schema.prisma:457-471` and `213-226` — `Activity` and `AuditLog` provide evidence trails.

Auth/RBAC and backend helpers:

- `apps/web/src/server/lib/access.ts:24-57` — org membership and event access helpers.
- `apps/web/src/server/lib/access.ts:66-92` — event management and assignee authorization helpers.
- `apps/web/src/server/lib/access.ts:115-151` — thread access includes participant, buyer-org, and listing-org paths.
- `apps/web/src/lib/rbac.ts:179-193` — `canManageEvent` permits admin, org owner, planner-created event, or non-planner org members.
- `apps/web/src/lib/rbac.ts:423-452` — `canViewEvent` isolates planners and blocks vendor/venue event viewing by default.
- `apps/web/src/lib/rbac.ts:543-599` — vendor/venue org profile and listing edit checks.
- `apps/web/src/lib/rbac.ts:607-646` — commercial proposal/contract detail access checks for buyer org, seller listing org, and signers.

Workflow routes and server code:

- `apps/web/src/app/api/providers/profile/route.ts:85-275` — profile publish/draft route; authenticated publish updates user role, creates/updates provider org, and syncs one primary listing.
- `apps/web/src/lib/marketplace-profile.ts:214-249` — profile-to-listing mapping for provider type, category, contact, location, capacity, and media.
- `apps/web/src/app/api/vendors/search/route.ts:22-225` and `apps/web/src/server/routers/search.ts:6-70` — marketplace/search query paths.
- `apps/web/src/app/api/shortlist/route.ts:23-55` and `57-180` — REST shortlist read/write authorization and persistence.
- `apps/web/src/app/api/shortlist/add/route.ts:14-117` — alternate AI-source shortlist add path with event manage authorization.
- `apps/web/src/app/api/bookings/request/route.ts:6-138` — visible booking-request REST creation route.
- `apps/web/src/server/routers/bookingRequest.ts:10-128` — tRPC request, provider status, and quote/proposal handoff router.
- `apps/web/src/app/vendor/dashboard/page.tsx:7-179` and `apps/web/src/app/venue/dashboard/page.tsx:8-171` — provider lead readback queries.
- `apps/web/src/app/(app)/requests/page.tsx:23-150` — request list visibility for buyer/provider org membership.
- `apps/web/src/lib/provider-backed-proposal.ts:19-42` — provider-backed proposal evidence helper requiring listing context and `PROVIDER_PROPOSAL_SUBMITTED` activity.
- `apps/web/src/app/api/proposals/[id]/approve/route.ts:18-143` and `apps/web/src/server/routers/proposal.ts:131-208` — provider-backed approval gates.
- `apps/web/src/app/api/contracts/from-proposal/route.ts:18-248` — contract generation requires accepted provider-backed proposal evidence and sets buyer/seller org IDs.
- `apps/web/src/app/api/payments/create-intent/route.ts:24-322` — payment intent creation requires buyer authorization, payable contract/milestone state, provider evidence, acceptance, Stripe metadata, and idempotency.
- `apps/web/src/app/api/payments/confirm/route.ts:14-151` and `apps/web/src/lib/payments/confirm-payment.ts:120-333` — payment confirmation checks payer, Stripe metadata/amount/currency, acceptance proof, escrow, transaction, holdback, and activity effects.

Tests/reports checked as supporting evidence:

- `apps/web/tests/marketplace-provider-actionability.test.tsx`
- `apps/web/tests/booking-request-provider-proposal.test.ts`
- `apps/web/tests/vendor-dashboard-workflow.test.tsx`
- `apps/web/tests/venue-dashboard-workflow.test.tsx`
- `apps/web/tests/proposal-provider-handoff.test.tsx`
- `apps/web/tests/proposal-trpc-accept-guard.test.ts`
- `apps/web/tests/contract-from-provider-backed-proposal.test.ts`
- `apps/web/tests/contract-readiness-clarity.test.tsx`
- `apps/web/tests/payment-intent-lifecycle.test.ts`
- `apps/web/tests/payment-release-guardrails.test.ts`
- `reports/seven-workflows/w1-scout-map.md`

## 3. Correctness verdict

PARTIAL / RISK.

The data model is strong enough to represent the W1 loop, and several critical commercial gates already exist: event manage authorization on shortlist/request, seller-side lead visibility by listing org, provider-backed proposal evidence, accepted proposal state, contract signature gates, payment acceptance records, Stripe metadata checks, escrow updates, transactions, holdbacks, and activity records.

The workflow is not structurally closed because the visible request path and the server-side provider response path are split. The visible REST booking request route creates the `BookingRequest` row but does not record activity or notify provider org users. The tRPC booking request router records activity, notifies provider admins, and can create provider-backed proposals, but no inspected provider dashboard component calls those mutations. This means the database can support proof, but the visible W1 loop can still stop after a lead row without auditable response evidence.

## 4. Exact risks and blockers

### R1 — Provider profile publish can mutate global user role without provider-role guard

Evidence:

- `apps/web/src/app/api/providers/profile/route.ts:100-143` and `197-202` update `User.role` to `VENDOR` or `VENUE` on non-draft publish.
- The route requires authentication for publish, but does not restrict which existing roles may convert into provider roles.

Risk:

Any authenticated user who reaches the endpoint can convert their global role to vendor/venue and create a provider org. This may be acceptable for open onboarding, but it is an unsafe assumption for a guarded private MVP unless Atlas explicitly wants self-service provider role conversion.

Implementation constraint:

Provider role conversion must be behind an explicit allowed-role policy or invite/admin-approved provider onboarding gate. If self-service remains approved, record the decision as a product/security rule and audit the conversion.

### R2 — Provider profile/listing sync lacks durable evidence rows

Evidence:

- `apps/web/src/app/api/providers/profile/route.ts:137-180` and `197-243` update/create orgs and sync a primary listing.
- No `recordActivity`/`recordAudit` call is present in the inspected profile publish/listing sync path.

Risk:

The system can show a provider listing, but cannot prove when the provider published, which listing was synced, or whether fields changed from draft to published. This weakens the “evidence recorded” requirement before the first marketplace lead.

Implementation constraint:

Profile publish must atomically record `PROVIDER_PROFILE_PUBLISHED` and `LISTING_SYNCED_FROM_PROFILE` evidence with actor, org, listing, profileStatus, providerType, and non-sensitive field-change summary.

### R3 — Primary listing sync updates the earliest listing for the org

Evidence:

- `apps/web/src/app/api/providers/profile/route.ts:63-72` finds the first listing by `orgId` ordered oldest and updates it.
- `Listing` has no `isPrimary`, `source`, `profileSyncedAt`, or provider profile linkage field in `schema.prisma:487-524`.

Risk:

For providers with multiple services/spaces, profile publish may overwrite the wrong listing or collapse distinct supply into one listing. This creates data integrity risk when marketplace search, shortlist, request, quote, and payment all depend on the chosen listing.

Implementation constraint:

Add an explicit canonical profile listing contract: one `isPrimary/source=PROFILE_SYNC` listing per provider org, or a separate profile-listing relation. Never infer primary by earliest listing once providers can have multiple listings.

### R4 — Visible booking request route persists the lead but does not record activity or notify provider

Evidence:

- `apps/web/src/app/api/bookings/request/route.ts:114-130` creates the `BookingRequest` and returns `{ success, id }`.
- No `recordActivity` or provider `Notification` write occurs in that route.
- `apps/web/src/server/routers/bookingRequest.ts:34-38` records `BOOKING_REQUEST_CREATED` and notifies provider org owner/admin users, but the inspected visible modal path uses the REST route per `reports/seven-workflows/w1-scout-map.md:142-152`.

Risk:

The buyer can submit a request and the provider dashboard may later query it, but the system does not produce proactive provider notification or event activity evidence on the visible path. This is a partial closure failure.

Implementation constraint:

The visible request endpoint must either call the same service as tRPC `bookingRequest.create` or share a single `createBookingRequest` backend function that writes: `BookingRequest`, buyer-side `Activity`, provider-side `Notification`, and safe request context in one transaction.

### R5 — tRPC `bookingRequest.listForOrg` exposes booking requests to any caller by org slug

Evidence:

- `apps/web/src/server/routers/bookingRequest.ts:50-54` reads an org by slug and returns booking requests for that org without calling `getCurrentUser`, `protectedProcedure`, `requireOrgMembership`, or equivalent authorization.

Risk:

If reachable through the app router client, any caller who knows or guesses an org slug can read booking requests including contact details, event details, and messages for that org. This is a backend privacy risk independent of whether current UI uses the procedure.

Implementation constraint:

Change `listForOrg` to `protectedProcedure` and require membership/owner/admin access to the org before returning rows. Do not expose contactName/contactEmail/contactPhone/message unless the caller is buyer-org member, seller listing-org member, or admin.

### R6 — Booking request creation does not enforce availability/capacity/service fit

Evidence:

- `apps/web/src/app/api/bookings/request/route.ts:86-112` validates dates and positive guests.
- It verifies listing existence at `72-84` but does not include listing capacity, `AvailabilitySlot`, org availability JSON, service area, blackout, min notice, or budget constraints.
- Marketplace fit labels are calculated in `apps/web/src/lib/marketplace-profile.ts:190-207`, but the route does not enforce them.

Risk:

A request can be created against an unavailable or capacity-mismatched listing. That is acceptable for “request only” if explicitly labeled, but unsafe if the workflow implies reliability, hold, or booking readiness.

Implementation constraint:

For W1 closure, classify request semantics exactly: either “inquiry only, provider must confirm” or enforce hard gates for capacity/date/service area. If any UI says hold/available/bookable, the API must enforce the same predicate server-side.

### R7 — Provider dashboard reads leads but lacks backend-connected response actions in visible components

Evidence:

- `apps/web/src/app/vendor/dashboard/page.tsx:47-99` and `apps/web/src/app/venue/dashboard/page.tsx:44-92` query booking requests by owned listing IDs.
- `apps/web/src/components/vendor/Dashboard.tsx:292-399` and `apps/web/src/components/venue/Dashboard.tsx:293-400` display lead rows and contact details.
- `apps/web/src/server/routers/bookingRequest.ts:55-126` has `setStatus` and `quote` mutations, with quote creating a provider-backed `Proposal` and `PROVIDER_PROPOSAL_SUBMITTED` activity, but the inspected dashboard components only route between local panels.

Risk:

Providers can see the lead but cannot complete response, status, quote, or provider-backed proposal evidence from the visible dashboard. This is the largest structural closure gap.

Implementation constraint:

Provider lead rows need a durable detail/action path wired to authenticated backend actions: set hold/decline/withdraw/quoted, submit quote, create provider-backed proposal, and write `PROVIDER_PROPOSAL_SUBMITTED` evidence. UI-only panel navigation is insufficient.

### R8 — Provider quote/proposal handoff stores buyer org as `Proposal.orgId`, which conflicts with provider-dashboard contract filtering

Evidence:

- `apps/web/src/server/routers/bookingRequest.ts:80-115` creates a provider quote proposal with `orgId: req.orgId` where `req.orgId` is the buyer/planner org.
- `apps/web/src/app/vendor/dashboard/page.tsx:104-118` and `apps/web/src/app/venue/dashboard/page.tsx:94-111` filter non-admin contracts with `proposal: { orgId: org.id }`, where `org.id` is the provider org.
- `apps/web/src/app/api/contracts/from-proposal/route.ts:209-227` separately sets `buyerId = proposal.event.orgId` and `sellerId = listing.orgId` on `Contract`.

Risk:

Accepted contracts from marketplace/provider proposals may not appear on provider dashboards because the dashboard filters by buyer-owned `Proposal.orgId` instead of contract `sellerId` or proposal listing org. This can break provider payment/readiness visibility.

Implementation constraint:

Treat `Proposal.orgId` as buyer/event org unless schema is changed. Provider-side contract queries must filter by `Contract.sellerId` or `proposal.listing.orgId`, not `proposal.orgId`.

### R9 — Contract and payment gates are materially safer, but payment intent buyer authorization depends on `contract.buyerId` correctness

Evidence:

- `apps/web/src/app/api/contracts/from-proposal/route.ts:209-227` sets buyer/seller org IDs at contract creation.
- `apps/web/src/app/api/payments/create-intent/route.ts:76-87` allows payment creation only when `contract.buyerId === contract.event.orgId` and the user owns/belongs to the event org.
- The same route enforces payable contract state, provider-backed proposal evidence, milestone/amount matching, acceptance, Stripe metadata, and idempotency at `89-289`.

Risk:

The payment path is guarded, but correctness hinges on all contract creation paths setting `buyerId`/`sellerId` consistently. Legacy or tRPC accept paths that create contracts without buyer/seller IDs will correctly fail payment later, but can strand accepted proposals in partial commercial states.

Implementation constraint:

All contract creation paths must share one service that sets buyerId, sellerId, bookingClassification, fee profile, status, and provider evidence checks. Do not allow duplicate legacy contract creation logic.

### R10 — Activity evidence is split across `Activity` and `AuditLog` without a single W1 proof contract

Evidence:

- `ShortlistItem`, `BookingRequest`, `Proposal`, `Contract`, `PaymentIntent`, `Transaction`, `Activity`, and `AuditLog` all exist in schema.
- `provider-backed-proposal.ts:31-42` gates provider-backed status only on `Activity` action/target/org/event.
- Vendor relationships use `recordAudit` in `apps/web/src/app/api/pro-planner/vendors/relationships/route.ts:86-96`, while shortlist/request/profile paths use either `Activity` or no durable evidence.

Risk:

Different workflow steps write different evidence tables, and some visible steps write none. Full workflow proof can become fragile because downstream checks depend on one action string rather than a normalized W1 event ledger.

Implementation constraint:

Define the W1 evidence contract before implementation: minimum event names, table, actor, orgId, eventId, listingId, bookingRequestId, proposalId, contractId, paymentIntentId, and metadata redaction rules. Each visible state transition must write one canonical evidence row.

## 5. Safe assumptions vs unsafe assumptions

Safe assumptions supported by current code:

- Provider/venue listings can be represented as `Organization` + `Listing` and linked to buyer requests by `BookingRequest.listingId`.
- Shortlist persistence is structurally sound for one event/listing pair because of `@@unique([eventId, listingId])`.
- Provider-side readback can be safely scoped by owned listing IDs when the server query uses the authenticated provider org.
- Provider-backed proposal and payment gates are directionally correct: provider evidence, accepted/converted proposal state, dual-party contract signing, payment acceptance, Stripe metadata matching, and escrow/transaction records are present.

Unsafe assumptions that must not be used to claim closure:

- A visible `BookingRequest` row alone proves provider notification or provider awareness.
- A marketplace fit label proves actual availability, capacity, or service-area eligibility.
- A provider dashboard lead row proves the provider can respond inside OneHub.
- `Proposal.orgId` can identify the seller/provider org for dashboard/payment visibility.
- Profile publish/listing sync is auditable without activity/audit rows.
- Provider role conversion is safe without an explicit gated onboarding policy.

## 6. Exact implementation constraints for W1 closure

1. Create one shared backend service for booking request creation and route both REST and tRPC callers through it.
2. The shared request service must execute in one transaction: authorize buyer event management, verify real listing, create request, record buyer-side activity, notify provider org owner/admin, and return a durable request id.
3. Lock `bookingRequest.listForOrg` behind authenticated org membership or remove it if unused.
4. Add provider lead detail/action endpoints or tRPC calls that verify listing-org ownership before exposing contact/message fields or mutating status/quote.
5. Wire visible provider/venue dashboard actions to those endpoints; response actions must write `Activity` evidence.
6. Make quote submission create provider-backed `Proposal` from the specific `BookingRequest` and write `PROVIDER_PROPOSAL_SUBMITTED` with `bookingRequestId`, `listingId`, and quote amount metadata.
7. Use `Contract.sellerId` or `proposal.listing.orgId` for provider-side contract/payment visibility; never filter provider dashboard contracts by buyer `Proposal.orgId`.
8. Centralize contract creation from provider-backed proposals; remove or gate any legacy path that creates contracts without buyerId/sellerId/provider evidence.
9. Keep live payment activation behind existing guarded Stripe gates. Do not enable live release or provider payout from W1 closure without Atlas/Marlon approval.
10. Define request semantics server-side: either inquiry-only or availability-gated. If any UI claims availability/hold/booking readiness, the API must enforce capacity/date/availability/service-area constraints.
11. Add profile publish/listing sync evidence rows and prevent ambiguous primary listing updates with explicit primary/source fields.
12. Add focused tests for the full backend chain: provider publish -> listing sync evidence -> event-authorized shortlist -> request creation activity/notification -> provider-owned lead read -> provider quote -> provider-backed proposal evidence -> contract/payment gates remain locked until signed/accepted.

## 7. Recommended narrow next action for Atlas

Route Forge for a narrow W1 backend closure slice:

1. First fix the privacy leak: protect or remove `bookingRequest.listForOrg`.
2. Then unify REST/tRPC booking request creation behind one authorized service that records activity and provider notification.
3. Then wire provider dashboard lead action(s) to provider-owned status/quote mutations and filter provider contracts by seller/listing org.
4. Add W1 backend tests proving the evidence chain and RBAC boundaries.

No founder escalation is required for these read-only findings or for the narrow guarded backend closure implementation. FOUNDER ESCALATION REQUIRED before self-service provider onboarding policy changes, public launch claims, live Stripe/payment release, payout activation, production credential/env/billing/domain/public-exposure changes, or legal approval claims.
