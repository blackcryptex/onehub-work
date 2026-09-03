# ONEHUB FULL-DEPTH READINESS AUDIT

Task: `t_c9a605da`
Date: 2026-09-02
Sentinel role: final read-only synthesis after Steward, Scout, competitor, and validation-gate lanes
Canonical URL: https://www.1hubevents.com
Repo: `/root/.hermes/workspaces/onehub/repo`
Commit inspected by validation lane: `970cc473745e5aa8ec09bf310f200212b181ac0c`
Branch: `atlas/slice7-canonical-deploy`

## 1. Scope under review

Marlon asked for one more full-scale, in-depth readiness answer for the whole OneHub program:

- redundancies, inconsistencies, missing links, placeholders, and broken promises
- live readiness
- money safety
- account, token, privacy, and role-boundary safety
- user-friendliness and information overload
- competitor benchmark against leading event, wedding, venue, and service-business platforms

Guardrail: this synthesis is read-only. No production credentials, billing, infrastructure, domain, live payment setting, public exposure, destructive production DB/schema, or legal changes were made.

## 2. Evidence examined

Primary audit artifacts inspected:

- `docs/full-readiness/README.md:8-18`, `:43-53` — audit objective and acceptance criteria.
- `docs/full-readiness/steward-security-money-audit.md:68-72`, `:74-160`, `:162-347`, `:349-400` — security, money, privacy, P0/P1/P2 findings, green money controls, validation commands, and launch judgment.
- `docs/full-readiness/scout-ux-link-audit.md:38-55`, `:57-239`, `:240-399` — route/link smoke, UX findings, role-by-role status, and UX fix order.
- `docs/full-readiness/competitor-benchmark.md:9-15`, `:40-104`, `:106-179`, `:180-194` — market bar and 13 external sources.
- `docs/full-readiness/sentinel-validation-gates.md:23-56`, `:81-105`, `:107-144`, `:146-166` — repo, typecheck, tests, lint, build, stabilization, canonical smoke, and confidence limits.
- `docs/trust-money-final-status.md:16-20`, `:54-80`, `:117-137` — prior trust-money private-pilot pass and hard founder gates.
- `docs/payments.md:13-33` — older Stripe/payment documentation, still not fully aligned with the current guarded/canonical payment path.
- `docs/legal-exceptions-register.md:7-35`, `:37-84`, `:95-101` — guarded MVP exception rules and disallowed money/legal exception classes.
- `docs/stabilization/STABILITY_SCORECARD.md:5-9` — stated architecture hygiene checks.

Direct source spot-checks were also inspected to verify the highest-risk security findings rather than relying on summaries only:

- `apps/web/src/server/routers/audit.ts:3-10` and `:16-19` — `audit.list` is a `publicProcedure`; empty `orgId` produces `{}` query and returns audit log items.
- `apps/web/src/server/routers/guest.ts:10-16` — `guest.list` is a `publicProcedure` returning guests and invitations for caller-provided `eventId`.
- `apps/web/src/server/routers/checklist.ts:5-17` — checklist create/list/add/toggle are `publicProcedure` endpoints with no auth guard in the resolver.
- `apps/web/src/server/routers/membership.ts:8-11` — `getMembers` is a `publicProcedure` and includes `user: true` and `team: true` by caller-provided `orgId`.
- `apps/web/src/server/routers/event.ts:62-84` — `event.list` is a `publicProcedure`; unauthenticated callers can receive all events for an org slug.

Validation commands reported by the Sentinel gate lane:

- `pnpm run typecheck` — PASS.
- `pnpm run test` — PASS, 86 test files / 455 tests.
- `pnpm run lint` — PASS exit 0 with 331 warnings.
- `pnpm run build` — PASS, Next.js production build compiled and generated 114 static pages.
- `pnpm run stabilize` — PASS with legacy warnings.
- Canonical smoke: `https://www.1hubevents.com`, `/signin`, `/signup`, `/features`, `/support`, `/api/health` returned HTTP 200; `/app` redirected to sign-in as expected.

## 3. Direct answers for Marlon

### Is OneHub ready to go live?

No.

Sentinel verdict: NOT RELEASE-SAFE for public/live production.

OneHub is not ready for broad public launch, live real-money activation, or production privacy exposure. The strongest safe classification is:

- Demo / controlled preview: YES, with clear caveats.
- Guarded private-pilot candidate: ONLY AFTER the P0 private-data exposures are closed and the pilot remains invite-limited, monitored, and legally/payment-guarded.
- Public/live production: NO.

### Is people's money safe?

Not safe enough for public/live money.

Confirmed positive evidence: the canonical guarded money path is materially improved. Prior Sentinel trust-money closure passed targeted workflows for contract signing, signup/invite protection, Google token session protection, payment cleanup, refunds/disputes/holdbacks, and admin controls. The latest validation lanes also passed typecheck, full tests, lint gate, build, and targeted money/security tests.

Blocking caveat: live-money safety is not only Stripe math. OneHub still has legacy commercial paths that can create inconsistent contracts/signatures, public/private-data exposures that undermine account and event trust, plaintext OAuth token storage, missing production-grade rate limiting, and founder-gated legal/live-payment decisions. Therefore money is credible for a guarded private-pilot workflow after P0 closure, but not public/live safe today.

### Are accounts and private data safe?

No.

The biggest blockers are privacy/security exposures:

- public audit log access
- public guest PII/invitation access by event ID
- public checklist read/write access
- public org membership roster access
- public event list enumeration by org slug

These are enough by themselves to block public launch and to block a real private pilot until fixed or isolated behind a non-public, tightly controlled environment.

### Are all links and user flows working?

No.

Major public/auth routes mostly resolve, but not all role/user flows are coherent:

- `EVENT_DREAMER` dashboard helper maps to `/event-dreamer`, while deployed `/event-dreamer` returned 404.
- Header search is visible but has no working form, handler, or results route.
- Vendor/venue signed-out dashboard flows appear to lose role-specific callback clarity.
- Provider start can extract as nearly empty and depends heavily on client-side session checks.
- `/privacy` duplicates terms while `/terms` exists separately.
- Some dashboard tabs are local-only and not deep-linkable.

### Is the product user-friendly or too much?

Partial, but too dense for live/public readiness.

OneHub has real role paths and real product substance. It is not a hollow landing page. But the pro planner selected-event workspace and public role/story surfaces present too many layers at once for a first-time user: global nav, role nav, event tabs, commerce spine, quick lanes, operational cards, right rail, and guarded payment/legal concepts. The UX needs progressive disclosure and one obvious next action per role before public launch.

### Competitor bar: behind, meeting, or ahead?

Overall: BEHIND for public market launch.

More precise classification:

- Cvent/Eventbrite enterprise, ticketing, mobile/day-of operations: BEHIND.
- Planning Pod venue operating-system depth: BEHIND.
- Zola/Joy/The Knot/WeddingWire guest/wedding polish: BEHIND.
- HoneyBook-style service-business clientflow: PARTIAL.
- Guarded planner-provider commerce concept: POTENTIALLY DIFFERENTIATED, but not yet proven publicly and not yet release-safe.

## 4. Final verdict

Verdict: NOT RELEASE-SAFE.

Classification by launch mode:

| Mode                                                   | Verdict                | Reason                                                                                                                              |
| ------------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Demo / local proof / investor walkthrough              | PASSED WITH CAVEATS    | Build/tests pass and major public routes load; must avoid live-money/public-privacy claims.                                         |
| Protected preview with no real users or sensitive data | PARTIAL                | Technically runnable, but must clearly warn that privacy/money/UX gaps remain.                                                      |
| Guarded private pilot with invited real users          | BLOCKED UNTIL P0 FIXES | Guest/audit/member/checklist/event private data cannot be exposed to real users.                                                    |
| Live payments / real-money activation                  | NOT RELEASE-SAFE       | Canonical path is strong, but P0 privacy issues, legacy commercial paths, rate limiting, token storage, legal/payment gates remain. |
| Broad public launch                                    | FAILED                 | Fails privacy/security, UX coherence, and competitor-market proof threshold.                                                        |

## 5. P0 blockers

P0 means must fix before real users, private pilot with sensitive data, public launch, or live money.

### P0-1: Public audit-log access

Evidence:

- `apps/web/src/server/routers/audit.ts:3` imports `publicProcedure`.
- `apps/web/src/server/routers/audit.ts:7-10` defines `audit.list` as public and allows empty `orgId` to query `{}`.
- `apps/web/src/server/routers/audit.ts:16-19` returns log items and cursor.
- Steward report: `docs/full-readiness/steward-security-money-audit.md:76-92`.

Impact: exposes operational/admin history, actor IDs, org IDs, target IDs, metadata, and potentially IP/audit context.

Required fix: convert to protected/scoped admin/org access; never allow empty unauthenticated global audit listing.

### P0-2: Public guest PII and invitation exposure by event ID

Evidence:

- `apps/web/src/server/routers/guest.ts:10-16` defines public guest list query and includes guests with group, seat, and invitations.
- Steward report: `docs/full-readiness/steward-security-money-audit.md:94-110`.

Impact: names, emails, phones, dietary notes, seating, RSVP state, and invitation tokens/URLs can leak if an event ID is known or guessed.

Required fix: make guest reads protected and event-scoped; strip invitation token/URL fields from general guest-list responses.

### P0-3: Public checklist reads and writes

Evidence:

- `apps/web/src/server/routers/checklist.ts:5-17` exposes createFromTemplate, list, addItem, and toggleItem as public procedures.
- Steward report: `docs/full-readiness/steward-security-money-audit.md:112-127`.

Impact: unauthenticated callers can read or corrupt operational checklists for events.

Required fix: require event view access for reads and event manage/edit access for mutations.

### P0-4: Public org membership roster access

Evidence:

- `apps/web/src/server/routers/membership.ts:8-11` exposes `getMembers` as public and includes full user/team records.
- Steward report: `docs/full-readiness/steward-security-money-audit.md:129-142`.

Impact: exposes organization rosters and user data for arbitrary org IDs.

Required fix: make membership roster protected/org-scoped and select only safe fields.

### P0-5: Public event enumeration by org slug

Evidence:

- `apps/web/src/server/routers/event.ts:62-84` exposes `event.list` as public; unauthenticated callers get org events unless user-specific planner filtering applies.
- Steward report: `docs/full-readiness/steward-security-money-audit.md:144-160`.

Impact: exposes event IDs, names, schedules, locations, budgets/status fields, and enables follow-on attacks against ID-based public routers.

Required fix: make event listing protected/org-scoped and preserve planner/event access filtering.

## 6. P1 release-safety risks

P1 means not acceptable for live money or credible public launch; may be sequenced immediately after P0 for a controlled private pilot.

1. High-risk tRPC pattern: many authenticated/tenant operations still use `publicProcedure` with manual checks. Evidence: `docs/full-readiness/steward-security-money-audit.md:164-181`.
2. Guest/seating mutations authorize any org member rather than event manager/editor. Evidence: `docs/full-readiness/steward-security-money-audit.md:183-199`.
3. Legacy `proposal.accept` can create incomplete commercial records outside the canonical guarded payment path. Evidence: `docs/full-readiness/steward-security-money-audit.md:201-216`.
4. Legacy `/api/contracts/sign` can create signatures outside intended signer slots and lacks the stronger acceptance proof trail. Evidence: `docs/full-readiness/steward-security-money-audit.md:218-234`.
5. Google/NextAuth OAuth tokens are server-only but stored as plaintext DB fields. Evidence: `docs/full-readiness/steward-security-money-audit.md:236-251`.
6. Rate limiter exists but is not wired into sensitive endpoints and is process-local/disabled by env. Evidence: `docs/full-readiness/steward-security-money-audit.md:253-268`.
7. Admin tRPC router uses `publicProcedure` for admin operations, relying on manual `requireAdmin`. Evidence: `docs/full-readiness/steward-security-money-audit.md:270-284`.
8. Event Dreamer role dashboard route helper points to missing `/event-dreamer`. Evidence: `docs/full-readiness/scout-ux-link-audit.md:67-80`.
9. Header search input appears usable but has no action/results surface. Evidence: `docs/full-readiness/scout-ux-link-audit.md:97-109`.
10. Provider/vendor/venue auth/onboarding clarity is weak; signed-out role dashboard callbacks appear generic and provider start extracts nearly empty. Evidence: `docs/full-readiness/scout-ux-link-audit.md:82-124`.
11. Public marketing copy overpromises legal/payment maturity compared with guarded help/legal language. Evidence: `docs/full-readiness/scout-ux-link-audit.md:126-140`.
12. Pro planner workspace is functionally rich but information-dense. Evidence: `docs/full-readiness/scout-ux-link-audit.md:142-156`.
13. DIY vault lacks a plain-language safe commerce sequence. Evidence: `docs/full-readiness/scout-ux-link-audit.md:158-170`.
14. Deployed support content may promise AI chat/phone support not present in current source; requires live re-verification. Evidence: `docs/full-readiness/scout-ux-link-audit.md:172-184`.
15. Public-market proof is weak: no clear pricing/trust/security position, supply proof, reviews/favorites/comparison, guest website/RSVP/travel polish, mobile/day-of operations, integrations, or customer proof. Evidence: `docs/full-readiness/competitor-benchmark.md:159-168`.

## 7. P2 improvements and cleanup

P2 means does not alone block controlled preview, but should be addressed before stronger launch claims.

1. CSP is report-only and allows `unsafe-inline`/`unsafe-eval`. Evidence: `docs/full-readiness/steward-security-money-audit.md:288-301`.
2. Logger redaction misses camelCase/nested token names. Evidence: `docs/full-readiness/steward-security-money-audit.md:303-316`.
3. Signup password minimum is 6 characters and public role self-selection is broad. Evidence: `docs/full-readiness/steward-security-money-audit.md:318-332`.
4. Seed script prints demo credentials; seed safety exists but must never run against public/shared env. Evidence: `docs/full-readiness/steward-security-money-audit.md:334-347`.
5. `/privacy` duplicates terms while `/terms` exists separately. Evidence: `docs/full-readiness/scout-ux-link-audit.md:186-198`.
6. Public footer mixes public pages, auth-gated app pages, and redirect shims without sign-in-required labels. Evidence: `docs/full-readiness/scout-ux-link-audit.md:200-212`.
7. Admin sidebar duplicates `/admin/overview` as Dashboard and Admin. Evidence: `docs/full-readiness/scout-ux-link-audit.md:214-224`.
8. Vendor/venue/pro dashboard tabs are local-only and not deep-linkable. Evidence: `docs/full-readiness/scout-ux-link-audit.md:226-238`.
9. Lint exits 0 but carries 331 warnings. Evidence: `docs/full-readiness/sentinel-validation-gates.md:51-55`, `:127-136`.
10. Stabilization script passes blocking checks but still reports legacy Prisma/app-layer and `as any` warnings. Evidence: `docs/full-readiness/sentinel-validation-gates.md:134-136`.
11. `docs/payments.md:13-33` still describes older Stripe flows and webhook production setup in generic terms; it should be aligned with the current guarded/canonical money path before external reliance.
12. `docs/legal-exceptions-register.md:88-93` contains stale `tmp_onehub_review/...` implementation-anchor paths; the policy intent may be useful, but path accuracy is not release-grade.

## 8. What is already strong

These are confirmed strengths, not a release pass:

- Repo technical gates are green under current configuration: typecheck, tests, lint exit, build, stabilization blocking checks.
- Full test suite passed: 86 files / 455 tests.
- Production build passed and generated 114 static pages.
- Canonical public site and sampled public/auth/health routes load.
- `/app` unauthenticated smoke redirects to sign-in.
- Prior trust-money private-pilot workflow scope passed targeted Sentinel verification.
- Canonical money path has meaningful guardrails: server-derived amounts, signed/provider-backed contract requirements, payer ownership/metadata/amount checks, webhook signature/idempotency handling, platform-admin release/refund controls, refund/dispute/holdback blocking before unsafe release, and audit/admin override records.
- Help/legal/payment pages include guarded private-pilot language in several places.
- Product is real enough to demonstrate: role paths, event vaults, marketplace, requests/proposals/contracts/payments, admin verification, messages, help center, and role dashboards exist in source and/or deployed smoke.

## 9. Redundancies, inconsistencies, missing links, and broken promises

Confirmed issues:

- Route inconsistency: `EVENT_DREAMER` dashboard helper points to missing `/event-dreamer`, while the working path is `/event-dreamer/create`.
- UX redundancy: admin sidebar has two labels pointing to `/admin/overview`.
- Legal redundancy: `/privacy` includes terms while `/terms` separately exists.
- Documentation inconsistency: `docs/payments.md` is older and does not reflect the full guarded money posture from recent Sentinel trust-money work.
- Documentation path inconsistency: `docs/legal-exceptions-register.md` references `tmp_onehub_review/...` paths rather than current repo paths.
- Public-promise inconsistency: features/home copy suggests “legally sound” contracts and broadly safe held funds, while guarded legal/help pages explicitly limit payment readiness and legal guarantees.
- Support inconsistency: deployed extraction may expose AI chat/phone-support promises that the source support page does not currently support.
- Functional placeholder/no-op: header search is visible but has no action/results flow.
- UX depth issue: role dashboards and pro vault contain real features, but first-time users may not know the next safe action.

## 10. Competitor benchmark verdict

OneHub is not meeting the current public-market bar.

Competitor sources reviewed by Scout:

- Cvent event management and vendor marketplace: `docs/full-readiness/competitor-benchmark.md:42-47`, sources [1]-[2].
- Eventbrite organizer/mobile check-in: `docs/full-readiness/competitor-benchmark.md:48-52`, sources [3]-[4].
- HoneyBook event/wedding planner clientflow: `docs/full-readiness/competitor-benchmark.md:54-58`, source [5].
- Planning Pod venue operations: `docs/full-readiness/competitor-benchmark.md:60-64`, source [6].
- The Knot, WeddingWire, Zola, Joy wedding/guest tooling: `docs/full-readiness/competitor-benchmark.md:66-88`, sources [7]-[13].

OneHub is behind on:

- marketplace density, reviews, favorites, comparison, recommendations, response reliability
- guest-facing website/RSVP/invite/travel/privacy polish
- native/mobile/day-of check-in, QR scanning, onsite operations
- venue operating-system depth: BEOs, floor plans, booking calendars, F&B/menu, migration/support
- pricing, fees, integrations, support commitments, trust/security positioning, social proof

OneHub has a potentially differentiated wedge:

- safer planner-provider commerce
- guarded payment release/refund/dispute/holdback admin review
- provider-backed proposals and contract/payment readiness
- role-aware operating model across DIY, pro planner, vendor, venue, client, admin, and Event Dreamer

That wedge should be marketed as a narrow private-pilot promise, not broad public-market parity.

## 11. Recommended fix sequence for Atlas

Do not broaden the work. Fix release blockers in this order.

### Phase 1 — P0 privacy/security closure

1. Lock down `audit.list`.
2. Lock down `guest.list` and strip invitation token/URL fields from normal guest responses.
3. Lock down all checklist operations.
4. Lock down `membership.getMembers` and safe-select user fields.
5. Lock down `event.list` with org/event/planner scoping.
6. Add/extend tests proving unauthenticated and cross-tenant denial for each P0 surface.
7. Sentinel re-verifies with source inspection and targeted tests.

### Phase 2 — live-money hardening before any real payment use

1. Disable or route legacy `proposal.accept` through the canonical proposal/contract generation path.
2. Disable or harden legacy `/api/contracts/sign`; keep only intended signer-slot signing with acceptance proof.
3. Apply production-suitable rate limiting to signup, auth-adjacent, invite/search, RSVP, abuse report, and payment intent endpoints.
4. Convert high-risk manual-auth `publicProcedure` resolvers into protected/scoped procedures or procedure middleware.
5. Tighten guest/seating writes to event manager/editor access.
6. Re-run full trust-money targeted tests plus full test/type/build/lint gates.

### Phase 3 — UX/link coherence before private-pilot expansion

1. Fix Event Dreamer dashboard route.
2. Remove or wire header search.
3. Preserve vendor/venue dashboard callbacks or explain role-specific sign-in continuation.
4. Server-render clear provider-start signed-out CTAs.
5. Align public marketing copy with guarded payment/legal language.
6. Add one plain-language DIY safe-commerce sequence.
7. Reduce pro-vault cognitive load by promoting one “next real action” and hiding secondary layers progressively.
8. Re-verify canonical support page and remove chat/phone promises unless staffed and implemented.
9. Split privacy vs terms authority and de-duplicate admin sidebar.

### Phase 4 — market readiness after safety

1. Decide positioning: planner/provider commerce-first versus all-in-one wedding/guest/ticketing platform.
2. Publish clear pricing/fees/trust/payment/support/integration pages if public launch is intended.
3. Add marketplace supply proof or carefully manage empty states.
4. Decide guest website/RSVP/travel roadmap: build, defer, or explicitly say out of scope.
5. Decide mobile/day-of operations roadmap: build, integrate, or avoid Eventbrite/Cvent comparisons.
6. Add customer/social proof only when true and approved.

## 12. Founder-gated decisions

FOUNDER ESCALATION REQUIRED before any of these:

- Live Stripe/payment activation or real-money charging/releasing/refunding.
- Production credential/env changes, including Stripe, Google OAuth/Calendar, Auth/NextAuth, KMS, and encryption keys.
- Token-at-rest encryption/key-management approach for OAuth/Calendar tokens.
- Billing, infrastructure, domain, DNS, public exposure, or production deployment changes.
- Legal/public-launch claims, terms/privacy/payment/refund policy commitments, or “escrow/legal guarantee” language.
- Destructive production database/schema changes.
- Any decision to publicly compete as a full wedding/guest/ticketing platform versus a guarded planner-provider commerce pilot.
- Any staffed support promise such as phone support or AI chat.

## 13. Sentinel final judgment

Sentinel does not approve OneHub for public go-live.

Sentinel does not approve live-money activation.

Sentinel does not approve real-user private data handling until P0 private-data exposures are fixed.

Sentinel does approve this narrower statement:

OneHub has a real and improving product foundation. The build/test baseline is green, the canonical trust-money workflow is materially stronger than before, and the product can support controlled demos or tightly bounded preview work. But the program is not release-safe today because privacy/account exposures remain P0, legacy commercial paths still exist, UX/link coherence is partial, legal/payment/support copy is inconsistent, and the product is behind the public competitor bar.

## 14. Recommended next action for Atlas

Atlas should route a narrow Forge backend hardening slice for the five P0 privacy/security exposures first, with tests for unauthenticated and cross-tenant denial. After Sentinel verifies those fixes, Atlas should route the legacy commercial-path/rate-limit hardening slice, then the UX/copy/link coherence slice. Public launch, live payments, production credentials, legal/payment claims, and broad competitor positioning must remain founder-gated.
