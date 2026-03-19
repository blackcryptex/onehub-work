import { Card, MediaGrid, Stars, AvailabilityCalendar } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { BookingRequestButtonClient } from "@/components/bookings/BookingRequestButtonClient";

export default async function ListingProfile({ params }: { params: { slug: string } }) {
  const listing = await prisma.listing.findUnique({
    where: { slug: params.slug },
    include: { tags: true, gallery: true, offers: true, availSlots: { orderBy: { startAt: "asc" } }, reviews: { where: { flagged: false }, take: 5, include: { author: true } } },
  });
  if (!listing) return notFound();
  const availability = listing.availSlots.map((slot) => ({
    id: slot.id,
    startAt: slot.startAt,
    endAt: slot.endAt,
    status: slot.status,
  }));
  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{listing.title}</h1>
        <div className="mt-1 flex items-center gap-4 text-sm text-slate-600">
          {listing.city && <span>{listing.city}, {listing.state}</span>}
          {listing.ratingAvg > 0 && <Stars rating={listing.ratingAvg} />}
        </div>
      </div>
      {listing.coverImageUrl && (
        <img src={listing.coverImageUrl} alt={listing.title} className="h-64 w-full rounded-2xl object-cover" />
      )}
      {listing.gallery && listing.gallery.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Gallery</h2>
          <MediaGrid items={listing.gallery} />
        </Card>
      )}
      {listing.description && (
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">About</h2>
          <p className="text-sm text-slate-700">{listing.description}</p>
        </Card>
      )}
      {listing.tags && listing.tags.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {listing.tags.map((t) => (
              <span key={t.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs">{t.value}</span>
            ))}
          </div>
        </Card>
      )}
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Availability</h2>
        <AvailabilityCalendar slots={availability} />
        <div className="mt-4">
          <BookingRequestButtonClient listingId={listing.id} listingTitle={listing.title} />
        </div>
      </Card>
      {listing.reviews && listing.reviews.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Reviews</h2>
          <div className="space-y-3">
            {listing.reviews.map((r) => (
              <div key={r.id} className="border-t pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} />
                  <span className="text-sm font-medium">{r.author?.name}</span>
                </div>
                {r.title && <div className="mt-1 font-medium">{r.title}</div>}
                {r.body && <div className="mt-1 text-sm text-slate-600">{r.body}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}
        </div>
      </main>
    </>
  );
}

