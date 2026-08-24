import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, sendOutboundEmail } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  sendOutboundEmail: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/outbound", () => ({ sendOutboundEmail }));

import { POST } from "../src/app/api/invites/vendor/route";

function request(body: Record<string, unknown>) {
  return new Request("http://test.local/api/invites/vendor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const validBody = {
  to: "vendor@example.com",
  subject: "Invitation to Join OneHub",
  body: "Join OneHub for the demo wedding.",
  vendorName: "Vendor Co.",
  eventName: "Demo Wedding",
};

describe("vendor invite outbound route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "planner-1", role: "PRO_PLANNER" });
    sendOutboundEmail.mockResolvedValue({
      channel: "email",
      status: "NOT_CONFIGURED",
      reason: "Outbound email provider is not configured; no email was sent.",
    });
  });

  it("reports not configured truthfully and does not claim an email was sent", async () => {
    const response = await POST(request(validBody));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      message: "Outbound email delivery is not configured; no email was sent by OneHub.",
      delivery: { channel: "email", status: "NOT_CONFIGURED" },
    });
    expect(sendOutboundEmail).toHaveBeenCalledWith({
      to: "vendor@example.com",
      subject: "Invitation to Join OneHub",
      text: "Join OneHub for the demo wedding.",
    });
  });

  it("reports configured provider sends with safe provider status", async () => {
    sendOutboundEmail.mockResolvedValueOnce({
      channel: "email",
      status: "SENT",
      provider: "RESEND",
      providerMessageId: "email-provider-id",
    });

    const response = await POST(request(validBody));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      message: "Invite email sent through configured outbound provider.",
      delivery: { channel: "email", status: "SENT", provider: "RESEND", providerMessageId: "email-provider-id" },
    });
  });

  it("requires authentication before any outbound delivery attempt", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(request(validBody));

    expect(response.status).toBe(401);
    expect(sendOutboundEmail).not.toHaveBeenCalled();
  });
});
