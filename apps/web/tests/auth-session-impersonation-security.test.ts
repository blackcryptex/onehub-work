import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique,
    },
  },
}));

vi.mock("next-auth", () => ({
  default: () => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (config: unknown) => config,
}));

vi.mock("next-auth/providers/google", () => ({
  default: (config: unknown) => config,
}));

import {
  authConfig,
  createImpersonationSessionUpdate,
  createStopImpersonationSessionUpdate,
} from "../src/lib/auth";

describe("auth JWT impersonation session updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "test-nextauth-secret-at-least-32-bytes";
  });

  it("ignores arbitrary client session.update actingUserId and role changes", async () => {
    const jwt = authConfig.callbacks?.jwt;
    expect(jwt).toBeTypeOf("function");

    const token = {
      id: "real-admin",
      realUserId: "real-admin",
      role: "ADMIN",
    };

    const updated = await jwt!({
      token,
      trigger: "update",
      session: {
        actingUserId: "victim-client",
        role: "CLIENT",
      },
    } as never);

    expect(updated).toMatchObject({
      id: "real-admin",
      realUserId: "real-admin",
      role: "ADMIN",
    });
    expect(updated).not.toHaveProperty("actingUserId");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("accepts only a server-signed impersonation transition token", async () => {
    findUnique.mockResolvedValueOnce({ role: "CLIENT" });
    const jwt = authConfig.callbacks?.jwt;
    expect(jwt).toBeTypeOf("function");

    const sessionUpdate = createImpersonationSessionUpdate({
      realUserId: "real-admin",
      actingUserId: "victim-client",
    });

    const updated = await jwt!({
      token: {
        id: "real-admin",
        realUserId: "real-admin",
        role: "ADMIN",
      },
      trigger: "update",
      session: sessionUpdate,
    } as never);

    expect(updated).toMatchObject({
      id: "victim-client",
      realUserId: "real-admin",
      actingUserId: "victim-client",
      role: "CLIENT",
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "victim-client" },
      select: { role: true },
    });
  });

  it("accepts only a server-signed stop-impersonation transition token", async () => {
    findUnique.mockResolvedValueOnce({ role: "ADMIN" });
    const jwt = authConfig.callbacks?.jwt;
    expect(jwt).toBeTypeOf("function");

    const sessionUpdate = createStopImpersonationSessionUpdate({
      realUserId: "real-admin",
      actingUserId: "victim-client",
    });

    const updated = await jwt!({
      token: {
        id: "victim-client",
        realUserId: "real-admin",
        actingUserId: "victim-client",
        role: "CLIENT",
      },
      trigger: "update",
      session: sessionUpdate,
    } as never);

    expect(updated).toMatchObject({
      id: "real-admin",
      realUserId: "real-admin",
      role: "ADMIN",
    });
    expect(updated).not.toHaveProperty("actingUserId");
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "real-admin" },
      select: { role: true },
    });
  });
});
