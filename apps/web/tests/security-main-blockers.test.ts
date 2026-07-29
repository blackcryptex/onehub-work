import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, dbMock } = vi.hoisted(() => {
  const dbMock = {
    event: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
    seatingPlan: { findUnique: vi.fn() },
    activity: { findMany: vi.fn() },
    orgSettings: { findUnique: vi.fn() },
  };
  return { getCurrentUser: vi.fn(), dbMock };
});

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user?: { role?: string | null }) => user?.role === "ADMIN",
}));

vi.mock("@/server/db", () => ({ db: dbMock }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/server/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));

import { seatingRouter } from "@/server/routers/seating";
import { activityRouter } from "@/server/routers/activity";
import { settingsRouter } from "@/server/routers/settings";

const member = { id: "user-member", email: "member@test.local", name: "Member", role: "PRO_PLANNER" };
const owner = { id: "user-owner", email: "owner@test.local", name: "Owner", role: "PRO_PLANNER" };
const outsider = { id: "user-outsider", email: "outsider@test.local", name: "Outsider", role: "PRO_PLANNER" };

function mockEvent(eventId = "event-1", orgId = "org-1") {
  dbMock.event.findUnique.mockResolvedValue({ id: eventId, orgId });
}

function mockOrgAccess({ callerIsMember = false, callerIsOwner = false } = {}) {
  dbMock.organization.findUnique.mockImplementation(async ({ where }: { where: { id?: string; slug?: string } }) => {
    if (where.id === "org-1" || where.slug === "org-1-slug") {
      return {
        id: "org-1",
        slug: "org-1-slug",
        ownerId: callerIsOwner ? owner.id : "someone-else",
        members: callerIsMember ? [{ userId: member.id, role: "MEMBER" }] : [],
      };
    }
    return null;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("main blocker: seating plan access", () => {
  it("rejects unauthenticated seating.getPlan before querying guest PII", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = seatingRouter.createCaller({});

    await expect(caller.getPlan({ eventId: "event-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.seatingPlan.findUnique).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant seating.getPlan before querying guest PII", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    mockEvent();
    mockOrgAccess({ callerIsMember: false });
    const caller = seatingRouter.createCaller({});

    await expect(caller.getPlan({ eventId: "event-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.seatingPlan.findUnique).not.toHaveBeenCalled();
  });

  it("allows an org member to read the seating plan for their event", async () => {
    getCurrentUser.mockResolvedValue(member);
    mockEvent();
    mockOrgAccess({ callerIsMember: true });
    dbMock.seatingPlan.findUnique.mockResolvedValue({ id: "plan-1", tables: [] });
    const caller = seatingRouter.createCaller({});

    await expect(caller.getPlan({ eventId: "event-1" })).resolves.toEqual({ id: "plan-1", tables: [] });
  });
});

describe("main blocker: activity feed access", () => {
  it("rejects unauthenticated activity.list before querying tenant activity", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = activityRouter.createCaller({});

    await expect(caller.list({ orgSlug: "org-1-slug" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.activity.findMany).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant activity.list before returning payment metadata", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    mockOrgAccess({ callerIsMember: false });
    const caller = activityRouter.createCaller({});

    await expect(caller.list({ orgSlug: "org-1-slug" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.activity.findMany).not.toHaveBeenCalled();
  });

  it("allows an org member to list their org activity", async () => {
    getCurrentUser.mockResolvedValue(member);
    mockOrgAccess({ callerIsMember: true });
    dbMock.activity.findMany.mockResolvedValue([{ id: "activity-1", meta: { paymentIntentId: "pi_test" } }]);
    const caller = activityRouter.createCaller({});

    const result = await caller.list({ orgSlug: "org-1-slug" });
    expect(result.items).toHaveLength(1);
  });
});

describe("main blocker: org settings access", () => {
  it("rejects unauthenticated org settings reads before querying billing/legal settings", async () => {
    getCurrentUser.mockResolvedValue(null);
    const caller = settingsRouter.createCaller({});

    await expect(caller.getOrgSettings({ orgId: "org-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.orgSettings.findUnique).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant org settings reads", async () => {
    getCurrentUser.mockResolvedValue(outsider);
    mockOrgAccess({ callerIsMember: false });
    const caller = settingsRouter.createCaller({});

    await expect(caller.getOrgSettings({ orgId: "org-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.orgSettings.findUnique).not.toHaveBeenCalled();
  });

  it("allows an org owner to read billing/legal settings", async () => {
    getCurrentUser.mockResolvedValue(owner);
    mockOrgAccess({ callerIsOwner: true });
    dbMock.orgSettings.findUnique.mockResolvedValue({ orgId: "org-1", billingEmail: "billing@test.local" });
    const caller = settingsRouter.createCaller({});

    await expect(caller.getOrgSettings({ orgId: "org-1" })).resolves.toEqual({ orgId: "org-1", billingEmail: "billing@test.local" });
  });
});
