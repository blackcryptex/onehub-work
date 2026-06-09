# OneHub Gate 3 Phase 3B — Role Selection & Routing Evidence

Status: review-required
Scope: narrow app implementation only. No DB migrations, no DB mutations against live/staging, no credential/billing/infra/production setting changes, no live payment actions, no Oracle work.

## Controlling inputs read

- `reports/production/gate3/phase3a/role-onboarding-audit.md`
- Sentinel task `t_b3e6b15b` metadata: PASS; confirmed signup lacked explicit role selection, signup defaulted invalid/missing roles to DIY, Client had generic `/app` fallback, Event Dreamer was a seventh non-MVP public role surface, and Pro Planner setup did not update `User.role` for existing users.

## Implementation evidence

### Public signup role selector

- `apps/web/src/lib/signup-roles.ts` defines the only public MVP signup roles as:
  - `DIY_PLANNER`
  - `PRO_PLANNER`
  - `VENDOR`
  - `VENUE`
- `CLIENT` is treated as invite/event-linked for MVP.
- `ADMIN` is treated as manual/internal provisioning only.
- `EVENT_DREAMER` is treated as a feature path, not a public signup role.
- `apps/web/src/app/(auth)/signup/page.tsx` renders a required radio selector from `SIGNUP_ROLE_OPTIONS` and blocks submit when no role is chosen.
- URL role params are accepted only when they match a public signup role; missing/invalid URL role no longer defaults to DIY.

### Signup API validation

- `apps/web/src/app/api/auth/signup/route.ts` now calls `validatePublicSignupRole(role)` before user creation.
- Missing role returns 400 with `Choose a public signup role to continue.`
- Invalid role returns 400 with `Choose a valid public signup role to continue.`
- Public `ADMIN`, `CLIENT`, and `EVENT_DREAMER` signup attempts return role-specific 400 errors.
- No silent fallback to `DIY_PLANNER` remains in the signup API.

### Role routing

- `apps/web/src/lib/routes.ts` now maps:
  - `DIY_PLANNER` -> `/diy-planner`
  - `PRO_PLANNER` -> `/pro/planner`
  - `VENDOR` -> `/vendor/dashboard`
  - `VENUE` -> `/venue/dashboard`
  - `CLIENT` -> `/client`
  - `ADMIN` -> `/app/admin/overview`
  - `EVENT_DREAMER` -> `/diy-planner` as a non-MVP feature-mode landing rather than a separate Gate 3 role dashboard.
- `apps/web/src/app/app/page.tsx` redirects `CLIENT` to `/client` instead of leaving Client on the generic `/app` fallback.
- `apps/web/src/app/(app)/client/page.tsx` adds a scoped Client portal empty state explaining invite/event-linked MVP behavior and redirects non-client roles back to their canonical dashboard.

### Pro Planner existing-user conversion

- `apps/web/src/app/api/orgs/create/route.ts` now computes `getRoleForCreatedOrg(orgType, session.user.role)` and wraps organization creation plus role update in a transaction.
- Creating a planner org updates existing non-admin/non-pro users to `PRO_PLANNER` without changing the organization membership creation path.
- Existing `PRO_PLANNER` and `ADMIN` users are left unchanged.
- Vendor/Venue org creation does not use this Pro Planner conversion path.

## Targeted tests added

- `apps/web/src/lib/__tests__/role-selection-routing.test.ts`
  - public signup roles are exactly DIY Planner, Pro Planner, Vendor, Venue
  - missing role rejected
  - invalid role rejected
  - Admin rejected from public signup
  - Client rejected from public signup / documented invite-only
  - Event Dreamer rejected from public signup
  - role dashboard routing matrix
  - Pro Planner conversion helper behavior
- `apps/web/tests/gate3b-role-api.test.ts`
  - signup API validation helper requires explicit role
  - invalid/Admin/Client/Event Dreamer rejected
  - exactly four public roles allowed
  - Pro Planner conversion helper behavior
- `apps/web/tests/gate3b-role-selection.test.tsx`
  - role selector options exclude Admin, Client, and Event Dreamer
  - dashboard routing matrix

## Validation performed

Command:

```sh
pnpm -C apps/web exec vitest run src/lib/__tests__/role-selection-routing.test.ts tests/gate3b-role-api.test.ts tests/gate3b-role-selection.test.tsx
```

Result: PASS

- Test Files: 3 passed
- Tests: 18 passed
- Exit code: 0

Command:

```sh
pnpm -C apps/web typecheck
```

Result: PASS

- `tsc --noEmit`
- Exit code: 0

## Residual risk / Sentinel verification notes

- This run did not perform live browser screenshots or Playwright traces. Evidence is code + targeted unit tests + typecheck.
- Workspace was dirty before this run with unrelated Gate 2/maintenance/security changes. Sentinel should review the Gate 3B-scoped files specifically and avoid attributing unrelated pre-existing modifications to this card.
- Client is implemented as invite-only for MVP with a clear `/client` landing/empty state; no public Client self-service signup was added.
- Admin remains non-public signup; no manual provisioning mechanism was changed.

## Sentinel can verify Gate 3B

Yes, Sentinel can verify Gate 3B against the scoped implementation and tests listed above. Recommended verification focus: signup UI selector, API validation behavior, `/app` to `/client` redirect for Client, role dashboard matrix, and Pro Planner org creation role update transaction.
