import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendOutboundEmail, sendOutboundSms } from "../src/lib/outbound";

const ORIGINAL_ENV = process.env;

function resetEnv(overrides: NodeJS.ProcessEnv = {}) {
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    ONEHUB_OUTBOUND_TEST_MODE: undefined,
    ONEHUB_EMAIL_PROVIDER: undefined,
    EMAIL_PROVIDER: undefined,
    OUTBOUND_EMAIL_FROM: undefined,
    EMAIL_FROM: undefined,
    SUPPORT_EMAIL: undefined,
    RESEND_API_KEY: undefined,
    SENDGRID_API_KEY: undefined,
    POSTMARK_SERVER_TOKEN: undefined,
    MAILGUN_API_KEY: undefined,
    MAILGUN_DOMAIN: undefined,
    ONEHUB_SMS_PROVIDER: undefined,
    SMS_PROVIDER: undefined,
    TWILIO_ACCOUNT_SID: undefined,
    TWILIO_AUTH_TOKEN: undefined,
    TWILIO_FROM_PHONE: undefined,
    SMS_FROM_PHONE: undefined,
    OUTBOUND_SMS_FROM: undefined,
    ...overrides,
  };
}

describe("outbound delivery providers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetEnv();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("returns NOT_CONFIGURED and performs no fetch when email provider credentials are absent", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const result = await sendOutboundEmail({ to: "vendor@example.com", subject: "Invite", text: "Join OneHub" });

    expect(result).toEqual({
      channel: "email",
      status: "NOT_CONFIGURED",
      reason: "Outbound email provider is not configured; no email was sent.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends email through configured Resend provider and exposes only safe delivery metadata", async () => {
    resetEnv({ ONEHUB_EMAIL_PROVIDER: "RESEND", RESEND_API_KEY: "resend-secret", OUTBOUND_EMAIL_FROM: "no-reply@onehub.test" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "email-provider-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await sendOutboundEmail({ to: "vendor@example.com", subject: "Invite", text: "Join OneHub" });

    expect(result).toEqual({ channel: "email", status: "SENT", provider: "RESEND", providerMessageId: "email-provider-id" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer resend-secret" }),
      }),
    );
  });

  it("returns FAILED when a configured email provider rejects delivery", async () => {
    resetEnv({ ONEHUB_EMAIL_PROVIDER: "RESEND", RESEND_API_KEY: "resend-secret", OUTBOUND_EMAIL_FROM: "no-reply@onehub.test" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ message: "bad request" }), { status: 400 }));

    const result = await sendOutboundEmail({ to: "vendor@example.com", subject: "Invite", text: "Join OneHub" });

    expect(result).toEqual({
      channel: "email",
      status: "FAILED",
      provider: "RESEND",
      reason: "Resend rejected the email request.",
    });
  });

  it("returns NOT_CONFIGURED and performs no fetch when SMS provider credentials are absent", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const result = await sendOutboundSms({ to: "+15555550100", body: "OneHub invite" });

    expect(result).toEqual({
      channel: "sms",
      status: "NOT_CONFIGURED",
      reason: "Outbound SMS provider is not configured; no SMS was sent.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends SMS through configured Twilio provider", async () => {
    resetEnv({
      ONEHUB_SMS_PROVIDER: "TWILIO",
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "twilio-secret",
      TWILIO_FROM_PHONE: "+15555550000",
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ sid: "SM123" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await sendOutboundSms({ to: "+15555550100", body: "OneHub invite" });

    expect(result).toEqual({ channel: "sms", status: "SENT", provider: "TWILIO", providerMessageId: "SM123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("allows mock outbound only when test mode is explicitly enabled", async () => {
    resetEnv({ ONEHUB_EMAIL_PROVIDER: "MOCK", OUTBOUND_EMAIL_FROM: "no-reply@onehub.test" });
    await expect(sendOutboundEmail({ to: "vendor@example.com", subject: "Invite", text: "Join OneHub" })).resolves.toMatchObject({
      channel: "email",
      status: "NOT_CONFIGURED",
    });

    resetEnv({
      ONEHUB_OUTBOUND_TEST_MODE: "true",
      ONEHUB_EMAIL_PROVIDER: "MOCK",
      OUTBOUND_EMAIL_FROM: "no-reply@onehub.test",
      ONEHUB_SMS_PROVIDER: "MOCK",
      TWILIO_FROM_PHONE: "+15555550000",
    });

    await expect(sendOutboundEmail({ to: "vendor@example.com", subject: "Invite", text: "Join OneHub" })).resolves.toMatchObject({
      channel: "email",
      status: "SENT",
      provider: "MOCK",
    });
    await expect(sendOutboundSms({ to: "+15555550100", body: "OneHub invite" })).resolves.toMatchObject({
      channel: "sms",
      status: "SENT",
      provider: "MOCK",
    });
  });
});
