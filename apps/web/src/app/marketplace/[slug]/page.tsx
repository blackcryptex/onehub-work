import { Card, MediaGrid, Stars, AvailabilityCalendar, Button } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { BookingRequestButtonClient } from "@/components/bookings/BookingRequestButtonClient";
import { AddToShortlistButtonClient } from "@/components/shortlist/AddToShortlistButtonClient";
import Link from "next/link";
import { safeInternalReturnTo } from "@/lib/routes";

interface ListingProfileProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    eventId?: string;
    eventSlug?: string;
    eventName?: string;
    returnTo?: string;
  }>;
}

export default async function ListingProfile({ params, searchParams }: ListingProfileProps) {
  const resolvedSearchParams = await searchParams;
  const resolvedParams = await params;
  const listing = await prisma.listing.findUnique({
    where: { slug: resolvedParams.slug },
    include: { tags: true, gallery: true, offers: true, availSlots: { orderBy: { startAt: "asc" } }, reviews: { where: { flagged: false }, take: 5, include: { author: true } } },
  });
  if (!listing) return notFound();

  const eventId = resolvedSearchParams?.eventId;
  const eventName = resolvedSearchParams?.eventName;
  const returnTo = safeInternalReturnTo(resolvedSearchParams?.returnTo);
  const availability = listing.availSlots.map((slot: { id: string; startAt: Date; endAt: Date; status: string }) => ({
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
      {eventId && eventName ? (
        <Card className="border-indigo-200 bg-indigo-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-indigo-950">Viewing this listing for {eventName}</div>
              <div className="text-sm text-indigo-700">
                Add it to your shortlist or send a booking request directly against this event.
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
            {listing.tags.map((t: { id: string; value: string }) => (
              <span key={t.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs">{t.value}</span>
            ))}
          </div>
        </Card>
      )}
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Availability</h2>
        <AvailabilityCalendar slots={availability} />
        <div className="mt-4 flex flex-wrap gap-3">
          {eventId ? (
            <AddToShortlistButtonClient eventId={eventId} listingId={listing.id} />
          ) : null}
          <BookingRequestButtonClient listingId={listing.id} listingTitle={listing.title} eventId={eventId} emphasized={Boolean(eventId)} />
        </div>
        {eventId ? (
          <p className="mt-3 text-xs text-slate-500">
            Booking requests from this page will be linked to {eventName ?? "your selected event"}.
          </p>
        ) : (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Select or create an event to shortlist or request booking.
          </div>
        )}
      </Card>
      {listing.reviews && listing.reviews.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Reviews</h2>
          <div className="space-y-3">
            {listing.reviews.map((r: { id: string; rating: number; title?: string | null; body?: string | null; author?: { name?: string | null } | null }) => (
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


