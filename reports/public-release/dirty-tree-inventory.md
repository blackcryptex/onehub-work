# Dirty Tree Inventory and Initial Classification - 2026-06-09T06:46:10.182786+00:00

## Summary

- Modified tracked files: 84
- Untracked files/directories: 46
- Total dirty entries: 130
- Classification is initial triage; backend/payment/schema buckets require Steward review before acceptance.
- Generated/local artifacts are candidates for revert/delete.

## Buckets

### revert_delete_generated (2)
- `M` `apps/web/tsconfig.tsbuildinfo`
- `??` `apps/web/LINKCHECK.json`

### keep_release_evidence (3)
- `??` `reports/production/`
- `??` `reports/public-release/`
- `??` `reports/stabilization/`

### keep_release_docs_review (3)
- `M` `docs/devops.md`
- `??` `docs/incident-response.md`
- `??` `docs/plans/`

### steward_review_schema_migrations (5)
- `M` `apps/web/prisma/schema.prisma`
- `??` `apps/web/prisma/migrations/20260410181500_add_refund_request_and_payment_holdback/`
- `??` `apps/web/prisma/migrations/20260411160000_add_communications_foundation_indexes/`
- `??` `apps/web/prisma/migrations/20260509210000_add_dream_response/`
- `??` `apps/web/prisma/migrations/20260509212000_enable_rls_on_security_advisor_tables/`

### steward_payment_risk_review (22)
- `M` `apps/web/src/app/(app)/admin/verification/disputes/[id]/page.tsx`
- `M` `apps/web/src/app/(app)/admin/verification/holdbacks/[id]/page.tsx`
- `M` `apps/web/src/app/(app)/admin/verification/payouts/[id]/page.tsx`
- `M` `apps/web/src/app/(app)/admin/verification/refunds/[id]/page.tsx`
- `M` `apps/web/src/app/api/admin/holdbacks/route.ts`
- `M` `apps/web/src/app/api/payments/confirm/route.ts`
- `M` `apps/web/src/app/api/payments/create-intent/route.ts`
- `M` `apps/web/src/app/api/payments/release-milestone/route.ts`
- `M` `apps/web/src/app/api/stripe/webhook/route.ts`
- `M` `apps/web/src/app/legal/disputes/page.tsx`
- `M` `apps/web/src/app/legal/payments/page.tsx`
- `M` `apps/web/src/app/legal/refunds/page.tsx`
- `M` `apps/web/src/lib/dispute-case.ts`
- `M` `apps/web/src/lib/payments/payoutLock.ts`
- `M` `apps/web/src/lib/refund-request.ts`
- `??` `apps/web/src/app/(app)/admin/transactions/`
- `??` `apps/web/src/lib/payments/money-state.ts`
- `??` `apps/web/src/lib/transaction-loop.ts`
- `??` `apps/web/tests/gate4b-transaction-loop.test.ts`
- `??` `apps/web/tests/gate5b-payment-state.test.ts`
- `??` `apps/web/tests/gate5c-payment-monitoring.test.ts`
- `??` `scripts/gate5c-payment-reconciliation.mjs`

### steward_auth_api_review (17)
- `M` `apps/web/src/app/(auth)/signup/page.tsx`
- `M` `apps/web/src/app/api/admin/impersonate/route.ts`
- `M` `apps/web/src/app/api/admin/stop-impersonate/route.ts`
- `M` `apps/web/src/app/api/auth/signup/route.ts`
- `M` `apps/web/src/app/api/contracts/[id]/sign/route.ts`
- `M` `apps/web/src/app/api/contracts/from-proposal/route.ts`
- `M` `apps/web/src/app/api/contracts/sign/route.ts`
- `M` `apps/web/src/app/api/diy/events/route.ts`
- `M` `apps/web/src/app/api/events/[eventSlug]/route.ts`
- `M` `apps/web/src/app/api/health/route.ts`
- `M` `apps/web/src/app/api/orgs/create/route.ts`
- `M` `apps/web/src/app/api/proposals/[id]/approve/route.ts`
- `M` `apps/web/src/app/api/users/search/route.ts`
- `M` `apps/web/src/lib/auth.ts`
- `M` `apps/web/src/middleware.ts`
- `??` `apps/web/src/app/api/bookings/respond/`
- `??` `apps/web/tests/auth-session-impersonation-security.test.ts`

### scout_trust_surface_review (7)
- `M` `apps/web/src/app/legal/booking-classification/page.tsx`
- `M` `apps/web/src/app/legal/fees/page.tsx`
- `M` `apps/web/src/app/privacy/page.tsx`
- `M` `apps/web/src/app/support/page.tsx`
- `M` `apps/web/src/app/terms/page.tsx`
- `M` `apps/web/src/components/legal/LegalNotice.tsx`
- `??` `apps/web/src/components/legal/DraftLegalPageNotice.tsx`

### forge_ui_feature_review (36)
- `M` `apps/web/src/app/(app)/admin/overview/page.tsx`
- `M` `apps/web/src/app/(app)/admin/verification/overrides/[id]/page.tsx`
- `M` `apps/web/src/app/(app)/admin/verification/page.tsx`
- `M` `apps/web/src/app/(app)/contracts/[id]/page.tsx`
- `M` `apps/web/src/app/(app)/proposals/[id]/page.tsx`
- `M` `apps/web/src/app/(app)/requests/page.tsx`
- `M` `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`
- `M` `apps/web/src/app/app/page.tsx`
- `M` `apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx`
- `M` `apps/web/src/app/help/page.tsx`
- `M` `apps/web/src/app/marketplace/page.tsx`
- `M` `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx`
- `M` `apps/web/src/app/providers/onboarding/page.tsx`
- `M` `apps/web/src/app/vendor-venue/setup/page.tsx`
- `M` `apps/web/src/components/admin/ImpersonateButton.tsx`
- `M` `apps/web/src/components/admin/ImpersonationBanner.tsx`
- `M` `apps/web/src/components/contracts/SignContractButton.tsx`
- `M` `apps/web/src/components/diy-planner/Dashboard.tsx`
- `M` `apps/web/src/components/events/EventActions.tsx`
- `M` `apps/web/src/components/layout/Footer.tsx`
- `M` `apps/web/src/components/layout/LandingHeader.tsx`
- `M` `apps/web/src/components/layout/Sidebar.tsx`
- `M` `apps/web/src/components/notifications/NotificationDropdown.tsx`
- `M` `apps/web/src/components/pro-planner/Dashboard.tsx`
- `M` `apps/web/src/components/proposals/GenerateProposalButton.tsx`
- `M` `apps/web/src/components/shortlist/AddToShortlistButtonClient.tsx`
- `M` `apps/web/src/components/vault/AiSourceVendorsVenuesPanel.tsx`
- `M` `apps/web/src/components/vault/DemoTour.tsx`
- `M` `apps/web/src/components/vendor/Dashboard.tsx`
- `M` `apps/web/src/components/venue/Dashboard.tsx`
- `??` `apps/web/src/app/(app)/admin/audit/`
- `??` `apps/web/src/app/(app)/client/page.tsx`
- `??` `apps/web/src/app/(app)/notifications/`
- `??` `apps/web/src/app/maintenance/`
- `??` `apps/web/src/components/bookings/ProviderBookingResponseControls.tsx`
- `??` `apps/web/src/components/onboarding/`

### forge_infra_test_review (4)
- `M` `apps/web/.env.example`
- `M` `scripts/reminders.ts`
- `M` `scripts/seed.ts`
- `M` `vitest.config.ts`

### needs_manual_review (31)
- `M` `apps/web/src/lib/acceptance.ts`
- `M` `apps/web/src/lib/errorTracker.ts`
- `M` `apps/web/src/lib/logger.ts`
- `M` `apps/web/src/lib/routes.ts`
- `M` `apps/web/src/server/eventVault.select.ts`
- `M` `apps/web/src/server/lib/activity.ts`
- `M` `apps/web/src/server/routers/admin.ts`
- `M` `apps/web/src/server/routers/contract.ts`
- `M` `apps/web/src/server/routers/guest.ts`
- `M` `apps/web/src/server/routers/notification.ts`
- `M` `apps/web/src/server/routers/proposal.ts`
- `??` `apps/web/src/lib/__tests__/gate7-launch-safety.test.ts`
- `??` `apps/web/src/lib/__tests__/maintenance.test.ts`
- `??` `apps/web/src/lib/__tests__/role-selection-routing.test.ts`
- `??` `apps/web/src/lib/admin-oversight.ts`
- `??` `apps/web/src/lib/event-delete-lifecycle.ts`
- `??` `apps/web/src/lib/maintenance.ts`
- `??` `apps/web/src/lib/onboarding-completion.ts`
- `??` `apps/web/src/lib/role-onboarding.ts`
- `??` `apps/web/src/lib/signup-roles.ts`
- `??` `apps/web/src/server/events/`
- `??` `apps/web/src/server/lib/lifecycle/`
- `??` `apps/web/tests/event-delete-dependents.test.ts`
- `??` `apps/web/tests/event-delete-lifecycle-ui.test.ts`
- `??` `apps/web/tests/gate3b-role-api.test.ts`
- `??` `apps/web/tests/gate3b-role-selection.test.tsx`
- `??` `apps/web/tests/gate3c-role-onboarding.test.tsx`
- `??` `apps/web/tests/gate6b-admin-notifications-foundation.test.ts`
- `??` `apps/web/tests/gate7-trust-legal-support-anchors.test.ts`
- `??` `apps/web/tests/p2-canonical-lifecycle.test.ts`
- `??` `apps/web/tests/users-search-role-security.test.ts`
