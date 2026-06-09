# Gate 7 Final Closure — Non-secret Environment Manifest

Scope: staging/production planning inventory only. No real values are included. Do not paste credentials, API keys, DSNs, webhook secrets, database URLs, OAuth secrets, or live payment values into this file.

Evidence sources read:

- `reports/production/acceleration/gate7-launch-readiness-no-provision/launch-readiness-checklist.md`
- `reports/production/acceleration/gate7-safe-local-prework/evidence.md`
- `docs/devops.md`
- `docs/incident-response.md`
- `docs/payments.md`
- `apps/web/.env.example`

Status terms:

- Secret: value must live only in approved secret storage.
- Public: value is intended or safe to expose to browser/client/public monitors.
- Internal: non-secret operational config, but still not customer-facing unless approved.

## Required staging/production environment names

| Environment name | Applies to | Purpose | Sensitivity | Owner / decision needed before launch |
|---|---|---|---:|---|
| `DATABASE_URL` | staging, production | PostgreSQL connection string used by Prisma/app backend. | Secret | Hosting/database operator must provide through approved secret storage; Marlon approval required before production provisioning or rotation. |
| `NEXTAUTH_URL` | staging, production | Auth callback/base URL for NextAuth. Must match approved staging/prod canonical URL. | Public/internal config | Marlon must approve exact staging and production URLs, domain, SSL, and auth callback policy. |
| `NEXTAUTH_SECRET` | staging, production | NextAuth signing/encryption secret. | Secret | Secret owner and rotation policy required; no value may be committed or placed in reports. |
| `NEXT_PUBLIC_APP_URL` | staging, production | Browser-visible app base URL. | Public | Marlon must approve staging/prod URL split and launch posture before public exposure. |
| `ONEHUB_CANONICAL_URL` | staging, production | Server-side canonical URL for redirects, links, and monitoring references. | Internal/public URL config | Marlon must approve canonical URL, apex/www/subdomain policy, and redirect handling. |
| `ONEHUB_PRIMARY_DOMAIN` | staging, production | Primary domain name used by app/ops documentation. | Public | Marlon must approve domain ownership, DNS authority, and SSL/TLS policy. |
| `ONEHUB_MAINTENANCE_MODE` | staging, production | Server-side maintenance/write-freeze gate. Must not be `NEXT_PUBLIC_*`. | Internal | Incident/ops owner must define approved toggle path; live production use requires Marlon-approved operator boundary. |
| `ERROR_TRACKING_PROVIDER` | staging, production | Selects local/provider-neutral error tracking mode, currently safe default `console`. | Internal | Monitoring provider decision required before external production tracking. |
| `SENTRY_DSN` | staging, production if Sentry approved | Server-side Sentry/project DSN placeholder. | Secret/internal | Marlon must approve monitoring provider, project, retention, budget, sampling, and DSN owner before provisioning. |
| `NEXT_PUBLIC_SENTRY_DSN` | staging, production if Sentry approved | Browser-visible Sentry DSN placeholder. | Public | Only set after provider/project approval and client-side PII/secret scrubbing review. |
| `ONEHUB_ERROR_LOG_SAMPLE_RATE` | staging, production | Error/event sample rate for provider-neutral monitoring adapter. | Internal | Monitoring owner must choose rate with Marlon-approved retention/budget. |
| `RATE_LIMIT_ENABLED` | staging, production | Enables rate-limiting controls. | Internal | Ops/backend owner must decide staging/prod setting; production requires shared-store design approval. |
| `RATE_LIMIT_WINDOW_MS` | staging, production | Rate-limit time window. | Internal | Backend/ops must choose values and false-positive handling before launch. |
| `RATE_LIMIT_MAX_REQUESTS` | staging, production | Max requests per rate-limit window. | Internal | Backend/ops must choose values and webhook/bypass policy before launch. |
| `RATE_LIMIT_TRUST_PROXY` | staging, production | Whether to trust proxy headers for client IP. | Internal | Hosting/proxy owner must approve only after deployment topology is known. |
| `GOOGLE_CLIENT_ID` | staging, production if Google OAuth enabled | OAuth client identifier for Google auth/integrations. | Public/internal OAuth config | OAuth owner must create separate staging/prod clients only after approval. |
| `GOOGLE_CLIENT_SECRET` | staging, production if Google OAuth enabled | OAuth client secret for Google auth/integrations. | Secret | Secret storage and rotation owner required; no value in repo or reports. |
| `STRIPE_SECRET_KEY` | staging test-mode; production only after live payment approval | Stripe server secret key. | Secret | Live value blocked until Marlon approves live payments, Stripe dashboard ownership, and operating controls. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | staging test-mode; production only after live payment approval | Browser-visible Stripe publishable key. | Public | Production value blocked until live-payment approval and legal/payment terms acceptance. |
| `STRIPE_WEBHOOK_SECRET` | staging test-mode; production only after live payment approval | Stripe webhook signing secret for `/api/stripe/webhook`. | Secret | Webhook endpoint/dashboard setup is out of scope; production value requires Marlon approval. |
| `STRIPE_CONNECT_CLIENT_ID` | staging test-mode; production only after live payment approval | Stripe Connect client identifier documented in `docs/payments.md`. | Internal/public Stripe config | Connect onboarding/ownership requires Marlon approval and legal/payment operations readiness. |
| `OPENAI_API_KEY` | staging, production if AI features enabled | Server-side key for AI-powered proposals/contracts. | Secret | AI feature owner must approve usage, budget, and secret storage. |
| `OPENAI_MODEL` | staging, production if AI features enabled | Model selector for AI-powered proposals/contracts. | Internal | Product/backend owner must approve model, cost posture, and fallback behavior. |

## Alignment notes

1. `apps/web/.env.example` already contains non-secret placeholders for database, auth, canonical URL/domain, maintenance mode, error tracking, rate limiting, OAuth, Stripe, and OpenAI.
2. `docs/payments.md` additionally documents `STRIPE_CONNECT_CLIENT_ID`; if Connect remains in scope for launch, `.env.example` should later be aligned with a placeholder only, not a real value.
3. Live Stripe values remain blocked. Test-mode placeholders are acceptable for local/staging planning only.
4. No real environment values were inspected or copied for this manifest.

## Hard blockers preserved

- Production/public launch: blocked.
- DNS/SSL/hosting provisioning: blocked pending Marlon approval.
- Credential/API key creation or rotation: blocked pending Marlon approval and secret policy.
- Billing/live Stripe/payment activation: blocked pending Marlon approval, legal/payment readiness, and external provider setup.
- Destructive DB/schema/migration actions: out of scope for this lane.
