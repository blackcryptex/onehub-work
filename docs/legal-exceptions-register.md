# OneHub Legal Exceptions Register

Status: canonical source of truth for guarded MVP
Owner: Atlas / OneHub policy lane
Scope: policy and audit rules for legal, money, and admin exception handling only

## Guardrails

- Default rule: no exception is allowed unless it is explicitly listed below as allowed.
- No open-ended "manual exception" path exists in guarded MVP.
- Exceptions may not redesign core money flow, fee math, or contract formation.
- Existing route permissions still apply. This register adds approval and evidence requirements on top.
- Current implementation note: product RBAC currently exposes broad `ADMIN` authority in code. For guarded MVP policy, the named approval roles below are authoritative. Until role-splitting is implemented, any named admin-role approval must be executed by a global `ADMIN` and recorded with the named approval role in the override record.

## Named approval roles

- `FINANCE_ADMIN`: approves refund, payout, release, and holdback exceptions.
- `LEGAL_ADMIN`: approves legal-text/version exceptions and dispute-outcome exceptions that modify obligations.
- `OPERATIONS_ADMIN`: approves booking-classification corrections and emergency operational interventions.
- `PLATFORM_ADMIN`: break-glass authority for emergency intervention, limited to platform continuity and safety.

## Required audit package for every allowed exception

Every allowed exception must produce all of the following:

1. override record with unique exception ID
2. actor identity and approval role
3. target object IDs (`contractId`, `proposalId`, `milestoneId`, `payoutId`, `eventId`, `orgId` as applicable)
4. before and after values
5. reason code and plain-language justification
6. supporting evidence artifacts or links
7. timestamp
8. linked Activity and Audit trail entries

Recommended storage target for guarded MVP: existing audit trail plus an exception record payload attached to the same operation metadata.

## Legal Exceptions Register

| Exception name | Trigger / exact use case | Approver | Acceptance capture required | Override record required | Legal version reference required | Refund / dispute / holdback freeze required | Allowed in guarded MVP | Required audit evidence |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Fee deviation: platform fee override | Any change to canonical platform fee percent on a contract, payout, or release | `FINANCE_ADMIN` + `LEGAL_ADMIN` | Yes | Yes | Yes | Yes | No | N/A, disallowed |
| Fee deviation: processor-fee absorption override | Platform absorbs or rewrites processor fee outside canonical flow | `FINANCE_ADMIN` | Yes | Yes | Yes | Yes | No | N/A, disallowed |
| Refund deviation: full refund override | Refund full milestone amount when standard contract terms would not auto-allow it, but money is still in escrow or refund route is available | `FINANCE_ADMIN` with `LEGAL_ADMIN` review if dispute-linked | Yes | Yes | Yes | Yes | Yes | dispute ID or cancellation record, payer request, milestone/payment IDs, refund amount, legal basis, reviewer note |
| Refund deviation: partial refund override | Refund amount smaller than funded amount to resolve cancellation/dispute with explicit bounded amount | `FINANCE_ADMIN` with `LEGAL_ADMIN` review if dispute-linked | Yes | Yes | Yes | Yes | Yes | dispute ID or cancellation record, amount calculation, payer acceptance, milestone/payment IDs, reviewer note |
| Refund deviation: off-ledger goodwill refund | Refund outside canonical escrow/payment path or without linked milestone/payment | `FINANCE_ADMIN` | Yes | Yes | Yes | Yes | No | N/A, disallowed |
| Dispute resolution exception: negotiated settlement disposition | Resolve an open dispute by selecting one bounded outcome: no refund, partial refund, or full refund against linked milestone | `LEGAL_ADMIN` with `FINANCE_ADMIN` approval for money movement | Yes | Yes | Yes | Yes | Yes | dispute record, submitted evidence, settlement summary, linked milestone/payment IDs, acceptance from affected party or documented refusal path |
| Dispute resolution exception: admin closes dispute without evidence | Close or reject dispute without submitted evidence or rationale | `LEGAL_ADMIN` | No | Yes | Yes | Yes | No | N/A, disallowed |
| Holdback exception: temporary release hold | Freeze payout/release on a funded milestone because of open dispute, fraud concern, identity mismatch, or legal review | `FINANCE_ADMIN` or `LEGAL_ADMIN` | No | Yes | No | Yes | Yes | trigger reason, linked dispute/risk case, milestone and escrow IDs, freeze start time, review deadline |
| Holdback exception: holdback amount rewrite | Change holdback amount or reserve ratio outside canonical milestone amount | `FINANCE_ADMIN` | Yes | Yes | Yes | Yes | No | N/A, disallowed |
| Payout/release exception: idempotent release recovery | Re-run a failed or uncertain release path for the same milestone without changing payee or amount | `FINANCE_ADMIN` | No | Yes | No | Yes if dispute/open review exists, otherwise No | Yes | payout/milestone IDs, failure evidence, before/after status snapshot, duplicate-check proof |
| Payout/release exception: payee swap after funding | Redirect payout to a different org/account after escrow funding | `FINANCE_ADMIN` + `LEGAL_ADMIN` | Yes | Yes | Yes | Yes | No | N/A, disallowed |
| Payout/release exception: amount override at release | Release amount different from milestone amount | `FINANCE_ADMIN` | Yes | Yes | Yes | Yes | No | N/A, disallowed |
| Booking-classification exception: pre-signing classification correction | Correct booking type/category/party classification before first contract signature and before payment funding, to align record with actual deal | `OPERATIONS_ADMIN` | No | Yes | Yes if contract already generated | No | Yes | source record showing incorrect classification, corrected value, confirmation no signatures and no funding exist |
| Booking-classification exception: post-signing classification rewrite | Reclassify booking after contract signing or payment funding in a way that changes legal/payment meaning | `OPERATIONS_ADMIN` + `LEGAL_ADMIN` | Yes | Yes | Yes | Yes | No | N/A, disallowed |
| Legal-text/version exception: regenerate unsent or unsigned legal text | Replace contract body/version before first signature because of drafting defect, missing field, or approved legal correction | `LEGAL_ADMIN` | No | Yes | Yes | No | Yes | prior version ID, new version ID, diff summary, reason for regeneration, proof no signature was captured on replaced version |
| Legal-text/version exception: signature on mismatched or missing version | Allow signing when displayed legal text/version does not exactly match stored signed artifact | `LEGAL_ADMIN` | Yes | Yes | Yes | Yes | No | N/A, disallowed |
| Admin emergency/manual intervention: break-glass impersonation for investigation | Admin impersonates a user only to inspect, reproduce, or unblock a live issue without changing legal or money terms | `PLATFORM_ADMIN` | No | Yes | No | No unless dispute/hold already open | Yes | ticket/incident ID, target user, reason, session start/end, actions performed, proof no money/legal values changed |
| Admin emergency/manual intervention: manual state repair | Correct a broken status transition or missing audit-linked row for an already-authorized action, without changing amount, payee, fee, or legal text | `PLATFORM_ADMIN` with domain co-approval (`FINANCE_ADMIN` or `LEGAL_ADMIN` as applicable) | No | Yes | If legal object touched: Yes | If money/dispute object touched: Yes until repair completes | Yes | incident evidence, broken state snapshot, exact fields repaired, linked authorized source action, before/after DB proof |
| Admin emergency/manual intervention: undocumented manual override | Any manual action that changes money, legal text, payee, fee, or obligation without one of the listed exception types | `PLATFORM_ADMIN` | N/A | Yes | N/A | N/A | No | N/A, disallowed |

## Allowed exception list

1. Refund deviation: full refund override
2. Refund deviation: partial refund override
3. Dispute resolution exception: negotiated settlement disposition
4. Holdback exception: temporary release hold
5. Payout/release exception: idempotent release recovery
6. Booking-classification exception: pre-signing classification correction
7. Legal-text/version exception: regenerate unsent or unsigned legal text
8. Admin emergency/manual intervention: break-glass impersonation for investigation
9. Admin emergency/manual intervention: manual state repair

## Disallowed exception list

1. Fee deviation: platform fee override
2. Fee deviation: processor-fee absorption override
3. Refund deviation: off-ledger goodwill refund
4. Dispute resolution exception: admin closes dispute without evidence
5. Holdback exception: holdback amount rewrite
6. Payout/release exception: payee swap after funding
7. Payout/release exception: amount override at release
8. Booking-classification exception: post-signing classification rewrite
9. Legal-text/version exception: signature on mismatched or missing version
10. Admin emergency/manual intervention: undocumented manual override

## Current implementation anchors and policy fit

- Milestone release authority already exists in `tmp_onehub_review/src/lib/rbac.ts` via `canReleaseMilestonePayment(...)`, and in `tmp_onehub_review/src/app/api/payments/release-milestone/route.ts`.
- Release audit trail already exists in `tmp_onehub_review/src/app/api/payments/release-milestone/route.ts` through `recordActivity(...)`, `recordAudit(...)`, payout creation, and `moneyTx` creation.
- Refund audit trail already exists in `tmp_onehub_review/src/server/routers/billing.ts` via `refundMilestone`, `moneyTx`, `recordActivity(...)`, and `recordAudit(...)`.
- Dispute objects already exist in `tmp_onehub_review/src/server/routers/dispute.ts`, but dispute status changes currently lack approval-role and evidence enforcement, so this register is the policy boundary for guarded MVP.
- Contract versioning already exists in `tmp_onehub_review/prisma/schema.prisma` (`Contract.version`) and contract acceptance already requires checkbox capture in `tmp_onehub_review/src/components/contracts/ContractSignatureForm.tsx`.
- Manual admin intervention surface already exists in `tmp_onehub_review/src/app/api/admin/impersonate/route.ts`; this register limits it to investigation or documented state repair only.

## Enforcement notes for guarded MVP

- If an action is not one of the allowed rows above, the action is denied.
- If required acceptance capture is missing, the exception is denied.
- If required legal version reference is missing, the exception is denied.
- If required freeze is missing for a live dispute or money-state intervention, the exception is denied.
- Every allowed exception must be reconstructible from audit evidence alone.
