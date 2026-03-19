/**
 * Vendor category canonicalizer
 * Maps various string inputs to VendorCategory union type
 */

import type { VendorCategory } from '../types.event';

// Map of common synonyms/variations to canonical VendorCategory
const CATEGORY_MAP: Record<string, VendorCategory> = {
  // Venue variations
  venue: 'venue',
  venues: 'venue',
  location: 'venue',
  locations: 'venue',
  'venue rental': 'venue',
  'event space': 'venue',
  
  // Catering variations
  catering: 'catering',
  caterer: 'catering',
  caterers: 'catering',
  food: 'catering',
  'food service': 'catering',
  
  // Photography variations
  photo: 'photo',
  photography: 'photo',
  photographer: 'photo',
  photographers: 'photo',
  'photo/video': 'photo',
  
  // Video variations
  video: 'video',
  videography: 'video',
  videographer: 'video',
  videographers: 'video',
  
  // Music/Entertainment variations
  music: 'music',
  dj: 'music',
  'dj/mc': 'music',
  entertainment: 'music',
  musician: 'music',
  musicians: 'music',
  band: 'music',
  'live music': 'music',
  
  // Florist variations
  florist: 'florist',
  floral: 'florist',
  flowers: 'florist',
  florals: 'florist',
  'flower arrangements': 'florist',
  
  // Decor variations
  decor: 'decor',
  decoration: 'decor',
  decorations: 'decor',
  'decor & rentals': 'decor',
  rentals: 'decor',
  
  // Planner variations
  planner: 'planner',
  planning: 'planner',
  'event planner': 'planner',
  'event planning': 'planner',
  coordinator: 'planner',
  
  // Officiant variations
  officiant: 'officiant',
  officiants: 'officiant',
  'officiant services': 'officiant',
  
  // Transportation variations
  transport: 'transport',
  transportation: 'transport',
  'transportation services': 'transport',
  limo: 'transport',
  limousine: 'transport',
  'car service': 'transport',
  
  // Cake variations
  cake: 'cake',
  'wedding cake': 'cake',
  'custom cake': 'cake',
  bakery: 'cake',
  
  // Other
  other: 'other',
  others: 'other',
  miscellaneous: 'other',
  misc: 'other',
};

// Valid VendorCategory values for runtime checks
const VALID_CATEGORIES: Set<VendorCategory> = new Set([
  'venue', 'catering', 'florist', 'music', 'photo', 'video', 'planner',
  'decor', 'officiant', 'transport', 'cake', 'other'
]);

/**
 * Converts a string input to a VendorCategory
 * @param input - Raw category string (e.g., "venues", "DJ", "photography")
 * @returns Canonical VendorCategory
 * @throws Error if input cannot be mapped to a valid category
 */
export function toVendorCategory(input: string): VendorCategory {
  if (!input || typeof input !== 'string') {
    throw new Error(`Invalid category input: ${input}`);
  }

  const normalized = input.trim().toLowerCase();
  
  // Check direct mapping first
  const mapped = CATEGORY_MAP[normalized];
  if (mapped) {
    return mapped;
  }
  
  // Check if input already matches a valid category (case-insensitive)
  if (VALID_CATEGORIES.has(normalized as VendorCategory)) {
    return normalized as VendorCategory;
  }
  
  // Try partial matching for compound strings
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Last resort: throw in dev, default to 'other' in production
  if (process.env.NODE_ENV === 'development') {
    throw new Error(`Unknown VendorCategory: "${input}". Valid categories: ${Array.from(VALID_CATEGORIES).join(', ')}`);
  }
  
  // In production, default to 'other' to avoid breaking the app
  console.warn(`[toVendorCategory] Unknown category "${input}", defaulting to "other"`);
  return 'other';
}

