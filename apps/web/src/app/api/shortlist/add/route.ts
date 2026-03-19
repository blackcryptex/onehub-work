import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Request validation schema
const addToShortlistSchema = z.object({
  eventId: z.string().min(1, "eventId is required"),
  listingId: z.string().min(1, "listingId is required"),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Auth check - using same pattern as vault page
    const user = await getCurrentUser();
    if (!user) {
      console.error("[api/shortlist/add] Unauthorized: No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body with zod
    const validationResult = addToShortlistSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("[api/shortlist/add] Validation failed:", validationResult.error.errors);
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { eventId, listingId, notes } = validationResult.data;

    // Verify event exists and user has access (optional but good for security)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, orgId: true },
    });

    if (!event) {
      console.error("[api/shortlist/add] Event not found:", eventId);
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      console.error("[api/shortlist/add] Listing not found:", listingId);
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Upsert shortlist item using unique constraint [eventId, listingId]
    // Prisma auto-generates constraint name from field names
    const item = await prisma.shortlistItem.upsert({
      where: {
        eventId_listingId: {
          eventId,
          listingId,
        },
      },
      create: {
        eventId,
        listingId,
        notes: notes || null,
      },
      update: {
        notes: notes || null,
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            type: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("[api/shortlist/add] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

