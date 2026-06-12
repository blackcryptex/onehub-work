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

    // Return 503 if degraded or down, 200 if ok. Keep the public response
    // intentionally minimal so unauthenticated monitors do not receive
    // dependency names, provider status, stack traces, or config details.
    const statusCode = health.status === "ok" ? 200 : 503;

    return NextResponse.json(
      {
        status: health.status,
        timestamp: health.timestamp,
      },
      { status: statusCode },
    );
  } catch (error) {
    // If health check itself fails, return a minimal safe down status.
    return NextResponse.json(
      {
        status: "down" as const,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

