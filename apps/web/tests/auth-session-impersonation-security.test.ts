import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, upsert, calendarAccountUpsert } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  calendarAccountUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique,
      upsert,
    },
    calendarAccount: {
      upsert: calendarAccountUpsert,
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
    delete process.env.NEXTAUTH_URL;
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

  it("promotes Marlon's Google login to the canonical app ADMIN role", async () => {
    upsert.mockResolvedValueOnce({
      id: "founder-user-id",
      email: "marlon.smith35@gmail.com",
      name: "Marlon Smith",
      image: null,
      role: "ADMIN",
    });
    const jwt = authConfig.callbacks?.jwt;
    expect(jwt).toBeTypeOf("function");

    const updated = await jwt!({
      token: {},
      user: {
        id: "google-profile-id",
        email: "marlon.smith35@gmail.com",
        name: "Marlon Smith",
        image: null,
        role: "CLIENT",
      },
      account: { provider: "google" },
    } as never);

    expect(upsert).toHaveBeenCalledWith({
      where: { email: "marlon.smith35@gmail.com" },
      create: {
        email: "marlon.smith35@gmail.com",
        name: "Marlon Smith",
        image: null,
        role: "ADMIN",
      },
      update: {
        name: "Marlon Smith",
        image: null,
        role: "ADMIN",
      },
      select: { id: true, email: true, name: true, image: true, role: true },
    });
    expect(updated).toMatchObject({
      id: "founder-user-id",
      realUserId: "founder-user-id",
      role: "ADMIN",
    });
  });

  it("does not promote non-founder Google users to ADMIN", async () => {
    const jwt = authConfig.callbacks?.jwt;
    expect(jwt).toBeTypeOf("function");

    const updated = await jwt!({
      token: {},
      user: {
        id: "ordinary-google-id",
        email: "planner@example.com",
        name: "Planner",
        image: null,
        role: "CLIENT",
      },
      account: { provider: "google" },
    } as never);

    expect(upsert).not.toHaveBeenCalled();
    expect(updated).toMatchObject({
      id: "ordinary-google-id",
      realUserId: "ordinary-google-id",
      role: "CLIENT",
    });
  });

  it("stores per-user Google Calendar tokens during Google OAuth login", async () => {
    const jwt = authConfig.callbacks?.jwt;
    expect(jwt).toBeTypeOf("function");

    await jwt!({
      token: {},
      user: {
        id: "planner-google-id",
        email: "planner@example.com",
        name: "Planner",
        image: null,
        role: "PRO_PLANNER",
      },
      account: {
        provider: "google",
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_at: 1800000000,
      },
    } as never);

    expect(calendarAccountUpsert).toHaveBeenCalledWith({
      where: { userId_provider: { userId: "planner-google-id", provider: "google" } },
      create: {
        userId: "planner-google-id",
        provider: "google",
        email: "planner@example.com",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(1800000000 * 1000),
      },
      update: {
        email: "planner@example.com",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(1800000000 * 1000),
      },
    });
  });

  it("keeps same-request-host callback URLs when NEXTAUTH_URL points elsewhere", async () => {
    process.env.NEXTAUTH_URL = "https://onehub.example.com";
    const redirect = authConfig.callbacks?.redirect;
    expect(redirect).toBeTypeOf("function");

    await expect(
      redirect!({
        url: "https://onehub-work-web-preview.vercel.app/diy-planner",
        baseUrl: "https://onehub-work-web-preview.vercel.app",
      }),
    ).resolves.toBe("https://onehub-work-web-preview.vercel.app/diy-planner");
  });
});
