export type OutboundDeliveryStatus = "NOT_CONFIGURED" | "FAILED" | "SENT";
export type OutboundChannel = "email" | "sms";
export type EmailProvider = "RESEND" | "SENDGRID" | "POSTMARK" | "MAILGUN" | "MOCK";
export type SmsProvider = "TWILIO" | "MOCK";

export interface OutboundDeliveryResult {
  channel: OutboundChannel;
  status: OutboundDeliveryStatus;
  provider?: EmailProvider | SmsProvider;
  providerMessageId?: string;
  reason?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export interface SendSmsInput {
  to: string;
  body: string;
  from?: string;
}

type EmailProviderConfig =
  | { provider: "RESEND"; apiKey: string; from: string }
  | { provider: "SENDGRID"; apiKey: string; from: string }
  | { provider: "POSTMARK"; serverToken: string; from: string }
  | { provider: "MAILGUN"; apiKey: string; domain: string; from: string }
  | { provider: "MOCK"; from: string };

type SmsProviderConfig =
  | { provider: "TWILIO"; accountSid: string; authToken: string; from: string }
  | { provider: "MOCK"; from: string };

const NOT_CONFIGURED_EMAIL_REASON = "Outbound email provider is not configured; no email was sent.";
const NOT_CONFIGURED_SMS_REASON = "Outbound SMS provider is not configured; no SMS was sent.";

function upper(value: string | undefined) {
  return value?.trim().toUpperCase();
}

function isTestModeEnabled() {
  return process.env.NODE_ENV === "test" && process.env.ONEHUB_OUTBOUND_TEST_MODE === "true";
}

function configuredEmailFrom(inputFrom?: string) {
  return inputFrom || process.env.OUTBOUND_EMAIL_FROM || process.env.EMAIL_FROM || process.env.SUPPORT_EMAIL;
}

function configuredSmsFrom(inputFrom?: string) {
  return inputFrom || process.env.TWILIO_FROM_PHONE || process.env.SMS_FROM_PHONE || process.env.OUTBOUND_SMS_FROM;
}

export function getEmailProviderConfig(inputFrom?: string): EmailProviderConfig | null {
  const requestedProvider = upper(process.env.ONEHUB_EMAIL_PROVIDER || process.env.EMAIL_PROVIDER);
  const from = configuredEmailFrom(inputFrom);

  if (requestedProvider === "MOCK") {
    return isTestModeEnabled() && from ? { provider: "MOCK", from } : null;
  }

  if ((!requestedProvider || requestedProvider === "RESEND") && process.env.RESEND_API_KEY && from) {
    return { provider: "RESEND", apiKey: process.env.RESEND_API_KEY, from };
  }

  if ((!requestedProvider || requestedProvider === "SENDGRID") && process.env.SENDGRID_API_KEY && from) {
    return { provider: "SENDGRID", apiKey: process.env.SENDGRID_API_KEY, from };
  }

  if ((!requestedProvider || requestedProvider === "POSTMARK") && process.env.POSTMARK_SERVER_TOKEN && from) {
    return { provider: "POSTMARK", serverToken: process.env.POSTMARK_SERVER_TOKEN, from };
  }

  if (
    (!requestedProvider || requestedProvider === "MAILGUN") &&
    process.env.MAILGUN_API_KEY &&
    process.env.MAILGUN_DOMAIN &&
    from
  ) {
    return { provider: "MAILGUN", apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN, from };
  }

  return null;
}

export function getSmsProviderConfig(inputFrom?: string): SmsProviderConfig | null {
  const requestedProvider = upper(process.env.ONEHUB_SMS_PROVIDER || process.env.SMS_PROVIDER);
  const from = configuredSmsFrom(inputFrom);

  if (requestedProvider === "MOCK") {
    return isTestModeEnabled() && from ? { provider: "MOCK", from } : null;
  }

  if (
    (!requestedProvider || requestedProvider === "TWILIO") &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    from
  ) {
    return {
      provider: "TWILIO",
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      from,
    };
  }

  return null;
}

async function parseJsonSafely(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function resultId(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function failed(channel: OutboundChannel, provider: EmailProvider | SmsProvider, reason: string): OutboundDeliveryResult {
  return { channel, status: "FAILED", provider, reason };
}

export async function sendOutboundEmail(input: SendEmailInput): Promise<OutboundDeliveryResult> {
  const config = getEmailProviderConfig(input.from);
  if (!config) {
    return { channel: "email", status: "NOT_CONFIGURED", reason: NOT_CONFIGURED_EMAIL_REASON };
  }

  if (config.provider === "MOCK") {
    return { channel: "email", status: "SENT", provider: "MOCK", providerMessageId: "mock-email-message" };
  }

  try {
    if (config.provider === "RESEND") {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: config.from, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
      });
      const payload = await parseJsonSafely(response);
      if (!response.ok) return failed("email", "RESEND", "Resend rejected the email request.");
      return { channel: "email", status: "SENT", provider: "RESEND", providerMessageId: resultId(payload, ["id"]) };
    }

    if (config.provider === "SENDGRID") {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: input.to }] }],
          from: { email: config.from },
          subject: input.subject,
          content: [{ type: input.html ? "text/html" : "text/plain", value: input.html || input.text }],
        }),
      });
      if (!response.ok) return failed("email", "SENDGRID", "SendGrid rejected the email request.");
      return {
        channel: "email",
        status: "SENT",
        provider: "SENDGRID",
        providerMessageId: response.headers.get("x-message-id") || undefined,
      };
    }

    if (config.provider === "POSTMARK") {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": config.serverToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ From: config.from, To: input.to, Subject: input.subject, TextBody: input.text, HtmlBody: input.html }),
      });
      const payload = await parseJsonSafely(response);
      if (!response.ok) return failed("email", "POSTMARK", "Postmark rejected the email request.");
      return { channel: "email", status: "SENT", provider: "POSTMARK", providerMessageId: resultId(payload, ["MessageID", "MessageId"]) };
    }

    const form = new URLSearchParams({ from: config.from, to: input.to, subject: input.subject, text: input.text });
    if (input.html) form.set("html", input.html);
    const response = await fetch(`https://api.mailgun.net/v3/${config.domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}`,
      },
      body: form,
    });
    const payload = await parseJsonSafely(response);
    if (!response.ok) return failed("email", "MAILGUN", "Mailgun rejected the email request.");
    return { channel: "email", status: "SENT", provider: "MAILGUN", providerMessageId: resultId(payload, ["id"]) };
  } catch {
    return failed("email", config.provider, "Email provider request failed before delivery confirmation.");
  }
}

export async function sendOutboundSms(input: SendSmsInput): Promise<OutboundDeliveryResult> {
  const config = getSmsProviderConfig(input.from);
  if (!config) {
    return { channel: "sms", status: "NOT_CONFIGURED", reason: NOT_CONFIGURED_SMS_REASON };
  }

  if (config.provider === "MOCK") {
    return { channel: "sms", status: "SENT", provider: "MOCK", providerMessageId: "mock-sms-message" };
  }

  try {
    const form = new URLSearchParams({ To: input.to, From: config.from, Body: input.body });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const payload = await parseJsonSafely(response);
    if (!response.ok) return failed("sms", "TWILIO", "Twilio rejected the SMS request.");
    return { channel: "sms", status: "SENT", provider: "TWILIO", providerMessageId: resultId(payload, ["sid"]) };
  } catch {
    return failed("sms", config.provider, "SMS provider request failed before delivery confirmation.");
  }
}
