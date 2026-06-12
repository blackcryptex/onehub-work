# OneHub Public Release Hardening Escalated Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Atlas coordinates; Forge builds; Steward reviews backend/system correctness; Scout provides external evidence/research as needed; Sentinel verifies before closure.

**Goal:** Move OneHub from a dirty, partially verified MVP state to a controlled public-release candidate that Marlon and users can trust.

**Architecture:** Freeze scope, clean the dirty tree, restore structural code boundaries, harden route/auth/payment trust controls, then run independent verification. This plan uses escalation lanes so unsafe or ambiguous work does not get buried inside normal implementation.

**Tech Stack:** Next.js 14, TypeScript, Prisma, Stripe/Connect, pnpm, Vitest, shell stabilization checks, local production smoke tests.

---

## Escalation Model

### Command
- Marlon decides release readiness and accepts residual risk.
- Atlas coordinates execution and blocks false completion.

### Specialist routing
- **Forge:** implementation, cleanup, refactors, tests.
- **Steward:** backend/data/auth/payment architecture review before acceptance.
- **Scout:** external docs, Stripe/OWASP/Next.js evidence, policy comparison.
- **Sentinel:** final verification, security/regression/release gate validation.

### Escalation severity

#### SEV-1 Release Blocker
Blocks public release immediately.
- Dirty tree unresolved.
- `pnpm stabilize` failing.
- Unprotected private route/API.
- Payment/webhook/idempotency failure.
- Secret exposure.
- Critical/high dependency issue without accepted risk.
- Any failing typecheck/test/build.

#### SEV-2 Trust Risk
Blocks launch unless Marlon explicitly accepts risk.
- Draft legal/payment/support language exposed as final.
- Missing refund/dispute/cancellation clarity.
- Missing observability/incident owner.
- Ambiguous provider payout/holdback language.
- Accessibility issue in auth/payment/core flows.

#### SEV-3 Cleanup Debt
Does not block if isolated and documented.
- UI copy polish.
- Non-critical lint warnings outside release surfaces.
- Later-gate feature work parked with label.

---

## Phase 0: Scope Freeze and Baseline Snapshot

**Owner:** Atlas  
**Verifier:** Sentinel  
**Escalation:** SEV-1 if work continues without freeze

### Task 0.1: Announce release freeze

**Objective:** Stop new work from increasing the dirty tree.

**Files:**
- Create: `docs/release/public-release-freeze.md`

**Steps:**
1. Document freeze rule: no new features, no UI polish, no production deploy, no payment activation.
2. List allowed work: release cleanup, stabilization, route/auth, payments safety, trust/legal, verification.
3. Commit freeze doc.

**Verification:**
```bash
git status --short --branch
```
Expected: changes are only the freeze document or planned release cleanup changes.

### Task 0.2: Capture baseline state

**Objective:** Preserve honest current evidence before cleanup.

**Files:**
- Create: `reports/public-release/baseline-2026-06-08.md`

**Commands:**
```bash
git status --short --branch
pnpm -C apps/web typecheck
pnpm test
pnpm -C apps/web build
pnpm -C apps/web linkcheck
pnpm stabilize
```

**Expected known baseline:**
- typecheck: pass
- tests: pass
- build: pass
- linkcheck: pass
- stabilize: fail
- dirty tree: present

---

## Phase 1: Dirty Tree Triage

**Owner:** Forge  
**Reviewer:** Atlas + Steward for backend/payment files  
**Verifier:** Sentinel  
**Escalation:** SEV-1 until clean or intentionally parked

### Task 1.1: Generate dirty-tree inventory

**Objective:** Classify all 128 dirty items.

**Files:**
- Create: `reports/public-release/dirty-tree-inventory.md`

**Commands:**
```bash
git status --porcelain=v1 > /tmp/onehub-dirty-tree.txt
git diff --stat > /tmp/onehub-diff-stat.txt
git diff --name-only > /tmp/onehub-modified-files.txt
git ls-files --others --exclude-standard > /tmp/onehub-untracked-files.txt
```

**Inventory buckets:**
- Keep now
- Fix now
- Park later
- Revert/delete

**Verification:**
Every dirty item appears exactly once in the inventory.

### Task 1.2: Remove generated/local artifacts

**Objective:** Remove non-source artifacts from release state.

**Likely candidates:**
- `apps/web/tsconfig.tsbuildinfo`
- local `LINKCHECK.json` unless intentionally tracked
- temporary reports unless release evidence

**Commands:**
```bash
git status --short
```

**Verification:**
Generated artifacts are deleted or moved to ignored/report-safe locations.

### Task 1.3: Split valid work into coherent commits

**Objective:** Make history reviewable.

**Commit groups:**
1. route/auth protection
2. stabilization boundary cleanup
3. payment safety/state-machine cleanup
4. legal/trust surfaces
5. observability/incident docs
6. tests/release verification

**Verification:**
```bash
git log --oneline --decorate --max-count=10
git status --short
```
Expected: clean or only active phase files remain.

---

## Phase 2: Stabilization Green

**Owner:** Forge  
**Reviewer:** Steward  
**Verifier:** Sentinel  
**Escalation:** SEV-1 until `pnpm stabilize` passes

### Task 2.1: Create/standardize server-only data boundary

**Objective:** Remove Prisma access from app layer.

**Files:**
- Create/modify: `apps/web/src/server/dal/*`
- Create/modify: `apps/web/src/server/services/*`
- Modify: files currently importing Prisma under `apps/web/src/app/**`

**Rules:**
- DAL modules use `import "server-only";`
- App/API components do not import Prisma directly.
- Services return safe DTOs, not raw DB records.

**Verification:**
```bash
rg 'from "@/lib/prisma"|prisma\.' apps/web/src/app apps/web/src/components
```
Expected: no disallowed matches.

### Task 2.2: Remove `as any` from API routes

**Objective:** Restore type safety on public/server entry points.

**Files:**
- Modify: `apps/web/src/app/api/**/*.ts`

**Pattern:**
- Replace `as any` with Zod schemas, typed DTOs, `unknown` plus narrowing, or exact Prisma/service types.

**Verification:**
```bash
rg 'as any' apps/web/src/app/api
```
Expected: no matches.

### Task 2.3: Remove `as any` from server routers

**Objective:** Restore type safety on server routers.

**Files:**
- Modify: `apps/web/src/server/routers/**/*.ts`

**Verification:**
```bash
rg 'as any' apps/web/src/server/routers
```
Expected: no matches.

### Task 2.4: Run stabilization gate

**Commands:**
```bash
pnpm stabilize
pnpm -C apps/web typecheck
pnpm test
pnpm -C apps/web build
```

**Expected:** all pass.

---

## Phase 3: Route/Auth Hardening

**Owner:** Forge  
**Reviewer:** Steward  
**Verifier:** Sentinel  
**Escalation:** SEV-1 for any private route public without approval

### Task 3.1: Create route classification map

**Objective:** Make public/private/admin route policy explicit.

**Files:**
- Create: `docs/security/route-classification.md`
- Modify: `apps/web/src/middleware.ts`
- Create/modify: route tests under `apps/web/tests/`

**Route classes:**
- Public marketing/legal/support
- Auth pages
- Authenticated user routes
- Role routes
- Admin-only routes
- Public API
- Authenticated API
- Stripe webhook API

### Task 3.2: Protect `/notifications`

**Objective:** Close observed route protection gap.

**Files:**
- Modify: `apps/web/src/middleware.ts`
- Modify or create: `apps/web/tests/route-protection.test.ts`

**Expected behavior:**
- Anonymous `/notifications` redirects to sign-in or returns unauthorized.
- Authenticated user can access their own notifications only.

**Verification:**
```bash
curl -sS -I http://127.0.0.1:3100/notifications
```
Expected: redirect/unauthorized when anonymous.

### Task 3.3: Add route protection tests

**Objective:** Prevent regression.

**Test cases:**
- anonymous protected route
- anonymous admin route
- non-admin admin route
- wrong-role route
- wrong-user resource route
- public legal/support route

**Verification:**
```bash
pnpm test
```
Expected: route protection tests pass.

---

## Phase 4: Payment Trust Hardening

**Owner:** Forge  
**Reviewer:** Steward  
**Verifier:** Sentinel  
**Escalation:** SEV-1 for any unverified money movement

### Task 4.1: Verify Stripe webhook handling

**Objective:** Ensure events are authentic and idempotent.

**Files:**
- Modify: `apps/web/src/app/api/stripe/webhook/route.ts`
- Modify/create tests for webhook signature/idempotency

**Requirements:**
- raw body signature verification
- fast 2xx response
- duplicate event protection
- no event ordering assumption
- safe logging without secrets/PII

### Task 4.2: Enforce money operation idempotency

**Objective:** Prevent duplicate charges/refunds/transfers.

**Files:**
- Modify payment routes/services under `apps/web/src/app/api/payments/**`
- Modify payment service/DAL modules

**Required operations:**
- payment intent create/confirm
- refund create
- transfer create
- transfer reversal
- payout/manual release

### Task 4.3: Implement/manual-review gate for first transactions

**Objective:** Align with Marlon's approved safety net.

**State model:**
- paid_pending_review
- approved_for_transfer
- transferred
- rejected_refund_pending
- refunded
- disputed
- failed/canceled

**Requirements:**
- no automatic provider payout before approval
- audit log for approval/rejection
- admin visibility
- clear user/provider status language

### Task 4.4: Payment trust policy check

**Objective:** Match UI/legal language to actual payment behavior.

**Files:**
- Legal/payment pages
- checkout/payment surfaces
- support/refund/dispute pages

**Rules:**
- Do not call funds “escrow.”
- Say Stripe processes payments if accurate.
- Explain provider payout review/holdback.
- Explain refund/dispute paths.

---

## Phase 5: Public Trust Surface

**Owner:** Forge  
**Research:** Scout  
**Reviewer:** Steward for risk language  
**Verifier:** Sentinel  
**Escalation:** SEV-2 unless payment/legal claims are false, then SEV-1

### Task 5.1: Finalize public legal/support pages

**Pages:**
- Terms
- Privacy
- Refund policy
- Cancellation policy
- Payment policy
- Dispute policy
- Fee explanation
- Booking classification
- Support/contact

**Verification:**
```bash
pnpm -C apps/web linkcheck
```
Expected: no broken public trust links.

### Task 5.2: Add visible trust signals

**Objective:** Users understand before paying.

**Required surfaces:**
- support email visible
- refund/dispute/cancellation links visible
- payment security/Stripe language visible
- statement descriptor explanation
- provider role/marketplace disclaimer

---

## Phase 6: Observability and Incident Readiness

**Owner:** Forge  
**Reviewer:** Steward  
**Verifier:** Sentinel  
**Escalation:** SEV-2; SEV-1 for payment/webhook blindness

### Task 6.1: Add/verify logs and request IDs

**Requirements:**
- request ID on API responses
- payment failure logs
- webhook failure logs
- auth denied logs
- admin action audit logs
- no secrets/PII in logs

### Task 6.2: Create incident runbooks

**Files:**
- `docs/incident-response.md`
- `docs/runbooks/payments.md`
- `docs/runbooks/stripe-webhooks.md`
- `docs/runbooks/refunds-disputes.md`

**Runbooks:**
- site down
- webhook failure
- payment failed
- duplicate payment event
- refund before transfer
- refund after transfer
- dispute opened/lost/won
- connected account disabled

---

## Phase 7: Final Sentinel Release Gate

**Owner:** Sentinel  
**Coordinator:** Atlas  
**Escalation:** Any failure blocks public release

### Required commands

```bash
pnpm -C apps/web typecheck
pnpm test
pnpm stabilize
pnpm -C apps/web build
pnpm -C apps/web linkcheck
```

### Required smoke tests

Run fresh production server:
```bash
pnpm -C apps/web build
pnpm -C apps/web exec next start -p 3100 -H 127.0.0.1
```

Smoke:
- public pages return 200
- private pages redirect/401/403 when anonymous
- admin pages blocked for non-admin
- `/api/health` returns ok
- no browser console errors on homepage/menu/core public pages

### Required security scans

- secret scan repo and history
- dependency audit
- route protection audit
- payment webhook/idempotency audit
- logging redaction check

### Required payment test-mode flows

- successful payment
- failed payment
- duplicate webhook replay
- refund before transfer
- refund after transfer/reversal path
- dispute created visibility
- manual approval before transfer

### Release acceptance

Public release can proceed only when:
- dirty tree is clean
- all core commands pass
- stabilization passes
- protected routes are proven protected
- payment flows are test-mode verified
- trust/legal pages are linked and coherent
- no live secrets are present
- residual risks are listed and explicitly accepted by Marlon

---

## Final Report Format

Atlas reports to Marlon:

- Status
- What changed
- Evidence
- Blockers
- Risks
- Next action

No release claim is valid without Sentinel evidence.
