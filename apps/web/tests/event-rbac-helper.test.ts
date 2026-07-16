import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-helpers", () => ({
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  canDeleteEvent,
  canEditEvent,
  canViewEvent,
  isEventSharedWithUser,
} from "../src/lib/rbac";

function user(id: string, role: string) {
  return { id, role };
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    orgId: "org-1",
    createdById: "planner-1",
    org: { ownerId: "owner-1", members: [] },
    stakeholders: [],
    shares: [],
    ...overrides,
  };
}

describe("event RBAC helper", () => {
  it("allows the creating planner to view, edit, and delete their event", () => {
    const planner = user("planner-1", "PRO_PLANNER");
    const ownedEvent = event();

    expect(canViewEvent(planner, ownedEvent)).toBe(true);
    expect(canEditEvent(planner, ownedEvent)).toBe(true);
    expect(canDeleteEvent(planner, ownedEvent)).toBe(true);
  });

  it("blocks a different planner from viewing, editing, or deleting another planner event", () => {
    const planner = user("planner-2", "DIY_PLANNER");
    const ownedByOtherPlanner = event();

    expect(canViewEvent(planner, ownedByOtherPlanner)).toBe(false);
    expect(canEditEvent(planner, ownedByOtherPlanner)).toBe(false);
    expect(canDeleteEvent(planner, ownedByOtherPlanner)).toBe(false);
  });

  it("allows an org owner to view, edit, and delete org events", () => {
    const owner = user("owner-1", "PRO_PLANNER");
    const orgEvent = event({ createdById: "planner-2" });

    expect(canViewEvent(owner, orgEvent)).toBe(true);
    expect(canEditEvent(owner, orgEvent)).toBe(true);
    expect(canDeleteEvent(owner, orgEvent)).toBe(true);
  });

  it("requires a CLIENT to be both stakeholder and summary share recipient", () => {
    const client = user("client-1", "CLIENT");

    expect(canViewEvent(client, event({
      stakeholders: [{ userId: "client-1", role: "CLIENT" }],
      shares: [],
    }))).toBe(false);

    expect(canViewEvent(client, event({
      stakeholders: [],
      shares: [{ viewerUserId: "client-1", scope: "SUMMARY" }],
    }))).toBe(false);

    expect(canViewEvent(client, event({
      stakeholders: [{ userId: "client-1", role: "CLIENT" }],
      shares: [{ viewerUserId: "client-1", scope: "SUMMARY" }],
    }))).toBe(true);
  });

  it("checks summary event shares for the requesting user only", () => {
    const client = user("client-1", "CLIENT");
    const sharedEvent = event({
      shares: [
        { viewerUserId: "client-2", scope: "SUMMARY" },
        { viewerUserId: "client-1", scope: "DETAILS" },
      ],
    });

    expect(isEventSharedWithUser(client, sharedEvent)).toBe(false);
    expect(isEventSharedWithUser(client, event({
      shares: [{ viewerUserId: "client-1", scope: "SUMMARY" }],
    }))).toBe(true);
  });

  it.each(["VENDOR", "VENUE", "EVENT_DREAMER"])("blocks %s from planner event access by default", (role) => {
    const actor = user("actor-1", role);
    const plannerEvent = event();

    expect(canViewEvent(actor, plannerEvent)).toBe(false);
    expect(canEditEvent(actor, plannerEvent)).toBe(false);
    expect(canDeleteEvent(actor, plannerEvent)).toBe(false);
  });

  it("allows ADMIN event access", () => {
    const admin = user("admin-1", "ADMIN");
    const plannerEvent = event({ createdById: "planner-2" });

    expect(canViewEvent(admin, plannerEvent)).toBe(true);
    expect(canEditEvent(admin, plannerEvent)).toBe(true);
    expect(canDeleteEvent(admin, plannerEvent)).toBe(true);
  });
});
