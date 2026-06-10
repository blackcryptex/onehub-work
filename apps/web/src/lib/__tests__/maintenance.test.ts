import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import middleware from "../../middleware";
import {
  getMaintenanceRedirectPath,
  isMaintenanceAllowedPath,
  isMaintenanceModeEnabled,
  isMutatingMethod,
  maintenanceModeResponseBody,
  shouldBlockForMaintenance,
} from "../maintenance";

function makeRequest(pathname: string, method = "GET") {
  return new NextRequest(`https://onehub.test${pathname}`, { method });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("maintenance mode safety gate", () => {
  it("only enables maintenance mode for an explicit true flag", () => {
    expect(isMaintenanceModeEnabled({ ONEHUB_MAINTENANCE_MODE: "true" })).toBe(true);
    expect(isMaintenanceModeEnabled({ ONEHUB_MAINTENANCE_MODE: "TRUE" })).toBe(true);
    expect(isMaintenanceModeEnabled({ ONEHUB_MAINTENANCE_MODE: "false" })).toBe(false);
    expect(isMaintenanceModeEnabled({ ONEHUB_MAINTENANCE_MODE: undefined })).toBe(false);
  });

  it("classifies only write methods as mutating", () => {
    expect(isMutatingMethod("GET")).toBe(false);
    expect(isMutatingMethod("HEAD")).toBe(false);
    expect(isMutatingMethod("OPTIONS")).toBe(false);
    expect(isMutatingMethod("POST")).toBe(true);
    expect(isMutatingMethod("PUT")).toBe(true);
    expect(isMutatingMethod("PATCH")).toBe(true);
    expect(isMutatingMethod("DELETE")).toBe(true);
  });

  it("allowlists maintenance-safe routes without exposing a bypass secret", () => {
    expect(isMaintenanceAllowedPath("/maintenance")).toBe(true);
    expect(isMaintenanceAllowedPath("/api/health")).toBe(true);
    expect(isMaintenanceAllowedPath("/api/auth/callback/google")).toBe(true);
    expect(isMaintenanceAllowedPath("/_next/static/chunk.js")).toBe(true);
    expect(isMaintenanceAllowedPath("/favicon.ico")).toBe(true);
    expect(isMaintenanceAllowedPath("/app/events/demo")).toBe(false);
    expect(isMaintenanceAllowedPath("/api/proposals/123/approve")).toBe(false);
  });

  it("classifies protected OneHub app namespaces for maintenance redirects", () => {
    expect(
      shouldBlockForMaintenance({
        enabled: true,
        pathname: "/admin/verification",
        method: "GET",
      }),
    ).toEqual({ blocked: true, kind: "page", redirectTo: getMaintenanceRedirectPath() });

    expect(
      shouldBlockForMaintenance({
        enabled: true,
        pathname: "/contracts/contract_123",
        method: "GET",
      }),
    ).toEqual({ blocked: true, kind: "page", redirectTo: getMaintenanceRedirectPath() });
  });

  it("preserves normal behavior when the flag is off", () => {
    expect(
      shouldBlockForMaintenance({
        enabled: false,
        pathname: "/api/proposals/123/approve",
        method: "POST",
      }),
    ).toEqual({ blocked: false });
  });

  it("returns 503 JSON for mutating API requests while enabled", () => {
    expect(
      shouldBlockForMaintenance({
        enabled: true,
        pathname: "/api/proposals/123/approve",
        method: "POST",
      }),
    ).toEqual({ blocked: true, kind: "api" });

    expect(maintenanceModeResponseBody()).toEqual({
      error: "maintenance_mode_active",
      message: "OneHub is temporarily in maintenance mode. Please retry after the maintenance window closes.",
    });
  });

  it("middleware returns 503 safe JSON for mutating API requests while enabled", async () => {
    vi.stubEnv("ONEHUB_MAINTENANCE_MODE", "true");

    const response = await middleware(makeRequest("/api/proposals/123/approve", "POST"));

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("300");
    expect(await response.json()).toEqual(maintenanceModeResponseBody());
  });

  it("middleware redirects protected UI routes to the maintenance page while enabled", async () => {
    vi.stubEnv("ONEHUB_MAINTENANCE_MODE", "true");

    const response = await middleware(makeRequest("/app/events/demo", "GET"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://onehub.test/maintenance");
  });
});
