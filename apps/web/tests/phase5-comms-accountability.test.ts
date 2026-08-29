import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, dbMock, recordActivity, canManageEvent } = vi.hoisted(() => {
  const tx = {
    task: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
    taskProof: { createMany: vi.fn() },
    taskDependency: { createMany: vi.fn(), deleteMany: vi.fn() },
    thread: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    message: { create: vi.fn() },
    notification: { createMany: vi.fn() },
    activity: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  const dbMock = {
    __tx: tx,
    $transaction: vi.fn(async (callback: (txClient: typeof tx) => unknown) => callback(tx)),
    event: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn(), findMany: vi.fn() },
    membership: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    proposal: { findUnique: vi.fn() },
    listing: { findUnique: vi.fn() },
    contract: { findUnique: vi.fn() },
    paymentIntent: { findUnique: vi.fn() },
    paymentMilestone: { findUnique: vi.fn() },
    refundRequest: { findUnique: vi.fn() },
    dispute: { findUnique: vi.fn() },
    crisisIssue: { findUnique: vi.fn() },
    thread: { findUnique: vi.fn(), findMany: vi.fn() },
    message: { create: vi.fn() },
    notification: { createMany: vi.fn() },
    auditLog: { create: vi.fn() },
    task: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    taskProof: { createMany: vi.fn() },
    taskDependency: { createMany: vi.fn(), deleteMany: vi.fn() },
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
  slug: "event-slug",
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
    visibility: "CLIENT_VISIBLE",
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
  dbMock.user.findMany.mockResolvedValue([{ id: "client-1", email: "client@test.local" }]);
  dbMock.proposal.findUnique.mockResolvedValue(null);
  dbMock.listing.findUnique.mockResolvedValue({ id: "listing-1" });
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

  it("blocks registered client participants from sending to internal planner threads", async () => {
    getCurrentUser.mockResolvedValue({ id: "client-1", email: "client@test.local", role: "CLIENT" });
    dbMock.thread.findUnique.mockResolvedValue(thread({ visibility: "INTERNAL" }));
    dbMock.membership.findMany.mockResolvedValue([]);
    dbMock.organization.findMany.mockResolvedValue([]);
    const caller = messageRouter.createCaller({});

    await expect(caller.send({ threadId: "thread-1", bodyMd: "can I see this?" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.__tx.message.create).not.toHaveBeenCalled();
  });

  it("rejects cross-event proposal context before creating a thread", async () => {
    getCurrentUser.mockResolvedValue(planner);
    dbMock.proposal.findUnique.mockResolvedValue({ id: "proposal-1", orgId: "org-1", eventId: "other-event", listingId: "listing-1" });
    const caller = threadRouter.createCaller({});

    await expect(caller.create({
      orgId: "org-1",
      eventId: "event-1",
      proposalId: "proposal-1",
      listingId: "listing-1",
      subject: "Proposal thread",
      visibility: "ALL_PARTIES",
      purpose: "PROPOSAL",
      participants: [{ userId: "client-1", email: "wrong@test.local", roleHint: "CLIENT" }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.__tx.thread.create).not.toHaveBeenCalled();
  });

  it("creates contextual threads with canonical registered participant emails and honest in-app notification links", async () => {
    getCurrentUser.mockResolvedValue(planner);
    dbMock.__tx.thread.create.mockResolvedValue({ id: "thread-1", participants: [], messages: [] });
    dbMock.__tx.thread.findUnique.mockResolvedValue({ id: "thread-1", messages: [] });
    const caller = threadRouter.createCaller({});

    await caller.create({
      orgId: "org-1",
      eventId: "event-1",
      subject: "Event update",
      visibility: "CLIENT_VISIBLE",
      purpose: "EVENT_COORDINATION",
      participants: [
        { userId: "client-1", email: "spoof@test.local", roleHint: "CLIENT" },
        { email: "client@test.local", roleHint: "CLIENT" },
      ],
      firstMessage: "Please review the event plan.",
    });

    expect(dbMock.__tx.thread.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        visibility: "CLIENT_VISIBLE",
        participants: { create: expect.arrayContaining([
          expect.objectContaining({ userId: "client-1", email: "client@test.local" }),
          expect.objectContaining({ userId: "planner-1", email: "planner@test.local" }),
        ]) },
      }),
    }));
    expect(dbMock.__tx.notification.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ userId: "client-1", link: "/messages/thread-1" })],
    }));
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
    dbMock.__tx.task.create.mockResolvedValue({ id: "task-1", eventId: "event-1", title: "Confirm menu", assigneeId: "client-1", status: "TODO", priority: "MEDIUM" });
    const caller = taskRouter.createCaller({});

    const result = await caller.create({ eventId: "event-1", title: "Confirm menu", assigneeId: "client-1" });

    expect(result).toMatchObject({ id: "task-1", assigneeId: "client-1" });
    expect(dbMock.__tx.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ createdById: "planner-1", assigneeId: "client-1" }),
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ db: dbMock.__tx, action: "TASK_CREATED", target: "task-1" }));
    expect(dbMock.__tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "TASK_CREATED", target: "task-1" }),
    }));
    expect(dbMock.__tx.notification.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ userId: "client-1", type: "TASK_ASSIGNED", link: "/events/event-slug/tasks?task=task-1" })],
    }));
  });

  it("requires structured blocker context before moving a task to blocked", async () => {
    getCurrentUser.mockResolvedValue(planner);
    dbMock.task.findUnique.mockResolvedValue({ id: "task-1", eventId: "event-1", status: "TODO", assigneeId: "client-1", event });
    const caller = taskRouter.createCaller({});

    await expect(caller.update({ id: "task-1", data: { status: "BLOCKED" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.__tx.task.update).not.toHaveBeenCalled();
  });

  it("records blocker metadata, escalation notification, and audit when blocking a task", async () => {
    getCurrentUser.mockResolvedValue(planner);
    dbMock.task.findUnique.mockResolvedValue({ id: "task-1", eventId: "event-1", status: "TODO", assigneeId: "client-1", event });
    dbMock.__tx.task.update.mockResolvedValue({ id: "task-1", eventId: "event-1", status: "BLOCKED", assigneeId: "client-1", blockerReason: "Waiting on venue contract" });
    const caller = taskRouter.createCaller({});

    const result = await caller.update({ id: "task-1", data: { status: "BLOCKED", blockerReason: "Waiting on venue contract", blockerType: "EXTERNAL_DEPENDENCY" } });

    expect(result).toMatchObject({ status: "BLOCKED", blockerReason: "Waiting on venue contract" });
    expect(dbMock.__tx.task.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ blockedAt: expect.any(Date), blockedById: "planner-1", escalationLevel: 1, escalatedAt: expect.any(Date) }),
    }));
    expect(dbMock.__tx.notification.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ userId: "client-1", type: "TASK_BLOCKED" })]),
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ db: dbMock.__tx, action: "TASK_STATUS_BLOCKED", target: "task-1" }));
    expect(dbMock.__tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "TASK_STATUS_BLOCKED" }) }));
  });

  it("requires completion evidence before marking a task done", async () => {
    getCurrentUser.mockResolvedValue(planner);
    dbMock.task.findUnique.mockResolvedValue({ id: "task-1", eventId: "event-1", status: "IN_PROGRESS", assigneeId: "client-1", event });
    const caller = taskRouter.createCaller({});

    await expect(caller.update({ id: "task-1", data: { status: "DONE" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.__tx.task.update).not.toHaveBeenCalled();
  });

  it("lets an assignee complete only their own task with evidence without event manage access", async () => {
    getCurrentUser.mockResolvedValue({ id: "client-1", email: "client@test.local", role: "CLIENT" });
    canManageEvent.mockReturnValue(false);
    dbMock.task.findUnique.mockResolvedValue({ id: "task-1", eventId: "event-1", status: "IN_PROGRESS", assigneeId: "client-1", event });
    dbMock.__tx.task.update.mockResolvedValue({ id: "task-1", eventId: "event-1", status: "DONE", assigneeId: "client-1", completionNote: "Uploaded final menu", completedById: "client-1" });
    const caller = taskRouter.createCaller({});

    const result = await caller.ownerUpdate({ id: "task-1", status: "DONE", completionNote: "Uploaded final menu", proofUrl: "https://example.test/menu.pdf" });

    expect(result).toMatchObject({ status: "DONE", completedById: "client-1" });
    expect(dbMock.__tx.task.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ completedAt: expect.any(Date), completedById: "client-1" }) }));
    expect(dbMock.__tx.taskProof.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ taskId: "task-1", uploadedById: "client-1", urlOrMediaId: "https://example.test/menu.pdf" })],
    }));
  });

  it("rejects dependency links to tasks from a different event", async () => {
    getCurrentUser.mockResolvedValue(planner);
    dbMock.task.findUnique.mockResolvedValue({ id: "task-1", eventId: "event-1", status: "TODO", assigneeId: "client-1", event });
    dbMock.task.findMany.mockResolvedValue([{ id: "dep-other", eventId: "other-event" }]);
    const caller = taskRouter.createCaller({});

    await expect(caller.setDependencies({ taskId: "task-1", dependsOnTaskIds: ["dep-other"] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.__tx.taskDependency.createMany).not.toHaveBeenCalled();
  });

  it("denies wrong-role users from mutating another user task", async () => {
    getCurrentUser.mockResolvedValue({ id: "other-client", email: "other@test.local", role: "CLIENT" });
    canManageEvent.mockReturnValue(false);
    dbMock.task.findUnique.mockResolvedValue({ id: "task-1", eventId: "event-1", status: "TODO", assigneeId: "client-1", event });
    const caller = taskRouter.createCaller({});

    await expect(caller.ownerUpdate({ id: "task-1", status: "DONE", completionNote: "Trying to close" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.__tx.task.update).not.toHaveBeenCalled();
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
