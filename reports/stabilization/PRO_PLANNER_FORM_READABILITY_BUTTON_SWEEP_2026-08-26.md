# Pro Planner Form Readability + Button Sweep

Date: 2026-08-26
Auditor: Scout
Task: `t_c570eef7`
Canonical URL: https://www.1hubevents.com
Scope boundary: Read-only inspection. No code, DB, env, credentials, billing, live payment, infra/domain, legal, destructive schema/migration, or production-setting changes were made. Oracle was not used.

## Verdict

PARTIAL.

The black-box form-control readability defect appears source/test-fixed on the Pro Planner dashboard: every inspected Pro Planner dashboard input/select/textarea uses explicit light readable styling after commit `de3a87a`, and the focused dashboard test suite passes. Authenticated canonical HTTP probes confirm the deployed `/pro/planner` route renders the Pro Planner command deck and role dashboard instead of a login wall or stale shell.

Remaining issue found: the Settings section includes a `Billing connection status` button that routes a Pro Planner to a vendor/venue-only denial page. This is not a readability defect, but it is a user-facing button/route integrity defect in the scoped Settings surface.

Runtime visual smoke note: Browser Use/Chrome could not start in this worker (`chrome-not-running`), so Scout could not perform interactive pixel-level browser typing/dropdown checks. Authenticated HTTP route probes plus source and Vitest coverage were used as the fallback evidence path.

## Scope inspected

Pro Planner dashboard surface, focused on visible sections requested by Atlas:
- Command/overview
- Team
- Clients
- Vendors
- Timeline
- Contracts/Payments
- Files/notes
- Services
- Availability
- Portfolio/Reports
- Settings

Controls checked by source/test evidence:
- Email input and submit button for assistant invites
- Client follow-up event/client selects, task input, due-date input, submit button
- Vendor relationship selects, date input, textarea, submit button
- Timeline event select, title input, due-date input, submit button
- Internal planner note event select, note input, submit button
- Availability service/status selects, start/end date inputs, note input, submit button
- Settings/overview/service/event route buttons and links

## Evidence reviewed

Runtime/authenticated canonical probes:
- Signed in as the seeded Pro Planner role through canonical production auth; `/api/auth/session` returned role `PRO_PLANNER`.
- `GET https://www.1hubevents.com/pro/planner` with authenticated cookies returned HTTP 200, 61,722 bytes, effective URL `/pro/planner`.
- Extracted authenticated `/pro/planner` text included: `Pro Planner`, `Professional Event Planning`, `Command Team Clients Vendors Timeline Contracts Payments Files Services Availability Portfolio Reports Settings`, `Agency command deck`, `Planner next-action engine`, `Money / contract alerts`, and `Private-pilot status only; this does not enable live charges or payouts.`
- `GET https://www.1hubevents.com/pro/planner/vault` returned HTTP 200 and rendered Event Vault content.
- Button/link target route probe results for Pro Planner session:
  - `/pro/planner` -> 200
  - `/pro/planner/vault` -> 200
  - `/events/new` -> 200
  - `/messages` -> 200
  - `/professional-planner/setup` -> 200
  - `/explore/vendors` -> 200
  - `/calendar` -> 200
  - `/marketplace/manage` -> 200
  - `/providers/onboarding?providerType=planner` -> 200
  - `/help` -> 200
  - `/app/billing/connect` -> 200, but rendered vendor/venue-only denial copy

Source evidence:
- `apps/web/src/components/pro-planner/Dashboard.tsx:193-195` defines shared readable form-control classes with `bg-white`, `text-slate-950`, placeholder color, disabled-state contrast, and `[color-scheme:light]`.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1279-1291` Team invite input uses `INLINE_FORM_CONTROL_CLASS`; submit disables until email is present.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1333-1372` Client follow-up selects/date/input use `FORM_CONTROL_CLASS`; submit disables until event and title are present.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1407-1437` Vendor relationship select/date/textarea controls use `FORM_CONTROL_CLASS`/`TEXTAREA_CONTROL_CLASS`; submit disables until a vendor/listing is selected.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1457-1477` Timeline milestone select/input/date controls use `FORM_CONTROL_CLASS`; submit disables until required values are present.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1534-1542` Files/internal note select/input use `FORM_CONTROL_CLASS`; submit disables until event and note are present.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1631-1642` Availability select/date/input controls use `FORM_CONTROL_CLASS`; submit disables until service and dates are present.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1746-1749` Settings buttons route to messages, help, billing connection status, and planner setup.
- `apps/web/src/components/pro-planner/Sidebar.tsx:40-79` all top-level section buttons call `onRoute(item.route)` and close mobile menu.

Test evidence:
- `pnpm run test -- apps/web/tests/pro-planner-dashboard-buildout.test.tsx` completed green via the repo Vitest config: 57 files passed, 314 tests passed.
- `apps/web/tests/pro-planner-dashboard-buildout.test.tsx:408-424` asserts Client follow-up form controls carry `bg-white`, `text-slate-950`, and `[color-scheme:light]`, and do not carry the unreadable dark/black classes.
- Same test file covers section routing and guarded endpoint calls for Team invite, Client task, Timeline milestone, Availability slot, Files internal note, and Vendor relationship save.

Repo/change evidence:
- Starting git status was clean on `atlas/slice7-canonical-deploy` at `de3a87a fix(pro-planner): keep form controls readable`.
- Scout only wrote this approved report artifact under `reports/stabilization/`.

## Findings

### F1 — MEDIUM — Settings `Billing connection status` routes Pro Planner to vendor/venue-only denial copy

Route/section/control:
- Section: Pro Planner dashboard > Settings
- Control: `Billing connection status`
- Source: `apps/web/src/components/pro-planner/Dashboard.tsx:1748`
- Target: `/app/billing/connect`

Observed behavior:
- The Settings button target returns HTTP 200 for the authenticated Pro Planner session.
- The rendered page says: `Stripe Connect Setup You need to be an admin or owner of a vendor or venue organization to connect Stripe.`

Expected behavior:
- A Pro Planner settings button should either route to a planner-relevant billing/readiness page or clearly label that vendor/venue Connect setup is not available to this role before navigation.

User-facing impact:
- A planner can click a first-party Settings control and land on a denial message written for a different role. This makes the dashboard feel less coherent and can revive payment-readiness confusion in a private-pilot surface.

Smallest recommended fix:
- Forge should either remove/hide this Settings button for Pro Planners, rename it to make the role boundary explicit, or route it to planner-relevant billing/readiness copy.
- Likely files/tests:
  - `apps/web/src/components/pro-planner/Dashboard.tsx`
  - `apps/web/tests/pro-planner-dashboard-buildout.test.tsx`

Forge implementation needed: YES, if Atlas wants the Pro Planner Settings surface clean before Sentinel final acceptance.

## Section-by-section result

| Section | Result | Evidence | Notes |
| --- | --- | --- | --- |
| Command/overview | PASS | Authenticated `/pro/planner` text + source links | Command deck renders on canonical production; key route targets return 200. |
| Team | PASS by source/test; visual runtime blocked | `Dashboard.tsx:1279-1293`, test guarded invite flow | Invite email input uses readable light classes and disabled submit state. |
| Clients | PASS by source/test; visual runtime blocked | `Dashboard.tsx:1333-1372`, test readability and guarded task flow | Selects/input/date controls use readable light classes; submit guard is clear. |
| Vendors | PASS by source/test; visual runtime blocked | `Dashboard.tsx:1407-1437`, test guarded relationship flow | Selects/date/textarea use readable light classes; submit disabled until vendor selected. |
| Timeline | PASS by source/test; visual runtime blocked | `Dashboard.tsx:1457-1477`, test guarded milestone flow | Event/title/date controls use readable light classes; submit disabled until required values present. |
| Files/notes | PASS by source/test; visual runtime blocked | `Dashboard.tsx:1534-1542`, test guarded note flow | Internal note controls use readable light classes and clear planner-only copy. |
| Services | PASS | `Dashboard.tsx:1593-1624`, route probe `/marketplace/manage` -> 200 | No direct form controls in dashboard section; manage-services route responds. |
| Availability | PASS by source/test; visual runtime blocked | `Dashboard.tsx:1631-1642`, test guarded availability flow | Service/status/date/note controls use readable light classes; submit disabled until service/dates present. |
| Payments/contracts | PASS | `Dashboard.tsx:1666-1696`, canonical text | Copy says no live-payment activation is added. |
| Settings | PARTIAL | `Dashboard.tsx:1746-1749`, route probe `/app/billing/connect` | Billing button routes to vendor/venue-only denial copy for Pro Planner. |

## User-facing impact summary

Confirmed:
- No source/test evidence of remaining unreadable Pro Planner dashboard form controls after the black-box fix.
- No source/test evidence that top-level sidebar section buttons are no-ops; they route to concrete panels through local UI state.
- No authenticated HTTP evidence of stale deployment for the main `/pro/planner` surface; canonical production renders the Pro Planner dashboard text matching the current source direction.

Assumptions/limits:
- Pixel-level color/readability after actual browser typing/selecting could not be confirmed because Chrome failed to start in this worker.
- HTTP probes validate route response and rendered server text, not full client-side click/hydration behavior.

## Recommended next action for Atlas

Route one narrow Forge cleanup slice for the Settings billing-link mismatch, then release the existing Sentinel child verifier.

Suggested Forge slice:
- Title: `Forge: Pro Planner settings billing-link role cleanup`
- Scope: Update the Pro Planner dashboard Settings billing control so Pro Planners do not land on vendor/venue-only Stripe Connect denial copy. Prefer hide/remove, relabel with explicit role boundary, or route to planner-relevant billing/readiness copy. Add/adjust `pro-planner-dashboard-buildout` assertions for the chosen behavior.

No founder escalation required for this narrow copy/route cleanup. FOUNDER ESCALATION REQUIRED only if the intended fix enables live billing, Stripe Connect onboarding, payment activation, production billing settings, or broader commercial policy changes.
