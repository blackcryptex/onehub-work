# OneHub Private Pilot Slice 4 — Protected Runtime Smoke / Founder Readiness Packet

Timestamp: 2026-08-05T14:21:42Z
Task: t_7ea93f99
Worker: Scout
Deployment inspected: https://onehub-work-web-8kph-c5k4lki0d-one-hub2.vercel.app
Repo branch: atlas/vercel-preview-current-main
Repo HEAD at start: 4a9f6b309a84538540da6c0ef4f06c55252a5478

## 1. Scope inspected

Read-only final private-pilot readiness inspection for the protected 8kph Preview lane, covering as far as available access allowed:

- protected login/session posture;
- Platform Admin visibility posture;
- View As / break-glass posture;
- role-dashboard navigation posture;
- selected-event / provider discovery posture;
- proposal -> contract -> payment-readiness/status posture;
- admin oversight and intervention surfaces;
- founder-facing PASS/BLOCKED readiness packet.

Guardrails followed:

- No deployment, DB mutation, env mutation, credential exposure, billing action, schema/migration change, production/public-exposure change, or live-payment action was performed.
- The only intended repo mutation is this report artifact.
- No secrets, tokens, cookies, bypass values, DB URLs, or private user data are included.

## 2. Evidence reviewed

### Runtime evidence attempted

Browser navigation to the active 8kph deployment reached Vercel protection/login, not the OneHub runtime:

- `/` opened Vercel login with title `Login – Vercel` and a `Log in to Vercel` page.
- Browser snapshot showed only Vercel login options: email, Google, GitHub, ChatGPT, SAML SSO, Passkey.
- Browser console on that page showed no JavaScript errors, but this is Vercel login evidence, not OneHub app evidence.

Read-only header checks also confirmed Vercel protection redirects for the scoped routes:

- `/` -> HTTP 302 to `https://vercel.com/sso-api?...`, then Vercel login.
- `/api/health` -> HTTP 302 to Vercel SSO/login.
- `/signin` -> HTTP 302 to Vercel SSO/login.
- `/app/admin/overview` -> HTTP 302 to Vercel SSO/login.
- `/app/admin/users` -> HTTP 302 to Vercel SSO/login.
- `/app/vault` -> HTTP 302 to Vercel SSO/login.
- `/app/proposals/demo` -> HTTP 302 to Vercel SSO/login.
- `/app/contracts/demo` -> HTTP 302 to Vercel SSO/login.
- `/app/disputes` -> HTTP 302 to Vercel SSO/login.
- `/marketplace` -> HTTP 302 to Vercel SSO/login.

Exact protected-access blocker:

This worker does not have an approved Vercel protected Preview session or bypass for `onehub-work-web-8kph-c5k4lki0d-one-hub2.vercel.app`. Scout therefore cannot truthfully browser-confirm the active protected OneHub runtime, Platform Admin page, role dashboards, selected event path, marketplace/event context, proposal/contract/payment status screens, or admin intervention queues on the live 8kph deployment.

### Accepted context from prior lanes

- Slice 2 proposal/contract/fund read guards passed Sentinel task t_8f5ef4f1.
- Slice 3 package/origin/report reconciliation passed Sentinel task t_65c90dc5.
- Accepted origin/branch state for this lane is `origin/atlas/vercel-preview-current-main` at `4a9f6b309a84538540da6c0ef4f06c55252a5478` and includes `af255a2bf5072b303fdaab9adb1a4f4cc8275b99`.
- Accepted task context states Marlon browser-confirmed Platform Admin active after environment activation and redeploy.

Scout treats Marlon's Platform Admin confirmation as accepted context, not fresh Scout runtime evidence.

### Repo/source evidence reviewed

Prior packet artifacts:

- `reports/stabilization/private-pilot/ONEHUB_PRIVATE_PILOT_OPERATING_LOOP_SLICE1_2026-08-04.md`
- `reports/stabilization/private-pilot/ONEHUB_PRIVATE_PILOT_SLICE2_PROPOSAL_CONTRACT_FUND_READ_GUARDS_2026-08-04.md`
- `reports/stabilization/private-pilot/ONEHUB_PRIVATE_PILOT_SLICE3_PACKAGE_HANDOFF_2026-08-04.md`

Current source files inspected for readiness posture:

- `apps/web/src/app/(app)/layout.tsx`
- `apps/web/src/app/(app)/admin/overview/page.tsx`
- `apps/web/src/app/(app)/admin/users/page.tsx`
- `apps/web/src/components/admin/ImpersonateButton.tsx`
- `apps/web/src/components/admin/ImpersonationBanner.tsx`
- `apps/web/src/app/api/admin/impersonate/route.ts`
- `apps/web/src/lib/rbac.ts`
- `apps/web/src/app/(app)/proposals/[id]/page.tsx`
- `apps/web/src/app/(app)/contracts/[id]/page.tsx`
- `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx`
- `apps/web/src/components/contracts/ContractPageClient.tsx`
- `apps/web/src/app/(app)/admin/verification/page.tsx`
- `apps/web/src/app/marketplace/page.tsx`
- `apps/web/src/app/marketplace/[slug]/page.tsx`

## 3. Founder readiness posture

### Invite-only private pilot

Posture: BLOCKED FOR SCOUT RUNTIME PASS; PARTIAL readiness based on accepted prior evidence and source inspection.

What is ready enough to continue toward a controlled private-pilot gate:

- The protected deployment is still protected by Vercel SSO/protection from this worker's environment.
- Accepted context says Platform Admin was active when Marlon inspected after env activation/redeploy.
- Slice 2's proposal/contract/fund direct-ID read-guard remediation is present in the current source and has already passed Sentinel.
- Slice 3 packaged the accepted code/report state on the verified branch.
- Source posture shows admin overview, admin users, guarded View As, impersonation banner, proposal detail, contract detail, fund placeholder, admin verification queues, and marketplace/event-context surfaces exist.

What is not ready to claim as PASS from Scout:

- Scout did not reach the OneHub app behind Vercel protection.
- Scout did not verify an authenticated app session.
- Scout did not browser-confirm Platform Admin visibility on the active 8kph runtime.
- Scout did not browser-confirm View As/break-glass behavior on the active 8kph runtime.
- Scout did not browser-confirm role-dashboard navigation, event/provider discovery, selected-event continuity, proposal/contract/payment-status visibility, or admin oversight queues on the active 8kph runtime.

### Public launch

Posture: NOT READY from this packet.

Reason: this packet is scoped to invite-only private-pilot readiness, not public launch. Public launch still needs broader runtime QA, public route hardening, legal/compliance approval, operational support readiness, production posture review, and non-protected/public-exposure decisions.

### Live payments

Posture: NOT READY from this packet.

Reason: no live payment, billing, Stripe, payout, refund, dispute, holdback, release, or production finance action was approved or executed. Source shows payment-readiness/status surfaces, but this inspection is read-only and cannot certify live-payment readiness.

## 4. Findings

### F0 — Protected runtime smoke is blocked for this worker

Severity: private-pilot blocker for Scout runtime PASS; not a confirmed product defect.
Category: Access / evidence gap.

Evidence:

- Browser navigation to the active 8kph deployment landed on Vercel login.
- Header checks for app, health, signin, admin, vault, proposal, contract, dispute, and marketplace routes all redirected to Vercel SSO/login.
- No approved protected Preview session/bypass was available to Scout.

User-facing impact:

- Scout cannot confirm what an approved invited pilot user or Marlon sees inside the active protected runtime.
- Atlas/Sentinel cannot use this packet alone as final runtime PASS evidence.

Narrow next action for Atlas:

- Route Sentinel or an approved operator with protected Preview access to run the final browser smoke. No code change is implied by this blocker alone.

### F1 — Platform Admin source posture is coherent; active runtime visibility remains unverified by Scout

Severity: high evidence gap until approved protected smoke passes.
Category: Founder/admin oversight.

Evidence:

- `apps/web/src/app/(app)/layout.tsx:8-12` requires an authenticated user for `(app)` routes and redirects unauthenticated users to `/signin`.
- `apps/web/src/app/(app)/admin/overview/page.tsx:8-18` gates admin overview with `canAccessDashboard(user, "ADMIN")` and loads organization, user, event, and open-dispute metrics.
- `apps/web/src/app/(app)/admin/users/page.tsx:23-31` gates the user list to admin users and limits founder role controls to Marlon's founder email.
- Accepted task context states Marlon already browser-confirmed Platform Admin active after env activation/redeploy.

User-facing impact:

- Founder/admin oversight appears structurally present for private-pilot operation.
- It remains a runtime evidence gap for Scout because this worker cannot enter the protected deployment.

Narrow next action for Atlas:

- Have an approved protected-session operator confirm `/admin/overview` and `/admin/users` render without exposing secrets and with expected safe counts/empty states.

### F2 — View As / break-glass posture is visibly guarded in source; runtime behavior still needs protected smoke

Severity: medium evidence gap.
Category: Platform Admin support / audit posture.

Evidence:

- `apps/web/src/components/admin/ImpersonateButton.tsx:28-35` requires both a break-glass reason and incident ticket before start.
- `apps/web/src/components/admin/ImpersonateButton.tsx:147-188` renders explicit break-glass copy, reason field, incident ticket field, and a disabled View As button until both are present.
- `apps/web/src/app/api/admin/impersonate/route.ts:28-31` requires guarded MVP Platform Admin authority, not merely a normal app user.
- `apps/web/src/app/api/admin/impersonate/route.ts:40-46` rejects missing reason or incident ticket.
- `apps/web/src/app/api/admin/impersonate/route.ts:63-77` records audit metadata for break-glass start.
- `apps/web/src/components/admin/ImpersonationBanner.tsx:64-92` shows a sticky warning banner with stop action while impersonating.

User-facing impact:

- The support posture is not a casual hidden toggle; it is framed as break-glass and visibly reversible.
- Active runtime still needs smoke to confirm the session update path and banner work in deployed Preview.

Narrow next action for Atlas:

- In protected smoke, verify missing reason/ticket cannot start View As, valid reason/ticket starts View As only for guarded Platform Admin, the banner appears, and Stop Impersonating returns to admin context. Do not expose target-user private data in the report.

### F3 — Proposal -> contract -> fund read guards are present after Slice 2; runtime negative-access smoke remains the final confidence check

Severity: medium residual evidence gap.
Category: Commercial path confidentiality.

Evidence:

- `apps/web/src/lib/rbac.ts:283-291` defines `canViewProposalResource` for event-side and seller/org-side proposal visibility.
- `apps/web/src/lib/rbac.ts:298-303` defines `canViewContractResource` through proposal visibility.
- `apps/web/src/app/(app)/proposals/[id]/page.tsx:59-62` fails closed with `notFound()` when a current user cannot view the proposal resource.
- `apps/web/src/app/(app)/contracts/[id]/page.tsx:61-62` fails closed with `notFound()` when a current user cannot view the contract resource.
- `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx:40-42` fails closed with `notFound()` when a current user cannot view the proposal resource.
- Slice 2 and Sentinel acceptance state say this guard work passed tests and verification.

User-facing impact:

- The prior high-risk direct-ID commercial visibility concern has been addressed in source and accepted by Sentinel.
- Final pilot confidence still benefits from runtime negative-access smoke with unrelated authenticated users, because source/test evidence is not the same as active protected runtime evidence.

Narrow next action for Atlas:

- Include a negative-access browser smoke: unrelated authenticated user cannot view another event's proposal, contract, or funding page by direct ID.

### F4 — Contract payment-readiness/status is visible but not live-payment ready

Severity: medium for payment-readiness evidence; private-pilot blocker only if the pilot intends live payments now.
Category: Payment-readiness / scope boundary.

Evidence:

- `apps/web/src/components/contracts/ContractPageClient.tsx:15-37` only exposes payment entry for `FULLY_SIGNED` or `IN_PAYMENT` contracts when `canEnterPayment` is true.
- `apps/web/src/components/contracts/ContractPageClient.tsx:147-159` labels the payment section as tied to the signed agreement and milestones.
- `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx:49-57` displays `Fund Held Funds` and states the Stripe Elements payment form would be embedded there, making it a readiness placeholder rather than live-payment certification.

User-facing impact:

- Pilot users can be shown status/readiness surfaces, but Marlon should not treat this as live-payment release readiness.
- Any payment execution remains outside this read-only packet.

Narrow next action for Atlas:

- For private pilot, smoke only the visibility/status posture. FOUNDER ESCALATION REQUIRED before any billing, payment, payout, refund, holdback, or release execution.

### F5 — Selected-event/provider discovery source posture supports a controlled pilot path; runtime navigation remains unverified

Severity: medium evidence gap.
Category: Provider discovery / event continuity.

Evidence:

- `apps/web/src/app/marketplace/page.tsx:25-34` carries event context into listing links.
- `apps/web/src/app/marketplace/page.tsx:48-63` shows `Browsing for {eventName}` and a Back to event button when event context is present.
- `apps/web/src/app/marketplace/[slug]/page.tsx:43-58` shows `Viewing this listing for {eventName}` and Back to event when event context is present.
- `apps/web/src/app/marketplace/[slug]/page.tsx:96-109` shows shortlist/request controls only with event context and otherwise tells the user to select or create an event.

User-facing impact:

- The selected-event marketplace path is designed to preserve pilot context and avoid contextless booking requests.
- Scout cannot confirm the deployed 8kph page renders or links correctly because Vercel protection blocked access.

Narrow next action for Atlas:

- Approved protected smoke should open one roster-approved event, enter marketplace from that event, open one listing, verify Back to event, and stop before any booking/shortlist mutation unless explicitly approved.

### F6 — Admin intervention queues are present as review surfaces, not public-scale operations

Severity: low for invite-only private pilot; not public-launch complete.
Category: Oversight / intervention.

Evidence:

- `apps/web/src/app/(app)/admin/verification/page.tsx:25-27` gates the admin verification page to admin users.
- `apps/web/src/app/(app)/admin/verification/page.tsx:31-124` fetches refunds, disputes, holdbacks, payouts, and override history.
- `apps/web/src/app/(app)/admin/verification/page.tsx:145-149` renders those canonical review sections.
- `apps/web/src/app/(app)/admin/verification/page.tsx:154-171` has a safe `No records found.` empty state.

User-facing impact:

- Manual founder/admin review loops are visible enough for a controlled invite-only pilot.
- They are not a complete public-scale trust and payments operation.

Narrow next action for Atlas:

- Protected smoke should inspect verification/abuse/dispute surfaces read-only and record only safe section presence or empty-state posture.

## 5. Issue classification

Private-pilot blockers:

1. Scout cannot issue a protected runtime PASS because this worker lacks approved protected Preview access/session.

High:

1. Platform Admin active runtime visibility is accepted from Marlon context but not independently confirmed by Scout in this run.

Medium:

1. View As / break-glass source posture is strong, but deployed session behavior needs protected smoke.
2. Proposal/contract/fund guards are accepted after Slice 2, but runtime negative-access smoke should still be run before broader roster expansion.
3. Contract payment-readiness visibility exists, but live-payment readiness is outside this packet.
4. Selected-event marketplace continuity exists in source, but deployed navigation is not Scout-confirmed.

Low:

1. Admin verification queues are present as MVP review surfaces; they are sufficient for controlled pilot visibility but not public-scale operations.

## 6. Marlon / founder packet

Plain-language answer:

- Private pilot: Not a Scout PASS yet. The package is close enough for an approved protected-access smoke, but Scout was stopped at Vercel protection and cannot certify the actual app runtime.
- Public launch: No. This packet does not certify public launch.
- Live payments: No. This packet does not approve or test live money movement.
- Platform Admin: Accepted context says Marlon saw it active; source posture supports it; Scout could not independently re-open it on the protected 8kph runtime.
- Biggest current blocker: access/evidence, not a confirmed app defect. Sentinel or another approved operator must run the browser smoke from a session that can enter the protected Preview.

What is ready:

- The branch and prior slices are accepted as packaged.
- The protected deployment still blocks unauthenticated/non-approved access.
- Source posture supports the core private-pilot operating loop: admin oversight, break-glass View As, role dashboards, selected-event marketplace, proposal/contract/fund read guards, payment-readiness/status visibility, and admin verification queues.

What is not ready:

- Final runtime PASS is not ready from Scout because OneHub pages were not reachable behind protection.
- Public launch is not ready.
- Live payments are not ready.
- Any Vercel/env/session/credential/billing/production/public exposure change remains outside Scout scope.

Exact next actions:

1. Atlas should route Sentinel or an approved operator with protected Preview access to run the final read-only 8kph smoke.
2. Smoke checklist:
   - Marlon/admin reaches `/admin/overview`.
   - `/admin/users` renders safely.
   - View As rejects missing reason/ticket.
   - View As with valid reason/ticket starts only for guarded Platform Admin and shows the warning banner/stop path.
   - One approved role dashboard opens.
   - One approved event opens through its canonical role route.
   - Marketplace opens from event context, one listing opens, and Back to event works.
   - Related user can view proposal/contract/funding status pages.
   - Unrelated authenticated user cannot view another event's proposal/contract/funding page by direct ID.
   - Admin verification/abuse/dispute queues render with safe counts or empty states.
3. Do not perform mutations during smoke unless Atlas/Marlon explicitly approves them.
4. FOUNDER ESCALATION REQUIRED for any protected-session grant, Vercel protection/env change, credential handling, production/public exposure decision, billing/payment execution, live-payment test, refund, payout, holdback, or fund release.

## 7. Verdict

PARTIAL

Reason: Source and prior accepted slices support controlled invite-only private-pilot readiness, but the active protected 8kph runtime was not accessible to Scout. The correct founder posture is BLOCKED FOR SCOUT RUNTIME PASS, not product PASS.

## 8. Recommended next action for Atlas

Route Sentinel or another approved protected-access operator to execute the read-only runtime smoke checklist above against `https://onehub-work-web-8kph-c5k4lki0d-one-hub2.vercel.app`. If that operator confirms the checklist without private-pilot blockers, Atlas can present the lane to Marlon as invite-only private-pilot ready with explicit exclusions for public launch and live payments.

## 9. Worktree status note

Initial repo state before report creation:

- Branch: `atlas/vercel-preview-current-main`
- HEAD: `4a9f6b309a84538540da6c0ef4f06c55252a5478`
- `git status --short`: clean output

Intentional file mutation by this task:

- `reports/stabilization/private-pilot/ONEHUB_PRIVATE_PILOT_SLICE4_PROTECTED_RUNTIME_SMOKE_FOUNDER_PACKET_2026-08-05.md`
