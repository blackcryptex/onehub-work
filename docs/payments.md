# Payments & Stripe Integration

Canonical exception policy for guarded MVP: `onehub_work/docs/legal-exceptions-register.md`

## Environment Variables

- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret (from Stripe dashboard)
- `STRIPE_CONNECT_CLIENT_ID`: Stripe Connect client ID (optional)

## Flows

### Connect Onboarding
Vendor/venue orgs can onboard via `/app/billing/connect`. Uses Stripe Express accounts with accountLinks for OAuth flow.

### Escrow Funding
Buyer creates PaymentIntent via `/api/trpc/billing.escrowCreatePaymentIntent`. Frontend uses Stripe Elements to collect payment. Webhook `payment_intent.succeeded` marks EscrowAccount as FUNDED.

### Milestone Release
Seller org releases milestone → creates Stripe Transfer to recipient's Connect account. Payout record tracks status.

### Refunds
Refunds create Stripe refund for underlying Charge. Updates milestone status to REFUNDED.

## Webhook Setup

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward events: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`

Production: Create webhook endpoint in Stripe Dashboard pointing to `https://yourdomain.com/api/stripe/webhook`.

