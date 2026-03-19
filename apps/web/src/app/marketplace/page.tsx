import { ListingCard } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import Link from "next/link";
import { LandingHeader } from "@/components/layout/LandingHeader";

export default async function MarketplacePage() {
  const listings = await prisma.listing.findMany({ 
    take: 20, 
    include: { tags: true, gallery: { take: 1 } },
    orderBy: { createdAt: "desc" }
  });
  
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
          
          {listings.length === 0 ? (
            <Card className="p-12 text-center">
              <h2 className="text-xl font-semibold mb-2">No listings yet</h2>
              <p className="text-slate-600 mb-6">Be the first to list your service!</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <Link key={l.id} href={`/marketplace/${l.slug}`}>
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

