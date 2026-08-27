export const MARKETPLACE_LISTING_CATEGORIES = [
  "VENUE_SPACE",
  "CATERING",
  "DECOR_FLORAL",
  "ENTERTAINMENT",
  "PHOTO_VIDEO",
  "TRANSPORT",
  "STAFFING",
  "PLANNING_SERVICES",
  "RENTALS",
  "OTHER",
] as const;

export type MarketplaceListingCategory = (typeof MARKETPLACE_LISTING_CATEGORIES)[number];
export type MarketplaceListingType = "VENDOR" | "VENUE";

export type MarketplaceEventContext = {
  id: string;
  slug?: string | null;
  name: string;
  startAt: Date;
  endAt: Date;
  venueCity?: string | null;
  venueState?: string | null;
  guestTarget?: number | null;
  budgetCents?: number | null;
  eventType?: string | null;
};

type JsonRecord = Record<string, unknown>;

type OrgProfileLike = {
  name?: string | null;
  type?: string | null;
  profileStatus?: string | null;
  about?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  servicesJson?: unknown;
  spacesJson?: unknown;
  availabilityJson?: unknown;
  paymentsJson?: unknown;
  mediaJson?: unknown;
  notificationsJson?: unknown;
  updatedAt?: Date | string | null;
};

type ListingProfileLike = {
  type?: string | null;
  category?: string | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  minGuests?: number | null;
  maxGuests?: number | null;
  priceTier?: number | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  updatedAt?: Date | string | null;
  offers?: Array<{ priceCents?: number | null }>;
  availSlots?: Array<{ startAt: Date | string; endAt: Date | string; status: string }>;
  org?: OrgProfileLike | null;
};

const CATEGORY_LABELS: Record<MarketplaceListingCategory, string> = {
  VENUE_SPACE: "Venue space",
  CATERING: "Catering",
  DECOR_FLORAL: "Decor & floral",
  ENTERTAINMENT: "Entertainment",
  PHOTO_VIDEO: "Photo & video",
  TRANSPORT: "Transportation",
  STAFFING: "Staffing",
  PLANNING_SERVICES: "Planning services",
  RENTALS: "Rentals",
  OTHER: "Other",
};

const CATEGORY_ALIASES: Array<[RegExp, MarketplaceListingCategory]> = [
  [/venue|space|hall|loft|room/i, "VENUE_SPACE"],
  [/cater|food|bar|beverage/i, "CATERING"],
  [/flor|decor|design|balloon/i, "DECOR_FLORAL"],
  [/music|dj|band|entertain|perform/i, "ENTERTAINMENT"],
  [/photo|video|film/i, "PHOTO_VIDEO"],
  [/transport|shuttle|limo|ride/i, "TRANSPORT"],
  [/staff|security|server|bartender/i, "STAFFING"],
  [/plan|coord|producer/i, "PLANNING_SERVICES"],
  [/rental|linen|chair|table|tent/i, "RENTALS"],
];

export function formatListingCategory(category?: string | null) {
  if (!category) return "Category not set";
  return CATEGORY_LABELS[category as MarketplaceListingCategory] ?? category.replace(/_/g, " ").toLowerCase();
}

export function formatListingType(type?: string | null) {
  return type === "VENUE" ? "Venue" : "Vendor";
}

export function normalizeProviderCategory(category: unknown, providerType: "vendor" | "venue"): MarketplaceListingCategory {
  if (providerType === "venue") return "VENUE_SPACE";
  if (typeof category !== "string" || category.trim().length === 0) return "OTHER";
  const normalized = category.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  if ((MARKETPLACE_LISTING_CATEGORIES as readonly string[]).includes(normalized)) {
    return normalized as MarketplaceListingCategory;
  }
  const alias = CATEGORY_ALIASES.find(([pattern]) => pattern.test(category));
  return alias?.[1] ?? "OTHER";
}

export function asProfileList(value: unknown, preferredKeys: string[] = []) {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  for (const key of preferredKeys) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested.filter(isRecord);
  }
  return [];
}

export function profileCompleteness(org?: OrgProfileLike | null) {
  if (!org) return { completed: 0, total: 6, label: "Profile not connected" };
  const services = asProfileList(org.servicesJson, ["services", "packages"]);
  const spaces = asProfileList(org.spacesJson, ["spaces", "rooms"]);
  const media = asProfileList(org.mediaJson, ["media", "gallery", "images"]);
  const checks = [
    Boolean(org.name),
    Boolean(org.contactEmail || org.contactPhone),
    Boolean(org.city || org.state || org.addressLine1),
    Boolean(org.about),
    services.length > 0 || spaces.length > 0,
    Boolean(org.paymentsJson) || Boolean(org.availabilityJson) || media.length > 0,
  ];
  const completed = checks.filter(Boolean).length;
  return { completed, total: checks.length, label: `${completed}/${checks.length} profile sections complete` };
}

export function verificationBadge(org?: OrgProfileLike | null) {
  const status = org?.profileStatus ?? "UNVERIFIED";
  if (status === "PILOT_VERIFIED") {
    return {
      label: "Pilot verified",
      description: "OneHub has reviewed this provider for the private pilot. Contract/payment readiness still depends on a provider-submitted proposal.",
    };
  }
  if (status === "PUBLISHED") {
    return {
      label: "On-platform profile",
      description: "This provider has a real OneHub organization and listing. This is not a license, insurance, availability, or payment guarantee.",
    };
  }
  return {
    label: "Unverified profile",
    description: "Copy-only or incomplete provider information. Shortlist and booking requests require a real OneHub listing.",
  };
}

export function responseSignal(org?: OrgProfileLike | null) {
  const notifications = isRecord(org?.notificationsJson) ? org?.notificationsJson : null;
  const label = readString(notifications, ["responseTimeLabel", "responseTime", "sla", "preferredResponseTime"]);
  return label ?? "Response SLA not yet measured";
}

export function startingPriceLabel(listing: ListingProfileLike) {
  const offerPrices = (listing.offers ?? [])
    .map((offer) => offer.priceCents)
    .filter((price): price is number => typeof price === "number" && price > 0);
  const profilePrices = [
    ...asProfileList(listing.org?.servicesJson, ["services", "packages"]),
    ...asProfileList(listing.org?.spacesJson, ["spaces", "rooms"]),
  ]
    .map(readPriceCents)
    .filter((price): price is number => typeof price === "number" && price > 0);
  const lowest = Math.min(...offerPrices, ...profilePrices);
  if (Number.isFinite(lowest)) return `Starts at ${formatCents(lowest)}`;
  if (listing.priceTier) return `${"$".repeat(listing.priceTier)} price tier`;
  return "Price available by request";
}

export function selectedEventFitLabel(listing: ListingProfileLike, event?: MarketplaceEventContext | null) {
  if (!event) return "Select an event for fit";
  if (event.guestTarget && listing.maxGuests && event.guestTarget > listing.maxGuests) {
    return `Capacity warning: ${event.guestTarget} guests exceeds max ${listing.maxGuests}`;
  }
  if (event.guestTarget && listing.minGuests && event.guestTarget < listing.minGuests) {
    return `Capacity warning: ${event.guestTarget} guests is below min ${listing.minGuests}`;
  }
  const matchingSlot = (listing.availSlots ?? []).find((slot) => {
    const startsBeforeOrAt = new Date(slot.startAt).getTime() <= event.startAt.getTime();
    const endsAfterOrAt = new Date(slot.endAt).getTime() >= event.endAt.getTime();
    return startsBeforeOrAt && endsAfterOrAt;
  });
  if (matchingSlot?.status === "AVAILABLE") return "Selected event appears available";
  if (matchingSlot) return `Selected event has ${matchingSlot.status.toLowerCase()} calendar status`;
  if ((listing.availSlots ?? []).length === 0) return "Availability not set yet";
  return "Availability needs provider confirmation";
}

export function contractReadinessLabel(org?: OrgProfileLike | null) {
  if (!org || org.profileStatus !== "PUBLISHED") return "Request unavailable until listing is on-platform";
  return "Can receive requests; contract/payment need provider-submitted proposal evidence";
}

export function primaryListingDataFromProfile(input: {
  providerType: "vendor" | "venue";
  businessName: string;
  providerCategory?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  about?: string | null;
  servicesJson?: unknown;
  spacesJson?: unknown;
  mediaJson?: unknown;
}) {
  const type: MarketplaceListingType = input.providerType === "venue" ? "VENUE" : "VENDOR";
  const category = normalizeProviderCategory(input.providerCategory, input.providerType);
  const capacity = firstCapacity(input.providerType === "venue" ? input.spacesJson : input.servicesJson);
  return {
    title: input.businessName,
    type,
    category,
    description: input.about || null,
    email: input.contactEmail || null,
    phone: input.contactPhone || null,
    website: input.website || null,
    city: input.city || null,
    state: input.state || null,
    postalCode: input.postalCode || null,
    country: input.country || "US",
    minGuests: capacity.minGuests,
    maxGuests: capacity.maxGuests,
    coverImageUrl: firstMediaUrl(input.mediaJson),
  };
}

export function formatDateTimeForInput(value?: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function firstCapacity(value: unknown) {
  const items = asProfileList(value, ["services", "packages", "spaces", "rooms"]);
  const mins = items.map((item) => readNumber(item, ["minGuests", "minCapacity", "capacityMin"])).filter(isPositiveNumber);
  const maxes = items.map((item) => readNumber(item, ["maxGuests", "maxCapacity", "capacityMax", "capacity"])).filter(isPositiveNumber);
  return {
    minGuests: mins.length > 0 ? Math.min(...mins) : null,
    maxGuests: maxes.length > 0 ? Math.max(...maxes) : null,
  };
}

function firstMediaUrl(value: unknown) {
  const items = asProfileList(value, ["media", "gallery", "images"]);
  for (const item of items) {
    const url = readString(item, ["url", "src", "imageUrl"]);
    if (url) return url;
  }
  return null;
}

function readPriceCents(item: JsonRecord) {
  const cents = readNumber(item, ["priceCents", "startingPriceCents"]);
  if (typeof cents === "number") return cents;
  const dollars = readNumber(item, ["startingPrice", "price", "priceDollars"]);
  return typeof dollars === "number" ? Math.round(dollars * 100) : null;
}

function readString(item: JsonRecord | null | undefined, keys: string[]) {
  if (!item) return null;
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function readNumber(item: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value.replace(/[^0-9.]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPositiveNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
