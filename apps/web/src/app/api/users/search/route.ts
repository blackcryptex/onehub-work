import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * Phase 3: Search for users (primarily CLIENT users for event intake)
 * 
 * GET /api/users/search?q=query&role=CLIENT
 * 
 * Only planners can search for clients.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only planners can search for clients
    if (user.role !== "PRO_PLANNER" && user.role !== "DIY_PLANNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only planners can search for users" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const role = searchParams.get("role") || "CLIENT";

    if (!query.trim()) {
      return NextResponse.json({ users: [] });
    }

    // Search for users by name or email, filtered by role
    const users = await prisma.user.findMany({
      where: {
        role: role as any,
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10,
      orderBy: [
        { name: "asc" },
        { email: "asc" },
      ],
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}

