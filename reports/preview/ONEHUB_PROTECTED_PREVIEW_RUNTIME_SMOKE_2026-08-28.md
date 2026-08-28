# OneHub Protected Preview Runtime Smoke — 2026-08-28

## Target

- Branch: `atlas/slice7-canonical-deploy`
- Base commit before runtime fix: `c47095e6cbae10066c36de928ff1afe368a688a5`
- Preview target: `https://onehub-work-web-8kph-3wfbfzdhj-one-hub2.vercel.app`
- Access method: Vercel Protection Bypass for Automation header, value redacted and not stored.

## Initial smoke result

PASS:
- `/api/health` returned application JSON with `database: ok` and `stripe: ok`.
- `/api/auth/providers` returned application JSON with credentials and Google providers.
- Credential login worked for seeded admin, pro planner, DIY planner, vendor, and venue accounts.
- Core dashboard routes loaded for DIY planner, vendor, venue, marketplace, event wizard, and admin users list.

FAIL / fixed in follow-up:
- `/messages` produced a Server Component error for multiple roles. Digest observed: `1109828187`.
- `/admin/overview` produced a Server Component error for admin. Digest observed: `2016912998`.
- A pro planner vault list detail link produced a Server Component error. Digest observed: `1573919229`.

## Follow-up local verification after Forge fix

Forge card `t_944aee8a` fixed the protected Preview runtime blockers locally.

Local gates run by Atlas after the fix:
- `git diff --check` — PASS
- `pnpm run test` — PASS, 66 files / 367 tests
- `pnpm run typecheck` — PASS
- `pnpm run lint` — PASS with pre-existing warnings only
- `pnpm run build` — PASS

## Remaining acceptance requirement

The fixed code must be committed, pushed, deployed to Vercel Preview, and then re-smoked on the protected Preview target. Sentinel worker lacked the bypass secret in its environment, so Atlas must run the protected Preview smoke with the approved bypass and provide redacted evidence for Sentinel/board closure.

## Guardrails

No secret value is stored here. No production env, billing, domain, infrastructure, database, live-payment, or legal/public-launch settings were changed.
