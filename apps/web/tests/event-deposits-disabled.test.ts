import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  prisma: {
    event: { findFirst: vi.fn() },
    deposit: { create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/rbac", () => ({ canViewEvent: vi.fn() }));

import { POST } from "../src/app/api/events/[eventSlug]/deposits/route";

function request() {
  return new Request("http://test.local/api/events/launch-gala/deposits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountCents: 5000, currency: "USD" }),
  }) as never;
}

const params = { params: Promise.resolve({ eventSlug: "launch-gala" }) };

describe("event deposits route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication before returning the disabled deposit response", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(request(), params);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(prisma.deposit.create).not.toHaveBeenCalled();
  });

  it("disables standalone deposit creation and does not create records", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "client-1", role: "CLIENT" });

    const response = await POST(request(), params);
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toEqual({
      error: "Standalone deposits are disabled. Use signed contract payment schedules for client payments.",
    });
    expect(prisma.deposit.create).not.toHaveBeenCalled();
  });
});
