import { describe, expect, it } from "vitest";

import { dashboard } from "../src/lib/routes";
import { SIGNUP_ROLE_OPTIONS } from "../src/lib/signup-roles";

describe("Gate 3B signup role selection", () => {
  it("defines explicit public MVP signup roles only", () => {
    expect(SIGNUP_ROLE_OPTIONS.map((option) => option.label)).toEqual([
      "DIY Planner",
      "Pro Planner",
      "Vendor",
      "Venue",
    ]);
    expect(SIGNUP_ROLE_OPTIONS.map((option) => option.role)).toEqual([
      "DIY_PLANNER",
      "PRO_PLANNER",
      "VENDOR",
      "VENUE",
    ]);
    expect(SIGNUP_ROLE_OPTIONS.some((option) => option.role === "ADMIN")).toBe(false);
    expect(SIGNUP_ROLE_OPTIONS.some((option) => option.role === "CLIENT")).toBe(false);
    expect(SIGNUP_ROLE_OPTIONS.some((option) => option.role === "EVENT_DREAMER")).toBe(false);
  });
});

describe("Gate 3B role dashboard routing", () => {
  it.each([
    ["DIY_PLANNER", "/diy-planner"],
    ["PRO_PLANNER", "/pro/planner"],
    ["VENDOR", "/vendor/dashboard"],
    ["VENUE", "/venue/dashboard"],
    ["CLIENT", "/client"],
    ["ADMIN", "/admin/overview"],
    ["EVENT_DREAMER", "/diy-planner"],
  ] as const)("routes %s to %s", (role, expectedPath) => {
    expect(dashboard(role)).toBe(expectedPath);
  });
});
