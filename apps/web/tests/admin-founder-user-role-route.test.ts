import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, update } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update,
    },
  },
}));

import { POST } from "../src/app/api/admin/users/role/route";

describe("founder admin role management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows only Marlon's founder account to grant ADMIN role", async () => {
    getCurrentUser.mockResolvedValueOnce({
      id: "founder-1",
      email: "marlon.smith35@gmail.com",
      role: "ADMIN",
    });
    update.mockResolvedValueOnce({
      id: "user-2",
      email: "trusted@example.com",
      role: "ADMIN",
    });

    const response = await POST(
      new Request("http://test.local/api/admin/users/role", {
        method: "POST",
        body: JSON.stringify({ userId: "user-2", role: "ADMIN" }),
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: { id: "user-2", email: "trusted@example.com", role: "ADMIN" },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { role: "ADMIN" },
      select: { id: true, email: true, role: true },
    });
  });

  it("rejects non-founder admins from granting ADMIN role", async () => {
    getCurrentUser.mockResolvedValueOnce({
      id: "admin-2",
      email: "admin@example.com",
      role: "ADMIN",
    });

    const response = await POST(
      new Request("http://test.local/api/admin/users/role", {
        method: "POST",
        body: JSON.stringify({ userId: "user-2", role: "ADMIN" }),
      }) as never,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Founder authorization required",
    });
    expect(update).not.toHaveBeenCalled();
  });
});
