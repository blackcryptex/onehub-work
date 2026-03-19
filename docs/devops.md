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

### Sentry

Configure Sentry DSN in `.env`:

```env
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
```

Sentry is initialized in:
- `apps/web/src/instrumentation.ts` (server)
- `apps/web/src/app/layout.tsx` (client)

### Logging

- **Server**: Pino logger with structured JSON output
- **Client**: Console logger (dev) / Sentry (prod)
- **Request ID**: Included in all server logs via middleware

### Error Handling

- **Global Error Boundary**: `apps/web/src/app/error.tsx`
- **Error IDs**: Generated for each error for tracking
- **User-friendly Messages**: Displayed in UI

## Rate Limiting

Rate limiting is configured via environment variables:

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=100
```

Applied to:
- Public endpoints (`/rsvp/**`, `/api/stripe/webhook`)
- tRPC procedures (via middleware)

**Note**: Wave 6 uses in-memory rate limiting. For production, migrate to Redis-based solution.

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

Required variables (see `.env.example`):

- Database: `DATABASE_URL`
- Auth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Sentry: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- Rate Limiting: `RATE_LIMIT_ENABLED`, etc.

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
