# Snapshot Reconciliation — 2026-06-12

Repo: /root/.hermes/workspaces/onehub/repo
Branch: cleanup/accelerated
Baseline (validated snapshot): 3f01372 "WIP: dirty tree snapshot before cleanup"
Reconciled from HEAD: 78aa601
Author of reconciliation: Forge (assigned by Atlas; triggered by Sentinel findings)

## Decision rule

Every file in `git diff 3f01372..78aa601` was classified as either:

- KEEP — intentional approved cleanup (evidence-classification / redaction policy of
  commits 38ce119 and 572a65d, or the ignore-policy .gitignore lines). Left at HEAD state.
- RESTORE — product work dropped during commit slicing. Restored byte-for-byte from
  3f01372 via `git checkout 3f01372 -- apps/web docs scripts`.

Default was RESTORE when uncertain. The restore covers the entire `apps/web`, `docs`,
and `scripts` trees because every post-snapshot commit was sliced *from* the snapshot:
inspection showed all HEAD-side deltas in those trees were losses of snapshot content
(canonical proposal/contract/payment lifecycle wiring, money-state payment safety,
typed UnsafeAny casts, admin nav and pages, marketplace filters, onboarding panels,
logger redaction list, env/doc hardening), not new work. The only true post-snapshot
additions were the evidence-classification doc and the .gitignore policy — both kept.

## Key restorations (Sentinel findings, all confirmed and restored)

- apps/web/src/app/(app)/admin/audit/page.tsx
- apps/web/src/app/(app)/admin/transactions/page.tsx
- apps/web/src/app/(app)/client/page.tsx (routes.ts/tests still expect /client)
- apps/web/src/app/api/bookings/respond/route.ts
- apps/web/src/components/bookings/ProviderBookingResponseControls.tsx (re-mounted in requests page)
- apps/web/prisma/migrations/20260410181500_add_refund_request_and_payment_holdback/migration.sql
- apps/web/prisma/migrations/20260411160000_add_communications_foundation_indexes/migration.sql
- apps/web/prisma/migrations/20260509210000_add_dream_response/migration.sql
- apps/web/prisma/migrations/20260509212000_enable_rls_on_security_advisor_tables/migration.sql
- apps/web/prisma/schema.prisma (DreamResponse model + enums, Thread/Message/ThreadParticipant
  indexes/relations, User/Organization/Event relation fields)

File restorations only. No prisma migrate / db push / any DB command was run.

## Validation (all at the reconciled tree)

- pnpm stabilize — PASS (all checks)
- pnpm -C apps/web typecheck — PASS (clean)
- pnpm test — PASS (27 files, 171 tests)
- pnpm -C apps/web build — PASS; /client, /admin/audit, /admin/transactions and
  /api/bookings/respond all present in the route manifest

No fixes beyond the snapshot-state restoration were needed.

## Classification counts

- Total files in diff: 179
- RESTORE (lost product work, restored from 3f01372): 74
- KEEP (intentional approved cleanup, left at HEAD): 105

## Full classification table

| Status | File | Classification | Reason |
|---|---|---|---|
| M | `.gitignore` | KEEP | Intentional approved cleanup: ignore policy for raw report artifacts (logs, exit markers, screenshots, diffs, SQL, helper scripts, JSON/TXT dumps) per evidence-classification decision (commits 38ce119/572a65d). |
| M | `apps/web/.env.example` | RESTORE | Lost product work: snapshot version documents non-secret placeholders (canonical URL, ONEHUB_MAINTENANCE_MODE, error-tracking, rate-limit) and safer localhost DATABASE_URL example; HEAD reverted to stale Supabase-host example. Restored. |
| D | `apps/web/prisma/migrations/20260410181500_add_refund_request_and_payment_holdback/migration.sql` | RESTORE | Lost product work: committed Prisma migration history dropped during commit slicing. Restored as files only; no DB command run. |
| D | `apps/web/prisma/migrations/20260411160000_add_communications_foundation_indexes/migration.sql` | RESTORE | Lost product work: committed Prisma migration history dropped during commit slicing. Restored as files only; no DB command run. |
| D | `apps/web/prisma/migrations/20260509210000_add_dream_response/migration.sql` | RESTORE | Lost product work: committed Prisma migration history dropped during commit slicing. Restored as files only; no DB command run. |
| D | `apps/web/prisma/migrations/20260509212000_enable_rls_on_security_advisor_tables/migration.sql` | RESTORE | Lost product work: committed Prisma migration history dropped during commit slicing. Restored as files only; no DB command run. |
| M | `apps/web/prisma/schema.prisma` | RESTORE | Lost product work: HEAD diff vs snapshot was pure deletions (DreamResponse model + 3 enums, Thread/Message/ThreadParticipant indexes and relations, User/Org/Event relation fields). Restored to snapshot state. |
| D | `apps/web/src/app/(app)/admin/audit/page.tsx` | RESTORE | Lost product work: admin audit log page deleted during slicing; admin overview and Sidebar in snapshot link to /admin/audit. |
| M | `apps/web/src/app/(app)/admin/overview/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| D | `apps/web/src/app/(app)/admin/transactions/page.tsx` | RESTORE | Lost product work: admin transactions page deleted during slicing; linked from admin overview and Sidebar. |
| M | `apps/web/src/app/(app)/admin/verification/detail/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/(app)/admin/verification/disputes/[id]/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/(app)/admin/verification/holdbacks/[id]/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/(app)/admin/verification/overrides/[id]/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/(app)/admin/verification/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/(app)/admin/verification/payouts/[id]/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/(app)/admin/verification/refunds/[id]/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| D | `apps/web/src/app/(app)/client/page.tsx` | RESTORE | Lost product work: client landing page deleted; lib/routes.ts dashboard(CLIENT) still returns /client and gate3b tests expect it. |
| M | `apps/web/src/app/(app)/disputes/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/(app)/requests/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/ai/source-vendors-venues/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| D | `apps/web/src/app/api/bookings/respond/route.ts` | RESTORE | Lost product work: provider booking-response API deleted; ProviderBookingResponseControls posts to it. |
| M | `apps/web/src/app/api/contracts/[id]/sign/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/contracts/from-proposal/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/contracts/sign/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/events/[eventSlug]/deposits/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/events/[eventSlug]/stakeholders/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/events/create/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/google/calendar/create-or-use/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/google/callback/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/google/connect/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/google/events/overlay/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/google/status/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/google/sync/push/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/health/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/orgs/create/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/payments/confirm/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/payments/create-intent/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/payments/release-milestone/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/proposals/[id]/approve/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/providers/profile/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/stripe/webhook/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/api/vendors/search/route.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/app/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/marketplace/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/vendor-venue/setup/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/app/venue/dashboard/page.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| D | `apps/web/src/components/bookings/ProviderBookingResponseControls.tsx` | RESTORE | Lost product work: provider booking response UI deleted; mounted by (app)/requests/page.tsx in snapshot. |
| M | `apps/web/src/components/contracts/SignContractButton.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/diy-planner/Dashboard.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/events/EventActions.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/layout/Sidebar.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/notifications/NotificationDropdown.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/onboarding/RoleOnboardingPanel.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/pro-planner/Dashboard.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/proposals/GenerateProposalButton.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/shortlist/AddToShortlistButtonClient.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/vault/AiSourceVendorsVenuesPanel.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/vault/DemoTour.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/vendor/Dashboard.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/components/venue/Dashboard.tsx` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/lib/acceptance.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/lib/dispute-case.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/lib/logger.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/lib/refund-request.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/server/routers/contract.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/server/routers/dispute.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/server/routers/proposal.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `apps/web/src/server/routers/shortlist.ts` | RESTORE | Lost product work: file partially reverted to pre-hardening state during commit slicing (lost canonical lifecycle/money-state wiring, typed casts, nav/UX, or hardening). Restored to snapshot state. |
| M | `docs/devops.md` | RESTORE | Lost product work: HEAD reverted devops doc to stale pre-hardening text (Sentry-as-configured, rate-limiting claims). Snapshot version is the hardened provider-neutral version; restored. |
| D | `docs/incident-response.md` | RESTORE | Lost product work: incident response runbook draft (gate7 launch-readiness deliverable) deleted during slicing. |
| D | `docs/plans/2026-06-08-public-release-hardening-escalated-plan.md` | RESTORE | Lost product work: approved public-release hardening plan document deleted during slicing. |
| D | `reports/production/acceleration/gate6a-scout-notification-admin-gap-map/screenshots/admin-overview-localhost3001.png` | KEEP | Intentional approved cleanup: screenshot excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/acceleration/gate6a-scout-notification-admin-gap-map/screenshots/admin-verification-localhost3001.png` | KEEP | Intentional approved cleanup: screenshot excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/acceleration/gate6a-scout-notification-admin-gap-map/screenshots/notification-dropdown-empty-localhost3001.png` | KEEP | Intentional approved cleanup: screenshot excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/acceleration/gate6b-local-notifications-admin-foundation/gate6b-relevant-status.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/acceleration/gate6b-local-notifications-admin-foundation/gate6b-relevant.diff` | KEEP | Intentional approved cleanup: raw diff excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| A | `reports/production/evidence-classification-2026-06-09.md` | KEEP | Intentional addition: documents the curated-evidence commit policy; kept. |
| D | `reports/production/gate1/phase1b/baseline-isolation/build.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/build.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/cleanup-classification.json` | KEEP | Intentional approved cleanup: raw JSON dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/final-diff-name-status.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/final-diff-stat.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/final-git-status.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/post-clean-pre-validation-diff-name-status.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/post-clean-pre-validation-diff-stat.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/post-clean-pre-validation-git-status.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/pre-clean-diff-name-status.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/pre-clean-diff-stat.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/pre-clean-git-status.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/pre-clean-untracked.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/typecheck.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/typecheck.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-isolation/validation-summary.json` | KEEP | Intentional approved cleanup: raw JSON dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-typecheck-repair/build.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-typecheck-repair/git-diff-name-only.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-typecheck-repair/git-diff-stat.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-typecheck-repair/git-status-short.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-typecheck-repair/test.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-typecheck-repair/typecheck.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/baseline-typecheck-repair/validation-summary.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/build.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/build.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/build.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/build.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/git-diff-name-status.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/git-diff-stat.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/git-status.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/recovery-summary.json` | KEEP | Intentional approved cleanup: raw JSON dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/stabilize.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/stabilize.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/test.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/test.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/typecheck.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/recovery/typecheck.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/build.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/build.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/git-diff-name-status.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/git-diff-stat.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/git-status.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/router-prisma-audit.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/router-recovery-summary.json` | KEEP | Intentional approved cleanup: raw JSON dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/stabilize.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/stabilize.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/test.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/test.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/typecheck.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/router-recovery/typecheck.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/stabilize.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/stabilize.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/test.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/test.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/typecheck.exit` | KEEP | Intentional approved cleanup: exit-code marker excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate1/phase1b/typecheck.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| M | `reports/production/gate2/phase2a/setup/database-operations-safety-audit.md` | KEEP | Intentional approved cleanup: credential-shaped content redacted before commit ([REDACTED] placeholders) per evidence-classification decision. Keeping redacted version. |
| D | `reports/production/gate2/phase2b/db-target-verification/classify_db_target.py` | KEEP | Intentional approved cleanup: local helper script excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/db-target-verification/command-results.json` | KEEP | Intentional approved cleanup: raw JSON dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/db-target-verification/drift-result.json` | KEEP | Intentional approved cleanup: raw JSON dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/db-target-verification/live-drift-preview.sql` | KEEP | Intentional approved cleanup: raw SQL drift preview excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/db-target-verification/prisma-migrate-diff.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/db-target-verification/prisma-migrate-status.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/db-target-verification/psql-readonly-metadata.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/db-target-verification/run_drift_preview.py` | KEEP | Intentional approved cleanup: local helper script excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/db-target-verification/run_readonly_verification.py` | KEEP | Intentional approved cleanup: local helper script excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/db-target-verification/target-classification.json` | KEEP | Intentional approved cleanup: raw JSON dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/schema-reconciliation/live-drift-preview-after.sql` | KEEP | Intentional approved cleanup: raw SQL drift preview excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/schema-reconciliation/migration-checksums.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/schema-reconciliation/prisma-generate.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/schema-reconciliation/prisma-migrate-diff.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/schema-reconciliation/prisma-migrate-status.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/schema-reconciliation/prisma-validate.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2b/schema-reconciliation/typecheck.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2c/migration-history-reconciliation/command-results.txt` | KEEP | Intentional approved cleanup: raw TXT dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2c/migration-history-reconciliation/live-drift-preview-after-resolve.sql` | KEEP | Intentional approved cleanup: raw SQL drift preview excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2c/migration-history-reconciliation/live-drift-preview-before-resolve.sql` | KEEP | Intentional approved cleanup: raw SQL drift preview excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2c/migration-history-reconciliation/prisma-generate-after.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2c/migration-history-reconciliation/prisma-migrate-diff-after.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2c/migration-history-reconciliation/prisma-migrate-diff-before.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2c/migration-history-reconciliation/prisma-migrate-resolve-applied.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2c/migration-history-reconciliation/prisma-migrate-status-after.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2c/migration-history-reconciliation/prisma-migrate-status-before.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2c/migration-history-reconciliation/prisma-validate-after.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate2/phase2c/migration-history-reconciliation/typecheck-after.log.md` | KEEP | Intentional approved cleanup: raw Markdown log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| M | `reports/production/gate2/phase2c/runbook-hardening/production-migration-runbook.md` | KEEP | Intentional approved cleanup: credential-shaped content redacted before commit ([REDACTED] placeholders) per evidence-classification decision. Keeping redacted version. |
| M | `reports/production/gate2/phase2c/runbook-hardening/verification-results.md` | KEEP | Intentional approved cleanup: credential-shaped content redacted before commit ([REDACTED] placeholders) per evidence-classification decision. Keeping redacted version. |
| D | `reports/production/gate5/phase5c/payment-monitoring-reconciliation/mock-local-payments.json` | KEEP | Intentional approved cleanup: raw JSON dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate5/phase5c/payment-monitoring-reconciliation/mock-stripe-payments.json` | KEEP | Intentional approved cleanup: raw JSON dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/production/gate5/phase5c/payment-monitoring-reconciliation/reconciliation-report.json` | KEEP | Intentional approved cleanup: raw JSON dump excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/public-release/delete-review-2026-06-09/inventory.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/public-release/final-verify-2026-06-09-rerun/build.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/public-release/final-verify-2026-06-09-rerun/route-smoke.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/public-release/final-verify-2026-06-09-rerun/stabilize.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/public-release/final-verify-2026-06-09-rerun/summary.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/public-release/final-verify-2026-06-09-rerun/test.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/public-release/final-verify-2026-06-09-rerun/typecheck.log` | KEEP | Intentional approved cleanup: raw log excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `reports/stabilization/p3-payment-safety.diff` | KEEP | Intentional approved cleanup: raw diff excluded by evidence-classification ignore policy; preserved on backup/dirty-snapshot. |
| D | `scripts/gate5c-payment-reconciliation.mjs` | RESTORE | Lost product work: gate5c payment reconciliation ops script deleted during slicing; companion to gate5c monitoring deliverable. |
| M | `scripts/reminders.ts` | RESTORE | Lost product work: HEAD changed notification links to /app/events/* which is wrong (events pages live in the (app) route group, URL is /events/*). Snapshot links restored. |

Status legend: M = modified in HEAD vs snapshot, D = deleted in HEAD vs snapshot,
A = added in HEAD vs snapshot. RESTORE rows are now identical to 3f01372;
KEEP rows remain at HEAD state. Excluded raw artifacts remain recoverable on
branch backup/dirty-snapshot.
