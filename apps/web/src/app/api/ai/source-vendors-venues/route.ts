import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { EventType, ListingCategory, ListingType } from "@prisma/client";

// Request validation schema
const sourceVendorsVenuesSchema = z.object({
  eventId: z.string().min(1, "eventId is required"),
  limitVerified: z.number().int().positive().optional(),
  limitUnverified: z.number().int().positive().optional(),
});

// Map EventType to relevant ListingCategory values (per demo requirements)
function getCategoriesForEventType(eventType: EventType): ListingCategory[] {
  switch (eventType) {
    case "WEDDING":
      return [
        "VENUE_SPACE",
        "CATERING",
        "DECOR_FLORAL",
        "ENTERTAINMENT",
        "PHOTO_VIDEO",
        "RENTALS",
      ];
    case "CONFERENCE":
    case "CORPORATE_GALA":
      return [
        "VENUE_SPACE",
        "CATERING",
        "STAFFING",
        "TRANSPORT",
        "PHOTO_VIDEO",
        "RENTALS",
      ];
    case "BIRTHDAY":
      return [
        "VENUE_SPACE",
        "CATERING",
        "ENTERTAINMENT",
        "DECOR_FLORAL",
        "PHOTO_VIDEO",
      ];
    case "FUNDRAISER":
    case "FESTIVAL":
    case "SPORTS":
    case "OTHER":
    default:
      return [
        "VENUE_SPACE",
        "CATERING",
        "ENTERTAINMENT",
        "PHOTO_VIDEO",
        "DECOR_FLORAL",
        "OTHER",
      ];
  }
}

interface VerifiedResult {
  kind: "VERIFIED";
  listingId: string;
  title: string;
  listingType: ListingType;
  category: ListingCategory;
  city: string | null;
  state: string | null;
  website: string | null;
  orgName: string;
  badgeText: "Verified";
}

interface UnverifiedResult {
  kind: "UNVERIFIED";
  title: string;
  listingType: ListingType;
  category: ListingCategory;
  city: string | null;
  state: string | null;
  website: null;
  badgeText: "Unverified";
}

type Result = VerifiedResult | UnverifiedResult;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with zod
    const validationResult = sourceVendorsVenuesSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("[api/ai/source-vendors-venues] Validation failed:", validationResult.error.errors);
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { eventId, limitVerified = 8, limitUnverified = 4 } = validationResult.data;

    // Load the event from Prisma
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        type: true,
        startAt: true,
        venueCity: true,
        venueState: true,
        description: true,
      },
    });

    if (!event) {
      console.error("[api/ai/source-vendors-venues] Event not found:", eventId);
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Determine categories based on event type
    const categories = getCategoriesForEventType(event.type);

    // Build where clause for verified listings
    const whereClause: any = {
      category: { in: categories },
    };

    // Optionally filter by state if present
    if (event.venueState) {
      whereClause.state = event.venueState;
    }

    // Query verified listings with proper ordering (demo-safe: deterministic)
    const verifiedListings = await prisma.listing.findMany({
      where: whereClause,
      take: limitVerified,
      orderBy: [
        { ratingAvg: "desc" },
        { ratingCount: "desc" },
        { updatedAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        type: true,
        category: true,
        city: true,
        state: true,
        website: true,
        org: {
          select: {
            name: true,
          },
        },
      },
    });

    // Build verified results
    const verifiedResults: VerifiedResult[] = verifiedListings.map((listing) => ({
      kind: "VERIFIED",
      listingId: listing.id,
      title: listing.title,
      listingType: listing.type,
      category: listing.category,
      city: listing.city,
      state: listing.state,
      website: listing.website,
      orgName: listing.org.name,
      badgeText: "Verified",
    }));

    // Generate unverified stub results (demo-safe + deterministic)
    const unverifiedResults: UnverifiedResult[] = [];
    const unverifiedCategories = categories.slice(0, limitUnverified);
    const eventCity = event.venueCity || "Local";
    const eventState = event.venueState || null;

    // Deterministic unverified suggestions based on category
    const getUnverifiedTitle = (category: ListingCategory, index: number): string => {
      const cityPrefix = eventCity;
      
      switch (category) {
        case "VENUE_SPACE":
          return `${cityPrefix} Luxe Event Venue`;
        case "CATERING":
          return `${cityPrefix} Premier Catering`;
        case "DECOR_FLORAL":
          return `${cityPrefix} Elegant Floral Design`;
        case "ENTERTAINMENT":
          return `${cityPrefix} Professional Entertainment`;
        case "PHOTO_VIDEO":
          return `${cityPrefix} Premium Photography`;
        case "TRANSPORT":
          return `${cityPrefix} Luxury Transport Services`;
        case "STAFFING":
          return `${cityPrefix} Event Staffing Solutions`;
        case "PLANNING_SERVICES":
          return `${cityPrefix} Expert Event Planning`;
        case "RENTALS":
          return `${cityPrefix} Premium Event Rentals`;
        case "OTHER":
        default:
          return `${cityPrefix} Event Services`;
      }
    };

    for (let i = 0; i < unverifiedCategories.length; i++) {
      const category = unverifiedCategories[i];
      if (!category) continue; // Type guard: skip if undefined (shouldn't happen, but TypeScript safety)
      
      // Determine if this category is typically a venue or vendor
      const isVenue = category === "VENUE_SPACE";
      const listingType: ListingType = isVenue ? "VENUE" : "VENDOR";
      const title = getUnverifiedTitle(category, i);

      unverifiedResults.push({
        kind: "UNVERIFIED",
        title,
        listingType,
        category,
        city: eventCity,
        state: eventState,
        website: null,
        badgeText: "Unverified",
      });
    }

    // Combine results
    const results: Result[] = [...verifiedResults, ...unverifiedResults];

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
      },
      results,
    });
  } catch (error) {
    console.error("[api/ai/source-vendors-venues] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

