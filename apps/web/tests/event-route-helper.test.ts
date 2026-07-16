import { describe, expect, it } from "vitest";
import {
  dashboard,
  getVaultBasePath,
  safeInternalReturnTo,
  vaultDetail,
  vaultIndex,
} from "../src/lib/routes";

describe("event route helpers", () => {
  it("maps planner vault indexes to role-specific event lists", () => {
    expect(vaultIndex("DIY_PLANNER")).toBe("/diy-planner/vault");
    expect(vaultIndex("PRO_PLANNER")).toBe("/pro/planner/vault");
  });

  it("maps client event detail links to the client-safe event surface", () => {
    expect(vaultDetail("CLIENT", "shared-gala")).toBe("/client/events/shared-gala");
  });

  it("maps planner event detail links to role-specific vault surfaces", () => {
    expect(vaultDetail("DIY_PLANNER", "spring-party")).toBe("/diy-planner/vault/spring-party");
    expect(vaultDetail("PRO_PLANNER", "spring-party")).toBe("/pro/planner/vault/spring-party");
  });

  it("keeps non-planner non-client roles on the legacy vault fallback", () => {
    expect(getVaultBasePath("VENDOR")).toBe("/app/vault");
    expect(getVaultBasePath("VENUE")).toBe("/app/vault");
    expect(getVaultBasePath("EVENT_DREAMER")).toBe("/app/vault");
    expect(vaultDetail("VENDOR", "vendor-view")).toBe("/app/vault/vendor-view");
  });

  it("maps role dashboards without sending clients to a dead vault page", () => {
    expect(dashboard("CLIENT")).toBe("/app");
    expect(dashboard("DIY_PLANNER")).toBe("/diy-planner");
    expect(dashboard("PRO_PLANNER")).toBe("/pro/planner");
  });

  it("allows only safe internal event return paths", () => {
    expect(safeInternalReturnTo("/client/events/shared-gala?tab=summary")).toBe("/client/events/shared-gala?tab=summary");
    expect(safeInternalReturnTo("/pro/planner/vault/pro-gala")).toBe("/pro/planner/vault/pro-gala");
    expect(safeInternalReturnTo("https://evil.example/client/events/shared-gala")).toBeUndefined();
    expect(safeInternalReturnTo("//evil.example/client/events/shared-gala")).toBeUndefined();
    expect(safeInternalReturnTo("/admin/users")).toBeUndefined();
  });
});
