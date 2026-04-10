import { NextResponse } from "next/server";

/**
 * POST /api/demo/milestones/[id]/release
 * Guarded MVP: disabled to prevent any demo-only payout release authority bypass.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Demo milestone release is disabled in guarded MVP. Use the canonical /api/payments/release-milestone route with PLATFORM_ADMIN authority and audit recording.",
    },
    { status: 410 }
  );
}
