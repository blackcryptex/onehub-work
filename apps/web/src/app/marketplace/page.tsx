import { ListingCard } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { Card, Button } from "@/components/ui";
import Link from "next/link";
import { safeInternalReturnTo } from "@/lib/routes";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import {
  MARKETPLACE_LISTING_CATEGORIES,
  contractReadinessLabel,
  formatListingCategory,
  formatListingType,
  responseSignal,
  selectedEventFitLabel,
  startingPriceLabel,
  verificationBadge,
  type MarketplaceEventContext,
} from "@/lib/marketplace-profile";

interface MarketplacePageProps {
  searchParams?: Promise<{
    eventId?: string;
    eventSlug?: string;
    eventName?: string;
    eventDate?: string;
    guests?: string;
    location?: string;
    budget?: string;
    type?: string;
    category?: string;
    verified?: string;
    returnTo?: string;
  }>;
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentUser();
  const selectedCategory = MARKETPLACE_LISTING_CATEGORIES.find((category) => category === resolvedSearchParams?.category);
  const selectedType = resolvedSearchParams?.type === "VENDOR" || resolvedSearchParams?.type === "VENUE" ? resolvedSearchParams.type : undefined;
  const location = resolvedSearchParams?.location?.trim();
  const eventId = resolvedSearchParams?.eventId;
  const returnTo = safeInternalReturnTo(resolvedSearchParams?.returnTo);
  const selectedEvent = eventId && user
    ? await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        org: {
          select: {
            ownerId: true,
            members: { select: { userId: true, role: true } },
          },
        },
      },
    })
    : null;
  const eventContext: MarketplaceEventContext | null = selectedEvent && canManageEvent(user, selectedEvent)
    ? {
      id: selectedEvent.id,
      slug: selectedEvent.slug,
      name: selectedEvent.name,
      startAt: selectedEvent.startAt,
      endAt: selectedEvent.endAt,
      venueCity: selectedEvent.venueCity,
      venueState: selectedEvent.venueState,
      guestTarget: selectedEvent.guestTarget,
      budgetCents: selectedEvent.budgetCents,
      eventType: selectedEvent.eventTypeCanonical ?? selectedEvent.eventTypeRaw ?? selectedEvent.type,
    }
    : null;
  const listings = await prisma.listing.findMany({ 
    take: 20, 
    where: {
      ...(selectedType ? { type: selectedType } : {}),
      ...(selectedCategory ? { category: selectedCategory } : {}),
      ...(resolvedSearchParams?.verified === "on-platform" ? { org: { profileStatus: "PUBLISHED" } } : {}),
      ...(location
        ? {
          OR: [
            { city: { contains: location, mode: "insensitive" as const } },
            { state: { contains: location, mode: "insensitive" as const } },
            { org: { city: { contains: location, mode: "insensitive" as const } } },
            { org: { state: { contains: location, mode: "insensitive" as const } } },
          ],
        }
        : {}),
    },
    include: { org: true, tags: true, gallery: { take: 1 }, offers: true, availSlots: true },
    orderBy: { createdAt: "desc" }
  });

  const eventContextLabel = eventContext?.name;
  const listingQuery = new URLSearchParams();
  if (eventContext) {
    listingQuery.set("eventId", eventContext.id);
    if (eventContext.slug) listingQuery.set("eventSlug", eventContext.slug);
    listingQuery.set("eventName", eventContext.name);
    listingQuery.set("eventDate", eventContext.startAt.toISOString());
    if (eventContext.guestTarget) listingQuery.set("guests", String(eventContext.guestTarget));
  }
  if (location) listingQuery.set("location", location);
  if (resolvedSearchParams?.budget) listingQuery.set("budget", resolvedSearchParams.budget);
  if (eventContext && returnTo) listingQuery.set("returnTo", returnTo);
  const listingSuffix = listingQuery.toString() ? `?${listingQuery.toString()}` : "";
  
  return (
    <>
      <LandingHeader currentUser={user} />
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Vendor &amp; Venue Marketplace</h1>
              <p className="text-slate-600 mt-1">Discover vendors and venues for your events</p>
            </div>
          </div>

          <Card className="p-4">
            <form className="grid gap-3 md:grid-cols-5" action="/marketplace">
              {eventContext ? <input type="hidden" name="eventId" value={eventContext.id} /> : null}
              {eventContext?.slug ? <input type="hidden" name="eventSlug" value={eventContext.slug} /> : null}
              {eventContext ? <input type="hidden" name="eventName" value={eventContext.name} /> : null}
              {eventContext && returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
              <label className="text-sm font-medium text-slate-700">
                Type
                <select name="type" defaultValue={selectedType ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">All</option>
                  <option value="VENDOR">Vendors</option>
                  <option value="VENUE">Venues</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Category
                <select name="category" defaultValue={selectedCategory ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">All categories</option>
                  {MARKETPLACE_LISTING_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{formatListingCategory(category)}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Location
                <input name="location" defaultValue={location ?? ""} placeholder="City or state" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Trust
                <select name="verified" defaultValue={resolvedSearchParams?.verified ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">All</option>
                  <option value="on-platform">On-platform profiles</option>
                </select>
              </label>
              <div className="flex items-end">
                <Button type="submit" className="w-full">Filter marketplace</Button>
              </div>
            </form>
          </Card>

          {eventContextLabel ? (
            <Card className="border-indigo-200 bg-indigo-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-indigo-950">Browsing for {eventContextLabel}</div>
                  <div className="text-sm text-indigo-700">
                    Open a listing to add it to this event’s shortlist or send a booking request with the event pre-selected.
                    {eventContext?.guestTarget ? ` Guest fit uses ${eventContext.guestTarget} guests.` : ""}
                  </div>
                </div>
                {returnTo ? (
                  <Button asChild variant="secondary">
                    <Link href={returnTo}>Back to event</Link>
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}
          
          {listings.length === 0 ? (
            <Card className="p-12 text-center">
              <h2 className="text-xl font-semibold mb-2">No listings yet</h2>
              <p className="text-slate-600 mb-6">Be the first to list your service!</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => {
                const badge = verificationBadge(l.org);
                return (
                <Link key={l.id} href={`/marketplace/${l.slug}${listingSuffix}`}>
                  <ListingCard 
                    title={l.title} 
                    city={l.city} 
                    state={l.state}
                    ratingAvg={l.ratingAvg} 
                    ratingCount={l.ratingCount}
                    priceTier={l.priceTier} 
                    typeLabel={formatListingType(l.type)}
                    categoryLabel={formatListingCategory(l.category)}
                    verificationLabel={badge.label}
                    verificationDescription={badge.description}
                    availabilityLabel={selectedEventFitLabel(l, eventContext)}
                    responseLabel={responseSignal(l.org)}
                    startingPriceLabel={startingPriceLabel(l)}
                    contractReadinessLabel={contractReadinessLabel(l.org)}
                    ctaLabel={eventContext ? "View details, shortlist, or request" : "View trusted profile"}
                  />
                </Link>
              );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

