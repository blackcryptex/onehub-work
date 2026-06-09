import { describe, expect, it } from "vitest";

import {
  getRoleForCreatedOrg,
  isPublicSignupRole,
  PUBLIC_SIGNUP_ROLES,
  SIGNUP_ROLE_OPTIONS,
  validatePublicSignupRole,
} from "../src/lib/signup-roles";

describe("Gate 3B signup API role validation", () => {
  it("requires an explicit public MVP role", () => {
    expect(validatePublicSignupRole(undefined)).toEqual({
      ok: false,
      error: "Choose a public signup role to continue.",
    });
    expect(validatePublicSignupRole(null)).toEqual({
      ok: false,
      error: "Choose a public signup role to continue.",
    });
    expect(validatePublicSignupRole(123)).toEqual({
      ok: false,
      error: "Choose a valid public signup role to continue.",
    });
  });

  it("rejects invalid, Admin, Client, and Event Dreamer public signup roles", () => {
    expect(validatePublicSignupRole("NOPE")).toEqual({
      ok: false,
      error: "Choose a valid public signup role to continue.",
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
  });

  it("allows exactly the four public MVP signup roles", () => {
    expect(PUBLIC_SIGNUP_ROLES).toEqual(["DIY_PLANNER", "PRO_PLANNER", "VENDOR", "VENUE"]);
    expect(SIGNUP_ROLE_OPTIONS.map((option) => option.role)).toEqual(PUBLIC_SIGNUP_ROLES);
    for (const role of PUBLIC_SIGNUP_ROLES) {
      expect(isPublicSignupRole(role)).toBe(true);
      expect(validatePublicSignupRole(role)).toEqual({ ok: true, role });
    }
  });
});

describe("Gate 3B pro planner existing-user conversion", () => {
  it("updates existing non-admin users to PRO_PLANNER when creating a planner organization", () => {
    expect(getRoleForCreatedOrg("PLANNER", "DIY_PLANNER")).toBe("PRO_PLANNER");
    expect(getRoleForCreatedOrg("PLANNER", "CLIENT")).toBe("PRO_PLANNER");
  });

  it("does not disrupt existing admin, pro planner, or provider roles", () => {
    expect(getRoleForCreatedOrg("PLANNER", "ADMIN")).toBeNull();
    expect(getRoleForCreatedOrg("PLANNER", "PRO_PLANNER")).toBeNull();
    expect(getRoleForCreatedOrg("VENDOR", "VENDOR")).toBeNull();
    expect(getRoleForCreatedOrg("VENUE", "VENUE")).toBeNull();
  });
});
