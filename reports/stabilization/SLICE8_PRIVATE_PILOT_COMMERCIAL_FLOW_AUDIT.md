# Slice 8 Phase 1: Private-Pilot Commercial Trust-Flow Audit

Date: 2026-08-20
Auditor: Scout
Scope: Read-only current-state audit of the invite-only private-pilot money/time protection flow.
Canonical source: `/root/.hermes/workspaces/onehub/repo`, branch `atlas/slice7-canonical-deploy`, HEAD `d84b3ac fix(pro-planner): guard dashboard data fallback`.
Canonical user-facing URL: `https://www.1hubevents.com`.

Important boundary: This audit does not imply public launch approval, live-payment approval, legal approval, production setting changes, or release approval. No code, env vars, DB data, billing, infrastructure, credentials, production settings, or live payments were changed.

## Verdict

PARTIAL.

OneHub currently has a recognizable private-pilot commercial trust spine: selected event entry, marketplace discovery, event shortlist, booking requests, proposal records, proposal acceptance capture, contract generation/signing records, payment-intent guardrails, held-funds status concepts, and admin trust-risk visibility. The biggest private-pilot blocker is that the proposal step is not yet a trustworthy vendor-backed commercial handoff: AI-generated proposals are created as `DRAFT`, the Pro event workspace explicitly says drafts are not vendor-ready, and the vendor booking request/quote path does not clearly convert into a non-draft proposal submitted by the provider.

## Evidence reviewed

Code inspection:
- Event creation: `apps/web/src/app/events/new/page.tsx:107-177`, `apps/web/src/app/api/events/create/route.ts:221-548`.
- Selected-event commercial workspace: `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx:284-384`, `341-393`, `510-573`, `722-776`, `897-1087`.
- DIY selected-event vault: `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx:35-219`, `250-267`.
- Marketplace/listing handoff: `apps/web/src/app/marketplace/page.tsx:17-90`, `apps/web/src/app/marketplace/[slug]/page.tsx:20-132`.
- AI/verified sourcing and shortlist: `apps/web/src/components/vault/AiSourceVendorsVenuesPanel.tsx:77-127`, `apps/web/src/app/api/ai/source-vendors-venues/route.ts:87-282`, `apps/web/src/app/api/shortlist/route.ts:57-180`.
- Booking request path: `apps/web/src/components/bookings/BookingRequestModal.tsx:39-77`, `apps/web/src/app/api/bookings/request/route.ts:6-139`, `apps/web/src/app/(app)/requests/page.tsx:23-140`.
- Proposal generation/approval: `apps/web/src/components/proposals/GenerateProposalButton.tsx:23-69`, `apps/web/src/app/api/proposals/generate/route.ts:17-239`, `apps/web/src/components/proposals/ApproveProposalButton.tsx:23-102`, `apps/web/src/app/api/proposals/[id]/approve/route.ts:14-123`, `apps/web/src/components/proposals/ProposalPageClient.tsx:174-203`.
- Contract generation/signing: `apps/web/src/components/contracts/GenerateContractButton.tsx:22-57`, `apps/web/src/app/api/contracts/from-proposal/route.ts:14-236`, `apps/web/src/components/contracts/ContractPageClient.tsx:15-193`, `apps/web/src/components/contracts/ContractSignatureForm.tsx:31-139`, `apps/web/src/app/api/contracts/[id]/sign/route.ts:9-211`.
- Payment readiness/status: `apps/web/src/components/payments/ContractPaymentPanel.tsx:51-160`, `apps/web/src/components/payments/PaymentModal.tsx:50-224`, `apps/web/src/app/api/payments/create-intent/route.ts:22-304`, `apps/web/src/app/api/payments/confirm/route.ts:47-349`, `apps/web/prisma/schema.prisma:793-890`, `832-867`.
- Admin oversight: `apps/web/src/app/(app)/admin/overview/page.tsx:48-171`, `apps/web/src/app/(app)/admin/verification/page.tsx:12-172`.
- Vendor/venue value surfaces: `apps/web/src/components/vendor/Dashboard.tsx:90-255`, `apps/web/src/components/venue/Dashboard.tsx:91-220`.

Safe probes and validation:
- `https://www.1hubevents.com/` returned HTTP 200.
- `https://www.1hubevents.com/marketplace` returned HTTP 200.
- `https://www.1hubevents.com/events/new` returned HTTP 200.
- `pnpm run typecheck` passed.
- `pnpm run test` passed: 43 test files, 259 tests.
- `pnpm run lint` exited 0 with existing warnings only: 342 warnings, 0 errors.

Not performed:
- No authenticated canonical browser smoke with seeded/demo users; no credentials were used or printed.
- No DB writes, no payment attempts, no Stripe live/test confirmation, no env inspection.

## Step-by-step PASS / FAIL / UNKNOWN

| Step | Status | Current support | Friction / blocker |
| --- | --- | --- | --- |
| 1. Client/DIY event creation or selected event entry | PASS | DIY/pro/admin event creation is implemented through `/events/new` and `/api/events/create`. The API validates required event details, restricts creation to `DIY_PLANNER`, `PRO_PLANNER`, and `ADMIN`, creates baseline budget lines, milestones, and checklist items, and can attach CLIENT stakeholders for pro-planner client intake. Selected-event entry is role-routed through role-specific vault helpers. | CLIENT users cannot directly create planner events, which appears intentional for current role safety. Private-pilot client participation depends on being attached/shared by a planner rather than creating the commercial event themselves. |
| 2. Provider/venue discovery or shortlist/request handoff | PASS | Marketplace browsing preserves selected event context; listing pages expose event-specific shortlist and booking-request actions. AI sourcing returns verified on-platform listings plus deterministic unverified leads. Shortlist is persisted with event/listing authorization. Booking request creation requires selected event, listing, contact, dates, and event manage permission. | AI sourcing has a client fallback UI with a sample verified listing id (`fallback-1`) that would not be a real listing if the sourcing API fails. This is a UX/trust risk if surfaced in private pilot. |
| 3. Proposal creation/approval path | FAIL | AI proposal generation exists and persists sections, line items, milestones, booking classification, and fee profile. Approval captures commercial acceptance and moves proposal to `ACCEPTED`. | The event workspace explicitly treats generated `DRAFT` proposals as not vendor-ready. The manual proposal page is a placeholder. The booking request/quote path does not clearly convert provider response into a provider-backed non-draft proposal. Current buyer-side generation can create and approve a proposal, but it does not prove the vendor/venue actually proposed or accepted the commercial scope. |
| 4. Contract generation/signing readiness boundaries | PASS | Contract generation requires an accepted/converted proposal and listing context, creates buyer/seller org ids, and records fee profile/platform fee. Signing requires authenticated buyer-side or seller-side authority, signer email matching the authenticated user, acceptance version capture, and updates `PARTIALLY_SIGNED` / `FULLY_SIGNED` from buyer/seller signature state. | Contract delivery is still thin: generated contracts start as `DRAFT`, no explicit send-for-signature CTA was found on the primary contract page, and legal sufficiency is not implied. |
| 5. Payment-readiness/status path, including manual status/live-payment guardrails | PASS | Payment entry is hidden until buyer-side user plus contract status `FULLY_SIGNED` or `IN_PAYMENT`. Payment-intent creation enforces buyer-side authorization, payable contract/milestone states, seller payee existence, server-derived totals, acceptance version, Stripe `allow_redirects: never`, idempotency, and local/Stripe amount metadata checks. Confirmation verifies payer, acceptance proof, Stripe status, updates `PaymentIntent`, milestone `IN_ESCROW`, escrow balance, transaction, holdback evaluation, and activity logs. | Live payment execution was not tested. If Stripe publishable/secret keys are absent or live mode is not approved, the UI/API correctly fail as not configured; this audit does not approve turning on live payments. |
| 6. Admin oversight/trust risk visibility | PASS | Admin overview exposes an “Admin trust & risk command center” with disputes, refunds, active holdbacks, pending payouts, abuse reports, and verification/user-role routes. Verification lists refunds, disputes, holdbacks, payouts, and override history with searchable ids. | Oversight is visibility/review oriented; manual release/override correctness remains outside this read-only audit. |
| 7. Role-specific value | PASS | DIY/pro planners can create/manage selected events; pro planner has a commerce spine and command center; vendors/venues have lead/inquiry dashboards and payment-readiness panels; admin has trust-risk visibility. | CLIENT value is mainly stakeholder/share and selected-event visibility rather than direct commercial self-serve creation. Vendor/venue “make money” value depends on fixing the proposal handoff so provider-backed scope is trustworthy. |

## Top private-pilot money/time risk blockers

1. HIGH — Proposal handoff is not provider-backed enough for trust.
   - Evidence: Pro workspace counts only non-draft proposals as proposal state and says drafts are not vendor-ready (`pro/planner/vault/[eventSlug]/page.tsx:357-362`, `986-1004`). AI proposal generation persists `status: "DRAFT"` (`api/proposals/generate/route.ts:177-188`). Booking request quote stores request `status: "QUOTED"` / `quoteCents`, but the audited request path does not create a proposal from provider response.
   - User impact: Client/pro planner could approve a proposal that was generated internally rather than submitted/confirmed by the vendor/venue. This risks money disputes and wasted coordination time.

2. MEDIUM-HIGH — Sourcing fallback can show a fake verified vendor if the API fails.
   - Evidence: `AiSourceVendorsVenuesPanel` fallback includes `kind: "VERIFIED"`, `listingId: "fallback-1"`, and “Sample Verified Vendor” (`AiSourceVendorsVenuesPanel.tsx:49-75`), while shortlist API requires a real listing id (`api/shortlist/route.ts:123-135`).
   - User impact: Private-pilot users may see “Verified” trust language for an item that cannot be shortlisted/requested, reducing confidence.

3. MEDIUM — Contract signing is functionally guarded but not a polished sent-signature workflow.
   - Evidence: Contract generation creates `status: "DRAFT"` (`api/contracts/from-proposal/route.ts:202-215`). Signing endpoint supports buyer/seller signatures and status updates (`api/contracts/[id]/sign/route.ts:89-203`), but the primary contract page shows direct signature form/payment gating rather than a clear “sent for signature” workflow (`ContractPageClient.tsx:147-190`).
   - User impact: A pilot user may not understand who signs next or whether the contract has actually been issued.

4. MEDIUM — Live-payment readiness is guarded but unproven on canonical.
   - Evidence: Payment entry and API guardrails exist (`ContractPaymentPanel.tsx:143-160`, `api/payments/create-intent/route.ts:74-98`, `166-296`, `api/payments/confirm/route.ts:128-165`, `167-323`). This audit did not inspect credentials or attempt live/test payments by scope.
   - User impact: The team can safely explain payment readiness, but should not promise live payment collection until Forge/Sentinel verify the configured environment and legal/payment approval path.

5. LOW-MEDIUM — CLIENT direct commercial creation remains intentionally limited.
   - Evidence: `/api/events/create` blocks non-planner creator roles (`api/events/create/route.ts:230-240`) but can attach CLIENT stakeholders (`301-405`).
   - User impact: Good for role safety, but marketing/demo language should avoid implying CLIENT self-serve commercial launch unless the client path is intentionally added.

## Smallest next Forge fix slice

Recommended next implementation slice:

“Provider-backed proposal handoff hardening.”

Acceptance target:
1. Add an explicit vendor/venue response-to-proposal path from a booking request or quote.
2. Persist the resulting proposal as provider-submitted or vendor-ready, not just planner-generated `DRAFT`.
3. Show provider-backed proposal status in the Pro event commerce spine and proposal detail.
4. Prevent proposal approval until the proposal is non-draft and has listing/provider context.
5. Replace or remove the fake verified fallback in sourcing; fallback items should be clearly unverified/copy-only leads and must not carry unusable listing ids.
6. Keep payment hidden until accepted provider-backed proposal -> contract -> dual signature remains satisfied.

Why this slice first: it protects the highest money/time risk before contract/payment work. Without a trustworthy proposal handoff, contract and payment guardrails can still attach to commercially ambiguous scope.

## Recommended Atlas next action

Route the smallest Forge implementation slice above to fix provider-backed proposal handoff and sourcing fallback truthfulness. After Forge implementation, route Sentinel for focused same-scope verification of: request -> provider-backed proposal -> approval -> contract -> signature -> payment-hidden/unhidden state. Public launch, live payment enablement, and legal approval remain out of scope and require founder/legal/payment approval before use.
