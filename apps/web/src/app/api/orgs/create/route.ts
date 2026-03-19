import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const body = await request.json();

    // Determine org type from body or role
    let orgType: "PLANNER" | "VENDOR" | "VENUE" | "CLIENT_AGENCY" = "PLANNER";
    if (body.orgType) {
      orgType = body.orgType;
    } else if (body.orgName) {
      // If orgName provided, use it
      orgType = body.type || "PLANNER";
    }

    // Generate slug
    const name = body.orgName || body.name || "My Organization";
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

    // Create organization
    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        type: orgType,
        ownerId: userId,
        members: { create: { userId, role: "OWNER" } },
        settings: { create: {} },
      },
    });

    return NextResponse.json({ orgId: org.id, slug: org.slug });
  } catch (error: unknown) {
    console.error("Error creating organization:", error);
    const prismaError = error as { code?: unknown; message?: unknown };
    if (prismaError && prismaError.code === "P2002") {
      return NextResponse.json({ error: "An organization with this name already exists" }, { status: 400 });
    }
    const message =
      typeof prismaError.message === "string" && prismaError.message.length > 0
        ? prismaError.message
        : "Failed to create organization";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

