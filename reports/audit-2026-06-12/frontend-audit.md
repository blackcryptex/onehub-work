# OneHub Frontend Route + Link Audit — 2026-06-12

Scope inspected: full Next.js frontend route inventory for `/root/.hermes/workspaces/onehub/repo`, branch `cleanup/accelerated`, commit `31f9792`, served anonymously from `http://127.0.0.1:3101`. Read-only audit; no code changes made. The only intended repo write is this report file.

## Evidence reviewed
- Build: `pnpm -C apps/web build` passed under pnpm 9.0.0. Next produced 145 app routes. Build emitted lint warnings but no build failure.
- Prod server: `pnpm -C apps/web exec next start -p 3101 -H 127.0.0.1`; health check for `/` returned HTTP 200.
- Route source: `.next/app-path-routes-manifest.json`, `.next/server/app-paths-manifest.json`, `.next/routes-manifest.json`, and app directory-derived build output.
- Anonymous crawl: every manifest route requested once with dynamic params replaced by sample values (`sample-event`, `sample-id`, `sample-vendor`, `sample-token`, `sample-thread`). Redirects were not followed for status classification.
- Browser-visible check: 28 routes that returned HTTP 200 HTML were opened in headless Chrome and checked for visible error text, empty shells, and console/page errors.
- Link check: `pnpm -C apps/web linkcheck` completed with 0 broken external links. Supplemental rendered-HTML crawl checked 44 unique internal hrefs from 28 public/200 HTML pages and found 0 dead internal hrefs.

## Summary
- Routes inventoried: 145
- HTTP status counts: 200: 35, 307: 55, 400: 1, 401: 12, 403: 1, 404: 1, 405: 40
- Verdict counts: BROKEN_VISIBLE_404: 2, EXPECTED: 1, EXPECTED/REVIEW: 62, EXPECTED_PRIVATE: 54, EXPECTED_PUBLIC: 26
- Broken route status failures: 0 HTTP 404/500 responses among manifest routes, excluding the intentional `/_not-found` route.
- Browser-visible failures: 2 dynamic sample routes rendered generic 404 UI with HTTP 200 (`/marketplace/sample-vendor`, `/rsvp/sample-token`).
- Broken rendered internal links: 0.
- Linkcheck result: 0 broken external links; linkcheck found 33 internal route strings but does not prove every rendered internal route status.

## Broken routes list

| Severity | Route | Sample URL | Observed | Evidence |
|---|---|---:|---|---|
| P1 degraded | `/marketplace/[slug]` | `/marketplace/sample-vendor` | HTTP 200, browser body shows generic 404 | `404 — This page could not be found.` Data-dependent because `sample-vendor` may not exist, but missing data should return a true 404 status or a clear marketplace empty state. |
| P1 degraded | `/rsvp/[token]` | `/rsvp/sample-token` | HTTP 200, browser body shows generic 404 | `404 — This page could not be found.` Data-dependent because `sample-token` may not exist, but invalid RSVP tokens should return true 404/expired-token UX rather than hidden 200. |

No manifest route returned HTTP 500. No public static route returned HTTP 404. Private page routes consistently returned 307-to-signin under anonymous crawl.

## Broken links list

None confirmed from rendered public HTML.

| Source page | Dead href | Status | Notes |
|---|---|---:|---|
| — | — | — | Rendered-HTML crawl checked 44 unique internal hrefs and found no 404/5xx. `pnpm -C apps/web linkcheck` found 0 broken external links. |

## Browser-visible failures / degraded UX

| Severity | Page(s) | Finding | User-facing impact |
|---|---|---|---|
| P1 degraded | `/marketplace/sample-vendor`, `/rsvp/sample-token` | Visible generic Next 404 UI with HTTP 200. | Invalid/stale dynamic links look broken and are hard for monitoring/SEO to detect because status is 200. |
| P1 degraded | `/`, `/demo/start`, `/event-vault/sample-event` | Browser console shows RSC prefetch CORS failures when protected links redirect from `127.0.0.1` to `localhost` signin. | Anonymous users see page content, but protected-link prefetch/navigation is degraded and noisy; this can mask real route failures in browser telemetry. |

## Severity definitions used

- P0 user-blocking: public/core flow cannot load at all or returns 5xx/404 for a normal user path.
- P1 degraded: route renders but shows wrong/error UX, wrong status, or client-side navigation/prefetch failure.
- P2 cosmetic: non-blocking visual/content polish issue.

## Prioritized fix list for Forge

1. P1 degraded: /marketplace/[slug] renders visible Next 404 UI while returning HTTP 200
   - Evidence: Browser text sample: ['404', '', 'This page could not be found.']
   - Impact: Users with invalid/stale vendor slug or RSVP token see a generic 404 surface; crawlers/monitors see HTTP 200, hiding the failure.
   - Narrow fix: Return a real 404 status/notFound() for missing data, and verify real seeded vendor/RSVP links resolve.
2. P1 degraded: /rsvp/[token] renders visible Next 404 UI while returning HTTP 200
   - Evidence: Browser text sample: ['404', '', 'This page could not be found.']
   - Impact: Users with invalid/stale vendor slug or RSVP token see a generic 404 surface; crawlers/monitors see HTTP 200, hiding the failure.
   - Narrow fix: Return a real 404 status/notFound() for missing data, and verify real seeded vendor/RSVP links resolve.
3. P1 degraded: Public pages emit browser console failures during RSC prefetch to private routes
   - Evidence: Observed on /, /demo/start, /event-vault/sample-event. Example: Access to fetch at http://localhost:3101/signin... redirected from http://127.0.0.1:3101/events/new?_rsc=... blocked by CORS.
   - Impact: Anonymous users can still read the page, but client-side prefetch/navigation degrades and produces noisy browser failures; route redirects use a different host than the audited origin.
   - Narrow fix: Align auth/redirect base URL with the served host, or prevent prefetch on protected links visible to anonymous users.

## Full route inventory + anonymous status

| # | Kind | Manifest route | Sample URL crawled | HTTP | Redirect location | Expected classification | Verdict |
|---:|---|---|---|---:|---|---|---|
| 1 | page | `/` | `/` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 2 | internal-page | `/_not-found` | `/_not-found` | 404 | `` | expected internal not-found route (404 acceptable) | EXPECTED |
| 3 | page | `/admin/abuse` | `/admin/abuse` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Fabuse` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 4 | page | `/admin/audit` | `/admin/audit` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Faudit` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 5 | page | `/admin/overview` | `/admin/overview` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Foverview` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 6 | page | `/admin/transactions` | `/admin/transactions` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Ftransactions` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 7 | page | `/admin/users` | `/admin/users` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Fusers` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 8 | page | `/admin/verification` | `/admin/verification` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Fverification` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 9 | page | `/admin/verification/detail` | `/admin/verification/detail` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Fverification%2Fdetail` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 10 | page | `/admin/verification/disputes/[id]` | `/admin/verification/disputes/sample-id` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Fverification%2Fdisputes%2Fsample-id` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 11 | page | `/admin/verification/holdbacks/[id]` | `/admin/verification/holdbacks/sample-id` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Fverification%2Fholdbacks%2Fsample-id` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 12 | page | `/admin/verification/overrides/[id]` | `/admin/verification/overrides/sample-id` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Fverification%2Foverrides%2Fsample-id` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 13 | page | `/admin/verification/payouts/[id]` | `/admin/verification/payouts/sample-id` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Fverification%2Fpayouts%2Fsample-id` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 14 | page | `/admin/verification/refunds/[id]` | `/admin/verification/refunds/sample-id` | 307 | `localhost:3101/signin?callbackUrl=%2Fadmin%2Fverification%2Frefunds%2Fsample-id` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 15 | api | `/api/acceptance` | `/api/acceptance` | 403 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 16 | api | `/api/admin/holdbacks` | `/api/admin/holdbacks` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 17 | api | `/api/admin/holdbacks/verification` | `/api/admin/holdbacks/verification` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 18 | api | `/api/admin/impersonate` | `/api/admin/impersonate` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 19 | api | `/api/admin/override-history` | `/api/admin/override-history` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 20 | api | `/api/admin/stop-impersonate` | `/api/admin/stop-impersonate` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 21 | api | `/api/ai/source-vendors-venues` | `/api/ai/source-vendors-venues` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 22 | api | `/api/auth/[...nextauth]` | `/api/auth/session` | 200 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 23 | api | `/api/auth/error` | `/api/auth/error` | 200 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 24 | api | `/api/auth/signup` | `/api/auth/signup` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 25 | api | `/api/bookings/request` | `/api/bookings/request` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 26 | api | `/api/bookings/respond` | `/api/bookings/respond` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 27 | api | `/api/contracts/[id]` | `/api/contracts/sample-id` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 28 | api | `/api/contracts/[id]/sign` | `/api/contracts/sample-id/sign` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 29 | api | `/api/contracts/from-proposal` | `/api/contracts/from-proposal` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 30 | api | `/api/contracts/sign` | `/api/contracts/sign` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 31 | api | `/api/demo/milestones/[id]/fund` | `/api/demo/milestones/sample-id/fund` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 32 | api | `/api/demo/milestones/[id]/release` | `/api/demo/milestones/sample-id/release` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 33 | api | `/api/demo/payouts/[id]/release` | `/api/demo/payouts/sample-id/release` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 34 | api | `/api/demo/preflight` | `/api/demo/preflight` | 200 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 35 | api | `/api/diy/events` | `/api/diy/events` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 36 | api | `/api/dreams/create` | `/api/dreams/create` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 37 | api | `/api/events/[eventSlug]` | `/api/events/sample-event` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 38 | api | `/api/events/[eventSlug]/deposits` | `/api/events/sample-event/deposits` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 39 | api | `/api/events/[eventSlug]/share` | `/api/events/sample-event/share` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 40 | api | `/api/events/[eventSlug]/stakeholders` | `/api/events/sample-event/stakeholders` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 41 | api | `/api/events/create` | `/api/events/create` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 42 | api | `/api/google/calendar/create-or-use` | `/api/google/calendar/create-or-use` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 43 | api | `/api/google/callback` | `/api/google/callback` | 307 | `/diy-planner` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 44 | api | `/api/google/connect` | `/api/google/connect` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 45 | api | `/api/google/events/overlay` | `/api/google/events/overlay` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 46 | api | `/api/google/status` | `/api/google/status` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 47 | api | `/api/google/sync/push` | `/api/google/sync/push` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 48 | api | `/api/health` | `/api/health` | 200 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 49 | api | `/api/invites/vendor` | `/api/invites/vendor` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 50 | api | `/api/notifications` | `/api/notifications` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 51 | api | `/api/notifications/[id]/read` | `/api/notifications/sample-id/read` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 52 | api | `/api/orgs/create` | `/api/orgs/create` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 53 | api | `/api/payments/auto-build` | `/api/payments/auto-build` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 54 | api | `/api/payments/confirm` | `/api/payments/confirm` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 55 | api | `/api/payments/create-intent` | `/api/payments/create-intent` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 56 | api | `/api/payments/deposits/auto` | `/api/payments/deposits/auto` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 57 | api | `/api/payments/lines` | `/api/payments/lines` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 58 | api | `/api/payments/lines/[id]` | `/api/payments/lines/sample-id` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 59 | api | `/api/payments/mark-milestone-complete` | `/api/payments/mark-milestone-complete` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 60 | api | `/api/payments/mark-milestone-paid-demo` | `/api/payments/mark-milestone-paid-demo` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 61 | api | `/api/payments/plan/from-accepted-proposals` | `/api/payments/plan/from-accepted-proposals` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 62 | api | `/api/payments/receipts/[id]` | `/api/payments/receipts/sample-id` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 63 | api | `/api/payments/release-milestone` | `/api/payments/release-milestone` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 64 | api | `/api/proposals/[id]` | `/api/proposals/sample-id` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 65 | api | `/api/proposals/[id]/approve` | `/api/proposals/sample-id/approve` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 66 | api | `/api/proposals/generate` | `/api/proposals/generate` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 67 | api | `/api/providers/profile` | `/api/providers/profile` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 68 | api | `/api/refund-requests` | `/api/refund-requests` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 69 | api | `/api/shortlist` | `/api/shortlist` | 400 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 70 | api | `/api/shortlist/add` | `/api/shortlist/add` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 71 | api | `/api/stripe/webhook` | `/api/stripe/webhook` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 72 | api | `/api/users/invite-client` | `/api/users/invite-client` | 405 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 73 | api | `/api/users/search` | `/api/users/search` | 401 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 74 | api | `/api/vendor-venue/check-profile` | `/api/vendor-venue/check-profile` | 200 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 75 | api | `/api/vendors/search` | `/api/vendors/search` | 200 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 76 | api | `/api/vendors/search-external` | `/api/vendors/search-external` | 200 | `` | expected API auth/method result (200/204/3xx/401/403/405; 5xx broken) | EXPECTED/REVIEW |
| 77 | page | `/app` | `/app` | 307 | `localhost:3101/signin?callbackUrl=%2Fapp` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 78 | page | `/app/billing/connect` | `/app/billing/connect` | 307 | `localhost:3101/signin?callbackUrl=%2Fapp%2Fbilling%2Fconnect` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 79 | page | `/app/contracts` | `/app/contracts` | 307 | `localhost:3101/signin?callbackUrl=%2Fapp%2Fcontracts` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 80 | page | `/app/contracts/[id]` | `/app/contracts/sample-id` | 307 | `localhost:3101/signin?callbackUrl=%2Fapp%2Fcontracts%2Fsample-id` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 81 | page | `/app/proposals` | `/app/proposals` | 307 | `localhost:3101/signin?callbackUrl=%2Fapp%2Fproposals` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 82 | page | `/app/proposals/[id]` | `/app/proposals/sample-id` | 307 | `localhost:3101/signin?callbackUrl=%2Fapp%2Fproposals%2Fsample-id` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 83 | page | `/app/vault` | `/app/vault` | 307 | `localhost:3101/signin?callbackUrl=%2Fapp%2Fvault` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 84 | page | `/app/vault/[eventSlug]` | `/app/vault/sample-event` | 307 | `localhost:3101/signin?callbackUrl=%2Fapp%2Fvault%2Fsample-event` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 85 | page | `/billing/connect` | `/billing/connect` | 307 | `localhost:3101/signin?callbackUrl=%2Fbilling%2Fconnect` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 86 | page | `/billing/payouts` | `/billing/payouts` | 307 | `localhost:3101/signin?callbackUrl=%2Fbilling%2Fpayouts` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 87 | page | `/calendar` | `/calendar` | 307 | `localhost:3101/signin?callbackUrl=%2Fcalendar` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 88 | page | `/client` | `/client` | 307 | `localhost:3101/signin?callbackUrl=%2Fclient` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 89 | page | `/client/events/[eventSlug]` | `/client/events/sample-event` | 307 | `localhost:3101/signin?callbackUrl=%2Fclient%2Fevents%2Fsample-event` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 90 | page | `/contracts/[id]` | `/contracts/sample-id` | 307 | `localhost:3101/signin?callbackUrl=%2Fcontracts%2Fsample-id` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 91 | page | `/demo` | `/demo` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 92 | page | `/demo/start` | `/demo/start` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 93 | page | `/disputes` | `/disputes` | 307 | `localhost:3101/signin?callbackUrl=%2Fdisputes` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 94 | page | `/diy-planner` | `/diy-planner` | 307 | `localhost:3101/signin?callbackUrl=%2Fdiy-planner` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 95 | page | `/diy-planner/vault` | `/diy-planner/vault` | 307 | `localhost:3101/signin?callbackUrl=%2Fdiy-planner%2Fvault` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 96 | page | `/diy-planner/vault/[eventSlug]` | `/diy-planner/vault/sample-event` | 307 | `localhost:3101/signin?callbackUrl=%2Fdiy-planner%2Fvault%2Fsample-event` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 97 | page | `/event-dreamer/create` | `/event-dreamer/create` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 98 | page | `/event-vault` | `/event-vault` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 99 | page | `/event-vault/[eventSlug]` | `/event-vault/sample-event` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 100 | page | `/events/[eventSlug]` | `/events/sample-event` | 307 | `localhost:3101/signin?callbackUrl=%2Fevents%2Fsample-event` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 101 | page | `/events/[eventSlug]/budget` | `/events/sample-event/budget` | 307 | `localhost:3101/signin?callbackUrl=%2Fevents%2Fsample-event%2Fbudget` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 102 | page | `/events/[eventSlug]/checklists` | `/events/sample-event/checklists` | 307 | `localhost:3101/signin?callbackUrl=%2Fevents%2Fsample-event%2Fchecklists` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 103 | page | `/events/[eventSlug]/guests` | `/events/sample-event/guests` | 307 | `localhost:3101/signin?callbackUrl=%2Fevents%2Fsample-event%2Fguests` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 104 | page | `/events/[eventSlug]/milestones` | `/events/sample-event/milestones` | 307 | `localhost:3101/signin?callbackUrl=%2Fevents%2Fsample-event%2Fmilestones` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 105 | page | `/events/[eventSlug]/proposals/new` | `/events/sample-event/proposals/new` | 307 | `localhost:3101/signin?callbackUrl=%2Fevents%2Fsample-event%2Fproposals%2Fnew` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 106 | page | `/events/[eventSlug]/seating` | `/events/sample-event/seating` | 307 | `localhost:3101/signin?callbackUrl=%2Fevents%2Fsample-event%2Fseating` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 107 | page | `/events/[eventSlug]/settings` | `/events/sample-event/settings` | 307 | `localhost:3101/signin?callbackUrl=%2Fevents%2Fsample-event%2Fsettings` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 108 | page | `/events/[eventSlug]/tasks` | `/events/sample-event/tasks` | 307 | `localhost:3101/signin?callbackUrl=%2Fevents%2Fsample-event%2Ftasks` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 109 | page | `/events/new` | `/events/new` | 307 | `localhost:3101/signin?callbackUrl=%2Fevents%2Fnew` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 110 | page | `/explore/vendors` | `/explore/vendors` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 111 | page | `/features` | `/features` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 112 | page | `/help` | `/help` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 113 | page | `/legal/booking-classification` | `/legal/booking-classification` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 114 | page | `/legal/disputes` | `/legal/disputes` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 115 | page | `/legal/fees` | `/legal/fees` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 116 | page | `/legal/payments` | `/legal/payments` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 117 | page | `/legal/refunds` | `/legal/refunds` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 118 | page | `/maintenance` | `/maintenance` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 119 | page | `/marketplace` | `/marketplace` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 120 | page | `/marketplace/[slug]` | `/marketplace/sample-vendor` | 200 | `` | expected public 200 | BROKEN_VISIBLE_404 |
| 121 | page | `/marketplace/manage` | `/marketplace/manage` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 122 | page | `/messages/[threadId]` | `/messages/sample-thread` | 307 | `localhost:3101/signin?callbackUrl=%2Fmessages%2Fsample-thread` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 123 | page | `/notifications` | `/notifications` | 307 | `localhost:3101/signin?callbackUrl=%2Fnotifications` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 124 | page | `/privacy` | `/privacy` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 125 | page | `/pro/planner` | `/pro/planner` | 307 | `localhost:3101/signin?callbackUrl=%2Fpro%2Fplanner` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 126 | page | `/pro/planner/vault` | `/pro/planner/vault` | 307 | `localhost:3101/signin?callbackUrl=%2Fpro%2Fplanner%2Fvault` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 127 | page | `/pro/planner/vault/[eventSlug]` | `/pro/planner/vault/sample-event` | 307 | `localhost:3101/signin?callbackUrl=%2Fpro%2Fplanner%2Fvault%2Fsample-event` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 128 | page | `/professional-planner/setup` | `/professional-planner/setup` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 129 | page | `/proposals/[id]` | `/proposals/sample-id` | 307 | `localhost:3101/signin?callbackUrl=%2Fproposals%2Fsample-id` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 130 | page | `/proposals/[id]/fund` | `/proposals/sample-id/fund` | 307 | `localhost:3101/signin?callbackUrl=%2Fproposals%2Fsample-id%2Ffund` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 131 | page | `/providers/onboarding` | `/providers/onboarding` | 307 | `localhost:3101/signin?callbackUrl=%2Fproviders%2Fonboarding` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 132 | page | `/providers/start` | `/providers/start` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 133 | page | `/requests` | `/requests` | 307 | `localhost:3101/signin?callbackUrl=%2Frequests` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 134 | page | `/rsvp/[token]` | `/rsvp/sample-token` | 200 | `` | expected public 200 | BROKEN_VISIBLE_404 |
| 135 | page | `/signin` | `/signin` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 136 | page | `/signout` | `/signout` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 137 | page | `/signup` | `/signup` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 138 | page | `/support` | `/support` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 139 | page | `/terms` | `/terms` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 140 | page | `/vault` | `/vault` | 307 | `localhost:3101/signin?callbackUrl=%2Fvault` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 141 | page | `/vault/[eventSlug]` | `/vault/sample-event` | 307 | `localhost:3101/signin?callbackUrl=%2Fvault%2Fsample-event` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 142 | page | `/vendor-venue-ads` | `/vendor-venue-ads` | 200 | `` | expected public 200 | EXPECTED_PUBLIC |
| 143 | page | `/vendor-venue/setup` | `/vendor-venue/setup` | 307 | `localhost:3101/signin?callbackUrl=%2Fvendor-venue%2Fsetup` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 144 | page | `/vendor/dashboard` | `/vendor/dashboard` | 307 | `localhost:3101/signin?callbackUrl=%2Fvendor%2Fdashboard` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |
| 145 | page | `/venue/dashboard` | `/venue/dashboard` | 307 | `localhost:3101/signin?callbackUrl=%2Fvenue%2Fdashboard` | expected private redirect to /signin (307/308) or 401/403 | EXPECTED_PRIVATE |

## Notes and limitations

- Dynamic routes were crawled with synthetic sample params. Findings on missing records are marked data-dependent; this audit did not authenticate or seed production-like data.
- API routes were included in the manifest inventory. Method/auth statuses such as 401/403/405/400 were treated as expected/review unless they returned 404/5xx.
- The app linkcheck command writes `apps/web/LINKCHECK.json`; git status remained clean because the file is ignored/untracked policy-wise in this workspace.
- Prod server was stopped after report generation.
