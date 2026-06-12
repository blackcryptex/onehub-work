import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ hasVendorOrg: false, hasVenueOrg: false });
    }

    const userId = session.user.id as string;

    // Check for vendor org
    const vendorOrg = await db.organization.findFirst({
      where: {
        ownerId: userId,
        type: "VENDOR",
      },
    });

    // Check for venue org
    const venueOrg = await db.organization.findFirst({
      where: {
        ownerId: userId,
        type: "VENUE",
      },
    });

    return NextResponse.json({
      hasVendorOrg: !!vendorOrg,
      hasVenueOrg: !!venueOrg,
    });
  } catch (error) {
    console.error("Error checking vendor/venue profile:", error);
    return NextResponse.json(
      { error: "Failed to check profile" },
      { status: 500 }
    );
  }
}
