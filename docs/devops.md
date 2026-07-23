# DevOps & Infrastructure

## CI/CD

### GitHub Actions

Workflows are defined in `.github/workflows/`:

- **Lint & Typecheck**: Runs on every PR
- **Test**: Runs unit and component tests
- **E2E**: Runs Playwright tests (requires database)
- **Prisma Migrate Check**: Validates schema changes

### Local Testing

```bash
# Run all checks
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

## Observability

### Error tracking

OneHub currently uses a provider-neutral error tracking adapter at
`apps/web/src/lib/errorTracker.ts`. The safe local default is console logging
with redaction. No paid/external provider, Sentry project, DSN, or alert route is
configured by code in this lane.

Non-secret placeholders live in `apps/web/.env.example`:

```env
ERROR_TRACKING_PROVIDER=console
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
ONEHUB_ERROR_LOG_SAMPLE_RATE=0
```

Before production launch, Marlon must approve the monitoring provider, budget,
retention, alert recipients, DSN ownership, and sampling policy. Provider setup
and credentials are out of scope for local pre-work.

### Logging

- **Server**: Pino logger with structured JSON output and secret redaction
- **Client/local fallback**: console through `errorTracker.ts`, with context redaction
- **Request ID**: Middleware assigns `x-request-id` on API/app responses

### Error Handling

- **Global Error Boundary**: `apps/web/src/app/error.tsx`
- **Global Root Error Boundary**: `apps/web/src/app/global-error.tsx`
- **User-friendly Messages**: Displayed in UI without stack traces or secrets

## Rate Limiting

Rate limiting is configured via environment variables listed in
`apps/web/.env.example`:

```env
RATE_LIMIT_ENABLED=false
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_TRUST_PROXY=false
```

Current implementation: `apps/web/src/server/lib/rateLimit.ts` provides a local
in-memory helper. It is acceptable for local/test-mode safety checks only.
Production launch still requires an approved Redis/shared-store design, proxy IP
trust policy, bypass policy for webhooks, and alerting/false-positive procedure.

Documented intended coverage:
- Public endpoints such as RSVP/share/webhook routes where explicitly wrapped
- Server route handlers that call the helper

**Note**: Do not treat the local in-memory helper as launch-ready for horizontally
scaled production traffic.

## Feature Flags

Feature flags control risky features:

- Calendar push sync
- Auto-assign seating
- AI suggestions

See `apps/web/src/server/lib/flags.ts` and `apps/web/src/server/routers/flags.ts`.

## Monitoring

### Health Checks

- `/api/health` - Basic health check
- `/api/trpc/health` - tRPC health check

### Database Migrations

```bash
# Create migration
pnpm prisma migrate dev --name <name>

# Apply migrations (production)
pnpm prisma migrate deploy

# Check migration status
pnpm prisma migrate status
```

## Deployment

### Environment Variables

Required/non-secret manifest entries are listed in `apps/web/.env.example`.
Production values must come from approved secret storage and must not be pasted
into docs or reports.

- Database: `DATABASE_URL`
- Auth and canonical URLs: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `ONEHUB_CANONICAL_URL`, `ONEHUB_PRIMARY_DOMAIN`
- Optional Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` canonical placeholders; legacy `GOOGLE_ID`, `GOOGLE_SECRET` aliases are accepted by code for compatibility
- Maintenance/write freeze: `ONEHUB_MAINTENANCE_MODE`
- Stripe placeholders: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Error tracking placeholders: `ERROR_TRACKING_PROVIDER`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `ONEHUB_ERROR_LOG_SAMPLE_RATE`
- Rate limiting placeholders: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_TRUST_PROXY`

### Build

```bash
pnpm build
```

### Production Considerations

1. **Database**: Use connection pooling (PgBouncer)
2. **Caching**: Implement Redis for rate limiting and sessions
3. **CDN**: Serve static assets via CDN
4. **Monitoring**: Set up alerts for errors and performance
5. **Backups**: Automated database backups
6. **Secrets**: Use secure secret management (Vault, AWS Secrets Manager)

## Troubleshooting

### Database Connection Issues

- Check `DATABASE_URL` format
- Verify network connectivity
- Check connection pool limits

### Migration Issues

- Ensure database is up-to-date
- Check for conflicting migrations
- Use `prisma migrate resolve` to mark migrations as applied

### Rate Limiting False Positives

- Check `RATE_LIMIT_ENABLED` setting
- Verify window size and max requests
- Check for proxy/load balancer IP forwarding
