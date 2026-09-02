# OneHub Trust + Money Priority Plan

Date: 2026-09-02
Owner: Atlas/default
Approved by: Marlon
Canonical target: https://www.1hubevents.com
Repo: /root/.hermes/workspaces/onehub/repo

## Objective
Fix the highest-risk MVP trust and money areas first, without stalling or broad re-analysis:
1. Contract signing safety and completion flow.
2. Sign-up / invite / onboarding protection.
3. Google token protection.
4. Payment cleanup and state correctness.
5. Refund/dispute handling.
6. Admin controls and oversight.

## Guardrails
- No live-payment activation.
- No billing, credential, env, domain, public-exposure, infrastructure, production DB destructive, or legal-launch changes without Marlon approval.
- Local tests, code changes, reports, and Kanban worker execution are approved.
- Sentinel must pass before a workflow is accepted.

## Execution graph

### Lane 1 — Trust + Money setup map, then direct fixes
Assignee: Steward first, then Forge as needed.
Scope: inspect the existing contract/payment/signup/token/admin code paths just enough to identify concrete blockers and exact files/tests. No broad product audit.
Evidence: repo status, touched paths, defect list tied to tests or routes, no secrets exposed.

### Lane 2 — Contract signing protection
Assignee: Forge; verifier: Sentinel.
Acceptance: draft contracts are not signable; only correct statuses can sign; both party signatures persist; wrong roles are blocked; user-facing state is clear.

### Lane 3 — Sign-up protection
Assignee: Forge; verifier: Sentinel.
Acceptance: invite/signup paths reject token abuse, expired/reused tokens, wrong org/role joins, and unsafe callback redirects; useful error states remain.

### Lane 4 — Google token protection
Assignee: Steward/Forge; verifier: Sentinel.
Acceptance: Google provider only appears when configured; OAuth/calendar tokens are not logged/exposed, stored safely, refreshed/cleared safely, and failures do not break core auth.

### Lane 5 — Payment cleanup + refund/admin controls
Assignee: Forge; verifier: Sentinel.
Acceptance: manual/test-mode payment readiness remains safe; failed checkout does not leave fake open intents; refunds/disputes block unsafe releases; admin override has explicit acceptance and audit trail; admin screens expose actionable state.

### Lane 6 — Final trust-money workflow smoke
Assignee: Sentinel.
Acceptance: targeted tests + typecheck/build + protected/local smoke where available; repo clean and committed; final status distinguishes pilot candidate from public/live-payment readiness.

## ETA
- First concrete worker result: 30–60 minutes after dispatch.
- Contract/sign-up/token/payment/refund/admin hardening sequence: ~1–2 focused days if defects are normal code/test fixes.
- If Preview auth, credentials, Vercel protection, Stripe/live-payment, or production DB decisions are required: add founder-decision time; Atlas will stop only at that hard guardrail.
