import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getCurrentUser, prisma, recordAudit } = vi.hoisted(() => ({
  auth: vi.fn(),
  getCurrentUser: vi.fn(),
  recordAudit: vi.fn(),
  prisma: {
    organization: {
      findUnique: vi.fn(),
    },
    invite: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    event: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
    },
    task: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/server/lib/audit", () => ({ recordAudit }));

import { inviteRouter } from "../src/server/routers/invite";
import { taskRouter } from "../src/server/routers/task";

function inviteCaller() {
  return inviteRouter.createCaller({});
}

function taskCaller() {
  return taskRouter.createCaller({});
}

function plannerOrg(overrides: Record<string, unknown> = {}) {
  return {
    id: "org-1",
    ownerId: "planner-1",
    members: [{ userId: "planner-1", role: "OWNER" }],
    ...overrides,
  };
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    orgId: "org-1",
    createdById: "planner-1",
    org: plannerOrg({
      members: [
        { userId: "planner-1", role: "OWNER" },
        { userId: "assistant-1", role: "MEMBER", staffRole: "ASSISTANT" },
      ],
    }),
    tasks: [],
    ...overrides,
  };
}

describe("pro planner assistant invite collaboration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordAudit.mockResolvedValue(undefined);
  });

  it("creates assistant invites as limited member invites, never owner/admin", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "PRO_PLANNER" });
    prisma.organization.findUnique.mockResolvedValueOnce(plannerOrg());
    prisma.invite.create.mockResolvedValueOnce({
      id: "invite-1",
      orgId: "org-1",
      email: "assistant@test.local",
      role: "MEMBER",
      token: "token-1",
      accepted: false,
    });

    const invite = await inviteCaller().createAssistantInvite({
      orgId: "org-1",
      email: "assistant@test.local",
    });

    expect(prisma.invite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: "org-1",
        email: "assistant@test.local",
        role: "MEMBER",
      }),
    });
    expect(prisma.invite.create.mock.calls[0][0].data.role).not.toBe("OWNER");
    expect(prisma.invite.create.mock.calls[0][0].data.role).not.toBe("ADMIN");
    expect(invite).toEqual(expect.objectContaining({ inviteUrl: expect.stringContaining("/invites/accept/") }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "invite.assistant.create",
      metadata: { email: "assistant@test.local", staffRole: "ASSISTANT" },
    }));
  });

  it("accepts assistant invites into the planner org with assistant staff role boundaries", async () => {
    auth.mockResolvedValueOnce({ user: { id: "assistant-1" } });
    prisma.invite.findUnique.mockResolvedValueOnce({
      id: "invite-1",
      orgId: "org-1",
      email: "assistant@test.local",
      role: "MEMBER",
      token: "token-1",
      accepted: false,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.membership.upsert.mockResolvedValueOnce({
      userId: "assistant-1",
      orgId: "org-1",
      role: "MEMBER",
      staffRole: "ASSISTANT",
    });
    prisma.invite.update.mockResolvedValueOnce({ id: "invite-1", accepted: true });

    await expect(inviteCaller().addMemberByInvite({ token: "token-1" })).resolves.toBe(true);

    expect(prisma.membership.upsert).toHaveBeenCalledWith({
      where: { userId_orgId: { userId: "assistant-1", orgId: "org-1" } },
      create: { userId: "assistant-1", orgId: "org-1", role: "MEMBER", staffRole: "ASSISTANT" },
      update: { role: "MEMBER", staffRole: "ASSISTANT" },
    });
  });
});

describe("assistant task assignment collaboration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets the pro planner assign persisted event tasks only to assistant team members", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "PRO_PLANNER" });
    prisma.event.findUniqueOrThrow.mockResolvedValueOnce(event());
    prisma.membership.findUnique.mockResolvedValueOnce({
      userId: "assistant-1",
      orgId: "org-1",
      role: "MEMBER",
      staffRole: "ASSISTANT",
    });
    prisma.task.create.mockResolvedValueOnce({
      id: "task-1",
      eventId: "event-1",
      title: "Confirm timeline",
      assigneeId: "assistant-1",
      status: "TODO",
      priority: "HIGH",
      dueAt: new Date("2027-05-01T12:00:00.000Z"),
    });

    await expect(taskCaller().create({
      eventId: "event-1",
      title: "Confirm timeline",
      assigneeId: "assistant-1",
      dueAt: new Date("2027-05-01T12:00:00.000Z"),
      priority: "HIGH",
    })).resolves.toEqual(expect.objectContaining({ assigneeId: "assistant-1" }));

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: "event-1",
        title: "Confirm timeline",
        assigneeId: "assistant-1",
        priority: "HIGH",
      }),
      include: { assignee: { select: { id: true, email: true, name: true } } },
    });
  });

  it("lets assistants list only their assigned tasks, not unrelated event tasks", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "assistant-1", role: "CLIENT" });
    prisma.event.findUniqueOrThrow.mockResolvedValueOnce(event({ createdById: "planner-1" }));
    prisma.task.findMany.mockResolvedValueOnce([{ id: "task-1", assigneeId: "assistant-1" }]);

    await taskCaller().listMyAssigned({});

    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { assigneeId: "assistant-1" },
      include: expect.objectContaining({ event: expect.any(Object), assignee: expect.any(Object) }),
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    }));
  });

  it("allows assistants to update safe status fields on assigned tasks only", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "assistant-1", role: "CLIENT" });
    prisma.task.findUniqueOrThrow.mockResolvedValueOnce({
      id: "task-1",
      eventId: "event-1",
      assigneeId: "assistant-1",
      event: event(),
    });
    prisma.task.update.mockResolvedValueOnce({ id: "task-1", status: "DONE" });

    await expect(taskCaller().update({
      id: "task-1",
      data: { status: "DONE", title: "Unsafe rename", assigneeId: "planner-1" },
    })).resolves.toEqual(expect.objectContaining({ status: "DONE" }));

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: { status: "DONE" },
      include: { assignee: { select: { id: true, email: true, name: true } } },
    });
  });

  it("blocks assistants from billing/admin/payment event management surfaces", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "assistant-1", role: "CLIENT" });
    prisma.event.findUniqueOrThrow.mockResolvedValueOnce(event({ createdById: "planner-1" }));

    await expect(taskCaller().create({
      eventId: "event-1",
      title: "Unsafe create",
      assigneeId: "assistant-1",
    })).rejects.toThrow("Forbidden");

    expect(prisma.task.create).not.toHaveBeenCalled();
  });
});
