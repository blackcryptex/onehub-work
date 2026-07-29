import { ListingCard } from "@onehub/ui";
import { ListingCategory, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { Card, Button } from "@/components/ui";
import Link from "next/link";
import type { Route } from "next";
import { LandingHeader } from "@/components/layout/LandingHeader";

interface MarketplacePageProps {
  searchParams?: Promise<{
    eventId?: string;
    eventSlug?: string;
    eventName?: string;
    returnTo?: string;
    q?: string;
    category?: string;
    city?: string;
    availableStart?: string;
    availableEnd?: string;
    sort?: string;
  }>;
}

const MARKETPLACE_CATEGORIES = Object.values(ListingCategory);

export default async function MarketplacePage(props: MarketplacePageProps) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q?.trim();
  const city = searchParams?.city?.trim();
  const availableStart = searchParams?.availableStart ? new Date(searchParams.availableStart) : null;
  const availableEnd = searchParams?.availableEnd ? new Date(searchParams.availableEnd) : null;
  const validAvailabilityRange =
    availableStart &&
    availableEnd &&
    !Number.isNaN(availableStart.getTime()) &&
    !Number.isNaN(availableEnd.getTime()) &&
    availableEnd > availableStart;
  const category = MARKETPLACE_CATEGORIES.includes(searchParams?.category as ListingCategory)
    ? (searchParams?.category as ListingCategory)
    : undefined;

  const where: Prisma.ListingWhereInput = {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { tags: { some: { value: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(validAvailabilityRange
      ? {
          availSlots: {
            some: {
              status: "AVAILABLE",
              startAt: { lte: availableStart },
              endAt: { gte: availableEnd },
            },
          },
        }
      : {}),
  };

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    searchParams?.sort === "rating"
      ? { ratingAvg: "desc" }
      : searchParams?.sort === "price"
        ? { priceTier: "asc" }
        : { createdAt: "desc" };

  const listings = await db.listing.findMany({ 
    where,
    take: 20, 
    include: { tags: true, gallery: { take: 1 } },
    orderBy,
  });

  const eventId = searchParams?.eventId;
  const eventSlug = searchParams?.eventSlug;
  const eventName = searchParams?.eventName;
  const returnTo = searchParams?.returnTo;
  const listingQuery = new URLSearchParams();
  if (eventId) listingQuery.set("eventId", eventId);
  if (eventSlug) listingQuery.set("eventSlug", eventSlug);
  if (eventName) listingQuery.set("eventName", eventName);
  if (returnTo) listingQuery.set("returnTo", returnTo);
  for (const key of ["q", "category", "city", "availableStart", "availableEnd", "sort"] as const) {
    const value = searchParams?.[key];
    if (value) listingQuery.set(key, value);
  }
  const listingSuffix = listingQuery.toString() ? `?${listingQuery.toString()}` : "";

  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Vendor &amp; Venue Marketplace</h1>
              <p className="text-slate-600 mt-1">Discover vendors and venues for your events</p>
            </div>
          </div>

          {eventId && eventName ? (
            <Card className="border-indigo-200 bg-indigo-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-indigo-950">Browsing for {eventName}</div>
                  <div className="text-sm text-indigo-700">
                    Open a listing to add it to this event’s shortlist or send a booking request with the event pre-selected.
                  </div>
                </div>
                {returnTo ? (
                  <Button asChild variant="secondary">
                    <Link href={returnTo as Route}>Back to event</Link>
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card className="p-4">
            <form className="grid gap-3 md:grid-cols-6" action="/marketplace">
              {eventId ? <input type="hidden" name="eventId" value={eventId} /> : null}
              {eventSlug ? <input type="hidden" name="eventSlug" value={eventSlug} /> : null}
              {eventName ? <input type="hidden" name="eventName" value={eventName} /> : null}
              {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">Keyword</span>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="catering, photography, venue"
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-600">Category</span>
                <select
                  name="category"
                  defaultValue={category ?? ""}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="">All</option>
                  {MARKETPLACE_CATEGORIES.map((option) => (
                    <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-600">City</span>
                <input
                  name="city"
                  defaultValue={city}
                  placeholder="Los Angeles"
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-600">Available from</span>
                <input
                  type="date"
                  name="availableStart"
                  defaultValue={searchParams?.availableStart}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-600">Available to</span>
                <input
                  type="date"
                  name="availableEnd"
                  defaultValue={searchParams?.availableEnd}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-600">Sort</span>
                <select
                  name="sort"
                  defaultValue={searchParams?.sort ?? "newest"}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="newest">Newest</option>
                  <option value="rating">Rating</option>
                  <option value="price">Price</option>
                </select>
              </label>
              <div className="flex items-end gap-2 md:col-span-5">
                <Button type="submit">Filter marketplace</Button>
                <Button asChild variant="secondary">
                  <Link href={eventId ? (`/marketplace?${new URLSearchParams({ eventId, ...(eventSlug ? { eventSlug } : {}), ...(eventName ? { eventName } : {}), ...(returnTo ? { returnTo } : {}) }).toString()}` as Route) : "/marketplace"}>Clear filters</Link>
                </Button>
              </div>
            </form>
          </Card>
          
          {listings.length === 0 ? (
            <Card className="p-12 text-center">
              <h2 className="text-xl font-semibold mb-2">No listings yet</h2>
              <p className="text-slate-600 mb-6">Be the first to list your service!</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <Link key={l.id} href={`/marketplace/${l.slug}${listingSuffix}` as Route}>
                  <ListingCard 
                    title={l.title} 
                    city={l.city} 
                    ratingAvg={l.ratingAvg} 
                    priceTier={l.priceTier} 
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

