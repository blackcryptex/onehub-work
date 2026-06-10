export const MAINTENANCE_MODE_ENV = "ONEHUB_MAINTENANCE_MODE";
export const MAINTENANCE_PAGE_PATH = "/maintenance";

type EnvLike = Partial<Record<string, string | undefined>>;

type MaintenanceCheckInput = {
  enabled: boolean;
  pathname: string;
  method: string;
};

type MaintenanceDecision =
  | { blocked: false }
  | { blocked: true; kind: "api" }
  | { blocked: true; kind: "page"; redirectTo: typeof MAINTENANCE_PAGE_PATH };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const ALLOWED_EXACT_PATHS = new Set([
  "/maintenance",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/api/health",
]);

const ALLOWED_PATH_PREFIXES = [
  "/_next/",
  "/assets/",
  "/images/",
  "/api/auth/",
  "/api/google/callback",
];

const PROTECTED_PAGE_PREFIXES = [
  "/admin",
  "/app",
  "/billing",
  "/calendar",
  "/client",
  "/contracts",
  "/disputes",
  "/diy-planner",
  "/events",
  "/messages",
  "/pro/planner",
  "/proposals",
  "/providers/onboarding",
  "/requests",
  "/vault",
  "/vendor",
  "/vendor-venue/setup",
  "/venue",
];

export function isMaintenanceModeEnabled(env: EnvLike = process.env): boolean {
  return env[MAINTENANCE_MODE_ENV]?.trim().toLowerCase() === "true";
}

export function isMutatingMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}

export function getMaintenanceRedirectPath(): typeof MAINTENANCE_PAGE_PATH {
  return MAINTENANCE_PAGE_PATH;
}

export function maintenanceModeResponseBody() {
  return {
    error: "maintenance_mode_active",
    message: "OneHub is temporarily in maintenance mode. Please retry after the maintenance window closes.",
  };
}

export function isMaintenanceAllowedPath(pathname: string): boolean {
  return (
    ALLOWED_EXACT_PATHS.has(pathname) ||
    ALLOWED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function isProtectedUserFacingPath(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function shouldBlockForMaintenance(input: MaintenanceCheckInput): MaintenanceDecision {
  if (!input.enabled || isMaintenanceAllowedPath(input.pathname)) {
    return { blocked: false };
  }

  if (input.pathname.startsWith("/api/")) {
    return isMutatingMethod(input.method) ? { blocked: true, kind: "api" } : { blocked: false };
  }

  if (isProtectedUserFacingPath(input.pathname)) {
    return {
      blocked: true,
      kind: "page",
      redirectTo: MAINTENANCE_PAGE_PATH,
    };
  }

  return { blocked: false };
}
