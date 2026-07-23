import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-helpers", () => ({
  isAdmin: (user?: { role?: string } | null) => user?.role === "ADMIN",
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { canAccessDashboard } from "../rbac";
import {
  contractDetail,
  dashboard,
  proposalDetail,
  proposalReturnPath,
  vaultDetail,
  vaultIndex,
} from "../routes";
import {
  getRoleForCreatedOrg,
  isPublicSignupRole,
  PUBLIC_SIGNUP_ROLES,
  SIGNUP_ROLE_OPTIONS,
  validatePublicSignupRole,
} from "../signup-roles";

describe("Gate 3B signup role selection", () => {
  it("offers only explicit public MVP signup roles", () => {
    expect(SIGNUP_ROLE_OPTIONS.map((option) => option.role)).toEqual([
      "DIY_PLANNER",
      "PRO_PLANNER",
      "VENDOR",
      "VENUE",
    ]);
    expect(PUBLIC_SIGNUP_ROLES).toEqual(["DIY_PLANNER", "PRO_PLANNER", "VENDOR", "VENUE"]);
    expect(isPublicSignupRole("ADMIN")).toBe(false);
    expect(isPublicSignupRole("CLIENT")).toBe(false);
    expect(isPublicSignupRole("EVENT_DREAMER")).toBe(false);
  });

  it("requires a role and rejects invalid, Admin, Client, and Event Dreamer signup roles", () => {
    expect(validatePublicSignupRole(undefined)).toEqual({
      ok: false,
      error: "Choose a public signup role to continue.",
    });
    expect(validatePublicSignupRole("ADMIN")).toEqual({
      ok: false,
      error: "Admin accounts are provisioned manually by OneHub operations.",
    });
    expect(validatePublicSignupRole("CLIENT")).toEqual({
      ok: false,
      error: "Client access is invite-only for MVP and must be event-linked.",
    });
    expect(validatePublicSignupRole("EVENT_DREAMER")).toEqual({
      ok: false,
      error: "Event Dreamer is an MVP feature path, not a public signup role.",
    });
    expect(validatePublicSignupRole("NOT_A_ROLE")).toEqual({
      ok: false,
      error: "Choose a valid public signup role to continue.",
    });
    expect(validatePublicSignupRole("VENDOR")).toEqual({ ok: true, role: "VENDOR" });
  });
});

describe("Gate 3B role routing matrix", () => {
  it("maps each MVP role to its canonical dashboard or scoped landing", () => {
    expect(dashboard("DIY_PLANNER")).toBe("/diy-planner");
    expect(dashboard("PRO_PLANNER")).toBe("/pro/planner");
    expect(dashboard("VENDOR")).toBe("/vendor/dashboard");
    expect(dashboard("VENUE")).toBe("/venue/dashboard");
    expect(dashboard("CLIENT")).toBe("/client");
    expect(dashboard("ADMIN")).toBe("/admin/overview");
    expect(dashboard("EVENT_DREAMER")).toBe("/diy-planner");
  });

  it("keeps vault index helpers on canonical role-aware landings without stale /app vault fallbacks", () => {
    expect(vaultIndex("DIY_PLANNER")).toBe("/diy-planner/vault");
    expect(vaultIndex("PRO_PLANNER")).toBe("/pro/planner/vault");
    expect(vaultIndex("CLIENT")).toBe("/client");
    expect(vaultIndex("VENDOR")).toBe("/vendor/dashboard");
    expect(vaultIndex("VENUE")).toBe("/venue/dashboard");
    expect(vaultIndex("ADMIN")).toBe("/admin/overview");
    expect(vaultIndex("EVENT_DREAMER")).toBe("/diy-planner");
  });

  it("keeps vault detail helpers role-aware for planners and clients", () => {
    expect(vaultDetail("DIY_PLANNER", "summer-gala")).toBe("/diy-planner/vault/summer-gala");
    expect(vaultDetail("PRO_PLANNER", "summer-gala")).toBe("/pro/planner/vault/summer-gala");
    expect(vaultDetail("CLIENT", "summer-gala")).toBe("/client/events/summer-gala");
    expect(vaultDetail("VENDOR", "summer-gala")).toBe("/vendor/dashboard");
    expect(vaultDetail("VENUE", "summer-gala")).toBe("/venue/dashboard");
  });

  it("keeps proposal and contract detail helpers on canonical shared routes", () => {
    expect(proposalDetail("prop_123")).toBe("/proposals/prop_123");
    expect(contractDetail("contract_123")).toBe("/contracts/contract_123");
  });

  it("returns from proposal delete to the scoped event route when available", () => {
    expect(proposalReturnPath("PRO_PLANNER", "summer-gala")).toBe("/pro/planner/vault/summer-gala");
    expect(proposalReturnPath("DIY_PLANNER", "summer-gala")).toBe("/diy-planner/vault/summer-gala");
    expect(proposalReturnPath("CLIENT", "summer-gala")).toBe("/client/events/summer-gala");
    expect(proposalReturnPath("VENDOR", "summer-gala")).toBe("/vendor/dashboard");
    expect(proposalReturnPath(undefined, undefined)).toBe("/app");
  });

  it("keeps dashboard access role-specific with admin override", () => {
    const roles = ["DIY_PLANNER", "PRO_PLANNER", "VENDOR", "VENUE", "EVENT_DREAMER"] as const;
    for (const role of roles) {
      for (const dashboardKey of roles) {
        expect(canAccessDashboard({ id: role, email: `${role}@test.local`, role }, dashboardKey)).toBe(role === dashboardKey);
      }
      expect(canAccessDashboard({ id: `${role}-admin-test`, email: `${role}-admin@test.local`, role }, "ADMIN")).toBe(false);
    }
    expect(canAccessDashboard({ id: "client", email: "client@test.local", role: "CLIENT" }, "PRO_PLANNER")).toBe(false);
    expect(canAccessDashboard({ id: "admin", email: "admin@test.local", role: "ADMIN" }, "VENUE")).toBe(true);
    expect(canAccessDashboard({ id: "admin", email: "admin@test.local", role: "ADMIN" }, "ADMIN")).toBe(true);
  });
});

describe("Gate 3B existing-user Pro Planner conversion", () => {
  it("updates planner organization creators to PRO_PLANNER without changing org membership", () => {
    expect(getRoleForCreatedOrg("PLANNER", "DIY_PLANNER")).toBe("PRO_PLANNER");
    expect(getRoleForCreatedOrg("PLANNER", "CLIENT")).toBe("PRO_PLANNER");
    expect(getRoleForCreatedOrg("PLANNER", "PRO_PLANNER")).toBeNull();
    expect(getRoleForCreatedOrg("VENDOR", "DIY_PLANNER")).toBeNull();
    expect(getRoleForCreatedOrg("VENUE", "CLIENT")).toBeNull();
  });
});
