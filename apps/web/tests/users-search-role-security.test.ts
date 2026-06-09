import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, findMany } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
}));

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findMany,
    },
  },
}));

import { GET } from "../src/app/api/users/search/route";

describe("users search role constraints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-CLIENT role searches instead of exposing arbitrary roles", async () => {
    getCurrentUser.mockResolvedValueOnce({
      id: "planner-1",
      email: "planner@test.local",
      role: "PRO_PLANNER",
    });

    const response = await GET(
      new Request("http://test.local/api/users/search?q=admin&role=ADMIN") as never,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Only CLIENT user search is supported",
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("defaults to and only queries CLIENT users for allowed planners", async () => {
    getCurrentUser.mockResolvedValueOnce({
      id: "planner-1",
      email: "planner@test.local",
      role: "DIY_PLANNER",
    });
    findMany.mockResolvedValueOnce([
      { id: "client-1", name: "Client One", email: "client@test.local" },
    ]);

    const response = await GET(
      new Request("http://test.local/api/users/search?q=client") as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      users: [{ id: "client-1", name: "Client One", email: "client@test.local" }],
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: "CLIENT" }),
      }),
    );
  });
});
