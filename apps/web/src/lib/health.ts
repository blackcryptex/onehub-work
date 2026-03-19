import { prisma } from "@/lib/prisma";
import { stripe } from "@/server/lib/stripe";

export type HealthStatus = "ok" | "degraded" | "down";
export type CheckStatus = "ok" | "error";

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  checks: {
    database: CheckStatus;
    stripe: CheckStatus;
  };
}

/**
 * Performs health checks for critical dependencies.
 * Returns status and individual check results.
 */
export async function performHealthChecks(): Promise<HealthCheckResult> {
  const checks = {
    database: "ok" as CheckStatus,
    stripe: "ok" as CheckStatus,
  };

  // Test database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    checks.database = "error";
  }

  // Test Stripe connectivity (only if Stripe is configured)
  if (stripe) {
    try {
      // Use a lightweight API call to verify connectivity
      await stripe.balance.retrieve();
    } catch (error) {
      checks.stripe = "error";
    }
  } else {
    // Stripe not configured - mark as ok (optional service)
    checks.stripe = "ok";
  }

  // Determine overall status
  let status: HealthStatus = "ok";
  if (checks.database === "error" && checks.stripe === "error") {
    status = "down";
  } else if (checks.database === "error" || checks.stripe === "error") {
    status = "degraded";
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    checks,
  };
}

