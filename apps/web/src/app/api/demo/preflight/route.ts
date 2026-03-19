import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAIAvailable } from "@/lib/ai/client";
import { isDemoMode } from "@/lib/demo-mode";

/**
 * GET /api/demo/preflight
 * Check demo readiness status (no auth required)
 */
export async function GET() {
  try {
    const demoModeActive = isDemoMode();
    const hasOpenAIKey = isAIAvailable();
    const fallbackActive = demoModeActive || !hasOpenAIKey;

    // Check if demo event exists
    let seedOk = false;
    let verifiedListingsCount = 0;

    try {
      const demoEvent = await prisma.event.findUnique({
        where: { slug: "demo-wedding" },
        select: { id: true },
      });

      if (demoEvent) {
        seedOk = true;

        // Optionally check for verified listings (listings with orgId)
        verifiedListingsCount = await prisma.listing.count({
          where: {
            orgId: { not: null },
            state: "IL", // Match demo event location
          },
        });

        // Seed is OK if event exists; verified listings are bonus
        // (We don't require listings for seedOk, but we report the count)
      }
    } catch (error) {
      console.error("[api/demo/preflight] Error checking seed:", error);
      // seedOk remains false
    }

    return NextResponse.json({
      demoModeActive,
      seedOk,
      verifiedListingsCount,
      ai: {
        hasOpenAIKey,
        fallbackActive,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/demo/preflight] Error:", error);
    return NextResponse.json(
      {
        demoModeActive: false,
        seedOk: false,
        verifiedListingsCount: 0,
        ai: {
          hasOpenAIKey: false,
          fallbackActive: false,
        },
        timestamp: new Date().toISOString(),
        error: "Failed to check preflight status",
      },
      { status: 500 }
    );
  }
}

