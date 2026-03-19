# Typecheck Summary

- Total errors: **59**
- Top offending files:

  - `src/server/routers/search.ts`: 17
  - `src/components/panes/CalendarPane.tsx`: 14
  - `src/server/routers/calendar.ts`: 7
  - `src/server/routers/ai.ts`: 3
  - `src/server/routers/event.ts`: 3
  - `scripts/verifyLinks.ts`: 2
  - `src/components/EventActionBar.tsx`: 2
  - `src/server/routers/activity.ts`: 2
  - `src/server/routers/admin.ts`: 2
  - `scripts/codemods/fix-unused-vars.ts`: 1

## Error Buckets

### Routers — 39 errors

- `src/server/routers/search.ts`: 17
- `src/server/routers/calendar.ts`: 7
- `src/server/routers/ai.ts`: 3
- `src/server/routers/event.ts`: 3
- `src/server/routers/activity.ts`: 2
- `src/server/routers/admin.ts`: 2
- `src/app/api/google/calendar/create-or-use/route.ts`: 1
- `src/app/api/google/events/overlay/route.ts`: 1
- `src/app/api/google/sync/push/route.ts`: 1
- `src/app/api/orgs/create/route.ts`: 1
- `src/app/api/stripe/webhook/route.ts`: 1

**Fast wins**:
- Add Zod schemas + typed Prisma selects; stop returning raw Prisma objects.

### Calendar Pane/Components — 17 errors

- `src/components/panes/CalendarPane.tsx`: 14
- `src/components/EventActionBar.tsx`: 2
- `src/app/(app)/events/[eventSlug]/tasks/page.tsx`: 1

**Fast wins**:
- Type calendar pane props/hooks and FullCalendar plugin arrays explicitly.

### Helper Scripts — 3 errors

- `scripts/verifyLinks.ts`: 2
- `scripts/codemods/fix-unused-vars.ts`: 1

**Fast wins**:
- Replace regex codemods with typed parsing/writers.

## Common Error Kinds

- 28 × TS18046 'where' is of type 'unknown'.
- 10 × TS18046 'ge' is of type 'unknown'.
- 5 × TS18046 'error' is of type 'unknown'.
- 2 × TS18046 'e' is of type 'unknown'.
- 2 × TS2322 Type 'unknown[]' is not assignable to type 'PluginDef[]'.

## Next Steps

1. Harden server routers with schema-validated DTOs.
2. Restore calendar pane typing (plugins, error handlers).
3. Refactor helper scripts to use typed parsing instead of blind regex replacements.
4. Re-run `npm run typecheck` after each bucket to verify progress.