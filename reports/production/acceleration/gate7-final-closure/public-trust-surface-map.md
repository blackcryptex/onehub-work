# Gate 7 Public Trust / Legal / Support Surface Map

Generated: 2026-06-04
Profile: Scout
Task: `t_d1b14bbd`
Scope: read-only UX/legal-surface mapping plus this internal report only. No Oracle. No DNS/SSL/infra, credential/API-key, billing, live Stripe/payment, destructive DB/schema/migration, production/public launch, or legal acceptance action was performed.

IMPORTANT: NOT LEGAL-APPROVED / INTERNAL DRAFT.

This report maps where OneHub must expose Terms, Privacy, Support, payment/refund/dispute language, vendor/client obligations, and trust/safety notices before launch. It is not public legal copy, not an approval to launch, and not acceptance text for users.

## Context read

- `reports/production/acceleration/gate7-launch-readiness-no-provision/launch-readiness-checklist.md`
- `reports/production/acceleration/gate7-safe-local-prework/evidence.md`
- `docs/payments.md`
- `docs/legal-exceptions-register.md`

## Route/component files inspected

Public/navigation/support/legal surfaces:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/layout/Footer.tsx`
- `apps/web/src/components/layout/LandingHeader.tsx`
- `apps/web/src/app/terms/page.tsx`
- `apps/web/src/app/privacy/page.tsx`
- `apps/web/src/app/support/page.tsx`
- `apps/web/src/app/help/page.tsx`
- `apps/web/src/app/legal/payments/page.tsx`
- `apps/web/src/app/legal/refunds/page.tsx`
- `apps/web/src/app/legal/disputes/page.tsx`
- `apps/web/src/app/legal/fees/page.tsx`
- `apps/web/src/app/legal/booking-classification/page.tsx`
- `apps/web/src/lib/legal-surface.ts`
- `apps/web/src/components/legal/LegalNotice.tsx`
- `apps/web/src/lib/acceptance-versions.ts`

Signup/onboarding/role entry surfaces:

- `apps/web/src/app/(auth)/signup/page.tsx`
- `apps/web/src/components/onboarding/RoleOnboardingPanel.tsx`
- `apps/web/src/app/providers/start/page.tsx`
- `apps/web/src/app/providers/onboarding/page.tsx`

Commercial action/payment/trust surfaces:

- `apps/web/src/components/proposals/ProposalPageClient.tsx`
- `apps/web/src/components/contracts/ContractPageClient.tsx`
- `apps/web/src/components/contracts/ContractSignatureForm.tsx`
- `apps/web/src/components/payments/ContractPaymentPanel.tsx`
- `apps/web/src/components/payments/PaymentModal.tsx`

## High-level continuity verdict

Verdict: PARTIAL.

OneHub now has visible route anchors for `/terms`, `/privacy`, `/support`, and guarded MVP legal pages under `/legal/*`. Footer and landing-header navigation make Privacy/Terms/Support discoverable, and proposal/contract/payment flows show `LegalNotice` cards with version labels and policy links.

Launch continuity is still not closed because the public legal pages appear to be generic or operational summaries without an explicit NOT LEGAL-APPROVED/public-beta disclaimer, the signup page creates accounts without visible Terms/Privacy acknowledgement, provider publishing has no obligation/trust/safety acknowledgement, support/help cards point several calls back to the same page instead of real support/help destinations, and payment/signature checkboxes do not yet expose full refund/dispute/fee/legal-policy context at the moment of action.

## Public trust surface map

| Surface / moment | What must appear before launch | Current evidence | Gap / friction risk | Narrow correction candidate |
|---|---|---|---|---|
| Global footer | Persistent Terms, Privacy, Support, payment/refund/dispute policy access, support contact, effective/version cue where legally needed. | `Footer.tsx` links `Support`, `Privacy Policy`, `Terms of Service`; contact mail/phone/AI chat appear. | Footer does not link `/legal/payments`, `/legal/refunds`, `/legal/disputes`, `/legal/fees`, or `/legal/booking-classification` directly. Users can only find those through `/terms`. Phone number `1-800-ONEHUB` and AI chat may imply channels that may not exist at launch. | Add a small `Legal` group or expand Resources with Payments, Refunds, Disputes, Fees once copy is legal-approved. Replace/label unsupported phone/chat promises until operationally real. |
| Landing header / public navigation | Easy access to support/privacy/legal before signup and before marketplace actions. | `LandingHeader.tsx` More menu links `Support`, `Help Center`, `Privacy & Terms`. | Header uses one combined `Privacy & Terms` link to `/privacy`; `/terms` is not directly exposed and `/privacy` also contains a Terms section, causing duplicated/ambiguous legal anchors. | Split menu links into `Privacy`, `Terms`, and `Support`; keep legal policy pages in footer or Terms sublinks. |
| Signup / account creation | Terms of Service + Privacy Policy acknowledgement before account creation; role-specific responsibilities note for DIY/pro/vendor/venue/client-invite. | `signup/page.tsx` collects name, email, password, role and submits without visible Terms/Privacy acceptance. | User can create an account without seeing account/legal obligations. Legal acceptance version is not captured here. Role picker says client invite-only/admin internal, but not obligations/safety. | Add non-launch draft checkbox/copy only after legal approval: “By creating an account, I agree to Terms and acknowledge Privacy Policy.” Consider recording `CURRENT_ACCEPTANCE_VERSIONS.account` later. |
| Provider start | Vendor/venue role choice should preview marketplace listing responsibility, accurate business info, support, cancellation/refund expectations, and verification/trust boundaries. | `providers/start/page.tsx` routes signed-in users into vendor/venue onboarding; unauthenticated users to sign-in. | No visible trust/safety or obligation notice before selecting vendor/venue path. | Add an internal-draft notice near the role cards: accurate business info, lawful listings, policy compliance, and support route. |
| Provider onboarding Step 4: Payments & Contracts | Deposit/final due/cancellation/reschedule fields must be framed as vendor/venue policy inputs subject to OneHub Terms, payment/refund/dispute policy, and legal review. | `providers/onboarding/page.tsx` Step 4 has deposit type/value, final due, cancellation policy, reschedule policy fields. | User-authored cancellation/reschedule terms can conflict with platform refund/dispute/held-funds policy; no links to `/legal/refunds`, `/legal/disputes`, `/legal/payments`, or Terms. | Add contextual helper text and links near Step 4. Avoid claiming legal enforceability until legal-approved. |
| Provider onboarding Step 7: Publish | Before publishing a marketplace-visible profile, vendor/venue should acknowledge listing accuracy, response/support obligations, cancellation/refund policy visibility, and compliance with platform rules. | Review & Publish says profile visible to planners, update anytime, start receiving booking requests/leads. | Publish action has no visible obligations or trust/safety acknowledgement. | Add a pre-publish checklist/checkbox once legal-approved: accurate profile, authorized representative, service terms kept current, disputes handled through OneHub policy. |
| Public Terms page | Platform Terms with effective date/version, account rules, commercial actions, provider/client obligations, payment/refund/dispute cross-links, support contact, launch posture. | `/terms/page.tsx` exists and links guarded MVP legal pages. | Copy is generic, includes “personal, non-commercial event planning” which conflicts with OneHub’s vendor/venue/pro-planner commercial platform. `Last Updated` is dynamic date, not a stable effective date/version. No NOT LEGAL-APPROVED marker. | Replace generic terms with legal-approved platform-specific copy. Until then, if public route remains, mark as internal draft/not legal-approved or gate from launch. |
| Public Privacy page | Privacy Policy with effective date/version, data categories, event/vendor/payment data, analytics/cookies, user rights, contact, processors, retention, security limits. | `/privacy/page.tsx` exists and also includes a Terms section. | Combines Privacy & Terms, uses broad “industry-standard security” / “regular security audits” language that may overclaim if not proven. Lacks policy version/effective date and legal approval marker. | Split Privacy from Terms; use legal-approved privacy text and avoid unverifiable security claims. |
| Support page | Real support channels, scope, SLAs, escalation, dispute/refund support routing, emergency/payment incident path. | `/support/page.tsx` has AI chat, email, phone, help center, common questions. | “Start Chat” links to `/support` (self-loop); phone may be placeholder; 24h and Enterprise support claims need operational confirmation. Held funds FAQ lacks links to payment/refund/dispute policy. | Make channels operationally true or label as coming soon/internal. Link held-funds/refunds/disputes FAQs to legal/support policy pages. |
| Help Center | Concrete help articles for account setup, payments, contracts, vendor marketplace, held funds, support escalation. | `/help/page.tsx` lists article names but TODO comments route all article links back to `/help`. | Users face dead ends/self-loops when looking for docs. Contracts & Payments category lacks refund/dispute/legal-policy links. | Add real article routes or disable faux article links; add policy links for payments/refunds/disputes. |
| Payment policy page | Held funds, release controls, fees, refund/dispute links, live-vs-test posture, support escalation, effective/version note. | `/legal/payments/page.tsx` exists. | Summary is short, no legal approval marker, no clear client/vendor obligations, no refund/dispute links, no effective/version cue. | Expand only with legal-approved copy; otherwise keep as internal draft summary. |
| Refund policy page | What can be requested, who reviews, timing, evidence, how refunds interact with contract/proposal terms, payment method limits, support route. | `/legal/refunds/page.tsx` exists. | Too brief for launch; does not state submission path, expected response, evidence requirements, or support/escalation. | Add outline/legal-approved refund details and links from payment/contract/support surfaces. |
| Dispute policy page | How disputes open, evidence required, freeze/release impact, admin review, timelines, outcomes, relation to refunds/holdbacks/support. | `/legal/disputes/page.tsx` exists. | Too brief for launch; does not explain user-visible dispute journey or evidence requirements. | Add dispute support path and expectations; link from payments, contracts, support, admin/user dispute pages. |
| Fee explanation page | Platform/processing fee responsibility by booking classification, examples, when fees are non-refundable/refundable, effective version. | `/legal/fees/page.tsx` exists. | Mentions seller-paid and processing absorption rules, but lacks examples, acceptance/effective date, and refund interaction. | Add plain-language examples once pricing policy is approved. |
| Booking classification page | Direct / planner-mediated / marketplace meaning, why classification matters, how correction works, who decides, no post-signing rewrite without policy. | `/legal/booking-classification/page.tsx` exists. | Internal policy terms are exposed without enough user-facing explanation; no correction/support route. | Add plain-language impact + support path for classification issues. |
| Proposal approval | Terms and commercial obligations must be visible before approval; payment/refund/dispute links should be visible if proposal includes milestones/payment. | `ProposalPageClient.tsx` shows `LegalNotice` before `ApproveProposalButton`, linking to `/terms`, version `proposal-guarded-mvp-v1`. | Good anchor exists, but label says acceptance of “guarded MVP commercial terms” while `/terms` is generic and not legal-approved. Payment/refund/dispute links are not surfaced in the approval card. | Keep LegalNotice pattern, but ensure linked `/terms` is approved and add related links where proposal has payment schedule. |
| Contract signing | Exact contract body, Terms, legal version, payment/refund/dispute implications, signer authority. | `ContractPageClient.tsx` shows `LegalNotice`; `ContractSignatureForm.tsx` requires “I agree to the terms and conditions of this contract.” | Signature checkbox does not link Terms/payment/refund/dispute pages or signer-authority obligations; legal version submitted but not visible in checkbox itself. | Add linked policy text to signature checkbox after legal approval; display legal version near checkbox/action. |
| Payment entry / payment modal | Payment authorization, held-funds policy, refund/dispute/fee links, amount/milestone, Stripe/payment processor notice, support route. | `ContractPaymentPanel.tsx` shows `LegalNotice`, held funds amounts, acknowledgement checkbox. `PaymentModal.tsx` shows secure payment, amount due, Stripe form. | Acknowledgement says signed contract/milestone schedule only; does not explicitly mention held-funds/refund/dispute/fees at the checkbox. Modal has no policy/support links. | Add concise links to payments/refunds/disputes/fees in the payment panel and modal. Keep live Stripe disabled until approved. |
| Admin/dispute/refund internal surfaces | Users and admins need consistent labels for freezes, holdbacks, refund/dispute review, and support status. | Relevant app/admin pages exist but were not deeply audited in this Scout pass beyond legal/payment anchors. | Risk of internal terminology not matching public policy. | Separate Forge/Sentinel pass should align user/admin labels after public policy copy is approved. |

## Draft copy outlines only — NOT LEGAL-APPROVED / INTERNAL DRAFT

These are outlines for legal/product review only. Do not paste into public acceptance text without legal approval.

### Terms of Service outline

- Header: `Terms of Service — NOT LEGAL-APPROVED / INTERNAL DRAFT`
- Effective date and version: fixed date/version, not dynamic render date.
- Who OneHub serves: clients, DIY planners, professional planners, vendors, venues, admins.
- Account rules: eligibility, accurate information, credential responsibility, role permissions, invite-only client/admin boundaries.
- Marketplace/provider obligations: truthful listings, authority to offer services, current availability/pricing, response expectations, lawful services, compliance with event/vendor rules.
- Client/planner obligations: accurate event details, authority to contract/pay, timely review of proposals/contracts/milestones, respectful communications.
- Proposals/contracts: proposal acceptance, contract signing, signer authority, version capture, no reliance on AI-generated legal text without review where applicable.
- Payments/held funds: links to Payments, Fees, Refunds, Disputes, booking classification pages.
- Trust/safety: fraud, abuse, impersonation, prohibited conduct, admin review/freeze controls.
- Support and disputes: support route, refund request route, dispute route, evidence expectations.
- Limitations/disclaimers: platform role, no guarantee of vendor performance or event outcome, legally reviewed liability language.
- Changes/contact: versioning, notice, legal/support contact.

### Privacy Policy outline

- Header: `Privacy Policy — NOT LEGAL-APPROVED / INTERNAL DRAFT`
- Effective date and version.
- Data collected: account/profile, event details, invitees/stakeholders, vendor/venue profiles, proposals/contracts, payment metadata, support communications, device/log data.
- Sensitive/payment data boundary: payment processing through approved payment processor; do not store full card details.
- How data is used: operate planning workflow, marketplace matching, contracts/payments, support, trust/safety, compliance, analytics.
- Sharing/processors: payment processor, authentication/email/SMS/support/hosting providers, legal/admin compliance cases.
- User controls: access/update/delete/export where applicable, marketing opt-out, support contact.
- Retention: event/legal/payment/audit retention policy.
- Security: accurate, non-overclaiming security statement.
- Children/eligibility, geography, policy changes, contact.

### Support page outline

- Header: `Support — operationally verified channels only`
- Primary contact: approved support email or form.
- Response expectations: only state SLA if staffed/approved.
- Payment/refund/dispute help: links to `/legal/payments`, `/legal/refunds`, `/legal/disputes`, `/legal/fees` and instructions for evidence.
- Account/security help: account access, suspected fraud/abuse, impersonation report.
- Vendor/venue support: profile/listing issues, booking request questions, cancellation/reschedule policy updates.
- Client/planner support: proposal, contract, payment, held-funds, milestone release questions.
- Emergency/incident boundary: what OneHub can/cannot do; live-payment freeze route if approved.

### Payments / Refunds / Disputes / Fees outline

- Header: `Payment, Refund, Dispute, Fee Policies — NOT LEGAL-APPROVED / INTERNAL DRAFT`
- Payment authorization: proposal/contract/milestone relationship; signer/payer authority.
- Held funds: what “held pending release” means, release triggers, holdback/freeze cases.
- Fees: platform fee, processing cost, examples by booking classification.
- Refund request: who can request, when, evidence, review path, possible outcomes.
- Dispute: how to open, what evidence to provide, freeze impact, admin review, relation to refund request.
- Support/escalation: where to get help and what identifiers to include.
- Version/effective date and legal approval owner.

### Vendor/client obligations outline

- Vendor/venue: accurate profile, legal right/insurance/licensing where applicable, service delivery, cancellation/reschedule policy accuracy, timely responses, evidence cooperation in disputes, no off-platform payment circumvention if prohibited by final Terms.
- Client/planner: accurate event requirements, authority to approve/sign/pay, timely milestone review, evidence cooperation in refund/dispute cases, respectful/legal conduct.
- OneHub/admin: platform routing, audit trail, support process, admin review boundaries, no unapproved manual money/legal overrides.

### Trust/safety notice outline

- Header: `Trust & Safety — NOT LEGAL-APPROVED / INTERNAL DRAFT`
- OneHub records proposal, contract, payment, refund, dispute, and admin-review actions for auditability.
- Funds may be paused during refund, dispute, suspected fraud, identity mismatch, or legal/admin review.
- Users should not share credentials or sensitive payment data in chat/support messages.
- Report fraud, impersonation, unsafe conduct, or listing inaccuracies through Support.
- Admin override paths are limited by the legal exceptions register and must be auditable.

## Friction risks by severity

### Blocking launch risks

1. Public Terms and Privacy pages are not launch-safe legal artifacts. They use generic copy, dynamic dates, and in `/privacy` include a mixed Terms section. `/terms` says “personal, non-commercial event planning,” which conflicts with OneHub’s commercial vendor/venue/planner marketplace.
2. Signup lacks Terms/Privacy acknowledgement and no account-level acceptance version is visible or captured.
3. Provider publish lacks obligations/trust/safety acknowledgement, despite making profiles visible and collecting cancellation/reschedule/payment policy inputs.
4. Payment and signature actions have useful `LegalNotice` anchors, but the linked policy pages are too short/generic to support launch acceptance.
5. Support/help routes include self-loops and unverified channel promises (`Start Chat` routes to `/support`; phone number appears placeholder; help articles route back to `/help`).

### Medium UX/legal continuity risks

1. Footer exposes `/terms`, `/privacy`, `/support`, but not the guarded MVP legal pages directly.
2. Header exposes `/privacy` as `Privacy & Terms`, while `/terms` is a separate route; this creates ambiguous policy destinations.
3. Public legal pages lack fixed effective dates/version labels corresponding to `CURRENT_ACCEPTANCE_VERSIONS`.
4. Payment modal does not repeat policy/support links at the final payment-confirmation moment.
5. Provider-entered cancellation/reschedule policy fields are not framed as subject to platform refund/dispute/payment policy.

## Recommended narrow Forge implementation card — safe only as draft/local prework

Title: `Gate 7 draft trust/legal/support UX anchors — no legal approval, no launch`

Assignee: `forge`

Scope:

- Local/docs/test-mode only. No Oracle. No production/public launch. No DNS/SSL/infra. No credentials/API keys. No billing/live Stripe. No destructive DB/schema/migration. Do not mark any copy as legal-approved.
- Add or adjust UX anchors only where copy is clearly marked internal draft/not legal-approved, or use neutral link/helper text that does not create legal acceptance.

Acceptance criteria:

1. Add a non-acceptance signup helper/checkbox draft behind clear `NOT LEGAL-APPROVED / INTERNAL DRAFT` wording or keep it docs-only if public UI copy is not approved.
2. Add policy/support links near provider onboarding Step 4 and Step 7 without asserting legal approval.
3. Fix support/help self-loop friction: either route to real pages/forms or label unavailable channels as draft/coming soon.
4. Add footer/header links for `/terms`, `/privacy`, `/support`, and the guarded MVP legal policy pages in a way that does not imply launch approval.
5. Add visible draft/effective-version placeholders to legal pages or move draft copy out of public routes until legal approval.
6. Add no credentials, secrets, live payment behavior, DNS/SSL/infra, legal acceptance enforcement, or production launch changes.
7. Sentinel must review for no secret exposure and no legal-approval overclaim.

## Scout continuity verdict

Flow under review: Gate 7 public trust/legal/support launch surface.

Continuity observed: route anchors exist and the app has the beginnings of a coherent legal/trust spine across footer, public legal pages, proposals, contracts, and payment entry.

Exact friction/dead end: account creation and provider publishing can proceed without visible legal/trust acknowledgements; legal pages are generic/draft-like but not labeled as such; support/help includes self-loop/placeholder channels; payment/signature moments do not expose enough refund/dispute/fee/support context.

Coherence verdict: PARTIAL.

Narrow next action: Forge should only add safe draft/local UX anchors and link fixes after review; legal-approved public acceptance copy and launch remain blocked on Marlon/legal approval and Sentinel verification.
