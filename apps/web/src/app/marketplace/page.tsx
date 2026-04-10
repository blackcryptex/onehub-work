import { ListingCard } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { Card, Button } from "@/components/ui";
import Link from "next/link";
import { LandingHeader } from "@/components/layout/LandingHeader";

interface MarketplacePageProps {
  searchParams?: {
    eventId?: string;
    eventSlug?: string;
    eventName?: string;
    returnTo?: string;
  };
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const listings = await prisma.listing.findMany({ 
    take: 20, 
    include: { tags: true, gallery: { take: 1 } },
    orderBy: { createdAt: "desc" }
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
              {listings.map((l) => (
                <Link key={l.id} href={`/marketplace/${l.slug}${listingSuffix}`}>
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

