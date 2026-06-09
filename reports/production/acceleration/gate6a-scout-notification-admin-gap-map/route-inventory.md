# Gate 6A route inventory

Task: t_3cf42da8
Workspace: `/root/.hermes/workspaces/onehub/repo`
Mode: read-only source/UX inventory; no source code edits.

## Admin page routes

Route groups named `(app)` do not appear in public URLs, so these pages resolve as `/admin/...`, not `/app/admin/...`.

- `/admin/abuse` (page) — `apps/web/src/app/(app)/admin/abuse/page.tsx`
- `/admin/overview` (page) — `apps/web/src/app/(app)/admin/overview/page.tsx`
- `/admin/users` (page) — `apps/web/src/app/(app)/admin/users/page.tsx`
- `/admin/verification` (page) — `apps/web/src/app/(app)/admin/verification/page.tsx`
- `/admin/verification/detail` (page) — `apps/web/src/app/(app)/admin/verification/detail/page.tsx`
- `/admin/verification/disputes/[id]` (page) — `apps/web/src/app/(app)/admin/verification/disputes/[id]/page.tsx`
- `/admin/verification/holdbacks/[id]` (page) — `apps/web/src/app/(app)/admin/verification/holdbacks/[id]/page.tsx`
- `/admin/verification/overrides/[id]` (page) — `apps/web/src/app/(app)/admin/verification/overrides/[id]/page.tsx`
- `/admin/verification/payouts/[id]` (page) — `apps/web/src/app/(app)/admin/verification/payouts/[id]/page.tsx`
- `/admin/verification/refunds/[id]` (page) — `apps/web/src/app/(app)/admin/verification/refunds/[id]/page.tsx`

## Admin API routes

- `/api/admin/holdbacks` — `apps/web/src/app/api/admin/holdbacks/route.ts`
- `/api/admin/holdbacks/verification` — `apps/web/src/app/api/admin/holdbacks/verification/route.ts`
- `/api/admin/impersonate` — `apps/web/src/app/api/admin/impersonate/route.ts`
- `/api/admin/override-history` — `apps/web/src/app/api/admin/override-history/route.ts`
- `/api/admin/stop-impersonate` — `apps/web/src/app/api/admin/stop-impersonate/route.ts`

## Notification routes and UI touchpoints

- `/api/notifications` — `apps/web/src/app/api/notifications/route.ts`
- `/api/notifications/[id]/read` — `apps/web/src/app/api/notifications/[id]/read/route.ts`
- Global topbar bell — `apps/web/src/components/layout/Topbar.tsx`
- Dropdown UI — `apps/web/src/components/notifications/NotificationDropdown.tsx`
- tRPC notification helper/router — `apps/web/src/server/routers/notification.ts`
- Notification schema — `apps/web/prisma/schema.prisma` model `Notification`

## Message/thread route touchpoints

- `/messages/[threadId]` (page) — `apps/web/src/app/(app)/messages/[threadId]/page.tsx`
- Thread/message schema — `apps/web/prisma/schema.prisma` models `Thread`, `ThreadParticipant`, `Message`

## Adjacent commercial/trust routes that notifications may link to

- `/requests` (page) — `apps/web/src/app/(app)/requests/page.tsx`
- `/proposals/[id]` (page) — `apps/web/src/app/(app)/proposals/[id]/page.tsx`
- `/proposals/[id]/fund` (page) — `apps/web/src/app/(app)/proposals/[id]/fund/page.tsx`
- `/contracts/[id]` (page) — `apps/web/src/app/(app)/contracts/[id]/page.tsx`
- `/events/[eventSlug]` (page) — `apps/web/src/app/(app)/events/[eventSlug]/page.tsx`
- `/events/[eventSlug]/budget` (page) — `apps/web/src/app/(app)/events/[eventSlug]/budget/page.tsx`
- `/events/[eventSlug]/checklists` (page) — `apps/web/src/app/(app)/events/[eventSlug]/checklists/page.tsx`
- `/events/[eventSlug]/guests` (page) — `apps/web/src/app/(app)/events/[eventSlug]/guests/page.tsx`
- `/events/[eventSlug]/milestones` (page) — `apps/web/src/app/(app)/events/[eventSlug]/milestones/page.tsx`
- `/events/[eventSlug]/tasks` (page) — `apps/web/src/app/(app)/events/[eventSlug]/tasks/page.tsx`

## Legacy `/app/...` routes found

These exist and may keep some old links working, but they split the route policy and increase notification click-through ambiguity.

- `/app/proposals` — `apps/web/src/app/app/proposals/page.tsx`
- `/app/proposals/[id]` — `apps/web/src/app/app/proposals/[id]/page.tsx`
- `/app/contracts` — `apps/web/src/app/app/contracts/page.tsx`
- `/app/contracts/[id]` — `apps/web/src/app/app/contracts/[id]/page.tsx`
- `/app/vault` — `apps/web/src/app/app/vault/page.tsx`
- `/app/vault/[eventSlug]` — `apps/web/src/app/app/vault/[eventSlug]/page.tsx`

## Stale or missing link targets observed

- No `/app/admin/...` page route exists in the authoritative workspace inventory, but sidebar/dashboard helpers still point admin users there.
- No `/app/events/[eventSlug]/...` page route exists in the authoritative workspace inventory, but seed/reminder notification links use `/app/events/...` for event task/checklist/milestone targets.
- No full `/notifications` or `/app/notifications` page route was found.
