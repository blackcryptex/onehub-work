import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createStopImpersonationSessionUpdate } from "@/lib/auth";
import { db } from "@/server/db";

/**
 * API route to stop impersonation
 * 
 * This route validates admin access and confirms impersonation is active.
 * The actual session update happens on the client side using NextAuth's update() method
 * with a short-lived server-signed transition token from this route.
 * 
 * Security: Only works if there's an active impersonation session.
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    const realUserId = session?.user?.realUserId || session?.user?.id;
    
    if (!realUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify the real user is an admin
    const realUser = await db.user.findUnique({ where: { id: realUserId } });
    if (!realUser || realUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    
    // Check if currently impersonating
    const actingUserId = session?.user?.actingUserId;
    if (!actingUserId) {
      return NextResponse.json({ error: "Not currently impersonating" }, { status: 400 });
    }
    
    const sessionUpdate = createStopImpersonationSessionUpdate({
      realUserId,
      actingUserId,
    });

    // Return success and signed session update payload.
    return NextResponse.json({
      success: true,
      message: "Impersonation stopped",
      sessionUpdate,
    });
  } catch (error) {
    console.error("[Impersonation] Error stopping impersonation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

