# Gate 7 Draft Trust / Legal / Support UX Anchors Evidence

Generated: 2026-06-06T10:42:07Z
Profile: Forge
Task: `t_990609bd`

## Scope

Safe local/docs/test-mode UX anchor work only. This evidence does not approve legal copy, does not approve public launch, and does not create enforceable acceptance text.

Forbidden actions preserved:

- No production/public launch action
- No DNS/SSL/infrastructure action
- No credential/API-key or secret changes
- No billing or live Stripe/payment changes
- No destructive DB/schema/migration action
- No legal approval or legal acceptance enforcement
- No Oracle involvement

## Changed files in this Gate 7 trust/legal/support anchor scope

- `apps/web/src/app/(auth)/signup/page.tsx`
- `apps/web/src/app/providers/onboarding/page.tsx`
- `apps/web/src/app/support/page.tsx`
- `apps/web/src/app/help/page.tsx`
- `apps/web/src/app/terms/page.tsx`
- `apps/web/src/app/privacy/page.tsx`
- `apps/web/src/app/legal/payments/page.tsx`
- `apps/web/src/app/legal/refunds/page.tsx`
- `apps/web/src/app/legal/disputes/page.tsx`
- `apps/web/src/app/legal/fees/page.tsx`
- `apps/web/src/app/legal/booking-classification/page.tsx`
- `apps/web/src/components/layout/Footer.tsx`
- `apps/web/src/components/layout/LandingHeader.tsx`
- `apps/web/src/components/legal/DraftLegalPageNotice.tsx`
- `apps/web/tests/gate7-trust-legal-support-anchors.test.ts`
- `reports/production/acceleration/gate7-draft-trust-legal-support-anchors/evidence.md`

## Work completed

1. Added a signup legal helper as a disabled, non-acceptance checkbox placeholder labeled `NOT LEGAL-APPROVED / INTERNAL DRAFT`, with Terms, Privacy, and Support review links only.
2. Added draft policy/support anchors near provider onboarding Step 4 Payments & Contracts and Step 7 Review & Publish without asserting legal approval or enabling legal acceptance.
3. Removed support/help self-loop friction by labeling unverified chat, phone, docs, video, API docs, and help articles as draft/coming soon instead of routing users back to the same page as if complete.
4. Split landing-header Privacy and Terms links and added header/footer anchors for `/terms`, `/privacy`, `/support`, and guarded draft legal policy pages.
5. Added shared visible legal-page notice component with draft/effective-version placeholders and placed it on Terms, Privacy, Payments, Refunds, Disputes, Fees, and Booking Classification pages.
6. Added a targeted Gate 7 regression test covering draft/non-acceptance posture, provider Step 4/Step 7 anchors, header/footer policy links, support/help self-loop fixes, and legal-page draft version placeholders.

## Validation performed

RED check:

```bash
pnpm test -- apps/web/tests/gate7-trust-legal-support-anchors.test.ts
```

Result: failed as expected before the final header fix because `LandingHeader.tsx` exposed `/legal/payments` but did not expose `/legal/refunds`, `/legal/disputes`, `/legal/fees`, or `/legal/booking-classification`.

GREEN checks:

```bash
pnpm test -- apps/web/tests/gate7-trust-legal-support-anchors.test.ts
```

Result:

```text
Test Files  1 passed (1)
Tests       5 passed (5)
```

```bash
pnpm -C apps/web typecheck
```

Result: exit code 0.

Secret/credential scan over scoped files:

```text
secret-like findings: none
```

## Residual risk / required next review

Sentinel must review the scoped diff for no secret exposure and no legal-approval overclaim before Atlas treats this lane as accepted. The copy remains internal draft placeholder language only; final Terms, Privacy, support operations, payment/refund/dispute language, effective dates, and legal acceptance enforcement remain blocked on Marlon/legal approval.

## Explicit stop point

Forge stops at safe local UX anchors plus targeted regression coverage. No legal approval, no public launch action, no production/infra change, no credential/API-key change, no billing/live payment change, and no destructive DB/schema/migration action occurred.
