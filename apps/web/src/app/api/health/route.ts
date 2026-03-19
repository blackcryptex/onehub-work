import { NextResponse } from "next/server";
import { performHealthChecks } from "@/lib/health";

/**
 * Health check endpoint for infrastructure monitoring.
 * 
 * Returns:
 * - 200 OK: All dependencies healthy
 * - 503 Service Unavailable: One or more dependencies unhealthy
 * 
 * Checks:
 * - Database connectivity (Prisma)
 * - Stripe/payment provider connectivity
 */
export async function GET() {
  try {
    const health = await performHealthChecks();
    
    // Return 503 if degraded or down, 200 if ok
    const statusCode = health.status === "ok" ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    // If health check itself fails, return down status
    return NextResponse.json(
      {
        status: "down" as const,
        timestamp: new Date().toISOString(),
        checks: {
          database: "error" as const,
          stripe: "error" as const,
        },
      },
      { status: 503 }
    );
  }
}

