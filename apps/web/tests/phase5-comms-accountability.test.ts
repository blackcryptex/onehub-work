import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, dbMock, recordActivity, canManageEvent } = vi.hoisted(() => {
  const tx = {
    thread: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    message: { create: vi.fn() },
    notification: { createMany: vi.fn() },
    activity: { create: vi.fn() },
  };
  const dbMock = {
    __tx: tx,
    $transaction: vi.fn(async (callback: (txClient: typeof tx) => unknown) => callback(tx)),
    event: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn(), findMany: vi.fn() },
    membership: { findMany: vi.fn() },
    thread: { findUnique: vi.fn(), findMany: vi.fn() },
    message: { create: vi.fn() },
    notification: { createMany: vi.fn() },
    task: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    milestone: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
  };
  return {
    getCurrentUser: vi.fn(),
    dbMock,
    recordActivity: vi.fn(async () => undefined),
    canManageEvent: vi.fn(),
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/rbac", () => ({ canManageEvent }));
vi.mock("@/server/db", () => ({ db: dbMock }));
vi.mock("@/server/lib/activity", () => ({ recordActivity }));

import { threadRouter } from "../src/server/routers/thread";
import { messageRouter } from "../src/server/routers/message";
import { taskRouter } from "../src/server/routers/task";
import { milestoneRouter } from "../src/server/routers/milestone";

const planner = { id: "planner-1", email: "planner@test.local", role: "PRO_PLANNER" };
const outsider = { id: "outsider-1", email: "outsider@test.local", role: "PRO_PLANNER" };
const event = {
  id: "event-1",
  orgId: "org-1",
  createdById: "planner-1",
  startAt: new Date("2026-10-01T00:00:00.000Z"),
  org: { ownerId: "owner-1", members: [{ userId: "planner-1" }] },
  stakeholders: [{ userId: "client-1", role: "CLIENT" }],
  shares: [],
};

function thread(overrides: Record<string, unknown> = {}) {
  return {
    id: "thread-1",
    orgId: "org-1",
    eventId: "event-1",
    subject: "Client approval",
    participants: [
      { userId: "planner-1", email: "planner@test.local" },
      { userId: "client-1", email: "client@test.local" },
    ],
    listing: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.$transaction.mockImplementation(async (callback: (txClient: typeof dbMock.__tx) => unknown) => callback(dbMock.__tx));
  dbMock.organization.findUnique.mockResolvedValue({ id: "org-1", ownerId: "owner-1", members: [{ userId: "planner-1" }] });
  dbMock.organization.findMany.mockResolvedValue([{ id: "org-1" }]);
  dbMock.membership.findMany.mockResolvedValue([{ orgId: "org-1" }]);
  dbMock.event.findUnique.mockResolvedValue(event);
  canManageEvent.mockReturnValue(true);
});

describe("Phase 5 thread/message accountability", () => {
  it("rejects unauthenticated message.send before creating a message", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = messageRouter.createCaller({});

    await expect(caller.send({ threadId: "thread-1", bodyMd: "hello" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.message.create).not.toHaveBeenCalled();
    expect(dbMock.__tx.message.create).not.toHaveBeenCalled();
  });

  it("rejects unrelated users from reading a thread by id", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    dbMock.thread.findUnique.mockResolvedValue(thread());
    dbMock.membership.findMany.mockResolvedValue([]);
    dbMock.organization.findMany.mockResolvedValue([]);
    const caller = threadRouter.createCaller({});

    await expect(caller.get({ threadId: "thread-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("persists authenticated in-app messages with sender, notifications, and activity", async () => {
    getCurrentUser.mockResolvedValue(planner);
    dbMock.thread.findUnique.mockResolvedValue(thread());
    dbMock.__tx.message.create.mockResolvedValue({ id: "message-1", threadId: "thread-1", senderId: "planner-1", bodyMd: "hello" });
    const caller = messageRouter.createCaller({});

    const result = await caller.send({ threadId: "thread-1", bodyMd: "hello" });

    expect(result).toMatchObject({ id: "message-1", senderId: "planner-1" });
    expect(dbMock.__tx.message.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ threadId: "thread-1", senderId: "planner-1", bodyMd: "hello" }),
    }));
    expect(dbMock.__tx.notification.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ userId: "client-1", type: "IN_APP_MESSAGE_CREATED", link: "/messages/thread-1" })],
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "MESSAGE_CREATED", target: "message-1" }));
  });
});

describe("Phase 6 task/milestone accountability", () => {
  it("requires event manage access before creating tasks", async () => {
    getCurrentUser.mockResolvedValue(planner);
    canManageEvent.mockReturnValue(false);
    const caller = taskRouter.createCaller({});

    await expect(caller.create({ eventId: "event-1", title: "Confirm menu" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.task.create).not.toHaveBeenCalled();
  });

  it("rejects task assignees outside the event org and stakeholder boundary", async () => {
    getCurrentUser.mockResolvedValue(planner);
    const caller = taskRouter.createCaller({});

    await expect(caller.create({ eventId: "event-1", title: "Confirm menu", assigneeId: "stranger-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.task.create).not.toHaveBeenCalled();
  });

  it("allows event stakeholders to be assigned persisted tasks", async () => {
    getCurrentUser.mockResolvedValue(planner);
    dbMock.task.create.mockResolvedValue({ id: "task-1", eventId: "event-1", title: "Confirm menu", assigneeId: "client-1", status: "TODO", priority: "MEDIUM" });
    const caller = taskRouter.createCaller({});

    const result = await caller.create({ eventId: "event-1", title: "Confirm menu", assigneeId: "client-1" });

    expect(result).toMatchObject({ id: "task-1", assigneeId: "client-1" });
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "TASK_CREATED", target: "task-1" }));
  });

  it("requires event manage access and records activity when milestones are completed", async () => {
    getCurrentUser.mockResolvedValue(planner);
    dbMock.milestone.findUnique.mockResolvedValue({ id: "milestone-1", eventId: "event-1", title: "Final walkthrough", done: false, event });
    dbMock.milestone.update.mockResolvedValue({ id: "milestone-1", eventId: "event-1", title: "Final walkthrough", done: true });
    const caller = milestoneRouter.createCaller({});

    const result = await caller.update({ id: "milestone-1", data: { done: true } });

    expect(result).toMatchObject({ id: "milestone-1", done: true });
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "MILESTONE_MARKED_COMPLETE", target: "milestone-1" }));
  });
});
