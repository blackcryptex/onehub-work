import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/lib/audit";

const relationshipSchema = z.object({
  orgId: z.string().min(1),
  listingId: z.string().min(1),
  status: z.enum(["ACTIVE", "PREFERRED", "WATCHLIST", "DO_NOT_USE"]).default("ACTIVE"),
  notes: z.string().trim().max(2000).optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  reliability: z.number().int().min(1).max(5).optional(),
});

function canUseVendorRelationships(user: { role?: string | null }) {
  return user.role === "PRO_PLANNER" || user.role === "ADMIN";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canUseVendorRelationships(user)) {
      return NextResponse.json({ error: "Only professional planners can manage vendor relationships" }, { status: 403 });
    }

    const input = relationshipSchema.parse(await request.json());

    const [org, listing] = await Promise.all([
      prisma.organization.findFirst({
        where: isAdmin(user)
          ? { id: input.orgId, type: { in: ["PLANNER", "CLIENT_AGENCY"] } }
          : {
              id: input.orgId,
              type: { in: ["PLANNER", "CLIENT_AGENCY"] },
              OR: [
                { ownerId: user.id },
                { members: { some: { userId: user.id, role: { in: ["OWNER", "ADMIN", "MEMBER"] } } } },
              ],
            },
        select: { id: true },
      }),
      prisma.listing.findUnique({
        where: { id: input.listingId },
        select: { id: true, title: true, type: true, category: true },
      }),
    ]);

    if (!org) {
      return NextResponse.json({ error: "Planner organization not found or not allowed" }, { status: 403 });
    }

    if (!listing) {
      return NextResponse.json({ error: "Vendor or venue listing not found" }, { status: 404 });
    }

    const relationship = await prisma.vendorRelationship.upsert({
      where: { orgId_listingId: { orgId: input.orgId, listingId: input.listingId } },
      create: {
        orgId: input.orgId,
        listingId: input.listingId,
        status: input.status,
        ownerUserId: user.id,
        notes: input.notes || null,
        nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
        reliability: input.reliability ?? null,
        lastContactAt: new Date(),
      },
      update: {
        status: input.status,
        notes: input.notes || null,
        nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
        reliability: input.reliability ?? null,
        lastContactAt: new Date(),
        ownerUserId: user.id,
      },
      include: {
        listing: { select: { id: true, title: true, type: true, category: true, city: true, state: true } },
      },
    });

    await recordAudit({
      orgId: input.orgId,
      actorId: user.id,
      action: "pro_planner.vendor_relationship.upserted",
      target: relationship.id,
      metadata: {
        listingId: input.listingId,
        status: relationship.status,
        nextFollowUpAt: relationship.nextFollowUpAt?.toISOString() ?? null,
      },
    });

    return NextResponse.json({ relationship });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid vendor relationship request", details: error.issues }, { status: 400 });
    }
    console.error("Error upserting pro planner vendor relationship:", error);
    return NextResponse.json({ error: "Failed to save vendor relationship" }, { status: 500 });
  }
}
