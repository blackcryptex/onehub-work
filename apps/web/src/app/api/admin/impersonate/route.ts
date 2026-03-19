import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API route to start impersonation
 * 
 * This route validates admin access and returns the target user info.
 * The actual session update happens on the client side using NextAuth's update() method,
 * which triggers the JWT callback with trigger === 'update'.
 * 
 * Security: Only admins can impersonate other users.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the real admin user (not impersonated)
    const session = await auth();
    const realUserId = session?.user?.realUserId || session?.user?.id;
    
    if (!realUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify the real user is an admin
    const realUser = await prisma.user.findUnique({ where: { id: realUserId } });
    if (!realUser || realUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    
    const body = await request.json();
    const { targetUserId } = body;
    
    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }
    
    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, role: true },
    });
    
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }
    
    // Prevent impersonating yourself
    if (targetUser.id === realUserId) {
      return NextResponse.json({ error: "Cannot impersonate yourself" }, { status: 400 });
    }
    
    // Return target user info - client will call session.update() with actingUserId
    return NextResponse.json({
      success: true,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
      },
      // Client will use this to update the session
      actingUserId: targetUser.id,
    });
  } catch (error) {
    console.error("[Impersonation] Error starting impersonation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

