# OneHub Beat-the-Market Execution Plan

> **For Hermes:** Use Kanban-first execution under Atlas Mission Kanban Protocol. One lane at a time unless Marlon explicitly approves controlled parallel lanes. Sentinel gates acceptance.

**Goal:** Make OneHub stronger than the major wedding/event planning platforms by winning the operational execution layer: trusted providers, proposals, contracts, protected payment readiness, communication, milestones, crisis recovery, and admin oversight.

**Architecture:** OneHub should not compete first on registry, invitation design, or a massive generic directory. It should become the trust-centered event operating system that connects discovery to execution and recovery. Each phase below has Forge implementation, Scout/Steward review where appropriate, and Sentinel verification before acceptance.

**Tech Stack:** Next.js app in `apps/web`, Prisma data model, role-based dashboards, proposal/contract/payment APIs, Vitest/Playwright-style smoke tests, Vercel Preview verification, Hermes Kanban workers.

---

## Phase 0: Lock the product promise and acceptance baseline

**Objective:** Freeze the exact OneHub market-winning promise before new build work.

**Why:** Prevents OneHub from becoming a generic vendor directory or another checklist app.

**Deliverables:**
- OneHub positioning statement: event operating system, not wedding website/registry.
- MVP trust-engine checklist.
- Competitor comparison matrix from the uploaded PDF.
- Current OneHub gap list mapped to the competitor weaknesses.

**Acceptance:**
- Marlon approves the execution promise.
- Atlas creates the Kanban lane map.
- Sentinel verifies that acceptance criteria preserve the trust engine.

---

## Phase 1: Trust-engine commercial spine

**Objective:** Finish and prove the chain: request → provider quote → provider-backed proposal → approval → contract → signature → payment readiness.

**Files / surfaces:**
- `apps/web/src/app/api/bookings/request/route.ts`
- `apps/web/src/app/(app)/requests/page.tsx`
- `apps/web/src/app/api/proposals/*`
- `apps/web/src/components/proposals/*`
- `apps/web/src/app/api/contracts/*`
- `apps/web/src/components/contracts/*`
- `apps/web/src/app/api/payments/*`
- Pro Planner event workspace

**Work:**
1. Verify the just-completed provider-backed evidence gates on Preview.
2. Add real user-visible status language for every step.
3. Ensure no proposal can move into contract/payment readiness without provider-submitted proof.
4. Ensure every role sees the right next action.
5. Add smoke tests for the full commercial flow.

**Acceptance:**
- Full tests pass.
- Typecheck passes.
- Build passes.
- Protected Preview smoke passes.
- Sentinel PASS.

**Priority:** Critical.

---

## Phase 2: Role privacy and access control hardening

**Objective:** Make sure commercial records are private to the right event/client/provider/admin participants.

**Why:** OneHub cannot be a trust platform if proposal/contract IDs expose records to unrelated authenticated users.

**Work:**
1. Server-side authorization before rendering proposal detail pages.
2. Server-side authorization before rendering contract detail pages.
3. Tests for unrelated DIY, client, vendor, venue, and planner roles.
4. Safe 403/404 user copy.
5. Admin access remains intentional and auditable.

**Acceptance:**
- Unauthorized users cannot view proposal/contract details by known ID.
- Related buyer-side, seller-side, client/stakeholder, and admin users can view only intended records.
- Sentinel security PASS.

**Priority:** Critical.

---

## Phase 3: Provider and venue profile trust layer

**Objective:** Make OneHub better than The Knot/WeddingWire on trust, not size.

**Work:**
1. Build complete vendor/venue profile completeness rules.
2. Add verification badges that mean specific things.
3. Add service area, pricing range, response expectation, portfolio, insurance/license fields where relevant.
4. Improve marketplace cards so each card answers: real, available, requestable, responsive, contract-ready.
5. Verify published profile appears in marketplace/search/detail/shortlist/request handoff.

**Acceptance:**
- Vendor and venue can create/publish useful profiles.
- DIY/pro planner can discover, shortlist, and request them.
- Public/detail pages show real profile data, not seed fallback.
- Sentinel Preview smoke PASS.

**Priority:** Critical.

---

## Phase 4: Marketplace quality and event-attached discovery

**Objective:** Make discovery actionable, not just browsable.

**Work:**
1. Authenticated marketplace navigation must show correct signed-in state.
2. Event context must stay visible through discovery, detail, shortlist, request, proposal.
3. Unverified external leads must be clearly copy-only/unverified.
4. Search/filter should prioritize available, verified, relevant providers.
5. Add route compatibility for old request links where needed.

**Acceptance:**
- No fake verified fallback listings.
- No authenticated users see public sign-in/create-account confusion on marketplace flows.
- Discovery leads into real request/proposal actions.
- Sentinel PASS.

**Priority:** High.

---

## Phase 5: Communication and notification system

**Objective:** Make OneHub coordination real: messages, invites, notifications, and delivery truth.

**Work:**
1. In-app message inbox and event/provider/client threads.
2. Invite flow: no fake sent/queued claims.
3. Configure provider-backed email delivery only when approved credentials exist.
4. Optional SMS only after explicit approval.
5. Delivery states: NOT_CONFIGURED, FAILED, SENT.
6. Dashboard entry points for all roles.

**Acceptance:**
- Users can communicate inside OneHub on event/provider/client contexts.
- Email/SMS never claims delivery unless provider accepts it.
- Notifications reflect real created events/messages/tasks/contracts.
- Sentinel PASS.

**Priority:** High.

---

## Phase 6: Milestones, task accountability, and event execution dashboard

**Objective:** Own the execution phase competitors do not control.

**Work:**
1. Role-specific task/milestone timelines.
2. Vendor deliverables linked to contract/payment milestones.
3. Client/planner visible status: not started, waiting, at risk, complete.
4. Admin risk queue for overdue/blocked items.
5. Refresh-safe persisted assignments and status updates.

**Acceptance:**
- A planner can see what is due, who owns it, and what is blocked.
- Vendor/venue sees only assigned obligations.
- Admin sees high-risk delays.
- Tests prove persistence across refresh.
- Sentinel PASS.

**Priority:** High.

---

## Phase 7: Crisis execution workflow

**Objective:** Build the feature that makes OneHub feel better than every competitor.

**Example:** Photographer cancels 72 hours before event.

**Work:**
1. Record cancellation/problem.
2. Show contract/payment/milestone impact.
3. Notify planner/client/provider/admin.
4. Surface replacement provider candidates.
5. Create replacement request/proposal/contract path.
6. Record refund/redirection/manual review state.
7. Update timeline and issue log.

**Acceptance:**
- A crisis can be entered and tracked.
- Replacement path can be started without losing event context.
- Money/legal copy remains careful; no automatic refund/release claims without approval.
- Sentinel PASS.

**Priority:** Very high differentiator.

---

## Phase 8: Payment/legal readiness controls

**Objective:** Keep OneHub strong without overclaiming escrow/legal/payment status.

**Work:**
1. Tighten Stripe Connect setup copy.
2. Keep live charges/payouts off unless Marlon explicitly approves activation.
3. Payment status definitions: setup, ready, intent created, confirmed, held/internal, released/manual.
4. Legal pages and contract/payment terms reviewed before public claims.
5. Admin approval queue for refunds, holdbacks, payouts, disputes.

**Acceptance:**
- No UI says live money is enabled unless it truly is.
- Payment readiness is clear and safe.
- Legal/public-launch claims are separated from MVP demo/private pilot.
- Sentinel PASS.

**Priority:** Critical before public launch.

---

## Phase 9: DIY/client/guest polish

**Objective:** Make OneHub feel usable enough for real users while preserving the trust engine.

**Work:**
1. DIY event detail must be useful after load and not blank/thin.
2. Client dashboard should clearly show planner, event status, next action, messages, documents.
3. Guest/RSVP basics should be clean enough for pilot if included.
4. Mobile-first layout for event pages and key dashboards.
5. Help guide: searchable and practical.

**Acceptance:**
- DIY/client users understand what to do next.
- Mobile smoke passes core pages.
- No obvious placeholders/coming-soon in included MVP surfaces.
- Sentinel PASS.

**Priority:** High for adoption.

---

## Phase 10: Admin command center and support operations

**Objective:** Make OneHub operationally dependable and supportable.

**Work:**
1. Admin issue queue for disputes, refunds, cancellations, failed sends, payment risks.
2. User/account/role oversight.
3. Event health view.
4. Audit trail: who did what, when, and why.
5. Support escalation forms that ask for exact event/blocker.

**Acceptance:**
- Admin can diagnose the main trust-engine risks from one command center.
- Support flows do not require guessing from screenshots.
- Sentinel PASS.

**Priority:** High.

---

## Phase 11: Reliability, deployment, and private-pilot proof

**Objective:** Prove the system works on the canonical Vercel Preview/production target before founder confidence claims.

**Work:**
1. Full route matrix smoke: Admin, DIY, Pro Planner, Client, Vendor, Venue.
2. Auth/session verification.
3. Health endpoint verification.
4. Database-backed flow verification.
5. Browser screenshots/evidence for key flows.
6. Clean repo and clean board.
7. No public launch until approved.

**Acceptance:**
- Protected Preview/private pilot smoke PASS.
- Sentinel final PASS.
- Repo clean.
- Board clean.
- Founder packet produced.

**Priority:** Critical.

---

## Execution order

1. Phase 0 — lock promise and scorecard.
2. Phase 1 — finish commercial spine proof on Preview.
3. Phase 2 — access control hardening.
4. Phase 3 — provider/venue trust profiles.
5. Phase 4 — marketplace actionability.
6. Phase 5 — communications/notifications.
7. Phase 6 — milestones/tasks/accountability.
8. Phase 7 — crisis execution.
9. Phase 8 — payment/legal readiness controls.
10. Phase 9 — DIY/client/guest polish.
11. Phase 10 — admin/support operations.
12. Phase 11 — final private-pilot proof.

---

## Kanban execution model

For each phase:
1. Scout/Steward read-only audit if the phase touches UX/backend/security/payment.
2. Forge implementation card.
3. Sentinel verifier card.
4. Atlas synthesis and commit/push only after Sentinel PASS.
5. No next phase starts until current phase has zero unresolved in-scope residuals unless Marlon approves controlled parallel work.

---

## Hard guardrails

Do not change without explicit Marlon approval:
- Live Stripe/payment activation.
- Billing/provider credential setup.
- Production DB destructive commands.
- Public launch/public exposure/domain changes.
- Legal claims or legal approval.
- Infrastructure changes.
- Secrets/env writes.

---

## Definition of done

OneHub is better than the listed platforms when:
- It is not just a planning/content app.
- Provider discovery leads to real provider-backed proposals.
- Contracts and payments are gated by evidence.
- Users only see records they are allowed to see.
- Communication and notifications are real/truthful.
- Tasks/milestones drive execution.
- Crisis recovery is handled inside the platform.
- Admin can intervene and audit.
- Private-pilot Preview passes authenticated role-flow smoke.
- Sentinel gives final PASS.
