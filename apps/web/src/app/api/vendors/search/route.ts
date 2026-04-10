import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VendorSearchFilters, VendorSearchResults, InternalVendorResult } from "@/lib/types.vendor-search";
import { z } from "zod";

export const dynamic = "force-dynamic";

const searchFiltersSchema = z.object({
  keyword: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  radiusMiles: z.number().optional(),
  eventDate: z.string().optional(),
  minBudget: z.number().optional(),
  maxBudget: z.number().optional(),
  categories: z.array(z.string()).optional(),
  sort: z.enum(["best_match", "highest_rated", "most_booked", "price_low_high", "price_high_low"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate filters
    const filters: VendorSearchFilters = {
      keyword: searchParams.get("keyword") || undefined,
      location: searchParams.get("location") || undefined,
      city: searchParams.get("city") || undefined,
      state: searchParams.get("state") || undefined,
      postalCode: searchParams.get("postalCode") || undefined,
      radiusMiles: searchParams.get("radiusMiles") ? parseInt(searchParams.get("radiusMiles")!) : undefined,
      eventDate: searchParams.get("eventDate") || undefined,
      minBudget: searchParams.get("minBudget") ? parseFloat(searchParams.get("minBudget")!) : undefined,
      maxBudget: searchParams.get("maxBudget") ? parseFloat(searchParams.get("maxBudget")!) : undefined,
      categories: searchParams.get("categories")?.split(",").filter(Boolean) || undefined,
      sort: (searchParams.get("sort") as any) || "best_match",
    };

    const validationResult = searchFiltersSchema.safeParse(filters);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid search filters", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const validatedFilters = validationResult.data;

    // Build Prisma query for internal vendors
    const where: any = {
      type: "VENDOR",
      // Only show vendors with published profiles OR vendors with listings (legacy support)
      OR: [
        { profileStatus: "PUBLISHED" },
        { listings: { some: {} } },
      ],
    };

    // Filter by categories (if provided)
    if (validatedFilters.categories && validatedFilters.categories.length > 0) {
      where.AND = [
        {
          listings: {
            some: {
              category: {
                in: validatedFilters.categories,
              },
            },
          },
        },
      ];
    } else {
      // If no category filter, still need to ensure they have listings
      where.AND = [
        {
          listings: {
            some: {},
          },
        },
      ];
    }

    // Filter by location
    if (validatedFilters.city) {
      where.city = {
        contains: validatedFilters.city,
        mode: "insensitive",
      };
    }
    if (validatedFilters.state) {
      where.state = {
        contains: validatedFilters.state,
        mode: "insensitive",
      };
    }
    if (validatedFilters.postalCode) {
      where.postalCode = validatedFilters.postalCode;
    }

    // Filter by keyword (search in name, about, or listing titles/descriptions)
    if (validatedFilters.keyword) {
      const keyword = validatedFilters.keyword.toLowerCase();
      where.OR = [
        { name: { contains: keyword, mode: "insensitive" } },
        { about: { contains: keyword, mode: "insensitive" } },
        {
          listings: {
            some: {
              OR: [
                { title: { contains: keyword, mode: "insensitive" } },
                { description: { contains: keyword, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    // Fetch internal vendors
    const internalVendors = await prisma.organization.findMany({
      where,
      include: {
        listings: {
          where: {
            type: "VENDOR",
          },
          include: {
            tags: true,
            reviews: true,
          },
          take: 1, // Get primary listing for display
        },
      },
      take: 50, // Limit results
    });

    // Transform to InternalVendorResult format
    const internalResults: InternalVendorResult[] = internalVendors
      .filter((org) => org.listings.length > 0)
      .map((org) => {
        const primaryListing = org.listings[0];
        if (!primaryListing) {
          // This should never happen due to filter, but TypeScript needs the check
          throw new Error("No primary listing found");
        }
        const reviews = primaryListing.reviews || [];
        const ratingAvg = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
          : primaryListing.ratingAvg || 0;

        return {
          id: org.id,
          name: org.name,
          slug: primaryListing.slug, // Use listing slug for marketplace link
          category: primaryListing.category,
          location: {
            city: primaryListing.city || org.city,
            state: primaryListing.state || org.state,
            postalCode: primaryListing.postalCode || org.postalCode,
            country: primaryListing.country || org.country,
          },
          description: primaryListing.description || org.about || undefined,
          tags: primaryListing.tags.map((t) => t.value),
          pricingSummary: {
            priceTier: primaryListing.priceTier,
          },
          rating: {
            average: ratingAvg,
            count: reviews.length || primaryListing.ratingCount || 0,
          },
          coverImageUrl: primaryListing.coverImageUrl || undefined,
          website: primaryListing.website || org.website || undefined,
          contactEmail: primaryListing.email || org.contactEmail || undefined,
          contactPhone: primaryListing.phone || org.contactPhone || undefined,
        };
      });

    // Apply sorting
    const sortedResults = [...internalResults];
    switch (validatedFilters.sort) {
      case "highest_rated":
        sortedResults.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
        break;
      case "price_low_high":
        sortedResults.sort((a, b) => (a.pricingSummary?.priceTier || 999) - (b.pricingSummary?.priceTier || 999));
        break;
      case "price_high_low":
        sortedResults.sort((a, b) => (b.pricingSummary?.priceTier || 0) - (a.pricingSummary?.priceTier || 0));
        break;
      case "most_booked":
        // Sort by rating count as proxy for bookings (can be enhanced later)
        sortedResults.sort((a, b) => (b.rating?.count || 0) - (a.rating?.count || 0));
        break;
      case "best_match":
      default:
        // Best match: keyword relevance + rating (simple implementation)
        if (validatedFilters.keyword) {
          sortedResults.sort((a, b) => {
            const aScore = (a.rating?.average || 0) * 0.3 + (a.rating?.count || 0) * 0.1;
            const bScore = (b.rating?.average || 0) * 0.3 + (b.rating?.count || 0) * 0.1;
            return bScore - aScore;
          });
        }
        break;
    }

    // For now, return empty external results (will be implemented separately)
    const results: VendorSearchResults = {
      internal: sortedResults,
      external: [],
      totalInternal: sortedResults.length,
      totalExternal: 0,
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching vendors:", error);
    return NextResponse.json(
      { error: "Failed to search vendors" },
      { status: 500 }
    );
  }
}
