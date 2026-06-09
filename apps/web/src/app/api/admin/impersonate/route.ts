import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createImpersonationSessionUpdate } from "@/lib/auth";
import { db } from "@/server/db";
import { recordAudit } from "@/server/lib/audit";
import { GUARDED_MVP_PLATFORM_ADMIN_AUTHORITY, getGuardedMvpAuthorityForUserId } from "@/lib/rbac";

/**
 * API route to start impersonation
 * 
 * This route validates admin access and returns the target user info.
 * The actual session update happens on the client side using NextAuth's update() method
 * with a short-lived server-signed transition token from this route.
 * 
 * Security: Only canonical guarded-MVP PLATFORM_ADMIN users can impersonate other users,
 * and only with break-glass evidence.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the real admin user (not impersonated)
    const session = await auth();
    const realUserId = session?.user?.realUserId || session?.user?.id;
    
    if (!realUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const realUser = await getGuardedMvpAuthorityForUserId(realUserId);
    if (!realUser) {
      return NextResponse.json({ error: "Forbidden: PLATFORM_ADMIN access required" }, { status: 403 });
    }
    
    const body = await request.json();
    const { targetUserId, reason, incidentTicketId } = body;
    
    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "Break-glass reason is required" }, { status: 400 });
    }

    if (!incidentTicketId || typeof incidentTicketId !== "string" || !incidentTicketId.trim()) {
      return NextResponse.json({ error: "incidentTicketId is required" }, { status: 400 });
    }
    
    // Verify target user exists
    const targetUser = await db.user.findUnique({
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
    
    await recordAudit({
      actorId: realUser.id,
      orgId: null,
      action: "admin.impersonation.break_glass.start",
      target: targetUser.id,
      metadata: {
        authorityPath: `guarded-mvp.${GUARDED_MVP_PLATFORM_ADMIN_AUTHORITY}`,
        incidentTicketId,
        reason: reason.trim(),
        targetUserId: targetUser.id,
        targetUserRole: targetUser.role,
        sessionStartAt: new Date().toISOString(),
        auditTrail: true,
      },
    });

    const sessionUpdate = createImpersonationSessionUpdate({
      realUserId,
      actingUserId: targetUser.id,
    });

    // Return target user info and signed session update payload.
    return NextResponse.json({
      success: true,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
      },
      sessionUpdate,
      breakGlass: {
        authorityPath: `guarded-mvp.${GUARDED_MVP_PLATFORM_ADMIN_AUTHORITY}`,
        incidentTicketId: incidentTicketId.trim(),
        reason: reason.trim(),
      },
    });
  } catch (error) {
    console.error("[Impersonation] Error starting impersonation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

