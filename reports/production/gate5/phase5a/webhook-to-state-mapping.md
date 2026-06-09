# OneHub Gate 5 Phase 5A — Stripe Webhook to State Mapping

Status: READ-ONLY PLANNING EVIDENCE
Generated: 2026-06-02T17:58:16Z
Scope: documentation/modeling only. No Stripe setup, no webhook activation, no secrets/config changes, no billing changes, no DB mutations, no live/test payment execution.

## Current webhook implementation inspected

File: `apps/web/src/app/api/stripe/webhook/route.ts`

Current route behavior:
- Requires Stripe SDK configuration through `getStripeOrThrow()`.
- Requires `stripe-signature` header.
- Requires `STRIPE_WEBHOOK_SECRET`.
- Verifies raw body with `stripe.webhooks.constructEvent(body, signature, webhookSecret)`.
- Creates `WebhookEvent` by Stripe event id as an idempotency marker before handling.
- Handles only:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- Stores the full event object into `WebhookEvent.meta` after successful handling.
- Returns duplicate success if the event id already exists.

No webhook endpoint was called during this task.

## Current mapping: implemented events

| Stripe event | Current internal lookup | Current internal transition | Current side effects | Gate 5A verdict |
|---|---|---|---|---|
| `payment_intent.succeeded` | Find `PaymentIntent` by `stripeIntentId`, or use Stripe metadata `paymentIntentId` to attach `stripeIntentId` to existing local row. | `PaymentIntent.status != SUCCEEDED` -> `SUCCEEDED`; milestone -> `IN_ESCROW`; contract `FULLY_SIGNED` -> `IN_PAYMENT`; escrow -> `FUNDED` and balance increment. | Stores payment method; increments escrow balance by local amount; marks webhook processed. | PARTIAL. Good idempotency guard exists for local `PaymentIntent`, but webhook path does not create `Transaction`, does not evaluate `PaymentHoldback`, and does not record activity/audit like confirm route. |
| `payment_intent.payment_failed` | Same `PaymentIntent` lookup. | If not already `FAILED` or `SUCCEEDED`, set `PaymentIntent.status = FAILED`. | Marks webhook processed. | PARTIAL. Failure state is simple and safe, but milestone/contract/escrow are not explicitly reconciled. |
| all other events | none | no state transition | event id stored and then meta updated | SOUND for no-op, but incomplete for refunds/disputes/transfers. |

## Recommended authoritative Gate 5B event map

This map is recommended for future implementation planning only. It is not approved to implement in Gate 5A.

| Stripe event | Required state transition | Required idempotency key | Required correctness guard | Approval needed before implementation |
|---|---|---|---|---|
| `payment_intent.created` | Optional local `PaymentIntent` metadata reconciliation only; do not mark payable/funded. | Stripe PaymentIntent id + local `PaymentIntent.id`. | Must not create duplicate local active attempts for same contract/milestone. | Marlon approval for test-mode Stripe only. |
| `payment_intent.processing` | Local `PaymentIntent.REQUIRES_PAYMENT/PROCESSING` -> `PROCESSING`. | Stripe event id + local `PaymentIntent.id`. | Must not regress `SUCCEEDED`, `FAILED`, or `CANCELLED`. | Marlon approval for test-mode Stripe only. |
| `payment_intent.succeeded` | Canonical success reducer: `PaymentIntent.SUCCEEDED`; milestone `IN_ESCROW`; escrow balance increment exactly once; contract `FULLY_SIGNED` -> `IN_PAYMENT`; create `Transaction`; evaluate `PaymentHoldback`; record activity/audit. | Stripe PaymentIntent id and/or local `PaymentIntent.id`, with transaction unique on `paymentIntentId`. | Must be atomic; must be safe if local confirm and webhook race; must verify amount/currency/metadata match local contract/milestone. | Explicit Marlon approval required before test-mode implementation; live mode still separately blocked. |
| `payment_intent.payment_failed` | `PaymentIntent` -> `FAILED`; optionally record failure metadata. | Stripe event id + local `PaymentIntent.id`. | Must not regress `SUCCEEDED`; must leave milestone payable unless retry policy closes it. | Explicit Marlon approval for test-mode implementation. |
| `payment_intent.canceled` | Active local attempt -> `CANCELLED`. | Stripe event id + Stripe PaymentIntent id. | Must not cancel a succeeded local intent; must not change escrow/milestone if already funded. | Explicit Marlon approval for test-mode implementation. |
| `charge.refunded` or `refund.created`/`refund.updated` | Refund lane: create/update `RefundRequest`/money event; milestone `REFUNDED` only after confirmed completed refund; escrow balance reconciliation. | Refund id + charge id + payment intent id. | Must block release while refund open; must preserve platform-fee/processing-fee treatment policy. | Separate approval required; refund automation is currently blocked. |
| `charge.dispute.created` | Create/open dispute; freeze release; set `Dispute.freezeState = FROZEN`; block milestone release. | Dispute id + charge id. | Must not release while dispute is open/frozen. | Separate approval required; dispute automation is currently blocked. |
| `transfer.created` / `transfer.paid` | Payout `PENDING` -> `SENT` only when transfer confirmed as paid/available under selected Stripe semantics. | Transfer id + payout id. | Must verify recipient account and source transaction; no payee swaps. | Separate approval required; payout automation is currently blocked. |
| `transfer.failed` / `payout.failed` | Payout `FAILED`; milestone should remain `IN_ESCROW` or require admin reconciliation, not `PAID`. | Transfer/payout id + payout id. | Must not decrement escrow/release funds until corrected. | Separate approval required. |

## Recommended OneHub canonical reducer

Gate 5B should introduce one internal reducer function for money-state transitions and make both webhook and local confirm paths call it.

Recommended conceptual API:

```ts
applyMoneyEvent({
  source: "stripe.webhook" | "local.confirm" | "admin.release" | "admin.refund" | "system.reconcile",
  eventId,
  stripePaymentIntentId,
  localPaymentIntentId,
  eventType,
  amountCents,
  currency,
  actorId,
  metadata,
})
```

Reducer requirements:
- Wrap every material state change in a DB transaction.
- Reject amount/currency mismatch between Stripe and local `PaymentIntent`.
- Reject missing contract/proposal/milestone linkage for milestone payments.
- Never regress terminal success/release/refund states.
- Create exactly one `Transaction` per successful `PaymentIntent`.
- Increment escrow exactly once per successful `PaymentIntent`.
- Evaluate holdback exactly once per successful funding.
- Record activity/audit evidence exactly once, or idempotently link duplicates.
- Store webhook events as append-only evidence without relying on raw Stripe payload as business state.

## Current implementation deltas for Gate 5B

1. Unify success handling.
   - Current webhook success and confirm success have different side effects.
   - Gate 5B should make them call the same success reducer.

2. Fix escrow status semantics before validation.
   - Confirm route currently sets `PARTIALLY_RELEASED` when a second funding increments non-zero balance. That appears wrong for funding.

3. Add amount/currency verification.
   - Webhook success should compare Stripe amount/currency metadata to local amount/currency before applying success.

4. Decide deposit handling.
   - Deposit route creates Stripe PaymentIntent metadata `type: deposit`, but current webhook route only knows local `PaymentIntent`, not `Deposit`.
   - Gate 5B must either add deposit webhook mapping or keep deposits disabled/manual.

5. Keep live actions blocked.
   - Release route can create Stripe transfers if `stripe` and Connect account exist. That remains out of Gate 5A scope and should not be exercised without explicit approval.

## Steward verdict

Verdict: RISK for implementation readiness; SOUND for read-only planning.

The current webhook route has useful signature verification and event-id idempotency, but it is not yet a complete authoritative payment-state source. Gate 5B should not proceed until Marlon explicitly approves test-mode work and the reducer/idempotency design above is accepted.
