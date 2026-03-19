import { NextRequest, NextResponse } from "next/server";
import { VendorSearchFilters, ExternalVendorResult } from "@/lib/types.vendor-search";

/**
 * External vendor search API route
 * 
 * This is a placeholder/mock implementation that simulates external vendor results.
 * In the future, this can be wired to real external APIs (Google Places, Yelp, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword") || "";
    const location = searchParams.get("location") || "";
    const categories = searchParams.get("categories")?.split(",").filter(Boolean) || [];

    // Mock external vendor results for demonstration
    // In production, this would call actual external APIs
    const mockExternalResults: ExternalVendorResult[] = [];

    // Only return mock results if there's a meaningful search query
    if (keyword || location) {
      // Simulate some external vendors based on search criteria
      const mockVendors = [
        {
          id: "ext-1",
          name: `${keyword || "Local"} Vendor Services`,
          category: categories[0] || "OTHER",
          location: location || "Various locations",
          description: `External vendor found via web search for "${keyword || "vendors"}"`,
          url: "https://example.com/vendor",
          source: "web_search",
          rating: { average: 4.2, count: 15 },
        },
        {
          id: "ext-2",
          name: `Premium ${keyword || "Event"} Solutions`,
          category: categories[0] || "OTHER",
          location: location || "Various locations",
          description: `External vendor matching your search criteria`,
          url: "https://example.com/vendor2",
          source: "web_search",
          rating: { average: 4.5, count: 8 },
        },
      ];

      mockExternalResults.push(...mockVendors);
    }

    return NextResponse.json({
      external: mockExternalResults,
      totalExternal: mockExternalResults.length,
    });
  } catch (error) {
    console.error("Error searching external vendors:", error);
    return NextResponse.json(
      { error: "Failed to search external vendors" },
      { status: 500 }
    );
  }
}

