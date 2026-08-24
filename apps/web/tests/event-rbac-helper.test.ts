import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-helpers", () => ({
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  canViewCommercialContract,
  canViewCommercialProposal,
  canDeleteEvent,
  canEditEvent,
  canViewEvent,
  isEventSharedWithUser,
} from "../src/lib/rbac";

function user(id: string, role: string) {
  return { id, role, email: `${id}@test.local` };
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

  it("limits proposal details to buyer org, shared clients, seller listing org, and admins", () => {
    const proposal = {
      event: event({
        org: { ownerId: "owner-1", members: [{ userId: "planner-member-1" }] },
        stakeholders: [{ userId: "client-1", role: "CLIENT" }],
        shares: [{ viewerUserId: "client-1", scope: "SUMMARY" }],
      }),
      listing: { orgId: "seller-org-1", org: { ownerId: "seller-owner-1", members: [{ userId: "seller-member-1" }] } },
    };

    expect(canViewCommercialProposal(user("owner-1", "PRO_PLANNER"), proposal)).toBe(true);
    expect(canViewCommercialProposal(user("planner-member-1", "PRO_PLANNER"), proposal)).toBe(true);
    expect(canViewCommercialProposal(user("client-1", "CLIENT"), proposal)).toBe(true);
    expect(canViewCommercialProposal(user("seller-member-1", "VENDOR"), proposal)).toBe(true);
    expect(canViewCommercialProposal(user("admin-1", "ADMIN"), proposal)).toBe(true);
    expect(canViewCommercialProposal(user("stranger-1", "VENUE"), proposal)).toBe(false);
  });

  it("allows intended contract signers without opening contract details to unrelated users", () => {
    const contract = {
      proposal: {
        event: event(),
        listing: { orgId: "seller-org-1", org: { ownerId: "seller-owner-1", members: [] } },
      },
      signatures: [{ signerId: null, signerEmail: "client-signer@test.local" }],
    };

    expect(canViewCommercialContract(user("seller-owner-1", "VENUE"), contract)).toBe(true);
    expect(canViewCommercialContract(user("client-signer", "CLIENT"), contract)).toBe(true);
    expect(canViewCommercialContract(user("stranger-1", "CLIENT"), contract)).toBe(false);
  });
});
