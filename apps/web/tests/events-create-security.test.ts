import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getCurrentUser, prisma } = vi.hoisted(() => {
  const tx = {
    organization: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    event: {
      create: vi.fn(),
    },
    eventStakeholder: {
      createMany: vi.fn(),
    },
    eventShare: {
      createMany: vi.fn(),
    },
    budgetLine: {
      createMany: vi.fn(),
    },
    milestone: {
      create: vi.fn(),
    },
    checklist: {
      create: vi.fn(),
    },
    checklistItem: {
      createMany: vi.fn(),
    },
  };

  return {
    auth: vi.fn(),
    getCurrentUser: vi.fn(),
    prisma: {
      user: {
        findMany: vi.fn(),
      },
      organization: tx.organization,
      event: {
        create: tx.event.create,
        findFirst: vi.fn(),
      },
      eventStakeholder: tx.eventStakeholder,
      eventShare: tx.eventShare,
      budgetLine: tx.budgetLine,
      milestone: tx.milestone,
      checklist: tx.checklist,
      checklistItem: tx.checklistItem,
      $transaction: vi.fn(async (fn) => fn(tx)),
      __tx: tx,
    },
  };
});

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/server/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/errorTracker", () => ({ trackError: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  getRequestLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { POST } from "../src/app/api/events/create/route";

function request(body: Record<string, unknown>) {
  return new Request("http://test.local/api/events/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const validBody = {
  name: "Launch Gala",
  event_type_raw: "wedding",
  budget_raw: "$10,000",
  date: "2026-09-01",
  city: "Atlanta",
  state: "ga",
  zipCode: "30301",
  headcount: "100",
  style: "Modern",
};

describe("events create route security and atomicity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "planner-1" } });
    getCurrentUser.mockResolvedValue({ id: "planner-1", role: "DIY_PLANNER" });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.__tx.organization.findFirst.mockResolvedValue({ id: "org-1" });
    prisma.__tx.event.create.mockResolvedValue({ id: "event-1", slug: "launch-gala-abcd", name: "Launch Gala" });
    prisma.__tx.checklist.create.mockResolvedValue({ id: "checklist-1" });
    prisma.event.findFirst.mockResolvedValue({
      id: "event-1",
      name: "Launch Gala",
      slug: "launch-gala-abcd",
      startAt: new Date("2026-09-01T00:00:00.000Z"),
      endAt: new Date("2026-09-01T04:00:00.000Z"),
      venueCity: "Atlanta",
      venueState: "GA",
      description: "Modern",
      tasks: [],
      milestones: [],
      proposals: [],
      contracts: [],
      guestLists: [],
      budgetLines: [],
    });
  });

  it.each(["CLIENT", "VENDOR", "VENUE"])("blocks %s from creating events", async (role) => {
    getCurrentUser.mockResolvedValueOnce({ id: "user-1", role });

    const response = await POST(request(validBody));

    expect(response.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(["DIY_PLANNER", "PRO_PLANNER", "ADMIN"])("allows %s to create events", async (role) => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role });

    const response = await POST(request(validBody));

    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.__tx.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "WEDDING" }),
      }),
    );
  });

  it("rejects invalid requested client ids before event transaction", async () => {
    prisma.user.findMany.mockResolvedValueOnce([{ id: "client-1" }]);

    const response = await POST(request({ ...validBody, clientIds: ["client-1", "missing-client"] }));

    expect(response.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates event and related initial records inside one transaction", async () => {
    prisma.user.findMany.mockResolvedValueOnce([{ id: "client-1" }]);

    const response = await POST(request({ ...validBody, clientIds: ["client-1"], autoShareSummary: true }));

    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.__tx.event.create).toHaveBeenCalled();
    expect(prisma.__tx.eventStakeholder.createMany).toHaveBeenCalled();
    expect(prisma.__tx.eventShare.createMany).toHaveBeenCalled();
    expect(prisma.__tx.budgetLine.createMany).toHaveBeenCalled();
    expect(prisma.__tx.milestone.create).toHaveBeenCalled();
    expect(prisma.__tx.checklist.create).toHaveBeenCalled();
    expect(prisma.__tx.checklistItem.createMany).toHaveBeenCalled();
  });
});
