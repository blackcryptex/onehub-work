# Gate 7 Final Closure — Payment Freeze and Monitoring Checklist

Scope: docs-only/test-mode planning. This checklist keeps live payments blocked. It does not authorize Stripe dashboard changes, live keys, webhook creation, Connect onboarding, payouts, refunds, disputes, billing changes, production launch, or legal acceptance.

Evidence sources read:

- `docs/payments.md`
- `docs/incident-response.md`
- `docs/devops.md`
- `apps/web/.env.example`
- `reports/production/acceleration/gate7-launch-readiness-no-provision/launch-readiness-checklist.md`
- `reports/production/acceleration/gate7-safe-local-prework/evidence.md`

## Current payment posture

Verdict: LIVE PAYMENTS FROZEN.

Allowed in this lane:

- Read docs and non-secret examples.
- Use local/test-mode placeholders only.
- Document required environment names and approval boundaries.
- Run non-destructive local checks that do not touch real env files or provider dashboards.

Not allowed in this lane:

- Creating, copying, rotating, revoking, or configuring real Stripe keys.
- Creating production Stripe webhook endpoints.
- Enabling live payment collection.
- Moving money through payouts, transfers, refunds, disputes, or Connect.
- Changing production billing, Stripe dashboard, DNS/SSL, hosting, or legal/public terms.

## Freeze checklist

| Check | Required safe state | Status |
|---|---|---:|
| Live Stripe keys | No live values in docs/reports/examples; only placeholders or test-mode example prefixes. | Required before review |
| `STRIPE_SECRET_KEY` | Secret; production value blocked until Marlon approval. | Frozen |
| `STRIPE_WEBHOOK_SECRET` | Secret; production webhook setup blocked until Marlon approval. | Frozen |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public key; production value blocked until live-payment approval. | Frozen |
| `STRIPE_CONNECT_CLIENT_ID` | Connect config; production use blocked until Connect/legal/payment ops approval. | Frozen |
| Webhook endpoint | `docs/payments.md` documents production endpoint need, but this lane performs no dashboard setup. | Blocked |
| Connect onboarding | No live Connect onboarding activation from this lane. | Blocked |
| Refunds/disputes/payouts/transfers | No live money-movement operations from this lane. | Blocked |
| Legal/payment terms | Terms, Privacy, Payment/Refund/Dispute policy, vendor/client obligations, support channel, and effective dates need approval. | Blocked |
| Monitoring/alerting | Payment webhook failures, idempotency failures, reconciliation mismatches, disputes, refunds, payout failures need approved alerting before launch. | Blocked pending monitoring decision |

## Test-mode monitoring checklist before any live-payment approval

These checks can be planned or run in approved local/test-mode only. They are prerequisites, not approval.

1. Webhook safety
   - Verify test-mode webhook route accepts only signed events.
   - Verify unsigned/invalid signatures fail safely.
   - Verify webhook logs redact secrets and do not persist raw signing secrets.
   - Verify idempotency for duplicate Stripe event delivery.

2. Payment state integrity
   - Verify PaymentIntent success maps to funded escrow state exactly once.
   - Verify failed/canceled PaymentIntent states do not mark escrow as funded.
   - Verify milestone release/refund/dispute state transitions preserve audit history.
   - Verify disputed or legally frozen milestones cannot be released accidentally.

3. Reconciliation
   - Compare local expected payment state against Stripe test-mode state.
   - Flag orphaned local payments, orphaned Stripe events, amount/currency mismatches, and duplicate events.
   - Record only non-secret metadata in evidence: IDs may be sanitized, timestamps, status categories, and test names.

4. Alerting prerequisites
   - Define alert recipients for webhook failure, payment state mismatch, payout/transfer failure, refund/dispute creation, and reconciliation drift.
   - Define severity: payment credential/fund-movement risk is SEV0; webhook/payment processing outage is at least SEV1.
   - Define maintenance/write-freeze trigger for payment incidents.

5. Operator/legal prerequisites
   - Marlon approves live mode explicitly.
   - Legal/payment terms are approved and linked to acceptance/version records.
   - Payment operations owner is assigned for refunds, disputes, payouts, Connect, and reconciliation.
   - Secrets owner confirms secret storage, rotation, access, and emergency revocation path.

## Live-payment unfreeze gate

Live payments may not be considered unblocked until all of these are true:

- Marlon explicitly approves live payments.
- Legal/payment documents are approved for public/customer use.
- Production domain, SSL, hosting, auth callbacks, and webhook URL are approved.
- Stripe live dashboard owner and webhook endpoint are approved.
- Secret storage and rotation policy are approved.
- Payment monitoring/alerting and reconciliation are approved and tested in test mode.
- Incident owner, payment freeze owner, and customer/support communication owner are assigned.

Until then, the correct operational state is: live payments remain frozen.
