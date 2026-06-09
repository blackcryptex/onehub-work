import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-helpers", () => ({
  isAdmin: (user?: { role?: string } | null) => user?.role === "ADMIN",
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { canAccessDashboard } from "../rbac";
import { dashboard } from "../routes";
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
