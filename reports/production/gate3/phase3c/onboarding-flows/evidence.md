# OneHub Gate 3 Phase 3C — Role-Specific Onboarding Flows Evidence

Status: review-required
Scope: narrow app implementation only. No DB migrations, no live/staging DB mutations, no credential/billing/infra/production setting changes, no third-party analytics setup, no live payment actions, no Oracle work.

## Controlling inputs read

- `reports/production/gate3/phase3a/role-onboarding-audit.md`
- `reports/production/gate3/phase3b/role-selection-routing/evidence.md`

## MVP role decisions preserved

- Public signup roles remain exactly: DIY Planner, Pro Planner, Vendor, Venue.
- Client remains invite/event-linked for MVP and is not exposed as public self-service signup.
- Admin remains manual/internal provisioning only and is not exposed as public signup.
- Event Dreamer is not included in Gate 3C role onboarding; it remains outside the six MVP onboarding roles.

## Implementation evidence

### Shared role onboarding model

- `apps/web/src/lib/role-onboarding.ts` defines `GATE3C_MVP_ONBOARDING_ROLES` as exactly:
  - `DIY_PLANNER`
  - `PRO_PLANNER`
  - `VENDOR`
  - `VENUE`
  - `CLIENT`
  - `ADMIN`
- The same file defines distinct headline, summary, checklist, help text, visibility note, first trust-engine action, and local completion key for each role.
- Client visibility copy says Client is invite/event-linked for MVP and not public self-service signup.
- Admin visibility copy says Admin is manual/internal provisioning only and never public signup.

### Dashboard/onboarding surfaces

- `apps/web/src/components/onboarding/RoleOnboardingPanel.tsx` renders the role-specific onboarding panel, checklist, tooltip/help copy, first trust-engine action, visibility note, and local completion button.
- `apps/web/src/components/diy-planner/Dashboard.tsx` renders `<RoleOnboardingPanel role="DIY_PLANNER" />` above the DIY dashboard content.
- `apps/web/src/components/pro-planner/Dashboard.tsx` renders `<RoleOnboardingPanel role="PRO_PLANNER" />` above the Pro Planner dashboard content.
- `apps/web/src/components/vendor/Dashboard.tsx` renders `<RoleOnboardingPanel role="VENDOR" />` above the Vendor dashboard content.
- `apps/web/src/components/venue/Dashboard.tsx` renders `<RoleOnboardingPanel role="VENUE" />` above the Venue dashboard content.
- `apps/web/src/app/(app)/client/page.tsx` renders `<RoleOnboardingPanel role="CLIENT" source="client-portal" />` in the invite/event-linked Client portal empty state.
- `apps/web/src/app/(app)/admin/overview/page.tsx` renders `<RoleOnboardingPanel role="ADMIN" source="admin-overview" />` in the guarded Admin overview.

### First trust-engine actions by role

- DIY Planner: Create your first event.
- Pro Planner: Create or manage a client event.
- Vendor: Complete and publish your vendor profile.
- Venue: Complete and publish your venue listing.
- Client: Review your shared event context.
- Admin: Review trust oversight queues.

### Local/server-safe onboarding completion instrumentation

- `apps/web/src/lib/onboarding-completion.ts` defines `onehub.gate3c.onboarding.completed` local completion events.
- Completion events include role, completion key, checklist items, source, and an optional local hash of user id.
- Raw user id is not emitted in the event payload.
- Browser completion stores the event in `window.localStorage` under `gate3c:onboarding:<ROLE>`.
- Server/non-browser completion returns/logs only local-safe event payloads and does not configure or call any external analytics provider.

## Targeted tests added

- `apps/web/tests/gate3c-role-onboarding.test.tsx`
  - proves the six Gate 3C MVP onboarding roles are exactly DIY Planner, Pro Planner, Vendor, Venue, Client, Admin.
  - proves each role has distinct first trust-engine action content and at least three checklist items.
  - proves Client/Admin remain excluded from public signup while still having onboarding copy.
  - proves local completion event construction does not include raw user id.
  - proves the panel renders role help content and writes local completion state.

Gate 3B public signup restrictions are also still covered by:

- `apps/web/src/lib/__tests__/role-selection-routing.test.ts`
- `apps/web/tests/gate3b-role-api.test.ts`
- `apps/web/tests/gate3b-role-selection.test.tsx`

## Validation performed

Command:

```sh
pnpm -C apps/web exec vitest run tests/gate3c-role-onboarding.test.tsx src/lib/__tests__/role-selection-routing.test.ts tests/gate3b-role-api.test.ts tests/gate3b-role-selection.test.tsx
```

Result: PASS

- Test Files: 4 passed
- Tests: 23 passed
- Exit code: 0

Command:

```sh
pnpm -C apps/web typecheck
```

Result: PASS

- `tsc --noEmit`
- Exit code: 0

## Residual risk / Sentinel verification notes

- This run did not perform live browser screenshots or Playwright traces. Evidence is code + targeted unit/component tests + typecheck.
- The shared OneHub workspace is dirty with many unrelated pre-existing Gate 2/maintenance/security changes. Sentinel should verify the Gate 3C-scoped files and avoid attributing unrelated modifications to this card.
- Client and Admin onboarding are present only on their scoped/guarded surfaces; no public signup exposure was added.
- No external analytics provider was configured; completion tracking is local/server-safe only.

## Sentinel can verify Gate 3C

Yes. Sentinel can verify Gate 3C against the scoped implementation, evidence above, targeted tests, and typecheck results.
