/**
 * Types for vendor search functionality
 */

export type VendorSearchSort = 
  | "best_match"
  | "highest_rated"
  | "most_booked"
  | "price_low_high"
  | "price_high_low";

export interface VendorSearchFilters {
  // Keyword / Service type
  keyword?: string;
  
  // Location
  location?: string; // City, state, zip, or general location
  city?: string;
  state?: string;
  postalCode?: string;
  radiusMiles?: number; // Distance radius in miles
  
  // Event date (for availability filtering)
  eventDate?: string; // ISO date string
  
  // Budget range
  minBudget?: number;
  maxBudget?: number;
  
  // Vendor category / type (multi-select)
  categories?: string[]; // Array of ListingCategory values
  
  // Sort option
  sort?: VendorSearchSort;
}

export interface InternalVendorResult {
  id: string;
  name: string;
  slug: string;
  category: string;
  location: {
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
  description?: string | null;
  tags: string[];
  pricingSummary?: {
    priceTier?: number | null;
    minPrice?: number | null;
    maxPrice?: number | null;
  };
  rating?: {
    average: number;
    count: number;
  };
  coverImageUrl?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface ExternalVendorResult {
  id: string;
  name: string;
  category: string;
  location: string;
  description?: string;
  url: string;
  source: string; // e.g., "google", "yelp", etc.
  rating?: {
    average: number;
    count: number;
  };
  imageUrl?: string;
}

export interface VendorSearchResults {
  internal: InternalVendorResult[];
  external: ExternalVendorResult[];
  totalInternal: number;
  totalExternal: number;
}

