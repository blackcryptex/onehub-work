import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * P0 security regression tests: planning-data routers.
 * Covers bookingRequest.listForOrg, task, checklist, milestone, guest.list.
 * Verifies: unauthenticated callers are rejected, cross-tenant callers are
 * rejected, and org owners/members retain legitimate access.
 */

const { getCurrentUser, dbMock } = vi.hoisted(() => {
  const dbMock = {
    event: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    organization: { findUnique: vi.fn(), findMany: vi.fn() },
    membership: { findMany: vi.fn() },
    task: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    checklist: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    checklistItem: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    checklistTemplate: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    milestone: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
    bookingRequest: { findMany: vi.fn() },
  };
  return { getCurrentUser: vi.fn(), dbMock };
});

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user?: { role?: string | null }) => user?.role === "ADMIN",
}));

vi.mock("@/server/db", () => ({ db: dbMock }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/rbac", () => ({ isOrgAdminOrOwner: vi.fn().mockReturnValue(false) }));
vi.mock("@/server/lib/activity", () => ({ recordActivity: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/server/routers/notification", () => ({ notify: vi.fn().mockResolvedValue(undefined) }));

import { taskRouter } from "@/server/routers/task";
import { checklistRouter } from "@/server/routers/checklist";
import { milestoneRouter } from "@/server/routers/milestone";
import { bookingRequestRouter } from "@/server/routers/bookingRequest";
import { guestRouter } from "@/server/routers/guest";

const member = { id: "user-member", email: "member@test.local", name: "Member", role: "PRO_PLANNER" };
const outsider = { id: "user-outsider", email: "outsider@test.local", name: "Outsider", role: "PRO_PLANNER" };

const eventFixture = { id: "event-1", orgId: "org-1" };

/** Org lookup used by isOrgMemberById: members filtered to the caller. */
function mockOrgMembership(callerIsMember: boolean) {
  dbMock.organization.findUnique.mockImplementation(async ({ where }: { where: { id?: string; slug?: string } }) => {
    if (where.id === "org-1" || where.slug === "org-1-slug") {
      return {
        id: "org-1",
        slug: "org-1-slug",
        ownerId: "someone-else",
        members: callerIsMember ? [{ userId: member.id }] : [],
      };
    }
    return null;
  });
}

function mockEventLookup() {
  dbMock.event.findUnique.mockResolvedValue(eventFixture);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("task router access control", () => {
  it("rejects unauthenticated task.listByEvent", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = taskRouter.createCaller({});
    await expect(caller.listByEvent({ eventId: "event-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.task.findMany).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant task.listByEvent", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    mockEventLookup();
    mockOrgMembership(false);
    const caller = taskRouter.createCaller({});
    await expect(caller.listByEvent({ eventId: "event-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.task.findMany).not.toHaveBeenCalled();
  });

  it("allows org member task.listByEvent", async () => {
    getCurrentUser.mockResolvedValue(member);
    mockEventLookup();
    mockOrgMembership(true);
    dbMock.task.findMany.mockResolvedValue([]);
    const caller = taskRouter.createCaller({});
    await expect(caller.listByEvent({ eventId: "event-1" })).resolves.toEqual([]);
  });

  it("rejects unauthenticated task.create", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = taskRouter.createCaller({});
    await expect(caller.create({ eventId: "event-1", title: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.task.create).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant task.update via task->event ownership", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    dbMock.task.findUnique.mockResolvedValue({ eventId: "event-1" });
    mockEventLookup();
    mockOrgMembership(false);
    const caller = taskRouter.createCaller({});
    await expect(caller.update({ id: "task-1", data: { title: "hijack" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.task.update).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant task.delete", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    dbMock.task.findUnique.mockResolvedValue({ eventId: "event-1" });
    mockEventLookup();
    mockOrgMembership(false);
    const caller = taskRouter.createCaller({});
    await expect(caller.delete({ id: "task-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.task.delete).not.toHaveBeenCalled();
  });
});

describe("checklist router access control", () => {
  it("rejects unauthenticated checklist.list", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = checklistRouter.createCaller({});
    await expect(caller.list({ eventId: "event-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.checklist.findMany).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant checklist.list", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    mockEventLookup();
    mockOrgMembership(false);
    const caller = checklistRouter.createCaller({});
    await expect(caller.list({ eventId: "event-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.checklist.findMany).not.toHaveBeenCalled();
  });

  it("allows org member checklist.list", async () => {
    getCurrentUser.mockResolvedValue(member);
    mockEventLookup();
    mockOrgMembership(true);
    dbMock.checklist.findMany.mockResolvedValue([]);
    const caller = checklistRouter.createCaller({});
    await expect(caller.list({ eventId: "event-1" })).resolves.toEqual([]);
  });

  it("rejects cross-tenant checklist.addItem via checklist->event ownership", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    dbMock.checklist.findUnique.mockResolvedValue({ eventId: "event-1" });
    mockEventLookup();
    mockOrgMembership(false);
    const caller = checklistRouter.createCaller({});
    await expect(caller.addItem({ checklistId: "cl-1", title: "x" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.checklistItem.create).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant checklist.toggleItem via item->checklist->event ownership", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    dbMock.checklistItem.findUnique.mockResolvedValue({ checklist: { eventId: "event-1" } });
    mockEventLookup();
    mockOrgMembership(false);
    const caller = checklistRouter.createCaller({});
    await expect(caller.toggleItem({ id: "item-1", done: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.checklistItem.update).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated checklist.createFromTemplate", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = checklistRouter.createCaller({});
    await expect(caller.createFromTemplate({ eventId: "event-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.checklist.create).not.toHaveBeenCalled();
  });
});

describe("milestone router access control", () => {
  it("rejects unauthenticated milestone.list", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = milestoneRouter.createCaller({});
    await expect(caller.list({ eventId: "event-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.milestone.findMany).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant milestone.list", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    mockEventLookup();
    mockOrgMembership(false);
    const caller = milestoneRouter.createCaller({});
    await expect(caller.list({ eventId: "event-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.milestone.findMany).not.toHaveBeenCalled();
  });

  it("allows org member milestone.list", async () => {
    getCurrentUser.mockResolvedValue(member);
    mockEventLookup();
    mockOrgMembership(true);
    dbMock.milestone.findMany.mockResolvedValue([]);
    const caller = milestoneRouter.createCaller({});
    await expect(caller.list({ eventId: "event-1" })).resolves.toEqual([]);
  });

  it("rejects cross-tenant milestone.update via milestone->event ownership", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    dbMock.milestone.findUnique.mockResolvedValue({ eventId: "event-1" });
    mockEventLookup();
    mockOrgMembership(false);
    const caller = milestoneRouter.createCaller({});
    await expect(caller.update({ id: "ms-1", data: { done: true } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.milestone.update).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant milestone.delete", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    dbMock.milestone.findUnique.mockResolvedValue({ eventId: "event-1" });
    mockEventLookup();
    mockOrgMembership(false);
    const caller = milestoneRouter.createCaller({});
    await expect(caller.delete({ id: "ms-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.milestone.delete).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant milestone.bulkGenerate", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    mockEventLookup();
    mockOrgMembership(false);
    const caller = milestoneRouter.createCaller({});
    await expect(caller.bulkGenerate({ eventId: "event-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.milestone.createMany).not.toHaveBeenCalled();
  });

  it("allows org member milestone.create on own event", async () => {
    getCurrentUser.mockResolvedValue(member);
    mockEventLookup();
    mockOrgMembership(true);
    dbMock.milestone.create.mockResolvedValue({ id: "ms-new" });
    const caller = milestoneRouter.createCaller({});
    await expect(
      caller.create({ eventId: "event-1", title: "Kickoff", dueAt: new Date("2026-07-01") })
    ).resolves.toEqual({ id: "ms-new" });
  });
});

describe("bookingRequest.listForOrg access control", () => {
  it("rejects unauthenticated listForOrg", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = bookingRequestRouter.createCaller({});
    await expect(caller.listForOrg({ orgSlug: "org-1-slug" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.bookingRequest.findMany).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant listForOrg (authenticated non-member)", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    mockOrgMembership(false);
    const caller = bookingRequestRouter.createCaller({});
    await expect(caller.listForOrg({ orgSlug: "org-1-slug" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.bookingRequest.findMany).not.toHaveBeenCalled();
  });

  it("allows org member listForOrg", async () => {
    getCurrentUser.mockResolvedValue(member);
    mockOrgMembership(true);
    dbMock.bookingRequest.findMany.mockResolvedValue([{ id: "br-1" }]);
    const caller = bookingRequestRouter.createCaller({});
    await expect(caller.listForOrg({ orgSlug: "org-1-slug" })).resolves.toEqual([{ id: "br-1" }]);
  });
});

describe("guest.list access control", () => {
  it("rejects unauthenticated guest.list", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = guestRouter.createCaller({});
    await expect(caller.list({ eventId: "event-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.event.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant guest.list (PII protected)", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    mockEventLookup();
    mockOrgMembership(false);
    const caller = guestRouter.createCaller({});
    await expect(caller.list({ eventId: "event-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.event.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("allows org member guest.list", async () => {
    getCurrentUser.mockResolvedValue(member);
    mockEventLookup();
    mockOrgMembership(true);
    dbMock.event.findUniqueOrThrow.mockResolvedValue({
      id: "event-1",
      guestLists: { guests: [{ id: "guest-1", firstName: "A", lastName: "B" }] },
    });
    const caller = guestRouter.createCaller({});
    await expect(caller.list({ eventId: "event-1" })).resolves.toEqual([
      { id: "guest-1", firstName: "A", lastName: "B" },
    ]);
  });
});
