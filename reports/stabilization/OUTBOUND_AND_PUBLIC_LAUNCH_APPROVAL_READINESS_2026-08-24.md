# OneHub outbound delivery and public-launch approval readiness

Date: 2026-08-24
Owner approval source: Marlon Smith founder approval for OneHub implementation readiness work.

## Scope recorded

This packet records implementation readiness for outbound email/SMS delivery and public-launch approval controls. It does not activate live Stripe, billing, money movement, production provider credentials, public domains, or infrastructure changes.

## Approval boundaries

- Founder approval: Marlon Smith approval is recorded as founder/product approval to continue readiness implementation.
- Legal counsel approval: Not recorded. No external legal-counsel approval evidence was provided in this lane.
- Public-launch readiness: Bounded. Public launch remains gated on provider credentials, legal-counsel review where required, and no live Stripe activation unless Marlon separately approves that lane.
- Payments/Stripe: No live Stripe activation, payment mode change, webhook activation, Connect activation, public payment promise, or money movement behavior is approved or changed by this packet.

## Outbound delivery readiness

Implemented delivery states must be reported truthfully:

- `NOT_CONFIGURED`: Provider credentials/from address are absent or mock mode is not explicitly enabled; no email/SMS was sent.
- `FAILED`: A configured provider rejected the request or delivery confirmation failed; no sent claim is made.
- `SENT`: A configured provider accepted the request and a safe provider/status/message id can be reported.

## Provider setup still required for real sends

Actual outbound sending is blocked pending provider credentials/env setup. Configure exactly one email provider and, when SMS is approved for use, Twilio SMS credentials. Do not commit credentials.

Email options:

- Resend: `ONEHUB_EMAIL_PROVIDER=RESEND`, `RESEND_API_KEY`, `OUTBOUND_EMAIL_FROM`
- SendGrid: `ONEHUB_EMAIL_PROVIDER=SENDGRID`, `SENDGRID_API_KEY`, `OUTBOUND_EMAIL_FROM`
- Postmark: `ONEHUB_EMAIL_PROVIDER=POSTMARK`, `POSTMARK_SERVER_TOKEN`, `OUTBOUND_EMAIL_FROM`
- Mailgun: `ONEHUB_EMAIL_PROVIDER=MAILGUN`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `OUTBOUND_EMAIL_FROM`

SMS option:

- Twilio: `ONEHUB_SMS_PROVIDER=TWILIO`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`

## Test-only delivery

Mock outbound delivery is only valid in tests when `NODE_ENV=test`, `ONEHUB_OUTBOUND_TEST_MODE=true`, and provider is `MOCK`. This prevents tests from sending real SMS/email while still proving configured send paths.

## Launch control recommendation

Before public launch, Sentinel/Atlas should verify:

1. Provider credentials are configured outside source control.
2. Not-configured UI/API paths do not claim messages were sent.
3. Any legal/public Terms, Payments, Refunds, Disputes, and Booking Classification surfaces have actual legal-counsel evidence if the product claims legal review.
4. Stripe remains non-live until a separate Marlon-approved Stripe activation lane is opened.
