# OneHub User Help Center Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task after Marlon approves. Use Forge for implementation, Scout for UX clarity, Steward for safety/role/privacy review, and Sentinel for verification.

**Goal:** Replace OneHub’s placeholder Help Center with real step-by-step user guidance so clients, DIY planners, pro planners, vendors, venues, and admins can learn how to complete key workflows without broken links, fake docs, or confusing placeholder content.

**Architecture:** Build a small, typed, static help-content system first. Render article index/detail pages from one source of truth, add role-based guide collections, link help from existing dashboards, and verify every help link with automated tests and browser smoke. Do not introduce CMS/database complexity yet.

**Tech Stack:** Next.js App Router, React/TypeScript, existing OneHub UI components, Vitest/Testing Library, Playwright, internal static content definitions.

---

## Non-negotiables

1. No broken links.
2. No placeholder article links pointing back to `/help`.
3. No fake chat/video/API docs claims unless those pages actually exist.
4. No wedding-only terminology in generic event guidance.
5. No legal/payment/live-money claims beyond current guarded/test-mode behavior.
6. No dirty repo at completion.
7. Sentinel must verify before calling it done.

---

## Current problem

OneHub has:

- `/help` with categories and article titles.
- `/support` with basic support cards and FAQ.
- DIY guided cockpit copy.
- Pro Planner settings link to `/help` and `/messages`.

But `/help` is mostly a placeholder:

- Article links do not open real article pages.
- Documentation, videos, and API docs cards point back to `/help`.
- There is no clear role-based guide for pro planners, DIY planners, vendors, venues, clients, or admins.
- There is no exact “how do I send a message?” article.
- There is no link checker/test gate proving help links stay valid.

---

## Target user experience

A user should be able to open Help and quickly choose:

- **I am a Pro Planner**
- **I am a DIY Planner**
- **I am a Vendor**
- **I am a Venue**
- **I am a Client**
- **I am an Admin**

Then read short step-by-step articles like:

- Send a message
- Create an event
- Source vendors or venues
- Send a booking request
- Review and accept a proposal
- Generate/review a contract
- Understand payment readiness
- Create tasks and milestones
- Handle a crisis or replacement
- Check admin oversight/risk

Each article must include:

- Who this is for
- Before you start
- Exact clicks
- What success looks like
- Common mistakes
- Safety notes if money/legal/admin risk is involved
- Related articles with working links

---

## Phase 0 — Baseline and link inventory

### Task 0.1: Capture current Help/Support link inventory

**Objective:** Know every current help/support link before changing anything.

**Files:**
- Inspect: `apps/web/src/app/help/page.tsx`
- Inspect: `apps/web/src/app/support/page.tsx`
- Inspect: `apps/web/src/components/layout/LandingHeader.tsx`
- Inspect: `apps/web/src/components/layout/Footer.tsx`
- Inspect: `apps/web/src/components/pro-planner/Dashboard.tsx`
- Inspect: `apps/web/src/components/diy-planner/Dashboard.tsx`

**Steps:**
1. Search for `/help`, `/support`, `Help Center`, `Support`, `TODO: Create`.
2. Record all current links and placeholders.
3. Confirm no hidden help article routes already exist.

**Verification:**
- Produce a short inventory in implementation notes.
- No code changes yet.

---

## Phase 1 — Static help content model

### Task 1.1: Create typed help article model

**Objective:** Add one clean source of truth for Help Center content.

**Files:**
- Create: `apps/web/src/lib/help-content.ts`
- Test: `apps/web/tests/help-content.test.ts`

**Implementation shape:**

Create types:

```ts
export type HelpRole = "pro-planner" | "diy-planner" | "vendor" | "venue" | "client" | "admin" | "all";

export type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  roles: HelpRole[];
  category: string;
  updatedAt: string;
  steps: string[];
  successLooksLike: string[];
  commonMistakes: string[];
  safetyNotes?: string[];
  relatedSlugs: string[];
};
```

Add helpers:

```ts
export function getHelpArticle(slug: string): HelpArticle | null;
export function getHelpArticlesByRole(role: HelpRole): HelpArticle[];
export function getHelpArticlesByCategory(category: string): HelpArticle[];
export function getAllHelpArticles(): HelpArticle[];
```

**Test requirements:**
- Every slug is unique.
- Every related slug exists.
- Every article has at least 3 steps.
- No article contains `coming soon`, `TODO`, or generic filler.
- Generic articles must not force wedding terminology.

**Commands:**

```bash
pnpm exec vitest run tests/help-content.test.ts --reporter=verbose
```

Expected: PASS.

---

## Phase 2 — Real article pages, no broken links

### Task 2.1: Replace placeholder `/help` cards with real links

**Objective:** Make `/help` a real index, not a placeholder page.

**Files:**
- Modify: `apps/web/src/app/help/page.tsx`
- Test: `apps/web/tests/help-center-page.test.tsx`

**Rules:**
- “Documentation” must link to actual article/category pages or be renamed to something real.
- “Video Tutorials” must be removed or clearly labeled unavailable only if no video page exists. Prefer not showing it yet.
- “API Documentation” must be removed from user-facing help unless actual API docs exist and are relevant.
- All article titles must link to `/help/articles/[slug]`.

**Verification:**
- Tests assert no Help Center article link points back to `/help` unless it is a real top-level navigation link.
- Tests assert no `TODO: Create` comments remain in the rendered Help page source.

---

### Task 2.2: Add article detail route

**Objective:** Users can open and read each guide.

**Files:**
- Create: `apps/web/src/app/help/articles/[slug]/page.tsx`
- Test: `apps/web/tests/help-article-page.test.tsx`

**Page behavior:**
- Unknown slug returns 404.
- Known slug renders title, summary, role labels, steps, success checklist, mistakes, safety notes, related articles.
- Related links point to real slugs.

**Verification:**

```bash
pnpm exec vitest run tests/help-article-page.test.tsx --reporter=verbose
```

Expected: PASS.

---

## Phase 3 — Minimum article set for private pilot

### Task 3.1: Add Pro Planner message guide

**Objective:** Teach pro planners exactly how to send a message.

**Article slug:** `pro-planner-send-message`

**Required content:**
- Go to Pro Planner dashboard.
- Click Messages or open `/messages`.
- Choose the thread connected to the event/client/vendor/venue/proposal/booking request.
- Type reply.
- Click Send.
- Confirm reply appears after refresh.
- Explain internal planner notes are not client/vendor messages.

**Safety notes:**
- Do not put private planner-only notes in client/vendor-visible threads.
- Use internal notes only for planner-only content.

---

### Task 3.2: Add Create Event guides

**Article slugs:**
- `diy-create-event`
- `pro-planner-create-event`

**Required content:**
- Start from correct dashboard.
- Enter event type, date, city, guest target, budget.
- Explain event type can be wedding, gala, corporate event, private party, conference, etc.
- Confirm Event Vault opens after event exists.

**Language rule:**
- Do not force wedding terms.

---

### Task 3.3: Add sourcing and booking request guides

**Article slugs:**
- `source-vendors-and-venues`
- `send-booking-request`

**Required content:**
- Open Marketplace.
- Search/filter by event need.
- Review trust/status/availability info.
- Shortlist or request.
- Explain request is not a signed contract or payment.

---

### Task 3.4: Add proposal and contract guides

**Article slugs:**
- `review-proposal`
- `accept-proposal`
- `review-contract`
- `sign-contract`

**Required content:**
- Proposal review path.
- Accept proposal only when terms are ready.
- Contract generation/review path.
- Signature readiness.
- Who signs next.

**Safety notes:**
- No legal advice claim.
- Contract/payment readiness does not equal public legal launch approval.

---

### Task 3.5: Add payment-readiness guide

**Article slug:** `understand-payment-readiness`

**Required content:**
- Explain guarded/test-mode/private-pilot payment readiness.
- Explain blocked/ready states.
- Explain disputes/refunds/holdbacks/admin review at a user level.
- Do not say live payments are enabled unless they are actually enabled.

---

### Task 3.6: Add tasks/milestones guide

**Article slug:** `create-tasks-and-milestones`

**Required content:**
- Open event workspace/vault.
- Add task.
- Assign owner.
- Set due date/dependency/blocker if available.
- Record completion proof/note.
- Explain admin/planner visibility.

---

### Task 3.7: Add crisis/replacement guide

**Article slug:** `handle-crisis-and-replacement`

**Required content:**
- Open event workspace.
- Record issue.
- Link vendor/venue/contract/payment/task/milestone when available.
- Start replacement request.
- Explain manual review before money/legal action.
- Confirm admin oversight sees risk.

---

### Task 3.8: Add admin oversight guide

**Article slug:** `admin-review-risk`

**Required content:**
- Explain what admins can see.
- Explain risk queues/status.
- Explain admins should not use manual override for money/legal changes without approval.
- Keep minimum necessary access language.

---

## Phase 4 — Role-based guide collections

### Task 4.1: Add role guide pages

**Objective:** Let users find help by role.

**Files:**
- Create: `apps/web/src/app/help/roles/[role]/page.tsx`
- Test: `apps/web/tests/help-role-page.test.tsx`

**Routes:**
- `/help/roles/pro-planner`
- `/help/roles/diy-planner`
- `/help/roles/vendor`
- `/help/roles/venue`
- `/help/roles/client`
- `/help/roles/admin`

**Verification:**
- Each role page renders at least one article.
- Unknown role 404s.
- All article links resolve.

---

## Phase 5 — Dashboard help entry points

### Task 5.1: Add contextual help links from Pro Planner surfaces

**Objective:** Users can get guidance where they are stuck.

**Files likely touched:**
- `apps/web/src/components/pro-planner/Dashboard.tsx`
- `apps/web/src/app/(app)/messages/page.tsx`
- `apps/web/src/app/(app)/messages/[threadId]/page.tsx`

**Add links:**
- Pro Planner Settings → `/help/roles/pro-planner`
- Message inbox → `/help/articles/pro-planner-send-message`
- Message thread page → `/help/articles/pro-planner-send-message`
- Contracts/payment panels → relevant contract/payment articles if nearby code allows cleanly.

**Rule:**
- Add only useful contextual links. Do not clutter every card.

---

### Task 5.2: Add contextual help links from DIY surfaces

**Objective:** DIY users can learn event creation, vendor sourcing, tasks, messages, and payment-readiness basics.

**Files likely touched:**
- `apps/web/src/components/diy-planner/Dashboard.tsx`
- selected Event Vault route if appropriate.

**Add links:**
- DIY help section → `/help/roles/diy-planner`
- Event creation area → `/help/articles/diy-create-event`
- Vendor/venue area → `/help/articles/source-vendors-and-venues`

---

## Phase 6 — Link checker and no-placeholder gate

### Task 6.1: Add static link integrity tests

**Objective:** Prevent broken internal help links from shipping.

**Files:**
- Create: `apps/web/tests/help-link-integrity.test.ts`

**Test rules:**
- Every article related slug exists.
- Every role page has articles.
- Every rendered Help index article link uses a known slug.
- No visible help link should point to `#`.
- No user-facing Help Center link points to an unavailable page.

---

### Task 6.2: Add copy quality tests

**Objective:** Prevent dirty/filler help content.

**Files:**
- Create: `apps/web/tests/help-copy-quality.test.ts`

**Test rules:**
- Ban `coming soon`, `TODO`, `lorem ipsum`, `placeholder` in help content.
- Ban wedding-forcing phrases in generic articles.
- Ban claims like “legally binding,” “live payments,” or “escrow enabled” unless the article is a safety explanation and uses guarded wording.
- Each article must include success criteria and common mistakes.

---

## Phase 7 — Browser smoke

### Task 7.1: Add Help Center Playwright smoke

**Objective:** Browser-prove the help system works.

**Files:**
- Create: `e2e/help-center.spec.ts`

**Smoke path:**
1. Open `/help`.
2. Click Pro Planner role guide.
3. Open “Send a message.”
4. Confirm exact steps render.
5. Click related message/help links.
6. Open DIY role guide.
7. Open source vendor/venue guide.
8. Confirm no 404.
9. Confirm page contains no `coming soon`/placeholder copy.

**Command:**

```bash
PLAYWRIGHT_BASE_URL=https://www.1hubevents.com pnpm exec playwright test e2e/help-center.spec.ts --project=chromium --reporter=line
```

During local implementation, run against local app if needed. Final proof should run against canonical Preview after deploy.

---

## Phase 8 — Reports and acceptance artifact

### Task 8.1: Save Help Center completion report

**Objective:** Keep proof in repo.

**Files:**
- Create: `reports/help-center/ONEHUB_HELP_CENTER_COMPLETION_2026-08-29.md`

**Report must include:**
- Articles shipped.
- Role pages shipped.
- Link integrity results.
- Copy quality results.
- Local gates.
- Protected/canonical Preview smoke result.
- Sentinel verdict.
- Known non-blocking residuals, if any.

---

## Final validation gate

Before calling this done, run:

```bash
git diff --check
pnpm exec vitest run tests/help-content.test.ts tests/help-center-page.test.tsx tests/help-article-page.test.tsx tests/help-role-page.test.tsx tests/help-link-integrity.test.ts tests/help-copy-quality.test.ts --reporter=verbose
pnpm run lint
pnpm run typecheck
pnpm run build
PLAYWRIGHT_BASE_URL=https://www.1hubevents.com pnpm exec playwright test e2e/help-center.spec.ts --project=chromium --reporter=line
```

Expected:
- All pass.
- Lint has 0 errors.
- No broken help links.
- No placeholder help content.
- Repo clean after commit.
- Sentinel signs off.

---

## Kanban execution graph after approval

1. **Scout:** Help/user-guidance UX inventory and article list review.
2. **Steward:** Safety/copy guardrail review for payment/legal/admin wording.
3. **Forge:** Implement static content model + article routes + tests.
4. **Forge:** Replace Help Center placeholders and add role pages.
5. **Forge:** Add contextual dashboard links.
6. **Sentinel:** Verify no broken links/placeholders and run tests.
7. **Forge:** Add Playwright help smoke and completion artifact.
8. **Sentinel:** Final protected/canonical Preview smoke and acceptance.

---

## Estimated effort

Best case: 1 working day.
Realistic: 1.5–2 working days.
If many dashboard contextual links need polish: 2–3 working days.

---

## Approval needed

Before implementation, Marlon should approve:

**“Approved — build the OneHub Help Center/user guides with no broken links or placeholders.”**

After approval, Atlas should create the Kanban graph and start Scout/Steward read-only review plus Forge implementation. Do not change production credentials, billing, live payments, legal status, infrastructure, or destructive data.
