# OneHub Preview Admin Access Verification — 2026-07-23

## Scope

Verify Marlon-provided Vercel Preview/admin target without changing code, secrets, database, billing, infrastructure, or production settings.

## Targets tested

- Protected deployment URL: `https://onehub-work-web-8kph-o8f8k1n2u-one-hub2.vercel.app`
- Accessible Vercel alias from screenshot: `https://onehub-work-web-8kph-two.vercel.app`
- Custom domain shown in Vercel: `https://www.1hubevents.com`

## Findings

### 1. Raw deployment URL is protected by Vercel SSO

`https://onehub-work-web-8kph-o8f8k1n2u-one-hub2.vercel.app/signin?callbackUrl=/admin/overview` redirects to Vercel login/SSO.

Result: Atlas cannot browser-test that exact raw deployment without Vercel session/protection bypass.

### 2. Alias is usable and database health is OK

`https://onehub-work-web-8kph-two.vercel.app/api/health` returned:

```json
{"status":"ok","checks":{"database":"ok","stripe":"ok"}}
```

### 3. Custom domain has database health degradation

`https://www.1hubevents.com/api/health` returned:

```json
{"status":"degraded","checks":{"database":"error","stripe":"ok"}}
```

### 4. Seeded admin credentials are valid on the Vercel alias

Credentials tested through the NextAuth credentials callback on `onehub-work-web-8kph-two.vercel.app`:

- `admin@example.com` / `[REDACTED]` -> accepted, 302 to app
- `admin@onehub.local` / `[REDACTED]` -> accepted, 302 to app

No credential values beyond known demo password are preserved here.

### 5. Admin page renders authenticated shell but fails server component render

Browser reached:

`https://onehub-work-web-8kph-two.vercel.app/admin/overview`

Visible authenticated state:

- Header: OneHub
- Navigation: Dashboard, Verification, Admin
- Sign out visible

Failure shown:

- `Something went wrong`
- `An error occurred in the Server Components render...`
- Error ID: `1148015143`

### 6. `/admin/users` currently shows 404 in browser on the alias

`https://onehub-work-web-8kph-two.vercel.app/admin/users` displayed the app 404 page during browser verification.

## Current conclusion

Preview access is no longer the only issue. The accessible alias verifies that:

1. Preview alias is reachable.
2. Database health on alias is OK.
3. Admin credentials exist and authenticate.
4. Admin area is not usable yet because authenticated admin routes fail or 404.

## Likely next repair area

Admin runtime/server rendering against the Preview database and deployed route set, especially:

- `apps/web/src/app/(app)/admin/overview/page.tsx`
- `apps/web/src/app/(app)/admin/users/page.tsx`
- `apps/web/src/app/(app)/admin/verification/page.tsx`
- Preview database schema/data compatibility for admin metrics/users/verification queries
- Vercel deployment/domain/env mismatch between raw deployment URL, alias, and custom domain

## Guardrails preserved

- No code changed except this report artifact.
- No push.
- No deploy.
- No secrets changed or exposed.
- No database mutation.
- No billing/infrastructure setting changed.
- No production/public promotion approved or performed.
