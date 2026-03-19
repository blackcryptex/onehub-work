"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { Card, Button, Input, Select } from "@/components/ui";
import { Search, MapPin, Calendar, DollarSign, Filter, Star, ExternalLink } from "lucide-react";
import { VendorSearchFilters, VendorSearchResults, InternalVendorResult, ExternalVendorResult } from "@/lib/types.vendor-search";

const VENDOR_CATEGORIES = [
  { value: "CATERING", label: "Catering" },
  { value: "PHOTO_VIDEO", label: "Photography & Video" },
  { value: "DECOR_FLORAL", label: "Decor & Floral" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "TRANSPORT", label: "Transportation" },
  { value: "STAFFING", label: "Staffing" },
  { value: "PLANNING_SERVICES", label: "Planning Services" },
  { value: "RENTALS", label: "Rentals" },
  { value: "OTHER", label: "Other" },
];

const SORT_OPTIONS = [
  { value: "best_match", label: "Best Match" },
  { value: "highest_rated", label: "Highest Rated" },
  { value: "most_booked", label: "Most Booked" },
  { value: "price_low_high", label: "Price: Low to High" },
  { value: "price_high_low", label: "Price: High to Low" },
];

export default function ExploreVendorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<VendorSearchFilters>({
    keyword: searchParams.get("keyword") || "",
    location: searchParams.get("location") || "",
    city: searchParams.get("city") || "",
    state: searchParams.get("state") || "",
    categories: searchParams.get("categories")?.split(",").filter(Boolean) || [],
    sort: (searchParams.get("sort") as any) || "best_match",
  });
  const [results, setResults] = useState<VendorSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Update URL params when filters change
  const updateUrlParams = useCallback((newFilters: VendorSearchFilters) => {
    const params = new URLSearchParams();
    if (newFilters.keyword) params.set("keyword", newFilters.keyword);
    if (newFilters.location) params.set("location", newFilters.location);
    if (newFilters.city) params.set("city", newFilters.city);
    if (newFilters.state) params.set("state", newFilters.state);
    if (newFilters.categories && newFilters.categories.length > 0) {
      params.set("categories", newFilters.categories.join(","));
    }
    if (newFilters.sort) params.set("sort", newFilters.sort);
    router.replace(`/explore/vendors?${params.toString()}`, { scroll: false });
  }, [router]);

  // Perform search
  const performSearch = useCallback(async (searchFilters: VendorSearchFilters) => {
    setLoading(true);
    setHasSearched(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (searchFilters.keyword) params.set("keyword", searchFilters.keyword);
      if (searchFilters.location) params.set("location", searchFilters.location);
      if (searchFilters.city) params.set("city", searchFilters.city);
      if (searchFilters.state) params.set("state", searchFilters.state);
      if (searchFilters.postalCode) params.set("postalCode", searchFilters.postalCode);
      if (searchFilters.radiusMiles) params.set("radiusMiles", searchFilters.radiusMiles.toString());
      if (searchFilters.eventDate) params.set("eventDate", searchFilters.eventDate);
      if (searchFilters.minBudget) params.set("minBudget", searchFilters.minBudget.toString());
      if (searchFilters.maxBudget) params.set("maxBudget", searchFilters.maxBudget.toString());
      if (searchFilters.categories && searchFilters.categories.length > 0) {
        params.set("categories", searchFilters.categories.join(","));
      }
      if (searchFilters.sort) params.set("sort", searchFilters.sort);

      // Search internal vendors
      const internalResponse = await fetch(`/api/vendors/search?${params.toString()}`);
      const internalData = await internalResponse.json();

      // Search external vendors (only if we have meaningful search criteria)
      let externalData = { external: [], totalExternal: 0 };
      if (searchFilters.keyword || searchFilters.location) {
        const externalResponse = await fetch(`/api/vendors/search-external?${params.toString()}`);
        externalData = await externalResponse.json();
      }

      setResults({
        internal: internalData.internal || [],
        external: externalData.external || [],
        totalInternal: internalData.totalInternal || 0,
        totalExternal: externalData.totalExternal || 0,
      });
    } catch (error) {
      console.error("Search error:", error);
      setResults({
        internal: [],
        external: [],
        totalInternal: 0,
        totalExternal: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search on mount if URL has params
  useEffect(() => {
    const hasParams = searchParams.get("keyword") || searchParams.get("location") || searchParams.get("categories");
    if (hasParams) {
      performSearch(filters);
    }
  }, []); // Only run on mount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams(filters);
    performSearch(filters);
  };

  const handleFilterChange = (key: keyof VendorSearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const toggleCategory = (category: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter((c) => c !== category)
      : [...currentCategories, category];
    handleFilterChange("categories", newCategories);
  };

  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-7xl px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Explore Vendors</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Search vendors by location, service type, budget, and availability. Vendors with OneHub profiles are shown first.
          </p>
        </div>

        {/* Search Form */}
        <Card className="p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Keyword */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Search className="w-4 h-4 inline mr-1" />
                  Keyword / Service Type
                </label>
                <Input
                  type="text"
                  placeholder="e.g., caterer, DJ, photographer"
                  value={filters.keyword || ""}
                  onChange={(e) => handleFilterChange("keyword", e.target.value)}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location
                </label>
                <Input
                  type="text"
                  placeholder="City, state, or zip code"
                  value={filters.location || ""}
                  onChange={(e) => handleFilterChange("location", e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* City */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                <Input
                  type="text"
                  placeholder="City"
                  value={filters.city || ""}
                  onChange={(e) => handleFilterChange("city", e.target.value)}
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                <Input
                  type="text"
                  placeholder="State"
                  value={filters.state || ""}
                  onChange={(e) => handleFilterChange("state", e.target.value)}
                />
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Event Date
                </label>
                <Input
                  type="date"
                  value={filters.eventDate || ""}
                  onChange={(e) => handleFilterChange("eventDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Budget Range */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Min Budget
                </label>
                <Input
                  type="number"
                  placeholder="$0"
                  value={filters.minBudget || ""}
                  onChange={(e) => handleFilterChange("minBudget", e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Max Budget</label>
                <Input
                  type="number"
                  placeholder="$0"
                  value={filters.maxBudget || ""}
                  onChange={(e) => handleFilterChange("maxBudget", e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Sort By
                </label>
                <Select
                  value={filters.sort || "best_match"}
                  onChange={(e) => handleFilterChange("sort", e.target.value)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Categories</label>
              <div className="flex flex-wrap gap-2">
                {VENDOR_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => toggleCategory(cat.value)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.categories?.includes(cat.value)
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Searching..." : "Search Vendors"}
            </Button>
          </form>
        </Card>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-8">
            {/* Internal Vendors */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                Vendors on OneHub {results && results.totalInternal > 0 && `(${results.totalInternal})`}
              </h2>
              {loading ? (
                <div className="text-center py-12 text-slate-600">Searching...</div>
              ) : results && results.internal.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.internal.map((vendor) => (
                    <VendorCard key={vendor.id} vendor={vendor} isInternal={true} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-slate-600">No OneHub vendors match your search yet.</p>
                </Card>
              )}
            </section>

            {/* External Vendors */}
            {results && results.external.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-4">
                  Other Vendors from the Web {results.totalExternal > 0 && `(${results.totalExternal})`}
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.external.map((vendor) => (
                    <VendorCard key={vendor.id} vendor={vendor} isInternal={false} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && (
          <Card className="p-12 text-center">
            <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Start Your Search</h3>
            <p className="text-slate-600">
              Enter keywords, location, or select categories to find vendors for your event.
            </p>
          </Card>
        )}
      </main>
    </>
  );
}

function VendorCard({
  vendor,
  isInternal,
}: {
  vendor: InternalVendorResult | ExternalVendorResult;
  isInternal: boolean;
}) {
  const locationStr = isInternal
    ? [
        (vendor as InternalVendorResult).location.city,
        (vendor as InternalVendorResult).location.state,
      ]
        .filter(Boolean)
        .join(", ") || "Location not specified"
    : (vendor as ExternalVendorResult).location;

  const coverImageUrl = "coverImageUrl" in vendor ? vendor.coverImageUrl : undefined;

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      {coverImageUrl && (
        <img
          src={coverImageUrl}
          alt={vendor.name}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
      )}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold">{vendor.name}</h3>
        {!isInternal && (
          <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
        )}
      </div>
      <p className="text-sm text-slate-600 mb-2">{vendor.category}</p>
      <p className="text-xs text-slate-500 mb-3 flex items-center">
        <MapPin className="w-3 h-3 mr-1" />
        {locationStr}
      </p>
      {vendor.description && (
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{vendor.description}</p>
      )}
      {vendor.rating && vendor.rating.count > 0 && (
        <div className="flex items-center gap-1 mb-3">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-medium">{vendor.rating.average.toFixed(1)}</span>
          <span className="text-xs text-slate-500">({vendor.rating.count} reviews)</span>
        </div>
      )}
      {isInternal && (vendor as InternalVendorResult).pricingSummary?.priceTier && (
        <div className="text-xs text-slate-600 mb-3">
          Price Tier: {"$".repeat((vendor as InternalVendorResult).pricingSummary!.priceTier!)}
        </div>
      )}
      {isInternal ? (
        <Button asChild variant="secondary" className="w-full">
          <a href={`/marketplace/${(vendor as InternalVendorResult).slug}`}>View Profile</a>
        </Button>
      ) : (
        <Button asChild variant="secondary" className="w-full">
          <a href={(vendor as ExternalVendorResult).url} target="_blank" rel="noopener noreferrer">
            Visit Website <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </Button>
      )}
    </Card>
  );
}

