# Evidence Artifact Classification — 2026-06-09

## Decision

Commit only curated Markdown evidence reports from the dirty safety snapshot. Do not commit raw/local verification dumps, screenshots, shell logs, exit-code markers, raw SQL drift previews, raw diffs, helper scripts, mock payment JSON, or files with credential-shaped content.

## Counts

- Dirty snapshot report/evidence candidates reviewed: 156
- Curated Markdown reports restored and committed: 51
- Raw/generated/local artifacts intentionally left out: 101
- Credential-shaped DB/runbook reports intentionally left out pending manual redaction: 4

## Restored curated Markdown reports

- `reports/production/acceleration/gate6a-scout-notification-admin-gap-map/gap-map.md`
- `reports/production/acceleration/gate6a-scout-notification-admin-gap-map/route-inventory.md`
- `reports/production/acceleration/gate6a-steward-backend-admin-safety/backend-admin-payment-safety.md`
- `reports/production/acceleration/gate6a-steward-backend-admin-safety/evidence.md`
- `reports/production/acceleration/gate6b-local-notifications-admin-foundation/atlas-recovery-handoff.md`
- `reports/production/acceleration/gate7-draft-trust-legal-support-anchors/evidence.md`
- `reports/production/acceleration/gate7-final-closure/ATLAS_GATE7_FINAL_CLOSURE.md`
- `reports/production/acceleration/gate7-final-closure/non-secret-env-manifest.md`
- `reports/production/acceleration/gate7-final-closure/ops-decision-register.md`
- `reports/production/acceleration/gate7-final-closure/payment-freeze-monitoring-checklist.md`
- `reports/production/acceleration/gate7-final-closure/public-trust-surface-map.md`
- `reports/production/acceleration/gate7-final-closure/sentinel-public-trust-surface-verification.md`
- `reports/production/acceleration/gate7-launch-readiness-no-provision/evidence-index.md`
- `reports/production/acceleration/gate7-launch-readiness-no-provision/launch-readiness-checklist.md`
- `reports/production/acceleration/gate7-safe-local-prework/evidence.md`
- `reports/production/gate1/phase1b/baseline-isolation/handoff.md`
- `reports/production/gate1/phase1b/baseline-typecheck-repair/repair-notes.md`
- `reports/production/gate2/GATE2_EXIT_SYNTHESIS.md`
- `reports/production/gate2/phase2b/db-target-verification/handoff.md`
- `reports/production/gate2/phase2b/db-target-verification/target-classification.md`
- `reports/production/gate2/phase2b/schema-reconciliation/handoff.md`
- `reports/production/gate2/phase2c/maintenance-mode/forge-implementation-evidence.md`
- `reports/production/gate2/phase2c/maintenance-mode/implementation-evidence.md`
- `reports/production/gate2/phase2c/migration-history-reconciliation/db-target-classification.md`
- `reports/production/gate2/phase2c/migration-history-reconciliation/handoff.md`
- `reports/production/gate2/phase2c/migration-history-reconciliation/live-readonly-schema-evidence.md`
- `reports/production/gate2/phase2c/migration-history-reconciliation/preflight-plan.md`
- `reports/production/gate2/phase2c/runbook-hardening/evidence-index.md`
- `reports/production/gate2/phase2c/runbook-hardening/maintenance-mode-recommendation.md`
- `reports/production/gate3/GATE3_EXIT_SYNTHESIS.md`
- `reports/production/gate3/phase3a/role-onboarding-audit.md`
- `reports/production/gate3/phase3b/role-selection-routing/evidence.md`
- `reports/production/gate3/phase3c/onboarding-flows/evidence.md`
- `reports/production/gate4/GATE4_EXIT_SYNTHESIS.md`
- `reports/production/gate4/phase4a/transaction-loop-map.md`
- `reports/production/gate4/phase4b/changed-files.md`
- `reports/production/gate4/phase4b/happy-path-log.md`
- `reports/production/gate4/phase4b/residual-risks-and-gate4c.md`
- `reports/production/gate4/phase4b/route-api-matrix.md`
- `reports/production/gate4/phase4c/state-machine-notes.md`
- `reports/production/gate4/phase4c/validation-evidence.md`
- `reports/production/gate5/phase5a/gate5b-recommendation.md`
- `reports/production/gate5/phase5a/milestone-examples.md`
- `reports/production/gate5/phase5a/money-state-diagram.md`
- `reports/production/gate5/phase5a/webhook-to-state-mapping.md`
- `reports/production/gate5/phase5b/payment-state-integration/evidence.md`
- `reports/production/gate5/phase5c/payment-monitoring-reconciliation/evidence.md`
- `reports/public-release/baseline-2026-06-09.md`
- `reports/public-release/dirty-tree-inventory.md`
- `reports/stabilization/p2-canonical-lifecycle/2026-06-06-steward-canonical-proposal-contract-payment-lifecycle.md`
- `reports/stabilization/source-of-truth/2026-06-06-steward-source-of-truth-checkpoint.md`

## Explicitly excluded for credential-shaped content

- `reports/production/gate2/phase2a/setup/database-operations-safety-audit.md`
- `reports/production/gate2/phase2c/runbook-hardening/migration-safety-checklist.md`
- `reports/production/gate2/phase2c/runbook-hardening/production-migration-runbook.md`
- `reports/production/gate2/phase2c/runbook-hardening/verification-results.md`

## Policy added to .gitignore

- Ignore raw report logs: `reports/**/*.log`
- Ignore exit-code markers: `reports/**/*.exit`
- Ignore screenshots: `reports/**/*.png`, `reports/**/screenshots/`
- Ignore raw diffs and SQL previews: `reports/**/*.diff`, `reports/**/*.sql`
- Ignore command result and mock payment JSON dumps: `reports/**/command-results*.json`, `reports/**/mock-*.json`

## Notes

- The safety snapshot branch `backup/dirty-snapshot` still preserves excluded artifacts for local recovery if needed.
- Excluded credential-shaped reports should be redacted before any future commit.
