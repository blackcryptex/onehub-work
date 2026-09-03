# OneHub Full-Depth Readiness Audit Plan

Date: 2026-09-02
Owner: Atlas/default
Canonical target: https://www.1hubevents.com
Repo: /root/.hermes/workspaces/onehub/repo

## Objective
Run one full-scale, in-depth readiness analysis of the entire OneHub program before any broader launch decision.

Marlon's questions to answer:
- Are all links and user flows working?
- Is people's money safe?
- Are accounts, tokens, private data, and role boundaries safe?
- Is the product user-friendly, or too dense/confusing?
- Are there redundancies, inconsistencies, missing links, placeholders, or broken promises?
- Compared with leading event/wedding/business platforms, is OneHub meeting, lagging, or exceeding the bar?
- Is OneHub ready to go live, and if not, exactly what blocks it?

## Scope
Read-only audit unless Marlon separately approves remediation. This audit may run tests, builds, source inspection, browser/link smoke, and web research. It must not change production credentials, billing, infrastructure, domains, live payment settings, public exposure, or production DB/schema.

## Audit lanes

1. **Steward — Code/security/data/money line-by-line audit**
   - Inspect auth, RBAC, tenant boundaries, Prisma schema, API routes, contracts, payments, refunds, disputes, admin controls, logging, tokens, PII, seed/demo data, and storage.
   - Output: `docs/full-readiness/steward-security-money-audit.md`.

2. **Scout — UX, links, navigation, user-friendliness audit**
   - Inspect deployed canonical site plus source route map for all key roles: public, signup/signin, DIY/client, pro planner, vendor, venue, admin.
   - Check broken links, no-op buttons, placeholders, confusing flows, information overload, and missing handoffs.
   - Output: `docs/full-readiness/scout-ux-link-audit.md`.

3. **Scout — Internet/competitor benchmark**
   - Ground with current web sources on Cvent, Eventbrite, HoneyBook, Planning Pod, The Knot/Zola/WeddingWire/Joy-style expectations.
   - Compare OneHub by capability, trust/money safety, usability, marketplace, contracts, payments, admin controls, onboarding, and operational depth.
   - Output: `docs/full-readiness/competitor-benchmark.md` with citations.

4. **Sentinel — Validation gate bundle**
   - Run clean repo checks, typecheck, tests, build, lint, route/test inventory, and safe smoke checks. Confirm no dirty tree and summarize confidence limits.
   - Output: `docs/full-readiness/sentinel-validation-gates.md`.

5. **Sentinel — Final readiness synthesis**
   - Integrate all reports into `ONEHUB_FULL_DEPTH_READINESS_AUDIT.md`.
   - Verdict must classify: public/live-production ready, private-pilot candidate, demo-only, or blocked.
   - Must list P0/P1/P2 blockers, exact files/routes/evidence, competitor bar, and recommended fix order.

## Acceptance criteria
- Evidence-first findings with exact file paths/routes/commands/sources.
- No vague "looks good" claims.
- Every finding ranked by severity and business impact.
- Clear distinction between code-scope readiness, protected Preview/private-pilot readiness, live payments, and public/legal launch.
- Final report is durable in the repo and Sentinel-owned.
