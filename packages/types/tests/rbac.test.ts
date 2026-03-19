import { describe, it, expect } from "vitest";
import { hasRole, requireRole, type Role } from "../src/roles";

describe("RBAC helpers", () => {
  const user = (role: Role) => ({ role });

  it("hasRole returns true for exact match", () => {
    expect(hasRole(user("ADMIN"), "ADMIN")).toBe(true);
  });

  it("hasRole returns false for non-match", () => {
    expect(hasRole(user("CLIENT"), "ADMIN")).toBe(false);
  });

  it("requireRole allows one of roles", () => {
    const can = requireRole(["ADMIN", "PRO_PLANNER"]);
    expect(can(user("PRO_PLANNER"))).toBe(true);
    expect(can(user("CLIENT"))).toBe(false);
  });
});
