# W7 Steward Map — Crisis/Event-Day Recovery backend/data/security workflow

Date: 2026-08-28
Owner lane: Steward
Task: `t_26c04189`
Verdict: PARTIAL/RISK

## 1. Backend or structural scope reviewed

Read-only backend/data/security/payment map for Workflow 7: Crisis/Event-Day Recovery.

Business loop reviewed:

`issue reported -> commercial context identified -> notifications -> replacement -> timeline/task/budget/payment risk -> admin oversight -> resolution`

Guardrails observed: no production, environment, credential, billing, infrastructure, domain, public exposure, live-payment, destructive DB, legal, or launch-claim changes. No implementation source files were changed; this report is the intended artifact.

## 2. Evidence examined

Workflow requirement:
- `docs/plans/2026-08-28-seven-pain-points-full-workflow-completion-plan.md:86-90` defines W7 as issue reported, linked vendor/venue/contract/payment/task/milestone identified, stakeholders notified, replacement options/request started, timeline/tasks/budget/payment risk updated, admin oversight shows open risk, and resolution recorded.

Data model evidence:
- `apps/web/prisma/schema.prisma:291-339` defines `Event` and its persisted links to booking requests, budget lines, contracts, crisis issues, disputes, deposits, milestones, proposals, tasks, threads, stakeholders, and shares.
- `apps/web/prisma/schema.prisma:1193-1225` defines `CrisisIssue` with event/org, reporter, issue type/severity/status, title/description, linked listing, booking request, proposal, contract, payment milestone, replacement listing/request, manual review notes, impact summary, recommended next action, and JSON audit trail.
- `apps/web/prisma/schema.prisma:1526-1532` defines crisis statuses: `OPEN`, `IMPACT_REVIEW`, `REPLACEMENT_STARTED`, `RESOLVED`, `CANCELED`.
- `apps/web/prisma/schema.prisma:430-455` defines persisted `Task` and `BudgetLine` records, but neither is structurally linked back to `CrisisIssue`.
- `apps/web/prisma/schema.prisma:669-813` defines payment milestones, contracts, escrow accounts, payouts, payment intents, and transactions.
- `apps/web/prisma/schema.prisma:833-868`, `950-1024` define holdbacks, disputes, and refund requests that can block release, but `CrisisIssue` is not a blocker relation on those models.

Crisis API/router evidence:
- `apps/web/src/server/routers/crisis.ts:20-37` accepts event id, issue details, linked listing/booking/proposal/contract/payment milestone ids, replacement listing, and replacement message.
- `apps/web/src/server/routers/crisis.ts:84-103` lists issues for an event after `canManageEvent`.
- `apps/web/src/server/routers/crisis.ts:105-139` loads the event and rejects create unless `canManageEvent(ctx.user, event)` passes.
- `apps/web/src/server/routers/crisis.ts:141-167` rejects booking request, proposal, contract, and payment milestone ids that are not attached to the selected event.
- `apps/web/src/server/routers/crisis.ts:169-177` rejects an explicit impacted listing unless it appears through the event's booking requests or proposals.
- `apps/web/src/server/routers/crisis.ts:183-188` verifies a replacement listing exists, but does not constrain it by availability, category/type compatibility, provider status, org relationship, or conflict with the failed listing.
- `apps/web/src/server/routers/crisis.ts:190-208` directly creates a replacement `BookingRequest` when replacement listing is supplied.
- `apps/web/src/server/routers/crisis.ts:227-260` persists the `CrisisIssue` and audit trail.
- `apps/web/src/server/routers/crisis.ts:263-287` creates one manual-review task assigned to the reporter and records activity; it does not create notifications, threads, budget lines, payment blockers, refund/dispute/holdback records, or resolution records.
- `apps/web/src/app/api/pro-planner/crisis/issues/route.ts:6-22` exposes only a POST API path that calls `crisisRouter.createCaller({}).create(input)`.

RBAC/access evidence:
- `apps/web/src/lib/rbac.ts:179-193` defines `canManageEvent`: admin, org owner, owning planner, or non-planner org member can manage; planners are isolated to events they created.
- `apps/web/src/lib/rbac.ts:423-452` defines `canViewEvent`: clients need stakeholder plus explicit share; vendors/venues have no event view by default.
- `apps/web/src/server/lib/access.ts:66-74` provides a reusable `requireEventManageAccess`, but `crisis.ts` uses its own `canManageEvent` pattern.
- `apps/web/src/server/lib/access.ts:76-92` validates task assignees for generic task creation; crisis-created tasks bypass this helper and always assign to `ctx.user.id`.
- `apps/web/src/lib/rbac.ts:327-333` restricts milestone payment release to guarded-MVP platform admin.

Notification/message evidence:
- `apps/web/src/server/routers/notification.ts:6-8` has a reusable in-app `notify` helper.
- `apps/web/src/server/routers/bookingRequest.ts:34-38` records activity and notifies listing-org owner/admin members for the normal booking-request create path.
- `apps/web/src/server/routers/thread.ts:30-105` can create event/proposal/listing threads and recipient notifications in one transaction.
- `apps/web/src/server/routers/message.ts:17-49` persists messages, creates notifications, and records activity.
- `apps/web/src/server/routers/crisis.ts:190-287` does not call the normal booking-request router, `notify`, thread creation, or message creation.

Payment/admin risk evidence:
- `apps/web/src/app/api/payments/release-milestone/route.ts:117-160` requires guarded release authority and blocks release on open refund request, frozen dispute, or active holdback before escrow debit/payout/Stripe transfer.
- `apps/web/tests/payment-release-guardrails.test.ts:134-208` verifies those release blockers occur before money movement.
- `apps/web/src/lib/payments/payoutLock.ts:55-105` can represent payout locks using `MoneyTx`, but crisis creation does not set payout locks.
- `apps/web/src/app/(app)/admin/overview/page.tsx:166-184` includes crisis issues in admin execution risk and shows a crisis next-safe-action card, but routes to `/admin/verification` rather than a crisis detail route.

UI/test evidence relevant to backend closure:
- `apps/web/src/components/pro-planner/Dashboard.tsx:1051-1093` posts crisis creates to `/api/pro-planner/crisis/issues` and only sends event, issue type/severity/title/description, listing/proposal/contract, replacement listing/message.
- `apps/web/src/components/pro-planner/Dashboard.tsx:1553-1585` renders the crisis lane, but does not expose payment milestone, event task, budget line, notification recipients, or resolution fields.
- `apps/web/src/app/pro/planner/page.tsx:192-199` reloads up to 20 open crisis issues across planner events.
- `apps/web/tests/phase7-crisis-workflow.test.ts:75-116` proves crisis create can persist linked impact, create a replacement booking request, create a task, and record activity without automatic refund/payment effects.
- `apps/web/tests/phase7-crisis-workflow.test.ts:118-129` proves unlinked proposal ids are rejected.
- Search of `apps/web/tests` for W7 terms found no W7 test proving wrong-role crisis route denial, stakeholder notification creation, provider-side notification/thread receipt, budget/payment blocker mutation, or resolution.

## 3. Correctness verdict

PARTIAL/RISK.

OneHub has a real backend start for W7: authenticated event managers can create crisis issues; linked booking/proposal/contract/payment milestone ids are event-bound; an optional replacement listing creates a real booking request; a manual review task and activity are persisted; no refund, release, cancellation, or legal conclusion is automatic.

The workflow is not structurally closed. The backend records the incident, but it does not yet make the incident an enforceable operating-system state across notification, replacement coordination, task/timeline/budget/payment risk, admin detail review, and resolution. Current evidence supports “crisis issue intake and guarded replacement request start,” not “event-day recovery workflow complete.”

## 4. Exact risks and blockers

### R1 — Stakeholder notifications are absent from crisis creation

Risk: The business loop requires stakeholders notified, but crisis creation only creates a `CrisisIssue`, one task, and activity. It does not notify planner org members, event stakeholders, affected client users, impacted provider/venue users, admin reviewers, or replacement provider users.

Structural blocker: The crisis route creates `BookingRequest` directly instead of calling a shared booking-request service/router path that already records provider notifications in `bookingRequest.ts:34-38`. It also does not call `notify`, create a crisis thread, or create message notifications.

Constraint: Crisis create must explicitly compute allowed recipients from persisted event/org/stakeholder/listing/proposal/contract context and create notifications/thread records inside a transaction after access checks. Recipient selection must honor `canViewEvent`, thread visibility, event shares, and seller/listing-org boundaries; do not broadcast private event/payment context to vendors/venues/clients unless they are entitled to that exact slice.

### R2 — Replacement request bypasses normal request-side effects and provider proof

Risk: `crisis.ts` creates the replacement `BookingRequest` directly, so normal booking-request side effects and future invariants can diverge. Provider-side notification is not proven from the crisis path.

Constraint: Extract a shared `createBookingRequestWithNotifications` service, or make crisis creation call a single lower-level booking-request creation function used by both the normal and crisis paths. Required effects: event/org/listing validation, provider org notification, activity, replacement source metadata, and idempotency/retry behavior.

### R3 — Replacement listing validation is too weak for event-day recovery

Risk: Any existing listing id can be used as replacement. The current check verifies existence only, not availability, category/type compatibility, provider status, blocked/watchlist relationship, city/date fit, or whether the replacement duplicates the failed provider.

Constraint: Before claiming replacement options, the backend must validate or explicitly label each candidate using persisted facts: listing type/category, org/profile status, availability overlap with event start/end, relationship status (`DO_NOT_USE`/`WATCHLIST`/preferred), location fit if available, and whether it is the same listing/org as the impacted provider. If a request is created without these checks, label it “manual recovery request,” not vetted replacement.

### R4 — Crisis issue does not create payment/budget/release blockers

Risk: A crisis can mention payment risk, but money surfaces remain independently releasable unless existing refund/dispute/holdback blockers happen to exist. The release route blocks on refund/dispute/holdback, not `CrisisIssue`.

Constraint: If a crisis is linked to a proposal/contract/payment milestone/payment intent, the backend must either:
1. create/activate a guarded payment holdback or dispute/refund-review blocker under existing legal/payment controls, or
2. create a non-money-moving `PaymentRiskReview`/`CrisisPaymentBlock` relation that the release route checks before payout finalization.

Do not move money, promise refunds, cancel contracts, or mark payouts paid from crisis create. The narrow safe correction is a blocker/review state plus admin-readable evidence.

### R5 — Budget and timeline are not structurally updated

Risk: The crisis issue creates one manual task, but no budget line, budget variance, timeline milestone, due date, dependency, or impacted task/milestone link is persisted. The task model has no `crisisIssueId`, and `CrisisIssue` has no task/timeline/budget relation.

Constraint: Add explicit crisis-derived operational records before claiming this loop is closed: a recovery task linked to the crisis, due date derived from event urgency, optional affected milestone/task links, and a budget-risk entry or budget-line annotation that survives refresh. Generic free-text task descriptions are insufficient as workflow proof.

### R6 — Resolution cannot be recorded through backend API

Risk: `CrisisIssueStatus` includes `RESOLVED` and `CANCELED`, but the inspected router exposes only `listForEvent` and `create`. There is no guarded update/resolve mutation, resolution note/proof, resolvedBy/resolvedAt, or audit transition.

Constraint: Add a guarded `resolve`/`cancel` mutation with event manage access, status-transition validation, required resolution note, optional replacement outcome ids, optional payment/budget/admin closeout refs, `resolvedById`, `resolvedAt`, and append-only audit evidence. Resolution must not delete the crisis issue or erase linked commercial context.

### R7 — Admin oversight is summary-level, not actionable

Risk: Admin overview counts and names an urgent crisis but links to `/admin/verification`, which does not establish a crisis-specific detail or decision surface. Admin can know risk exists but may not see linked event/vendor/contract/payment/replacement context from the oversight card.

Constraint: Add a read-only admin crisis queue/detail route or verification subview that loads exact linked crisis context, payment blockers, replacement request, task/timeline/budget risk, notifications sent/read state, and resolution status. Mutations from that surface must use existing guarded admin/payment controls and record audit/admin override when they affect money/legal state.

### R8 — API route lacks explicit route-level role/context guard

Risk: `/api/pro-planner/crisis/issues` relies on `protectedProcedure` inside `createCaller({})` plus `canManageEvent` in the router. That is acceptable for auth/object access, but the route name is pro-planner and no route-level role assertion or method-specific logging/audit context exists.

Constraint: Keep object-level `canManageEvent` as the authority, but add route tests proving unauthenticated users, wrong-role users, unrelated planners, clients, vendors, and unrelated org members cannot create/read crisis issues for an event. If the route remains under `/api/pro-planner`, explicitly reject non-planner/non-admin callers unless Atlas decides org-member crisis reporting should be broader.

### R9 — Crisis audit trail is mutable JSON and not a full transition ledger

Risk: `CrisisIssue.auditTrail` is a JSON blob written at create time. It is not append-only, normalized, or enforced for later status changes, notification events, payment-risk transitions, or resolution proof.

Constraint: Either add a `CrisisIssueEvent`/`CrisisAuditEntry` relation, or constrain all crisis status/update operations to append structured entries with actor, timestamp, action, before/after status, linked records, and request context. Do not rely on overwriteable JSON alone for event-day recovery proof.

### R10 — Transactionality/idempotency is not strong enough for crisis create

Risk: Crisis create performs multiple writes in sequence: optional booking request, crisis issue, task, activity. If a later write fails, earlier writes can persist partially. Retried submits can duplicate replacement booking requests/tasks/issues.

Constraint: Wrap crisis creation, replacement request, notification/thread records, task/risk records, and activity in a single transaction where possible. Add an idempotency key or deterministic duplicate guard keyed by event, issue title/source, replacement listing, reporter, and recent timestamp/session. Report partial write recovery explicitly if a transaction cannot include all side effects.

## 5. Current safe assumptions

1. Safe: W7 has a persisted crisis issue model and guarded create/list router.
2. Safe: Event-bound proposal/contract/payment milestone ids are checked before crisis persistence.
3. Safe: The current path avoids automatic refund, payout release, contract cancellation, and legal conclusions.
4. Safe: A replacement booking request can be created if a replacement listing id is supplied.
5. Safe: Planner/admin summary visibility exists for open crisis issues.

## 6. Unsafe assumptions

1. Unsafe: “Stakeholders are notified” — no crisis notification/thread/message evidence exists.
2. Unsafe: “Replacement recovery is started with provider awareness” — crisis-created booking requests bypass the normal notification path.
3. Unsafe: “Payment risk is blocked” — crisis issues do not block release unless separate refund/dispute/holdback records exist.
4. Unsafe: “Budget/timeline/tasks are updated” — only one generic reporter-assigned task is created, with no crisis/task/budget/timeline relation.
5. Unsafe: “Admin can oversee and resolve the crisis” — admin overview is summary-level and no crisis detail/resolve API is proven.
6. Unsafe: “Resolution is recorded” — no backend resolve/update route or resolution proof exists.
7. Unsafe: “Wrong roles are blocked end-to-end” — object guards exist, but W7 wrong-role route/browser proof is not present in inspected tests.
8. Unsafe: “Event-day recovery is complete” — current implementation proves intake plus partial replacement request, not the full operating loop.

## 7. Minimal implementation constraints for Forge

P0 constraints for the next backend slice:

1. Preserve the current no-automatic-money/legal behavior. Crisis creation may create risk/blocker records, tasks, notifications, and replacement requests; it must not release funds, refund, cancel contracts, alter legal terms, or mark providers paid.
2. Convert crisis create into an atomic workflow service. Required outputs in one transaction or explicit compensating boundary: `CrisisIssue`, replacement request if any, crisis-linked task(s), notifications/thread/message records, activity, and crisis audit entry.
3. Add crisis-specific recipient calculation. Required recipient classes must be explicit and permission-bound: reporting planner, event org owner/admin/assigned members, client stakeholders only when event share/visibility allows, impacted provider org owner/admin only for provider-safe context, replacement provider org owner/admin for replacement request context, platform admin for critical/payment/contract risks.
4. Add crisis-linked operational records. Required fields/relations: `crisisIssueId` on task or join model, due date, owner, blocked/recovery status, affected event milestone/task if selected, and completion/resolution proof reference.
5. Add payment-risk blocking semantics. A crisis linked to payment milestone/intent/contract must either create a payment holdback/dispute/refund-review under existing controls or a non-money-moving crisis payment block checked by release/finalization routes.
6. Add resolution API. Required: guarded transition, required note, resolved/canceled status, resolvedBy/resolvedAt, linked replacement/payment/task/budget closeout refs, append-only audit, and tests.
7. Add admin detail. Required: read-only crisis queue/detail from admin overview with linked event/provider/contract/payment/replacement/task/notification/resolution state; any money/legal action must deep-link to existing guarded verification surfaces.
8. Add tests for the full backend loop: create -> event-bound context validation -> notification/thread rows -> replacement request provider notification -> task/timeline/budget/payment-risk records -> admin detail visibility -> blocked release while payment risk open -> resolve -> risk no longer open -> refresh/list persistence -> wrong-role denial.

P1 hardening constraints:

1. Add idempotency for crisis submission and replacement request creation.
2. Add replacement candidate vetting/labels using availability, category/type, relationship status, org/profile status, same-provider detection, and event timing.
3. Normalize crisis audit entries rather than relying only on mutable JSON.
4. Expose payment milestone, task, milestone, and budget context in the UI only after backend supports those links safely.

## 8. Recommended narrow next action for Atlas

RISK verdict. Route Forge to implement W7 as one backend workflow service, not scattered component patches:

1. atomic `createCrisisIssueWorkflow` service;
2. permission-bound notification/thread creation;
3. shared replacement booking-request creation with provider notification;
4. crisis-linked task/timeline/budget/payment-risk records;
5. guarded resolve/cancel API with audit proof;
6. admin crisis queue/detail read model;
7. full W7 tests including wrong-role denial and payment release blocking.

FOUNDER ESCALATION REQUIRED only before changing protected Preview access, sharing credentials/sessions, enabling live money movement, changing Stripe/billing settings, changing public/legal terms, or making public launch/payment/legal claims.
