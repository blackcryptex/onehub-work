import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * P0 security regression tests: thread + message routers.
 * Verifies: unauthenticated callers are rejected, cross-tenant callers are
 * rejected, and participants/org members retain access.
 */

const { getCurrentUser, dbMock } = vi.hoisted(() => {
  const dbMock = {
    thread: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    message: { create: vi.fn() },
    organization: { findUnique: vi.fn(), findMany: vi.fn() },
    membership: { findMany: vi.fn() },
    event: { findUnique: vi.fn() },
    proposal: { findUnique: vi.fn() },
    listing: { findUnique: vi.fn() },
  };
  return { getCurrentUser: vi.fn(), dbMock };
});

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user?: { role?: string | null }) => user?.role === "ADMIN",
}));

vi.mock("@/server/db", () => ({ db: dbMock }));

import { threadRouter } from "@/server/routers/thread";
import { messageRouter } from "@/server/routers/message";

const member = { id: "user-member", email: "member@test.local", name: "Member", role: "PRO_PLANNER" };
const outsider = { id: "user-outsider", email: "outsider@test.local", name: "Outsider", role: "PRO_PLANNER" };

const threadFixture = {
  id: "thread-1",
  orgId: "org-1",
  eventId: null,
  proposalId: null,
  listingId: null,
  subject: "Private",
  participants: [{ userId: "user-participant", email: "participant@test.local" }],
  listing: null,
};

function mockUserOrgs(orgIds: string[]) {
  dbMock.membership.findMany.mockResolvedValue(orgIds.map((orgId) => ({ orgId })));
  dbMock.organization.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("thread router access control", () => {
  it("rejects unauthenticated thread.get", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = threadRouter.createCaller({});
    await expect(caller.get({ threadId: "thread-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.thread.findUnique).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant thread.get (not participant, not org member)", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    dbMock.thread.findUnique.mockResolvedValue(threadFixture);
    mockUserOrgs(["org-other"]);
    const caller = threadRouter.createCaller({});
    await expect(caller.get({ threadId: "thread-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows org member thread.get", async () => {
    getCurrentUser.mockResolvedValue(member);
    dbMock.thread.findUnique.mockResolvedValue(threadFixture);
    mockUserOrgs(["org-1"]);
    const caller = threadRouter.createCaller({});
    await expect(caller.get({ threadId: "thread-1" })).resolves.toBeTruthy();
  });

  it("allows participant thread.get even without org membership", async () => {
    getCurrentUser.mockResolvedValue({ ...outsider, email: "participant@test.local" });
    dbMock.thread.findUnique.mockResolvedValue(threadFixture);
    mockUserOrgs([]);
    const caller = threadRouter.createCaller({});
    await expect(caller.get({ threadId: "thread-1" })).resolves.toBeTruthy();
  });

  it("rejects unauthenticated thread.create", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = threadRouter.createCaller({});
    await expect(
      caller.create({ orgId: "org-1", subject: "x", participants: [] })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.thread.create).not.toHaveBeenCalled();
  });

  it("rejects thread.create for non-member of target org", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    dbMock.organization.findUnique.mockResolvedValue({ id: "org-1", ownerId: "someone-else", members: [] });
    const caller = threadRouter.createCaller({});
    await expect(
      caller.create({ orgId: "org-1", subject: "x", participants: [] })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.thread.create).not.toHaveBeenCalled();
  });

  it("allows thread.create for org member", async () => {
    getCurrentUser.mockResolvedValue(member);
    dbMock.organization.findUnique.mockResolvedValue({
      id: "org-1",
      ownerId: "someone-else",
      members: [{ userId: member.id }],
    });
    dbMock.thread.create.mockResolvedValue({ id: "thread-new" });
    const caller = threadRouter.createCaller({});
    await expect(
      caller.create({ orgId: "org-1", subject: "x", participants: [{ email: "p@test.local" }] })
    ).resolves.toEqual({ id: "thread-new" });
  });

  it("filters listByContext to accessible threads only", async () => {
    getCurrentUser.mockResolvedValue(member);
    dbMock.thread.findMany.mockResolvedValue([
      { ...threadFixture, id: "t-mine", orgId: "org-1" },
      { ...threadFixture, id: "t-other", orgId: "org-other" },
    ]);
    mockUserOrgs(["org-1"]);
    const caller = threadRouter.createCaller({});
    const result = await caller.listByContext({ eventId: undefined });
    expect(result.map((t: { id: string }) => t.id)).toEqual(["t-mine"]);
  });
});

describe("message router access control", () => {
  it("rejects unauthenticated message.send", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = messageRouter.createCaller({});
    await expect(caller.send({ threadId: "thread-1", bodyMd: "hi" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(dbMock.message.create).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant message.send", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    dbMock.thread.findUnique.mockResolvedValue(threadFixture);
    mockUserOrgs(["org-other"]);
    const caller = messageRouter.createCaller({});
    await expect(caller.send({ threadId: "thread-1", bodyMd: "hi" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(dbMock.message.create).not.toHaveBeenCalled();
  });

  it("allows authorized member send and stamps senderId from session", async () => {
    getCurrentUser.mockResolvedValue(member);
    dbMock.thread.findUnique.mockResolvedValue(threadFixture);
    mockUserOrgs(["org-1"]);
    dbMock.message.create.mockResolvedValue({ id: "msg-1" });
    const caller = messageRouter.createCaller({});
    await expect(caller.send({ threadId: "thread-1", bodyMd: "hi" })).resolves.toEqual({ id: "msg-1" });
    expect(dbMock.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ senderId: member.id }),
      })
    );
  });
});
