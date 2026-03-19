import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";

const inviteClientSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * Phase 3: Invite a new client by email
 * 
 * POST /api/users/invite-client
 * 
 * Creates a CLIENT user if they don't exist, or returns existing user.
 * Only planners can invite clients.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only planners can invite clients
    if (user.role !== "PRO_PLANNER" && user.role !== "DIY_PLANNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only planners can invite clients" }, { status: 403 });
    }

    const body = await request.json();
    const { email } = inviteClientSchema.parse(body);

    // Check if user already exists
    let clientUser = await prisma.user.findUnique({
      where: { email },
    });

    if (clientUser) {
      // User exists - return their info
      return NextResponse.json({
        userId: clientUser.id,
        name: clientUser.name,
        email: clientUser.email,
        message: "User already exists",
      });
    }

    // Create new CLIENT user
    // Generate a temporary password (user will need to reset it)
    const tempPassword = randomBytes(16).toString("hex");
    const bcryptjsModule = await import("bcryptjs");
    const bcrypt = bcryptjsModule.default || bcryptjsModule;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    clientUser = await prisma.user.create({
      data: {
        email,
        role: "CLIENT",
        password: hashedPassword,
        // Name will be set when user completes signup
      },
    });

    // TODO: Send invitation email with signup link
    // For now, just log it
    console.log(`[STUB] Client invitation sent to ${email}. User ID: ${clientUser.id}`);

    return NextResponse.json({
      userId: clientUser.id,
      name: clientUser.name,
      email: clientUser.email,
      message: "Client invited successfully",
    });
  } catch (error) {
    console.error("Error inviting client:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to invite client" }, { status: 500 });
  }
}

