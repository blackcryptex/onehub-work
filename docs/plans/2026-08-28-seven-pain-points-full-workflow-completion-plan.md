# OneHub Seven Pain Points Full Workflow Completion Plan

> **For Hermes:** Use OneHub Kanban full-graph autonomous execution. Use Atlas as coordinator, Forge for implementation, Scout for UX/product flow checks, Steward for backend/data/security/payment checks, and Sentinel for verification/veto.

**Goal:** Complete the seven pain points as full end-to-end workflows, not isolated feature slices, so OneHub stops revisiting the same lanes.

**Architecture:** Each workflow is treated as a closed business loop with setup, integration, business logic, browser verification, Sentinel acceptance, clean commit, and Preview smoke evidence. A workflow is not done until the user can start it, complete it, see the result, and the right other parties/admin surfaces see it too.

**Tech Stack:** Next.js App Router, React, Prisma, NextAuth, Stripe test/guarded payment readiness, Vercel Preview, Playwright/Vitest, Hermes Kanban.

---

## Non-negotiable completion rule

Do not mark a workflow done because one page, API, model, or test passes.

A workflow is complete only when all are true:

1. User starts the workflow from the correct role dashboard/event workspace.
2. User completes the main action without dead ends, placeholders, or fake actions.
3. Related parties see the correct update/message/notification/status.
4. Admin/oversight surface shows the right risk/state when relevant.
5. Data persists after refresh/refetch.
6. Permissions prevent the wrong roles from viewing/changing it.
7. Unit/integration tests pass.
8. Protected Preview browser smoke passes.
9. Sentinel passes.
10. Repo is clean and committed.

## Guardrails

No public launch, live payments, billing, infrastructure/domain changes, credentials/env writes, production DB destructive changes, or legal/payment acceptance claims without Marlon approval.

---

## Workflow 1 — Vendor/Venue Reliability

**Business loop:** provider creates/updates profile -> profile becomes real marketplace listing -> planner/DIY searches in event context -> compares trust/availability/price/reviews -> requests/shortlists -> provider sees lead -> evidence recorded.

**Assets:** Scout maps UX trust gaps; Steward verifies provider/listing data and permissions; Forge implements; Sentinel verifies.

**Acceptance:** marketplace is honest, event-aware, no fake verified claims, provider/venue lead path works on Preview.

**Estimate:** 2 working days.

## Workflow 2 — Communication

**Business loop:** planner/client/vendor/venue starts event-linked conversation -> participants receive notification -> thread detail works -> reply persists -> context stays tied to event/proposal/listing/contract/task/payment/crisis -> wrong roles blocked.

**Acceptance:** no scattered dead-end contact cards; real in-app thread path works for every role needed in private pilot.

**Estimate:** 1.5 working days.

## Workflow 3 — Budget + Change Orders

**Business loop:** event budget created -> planned/actual/committed/paid/owed visible -> accepted proposal impacts budget -> change order changes committed amount -> overrun warning appears -> admin/planner can see risk.

**Acceptance:** budget is not just a table; it explains financial state and overrun risk.

**Estimate:** 2 working days.

## Workflow 4 — Scheduling + Logistics

**Business loop:** event timeline/tasks/calendar created -> vendor/venue availability/status feeds schedule -> changes/crisis update timeline -> conflicts/late items are surfaced -> affected roles see the next action.

**Acceptance:** scheduling/logistics has a real coordination loop, not only dates and calendar UI.

**Estimate:** 2 working days.

## Workflow 5 — Contracts + Payments + Trust

**Business loop:** provider-backed proposal -> accepted -> contract generated -> signatures complete -> payment readiness shown -> payment blocked/released only under guardrails -> refund/dispute/holdback/admin review states visible -> no fake live-money claims.

**Acceptance:** the entire commercial spine is complete in guarded/test mode and users understand every blocked/ready state.

**Estimate:** 2.5 working days.

## Workflow 6 — Tasks + Accountability

**Business loop:** task created -> owner assigned -> dependency/deadline/blocker visible -> notification/escalation triggered -> completion proof/note recorded -> dashboard/admin sees status -> wrong role cannot mutate outside permission.

**Acceptance:** tasks are accountable work records, not just checklist rows.

**Estimate:** 2 working days.

## Workflow 7 — Crisis/Event-Day Recovery

**Business loop:** issue reported -> linked vendor/venue/contract/payment/task/milestone identified -> stakeholders notified -> replacement options/request started -> timeline/tasks/budget/payment risk updated -> admin oversight shows open risk -> resolution recorded.

**Acceptance:** OneHub can demonstrate the competitor-killing use case: a cancellation or event-day problem is handled inside one operating system.

**Estimate:** 3 working days.

---

## Final full-system verification

**Business loop smoke:** create event -> source provider/venue -> shortlist/request -> message -> proposal -> contract -> signature/payment-readiness -> budget impact -> tasks/milestones -> crisis -> replacement -> admin oversight -> completion evidence.

**Required gates:** tests, typecheck, lint, build, git diff check, protected Preview deploy, protected Preview smoke, Sentinel PASS, clean repo.

**Estimate:** 2 working days.

---

## Total ETA

Best case: 12 working days.
Realistic: 15 working days.
With migrations/auth/Vercel/payment friction: 18-20 working days.

Because Marlon said there is no hurry and the priority is to get it right, default to the realistic 15-working-day plan, not a rushed patch sprint.

## Execution approach after approval

1. Create the full Kanban graph up front.
2. Start Workflow 5 and Workflow 7 first because they are the core trust-engine/revisit risks.
3. Run Scout and Steward in parallel for read-only maps while Forge implements one workflow at a time.
4. Sentinel verifies every workflow before it can close.
5. Keep a quiet full-graph driver running every 5-10 minutes to dispatch ready work and report only material changes.
6. After every workflow: commit clean, smoke, Sentinel PASS, then move on.

## Why this stops revisiting

The old problem was accepting components as done. This plan accepts only closed workflows. If contracts are touched, contracts are not done until the full proposal-contract-signature-payment-refund/dispute/admin path passes. If tasks are touched, tasks are not done until ownership, dependencies, escalation, proof, role visibility, and Preview smoke pass.
