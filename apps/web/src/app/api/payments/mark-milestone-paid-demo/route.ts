import { NextResponse } from "next/server";

/**
 * POST /api/payments/mark-milestone-paid-demo
 * Guarded MVP: disabled to prevent any demo-only milestone PAID transition bypass.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Demo milestone paid marking is disabled in guarded MVP. Use the canonical /api/payments/release-milestone route with PLATFORM_ADMIN authority, acceptance capture, and audit recording.",
    },
    { status: 410 }
  );
}
