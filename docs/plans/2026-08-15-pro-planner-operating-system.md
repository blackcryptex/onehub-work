# Pro Planner Operating System Production-Grade Implementation Plan

> **For Hermes:** Use autonomous assets and narrow implementation/review lanes. Atlas owns scope, guardrails, final verification, and founder checkpoints.

**Goal:** Build OneHub Pro Planner into a production-grade operating system for professional event planners and agencies.

**Architecture:** Extend existing OneHub data models and routes first, then add narrow migrations only where the existing schema cannot safely represent production behavior. The top-level `/pro/planner` becomes the agency operating home; event-specific `/pro/planner/vault/[eventSlug]` remains the command center for event execution. All money, contract, client, vendor, file, and assistant features must preserve OneHub’s trust engine and role boundaries.

**Tech Stack:** Next.js App Router, React/TypeScript, Prisma, existing OneHub RBAC/auth helpers, existing organization/event/listing/proposal/contract/payment/thread/notification models, Vitest/Testing Library, ESLint, Next production build.

---

## Founder approval and guardrails

**Approved by:** Marlon via Telegram on 2026-08-15.

Atlas may autonomously:

- Modify OneHub application code inside the approved Pro Planner OS scope.
- Add tests, docs, local-only verification scripts, and safe local migrations.
- Commit scoped, verified work.
- Use Scout, Forge, Sentinel, and Steward/Stewart assets.

Atlas must ask before:

- Pushing or deploying.
- Moving domains or changing Vercel project settings.
- Changing production environment variables.
- Touching billing/live-money/Stripe production settings.
- Publicly exposing dashboards, files, controls, credentials, or internal systems.
- Running destructive production database actions.
- Changing OneHub’s business model or trust/legal acceptance rules.

---

## Existing platform assets to build on

Existing schema/routes already support much of the operating system foundation:

- **Agency/team:** `Organization`, `Team`, `Membership`, `Invite`, `OrgRole`, `StaffRole`, `AuditLog`.
- **Events:** `Event`, `EventStakeholder`, `EventShare`, `Task`, `Milestone`, `Checklist`, `Activity`.
- **Clients:** event stakeholders, event shares, tasks, threads/messages, notifications.
- **Vendors/venues:** `Listing`, `AvailabilitySlot`, `BookingRequest`, `ShortlistItem`, `Proposal`, listing reviews/media.
- **Contracts/payments:** `Proposal`, `PaymentMilestone`, `Contract`, `Signature`, `PaymentIntent`, `EscrowAccount`, disputes/refunds/holdbacks/payouts.
- **Files/documents:** `Media` and message attachment JSON exist; production file access model needs review before public upload expansion.
- **Communications:** `Thread`, `ThreadParticipant`, `Message`, `Notification`.
- **Oversight/trust:** `AuditLog`, admin verification pages/routes, dispute/refund/payment holdback models.

---

## Production-grade build phases and checkpoints

### Phase 0 — Blueprint, asset split, acceptance gates

**Timeline:** 0.5–1 build day.

**Objective:** Create the executable build map before broad code changes.

**Work:**

1. Inventory existing Pro Planner, event vault, marketplace, billing, messaging, notification, membership, invite, and payment surfaces.
2. Identify exact migrations needed versus existing-model reuse.
3. Define role/permission matrix for owner planner, lead planner, assistant/coordinator, client, vendor/venue, admin.
4. Define acceptance gates and verification commands for every subsystem.
5. Split lanes across assets:
   - Scout: inventory/gaps.
   - Forge: implementation map and code lanes.
   - Sentinel: safety/acceptance review.
   - Steward/Stewart: evidence packaging and cleanup if needed.

**Files:**

- Create: `docs/plans/2026-08-15-pro-planner-operating-system.md`
- Later likely: `docs/pro-planner-os/acceptance-gates.md`
- Later likely: `docs/pro-planner-os/role-matrix.md`

**Acceptance:**

- Plan exists and is committed.
- Repo/worktree clean after the plan commit.
- Asset lanes are dispatched or ready with bounded prompts.

**Checkpoint with Marlon:** Phase 0 report after plan commit and clean repo check.

---

### Phase 1 — Full Pro Planner OS layout and route shell

**Timeline:** 1–2 build days.

**Objective:** Turn `/pro/planner` from a dashboard into the complete operating-system navigation and shell without fake panels.

**Build:**

- Command Center
- Events
- Team
- Clients
- Vendors/Venues
- Timeline
- Contracts
- Payments
- Files
- Services
- Availability
- Reports
- Settings

**Likely files:**

- Modify: `apps/web/src/components/pro-planner/Dashboard.tsx`
- Modify: `apps/web/src/app/pro/planner/page.tsx`
- Create/modify: `apps/web/tests/pro-planner-dashboard-buildout.test.tsx`
- Possibly create: `apps/web/src/components/pro-planner/sections/*.tsx`
- Possibly create: `apps/web/src/lib/pro-planner-os/*.ts`

**Acceptance:**

- No `coming soon`, generic placeholder copy, dead tabs, or fake live data.
- Every section uses real data or explicit useful empty states with real next actions.
- Every CTA links to a real route or a safe setup route.
- Tests cover all top-level sections.

**Verification:**

- `pnpm exec vitest run --config apps/web/vitest.config.ts apps/web/tests/pro-planner-dashboard-buildout.test.tsx`
- `pnpm typecheck`
- `pnpm lint`
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build`
- `git diff --check`
- placeholder scan
- secret scan

**Checkpoint with Marlon:** End of Phase 1 after tests/build and clean commit.

---

### Phase 2 — Agency team, assistant/co-planner, and safe task ownership

**Timeline:** 2–3 build days.

**Objective:** Make Pro Planner support real agency/team operation.

**Build:**

- Team roster surface using `Membership`, `Team`, and `Invite`.
- Assistant/co-planner invite flow if existing invite router supports it; otherwise add safe minimal endpoints.
- Event assignment using `EventStakeholder` and/or task `assigneeId`.
- Task ownership controls.
- Role boundaries that prevent assistants from money/contract actions unless explicitly permitted.
- Audit/activity entries for invite, assignment, and permission-sensitive changes.

**Likely files:**

- `apps/web/src/server/routers/membership.ts`
- `apps/web/src/server/routers/invite.ts`
- `apps/web/src/app/api/users/invite-client/route.ts` or new invite route if required
- `apps/web/src/app/api/events/[eventSlug]/stakeholders/route.ts`
- `apps/web/src/components/pro-planner/*`
- `apps/web/tests/*team*.test.tsx` / route tests

**Migration expectation:** Maybe. Existing `Membership`, `Team`, `Invite`, `Task.assigneeId`, `EventStakeholder` may be enough for MVP. Production permissions may require an explicit capability field or staff permission JSON after review.

**Acceptance:**

- Planner can see team/assistant state.
- Planner can invite or prepare an invite through a real existing route.
- Planner can assign tasks/events safely.
- Assistant cannot access contracts/payments unless authorized.
- Audit/activity evidence exists for sensitive changes.

**Checkpoint with Marlon:** End of Phase 2, especially if permission model requires a founder decision.

---

### Phase 3 — Client command system

**Timeline:** 2 build days.

**Objective:** Give planners a real client relationship control layer per event and across events.

**Build:**

- Client roster from `EventStakeholder`, `EventShare`, and event creator data.
- Waiting-on-client queue from tasks, notifications, threads, proposals/contracts requiring client action.
- Decision/approval log foundation using existing activity/audit/message models or a small migration if needed.
- Client-facing task/approval indicators.
- Privacy-safe client route links.

**Likely files:**

- `apps/web/src/app/pro/planner/page.tsx`
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx`
- `apps/web/src/app/(app)/client/events/[eventSlug]/page.tsx`
- `apps/web/src/app/api/events/[eventSlug]/stakeholders/route.ts`
- `apps/web/tests/*client*.test.tsx`

**Migration expectation:** Possible for durable client decisions/approvals if existing `Activity`/threads are insufficient.

**Acceptance:**

- Planner can see clients per event.
- Planner can see what is waiting on the client.
- Client-facing and internal-only data stay separated.
- Tests prove non-client users cannot see private client surfaces.

**Checkpoint with Marlon:** End of Phase 3.

---

### Phase 4 — Vendor/venue relationship system

**Timeline:** 2–3 build days.

**Objective:** Turn vendor/venue management from one-off booking requests into relationship operations.

**Build:**

- Preferred/recent/caution vendor relationship cards.
- Follow-up queue from `BookingRequest`, `Proposal`, `ShortlistItem`, and `Thread`.
- Quote/proposal comparison across event shortlists.
- Vendor document/status surface where files/media exist.
- Relationship notes model if existing `ShortlistItem.notes`, `BookingRequest.notes`, and threads are insufficient.

**Likely files:**

- `apps/web/src/components/pro-planner/*`
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx`
- `apps/web/src/app/explore/vendors/page.tsx`
- `apps/web/src/app/(app)/marketplace/manage/page.tsx`
- `apps/web/tests/*vendor*.test.tsx`

**Migration expectation:** Likely for production-grade cross-event vendor relationship notes/status.

**Acceptance:**

- Planner can manage vendor follow-up across events.
- Planner can distinguish shortlist/request/proposal/contract/payment states.
- Vendor notes/history do not leak between organizations.

**Checkpoint with Marlon:** End of Phase 4.

---

### Phase 5 — Timeline, milestones, dependencies, week-of/day-of operations

**Timeline:** 2–3 build days.

**Objective:** Make the planner’s schedule operational and risk-aware.

**Build:**

- Master event timeline from tasks, milestones, calendar events, contracts, payments, and event dates.
- Critical path/dependency model.
- Late/blocking warnings.
- Week-of-event mode.
- Day-of run sheet foundation.
- Setup/strike schedule structure.

**Likely files:**

- `apps/web/src/app/(app)/events/[eventSlug]/milestones/page.tsx`
- `apps/web/src/app/(app)/events/[eventSlug]/tasks/page.tsx`
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx`
- `apps/web/src/components/pro-planner/*`
- `apps/web/tests/*timeline*.test.tsx`

**Migration expectation:** Likely for task dependencies and run-sheet entries.

**Acceptance:**

- Planner can see late work, blocking dependencies, and event-day readiness.
- Warnings are deterministic and tested.
- No fake AI or invented event state.

**Checkpoint with Marlon:** End of Phase 5.

---

### Phase 6 — Contracts, payments, disputes, and trust command center

**Timeline:** 2–3 build days.

**Objective:** Strengthen OneHub’s trust engine for planners.

**Build:**

- All-events contract/payment command center.
- Missing signature alerts.
- Deposit/final payment due alerts.
- Payment release readiness.
- Vendor payout readiness.
- Holdback/dispute/refund warnings.
- Money-at-risk priority score.

**Likely files:**

- `apps/web/src/components/payments/*`
- `apps/web/src/server/routers/billing.ts`
- `apps/web/src/server/routers/contract.ts`
- `apps/web/src/app/(app)/contracts/[id]/page.tsx`
- `apps/web/src/app/(app)/admin/verification/page.tsx`
- `apps/web/tests/*payment*.test.tsx`

**Migration expectation:** Maybe. Existing models are strong; score/cache may be computed without migration first.

**Acceptance:**

- Planners can see contract/payment risk without changing live-money settings.
- Assistants cannot take restricted financial/legal actions.
- Tests prove trust boundaries.

**Checkpoint with Marlon:** End of Phase 6. Ask before any production Stripe/env/billing change.

---

### Phase 7 — Services, packages, pricing, availability, booking readiness

**Timeline:** 2–3 build days.

**Objective:** Let planners sell/manage services and capacity.

**Build:**

- Service/package builder from `Listing`, `Offer`, `servicesJson`, and marketplace management.
- Price tiers, add-ons, retainers/hourly blocks if model supports them.
- Availability/blackout/capacity rules.
- Booking-readiness score.
- Calendar conflict warnings.

**Likely files:**

- `apps/web/src/app/(app)/marketplace/manage/page.tsx`
- `apps/web/src/server/routers/listing.ts`
- `apps/web/src/server/routers/availability.ts`
- `apps/web/src/app/providers/onboarding/page.tsx`
- `apps/web/tests/*availability*.test.tsx`

**Migration expectation:** Possible for package pricing and capacity rules if `Listing`/`Offer` are not enough.

**Acceptance:**

- Planner can manage visible services and availability using real data.
- Booking readiness is actionable and not fake.
- Calendar/payment integrations remain inside guardrails.

**Checkpoint with Marlon:** End of Phase 7.

---

### Phase 8 — Files, documents, and communication hub

**Timeline:** 2–4 build days.

**Objective:** Organize event files and communication safely.

**Build:**

- Event file library using existing `Media` and message attachment structures first.
- Contract/proposal/floorplan/vendor-document grouping.
- Event-specific threads.
- Internal notes vs client-visible communication.
- Message templates and follow-up reminders.

**Likely files:**

- `apps/web/src/app/(app)/messages/[threadId]/page.tsx`
- `apps/web/src/server/routers/thread.ts`
- `apps/web/src/server/routers/message.ts`
- `apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx`
- `apps/web/tests/*messages*.test.tsx`

**Migration expectation:** Likely for production-grade document metadata/access rules.

**Acceptance:**

- Files/messages are scoped by org/event/role.
- No public file leakage.
- Internal notes do not show to clients/vendors.

**Checkpoint with Marlon:** End of Phase 8. Ask before new storage/bucket/public exposure settings.

---

### Phase 9 — Reporting and business intelligence

**Timeline:** 1–2 build days.

**Objective:** Give planner agencies operational and revenue visibility.

**Build:**

- Revenue pipeline.
- Booked revenue.
- Outstanding payments.
- Event workload by month.
- Vendor response/performance summary.
- Package performance.
- Inquiry-to-booking conversion foundation.

**Likely files:**

- `apps/web/src/components/pro-planner/*`
- `apps/web/src/lib/pro-planner-os/reports.ts`
- `apps/web/tests/*reports*.test.tsx`

**Migration expectation:** Maybe not. Start computed from existing data.

**Acceptance:**

- Reports are computed from real OneHub data.
- Empty states explain exactly what data is needed.
- Reports are org-scoped.

**Checkpoint with Marlon:** End of Phase 9.

---

### Phase 10 — Assistant/AI next-action engine

**Timeline:** 2–4 build days.

**Objective:** Provide real planner guidance while preventing unsafe automation.

**Build:**

- Deterministic recommendation engine first:
  - Missing venue.
  - Missing contract.
  - Missing payment plan.
  - Late vendor response.
  - Client approval reminder.
  - Week-of-event readiness.
- Optional AI-drafted messages only after safe user-action boundaries are explicit.
- Weekly planner briefing foundation.

**Likely files:**

- `apps/web/src/lib/pro-planner-os/recommendations.ts`
- `apps/web/src/components/pro-planner/*`
- `apps/web/tests/*recommendations*.test.tsx`

**Migration expectation:** Maybe for persistent recommendations/acknowledgements.

**Acceptance:**

- Recommendations are explainable and tested.
- AI does not auto-send, auto-approve, move money, or alter legal/payment state.
- User stays in control.

**Checkpoint with Marlon:** End of Phase 10.

---

### Phase 11 — Hardening, QA, Sentinel verification, release readiness

**Timeline:** 2–3 build days.

**Objective:** Prove the system is clean and safe to release.

**Verification gates:**

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build`
- Route smoke for `/pro/planner` and event command center.
- Role/permission smoke.
- Contract/payment safety smoke.
- Placeholder scan.
- Secret scan.
- `git diff --check`.
- Primary repo clean.
- Current-main worktree clean.
- Sentinel safety PASS or explicit blocker report.

**Checkpoint with Marlon:** Release readiness packet. Ask before push/deploy.

---

## Reporting cadence

Atlas reports:

1. **Start of each phase:** phase, active assets, blocker yes/no, need Marlon yes/no.
2. **End of each phase:** completed, tests/build, commit, repo clean, next phase.
3. **Immediate hard-blocker report:** credentials, production settings, billing/Stripe, public exposure, destructive DB, deploy/push, founder product decision.
4. **No noise while work is moving:** reports happen on material phase changes, verifier failures, hard blockers, or clean completion.

---

## Standard verification commands

Run these as appropriate after each implementation phase:

```bash
pnpm exec vitest run --config apps/web/vitest.config.ts <targeted-test-file>
pnpm test
pnpm typecheck
pnpm lint
NODE_OPTIONS=--max-old-space-size=4096 pnpm build
git diff --check
```

Plus deterministic scans:

- Placeholder scan for `coming soon`, generic placeholder copy, `TODO:`, `console.log(` in touched files.
- Secret scan over diffs/commits.
- Route smoke when a runnable environment is available.

---

## Current next action

Phase 0 is active. Atlas has dispatched independent Scout/Forge/Sentinel asset lanes and will merge their findings into the next implementation slice. The next code lane is Phase 1: split the Pro Planner dashboard into production OS sections with real data, tested empty states, and clean navigation.
