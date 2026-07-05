# OneHub Decision Log

## Module 2: Database, Schema & Seed Baseline — Final PASS Decision

**Decision:** Module 2 is accepted as PASS after final docs update.

### Basis

- Prisma validate: PASS
- Prisma generate: PASS
- Disposable migration replay: PASS
- Disposable seed first run: PASS
- Disposable seed second run: PASS
- RLS/User/Account security: PASS
- Typecheck: PASS
- Tests: PASS — 13 files / 84 tests
- Build: handled under Build Resource Handling Protocol

### Security/auth model decision recorded

For MVP, OneHub uses server-only Prisma access. Browser/client Supabase/PostgREST access is not allowed. RLS is defense-in-depth. `User` and `Account` are denied to `anon` and `authenticated` for direct SELECT access.

### Relevant commits

- Dispute migration alignment: `ce30d3e`
- Test resolution: `a8ae0b1`
- `db:seed` fix: `3bfbc04`
- Final migration/RLS commit: `46bf1af`
