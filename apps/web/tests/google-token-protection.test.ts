import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  calendarAccountFindFirst,
  calendarAccountUpdate,
  calendarAccountUpdateMany,
  calendarAccountUpsert,
  credentialsProvider,
  googleCalendar,
  googleProvider,
  nextAuth,
  oauth2ClientFactory,
  refreshAccessToken,
  setCredentials,
  userFindUnique,
  userUpsert,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  calendarAccountFindFirst: vi.fn(),
  calendarAccountUpdate: vi.fn(),
  calendarAccountUpdateMany: vi.fn(),
  calendarAccountUpsert: vi.fn(),
  credentialsProvider: vi.fn((config: unknown) => ({ id: "credentials", config })),
  googleCalendar: vi.fn(),
  googleProvider: vi.fn((config: unknown) => ({ id: "google", config })),
  nextAuth: vi.fn((config: unknown) => ({
    handlers: {},
    auth: authMock,
    signIn: vi.fn(),
    signOut: vi.fn(),
    config,
  })),
  oauth2ClientFactory: vi.fn(),
  refreshAccessToken: vi.fn(),
  setCredentials: vi.fn(),
  userFindUnique: vi.fn(),
  userUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUnique,
      upsert: userUpsert,
    },
    calendarAccount: {
      findFirst: calendarAccountFindFirst,
      update: calendarAccountUpdate,
      updateMany: calendarAccountUpdateMany,
      upsert: calendarAccountUpsert,
    },
  },
}));

vi.mock("next-auth", () => ({
  default: nextAuth,
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: credentialsProvider,
}));

vi.mock("next-auth/providers/google", () => ({
  default: googleProvider,
}));

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: oauth2ClientFactory,
    },
    calendar: googleCalendar,
  },
}));

function clearGoogleEnv() {
  delete process.env.GOOGLE_ID;
  delete process.env.GOOGLE_SECRET;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.NEXTAUTH_URL;
  delete process.env.AUTH_URL;
}

async function importAuthWithGoogleEnv(enabled: boolean) {
  vi.resetModules();
  clearGoogleEnv();
  process.env.NEXTAUTH_SECRET = "test-nextauth-secret-at-least-32-bytes";
  if (enabled) {
    process.env.GOOGLE_ID = "google-client-id";
    process.env.GOOGLE_SECRET = "google-client-secret";
  }
  return import("../src/lib/auth");
}

describe("Google auth provider visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGoogleEnv();
  });

  it("does not register Google sign-in unless OAuth credentials are configured", async () => {
    const { authConfig } = await importAuthWithGoogleEnv(false);

    expect(authConfig.providers).toHaveLength(1);
    expect(googleProvider).not.toHaveBeenCalled();
  });

  it("registers Google sign-in only when OAuth credentials are configured", async () => {
    const { authConfig } = await importAuthWithGoogleEnv(true);

    expect(authConfig.providers).toEqual(expect.arrayContaining([expect.objectContaining({ id: "google" })]));
    expect(googleProvider).toHaveBeenCalledWith(expect.objectContaining({
      clientId: "google-client-id",
      clientSecret: "google-client-secret",
    }));
  });
});

describe("Google token handling in auth callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGoogleEnv();
  });

  it("persists OAuth tokens server-side without copying them into the JWT/session payload", async () => {
    const { authConfig } = await importAuthWithGoogleEnv(true);
    const jwt = authConfig.callbacks?.jwt;
    expect(jwt).toBeTypeOf("function");

    const updated = await jwt!({
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

    expect(updated).toMatchObject({
      id: "planner-google-id",
      realUserId: "planner-google-id",
      role: "PRO_PLANNER",
    });
    expect(updated).not.toHaveProperty("accessToken");
    expect(updated).not.toHaveProperty("refreshToken");
    expect(updated).not.toHaveProperty("expiresAt");
    expect(calendarAccountUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ accessToken: "access-token", refreshToken: "refresh-token" }),
      update: expect.objectContaining({ accessToken: "access-token", refreshToken: "refresh-token" }),
    }));
  });

  it("keeps core auth working if server-side calendar token persistence fails", async () => {
    calendarAccountUpsert.mockRejectedValueOnce(new Error("db rejected access-token refresh-token"));
    const { authConfig } = await importAuthWithGoogleEnv(true);
    const jwt = authConfig.callbacks?.jwt;
    expect(jwt).toBeTypeOf("function");

    await expect(jwt!({
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
    } as never)).resolves.toMatchObject({ id: "planner-google-id" });
  });
});

describe("Google calendar token refresh fail-safe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGoogleEnv();
    process.env.GOOGLE_ID = "google-client-id";
    process.env.GOOGLE_SECRET = "google-client-secret";
    process.env.NEXTAUTH_URL = "https://onehub.example.com";
    oauth2ClientFactory.mockImplementation(class {
      setCredentials = setCredentials;
      refreshAccessToken = refreshAccessToken;
    } as never);
    calendarAccountUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("clears stored calendar tokens when a refresh fails", async () => {
    calendarAccountFindFirst.mockResolvedValueOnce({
      id: "calendar-account-1",
      userId: "planner-1",
      provider: "google",
      email: "planner@example.com",
      accessToken: "expired-access-token",
      refreshToken: "dead-refresh-token",
      expiresAt: new Date(Date.now() - 60_000),
      googleCalendarId: "onehub-calendar",
    });
    refreshAccessToken.mockRejectedValueOnce(new Error("invalid_grant dead-refresh-token"));
    const { getGoogleClient } = await import("../src/lib/google.calendar");

    await expect(getGoogleClient("planner-1")).rejects.toThrow("Google Calendar token refresh failed; reconnect Google Calendar");

    expect(calendarAccountUpdateMany).toHaveBeenCalledWith({
      where: { userId: "planner-1", provider: "google" },
      data: {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        googleCalendarId: null,
      },
    });
    expect(calendarAccountUpdate).not.toHaveBeenCalled();
  });
});

describe("Google connect/status API gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGoogleEnv();
    authMock.mockResolvedValue({ user: { id: "planner-1", email: "planner@example.com" } });
  });

  it("refuses Google connect when OAuth credentials are not configured", async () => {
    vi.resetModules();
    const { POST } = await import("../src/app/api/google/connect/route");

    const response = await POST(new Request("https://onehub.example.com/api/google/connect") as never);

    await expect(response.json()).resolves.toEqual({ error: "Google Calendar is not configured" });
    expect(response.status).toBe(503);
  });

  it("reports disconnected without exposing token fields", async () => {
    vi.resetModules();
    process.env.GOOGLE_ID = "google-client-id";
    process.env.GOOGLE_SECRET = "google-client-secret";
    calendarAccountFindFirst.mockResolvedValueOnce({
      id: "calendar-account-1",
      email: "planner@example.com",
      googleCalendarId: "onehub-calendar",
      accessToken: null,
    });
    const { GET } = await import("../src/app/api/google/status/route");

    const response = await GET(new Request("https://onehub.example.com/api/google/status") as never);

    await expect(response.json()).resolves.toEqual({
      connected: false,
      configured: true,
      calendarId: "onehub-calendar",
      email: "planner@example.com",
      overlay: false,
    });
  });
});
