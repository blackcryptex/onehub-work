import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => {
  const tx = {
    user: { create: vi.fn() },
    membership: { findUnique: vi.fn(), create: vi.fn() },
    invite: { updateMany: vi.fn() },
  };

  return {
    prisma: {
      user: { findUnique: vi.fn(), create: tx.user.create },
      invite: { findUnique: vi.fn(), updateMany: tx.invite.updateMany },
      membership: { findUnique: tx.membership.findUnique, create: tx.membership.create },
      $transaction: vi.fn(async (fn) => fn(tx)),
      __tx: tx,
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(async () => "hashed-password") },
  hash: vi.fn(async () => "hashed-password"),
}));

import { POST } from "../src/app/api/auth/signup/route";

function request(body: Record<string, unknown>) {
  return new Request("http://test.local/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const validBody = {
  email: "New.Member@Example.com ",
  password: "secret123",
  name: "New Member",
  role: "ADMIN",
};

const validInvite = {
  id: "invite-1",
  orgId: "org-1",
  email: "new.member@example.com",
  role: "MEMBER",
  token: "token-1",
  accepted: false,
  expiresAt: new Date("2099-01-01T00:00:00.000Z"),
};

describe("signup invite protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.invite.findUnique.mockResolvedValue(null);
    prisma.__tx.user.create.mockResolvedValue({ id: "user-1" });
    prisma.__tx.membership.findUnique.mockResolvedValue(null);
    prisma.__tx.invite.updateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects unknown invite tokens before creating an account", async () => {
    const response = await POST(request({ ...validBody, inviteToken: "missing-token" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/invalid/i) });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects expired invite tokens before creating an account", async () => {
    prisma.invite.findUnique.mockResolvedValueOnce({ ...validInvite, expiresAt: new Date("2020-01-01T00:00:00.000Z") });

    const response = await POST(request({ ...validBody, inviteToken: "token-1" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/expired/i) });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects reused invite tokens before creating an account", async () => {
    prisma.invite.findUnique.mockResolvedValueOnce({ ...validInvite, accepted: true });

    const response = await POST(request({ ...validBody, inviteToken: "token-1" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/already been used/i) });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("blocks signup when the invite belongs to a different email", async () => {
    prisma.invite.findUnique.mockResolvedValueOnce({ ...validInvite, email: "other@example.com" });

    const response = await POST(request({ ...validBody, inviteToken: "token-1" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/different email/i) });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("accepts a valid invite atomically without granting a requested app admin role", async () => {
    prisma.invite.findUnique.mockResolvedValueOnce(validInvite);

    const response = await POST(request({ ...validBody, inviteToken: "token-1" }));

    expect(response.status).toBe(200);
    expect(prisma.__tx.user.create).toHaveBeenCalledWith({
      data: {
        email: "new.member@example.com",
        name: "New Member",
        password: "hashed-password",
        role: "DIY_PLANNER",
      },
    });
    expect(prisma.__tx.membership.create).toHaveBeenCalledWith({
      data: { userId: "user-1", orgId: "org-1", role: "MEMBER" },
    });
    expect(prisma.__tx.invite.updateMany).toHaveBeenCalledWith({
      where: { id: "invite-1", accepted: false },
      data: { accepted: true },
    });
  });
});
