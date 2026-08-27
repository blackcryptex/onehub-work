import { Card, MediaGrid, Stars, AvailabilityCalendar, Button } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { BookingRequestButtonClient } from "@/components/bookings/BookingRequestButtonClient";
import { AddToShortlistButtonClient } from "@/components/shortlist/AddToShortlistButtonClient";
import Link from "next/link";
import { safeInternalReturnTo } from "@/lib/routes";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import {
  asProfileList,
  contractReadinessLabel,
  formatCents,
  formatDateTimeForInput,
  formatListingCategory,
  formatListingType,
  profileCompleteness,
  responseSignal,
  selectedEventFitLabel,
  startingPriceLabel,
  verificationBadge,
  type MarketplaceEventContext,
} from "@/lib/marketplace-profile";

interface ListingProfileProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    eventId?: string;
    eventSlug?: string;
    eventName?: string;
    eventDate?: string;
    guests?: string;
    location?: string;
    budget?: string;
    returnTo?: string;
  }>;
}

export default async function ListingProfile({ params, searchParams }: ListingProfileProps) {
  const resolvedSearchParams = await searchParams;
  const resolvedParams = await params;
  const user = await getCurrentUser();
  const listing = await prisma.listing.findUnique({
    where: { slug: resolvedParams.slug },
    include: {
      org: true,
      tags: true,
      gallery: true,
      offers: true,
      availSlots: { orderBy: { startAt: "asc" } },
      reviews: { where: { flagged: false }, take: 5, include: { author: true } },
    },
  });
  if (!listing) return notFound();

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
  const eventContextLabel = eventContext?.name;
  const availability = listing.availSlots.map((slot: { id: string; startAt: Date; endAt: Date; status: string }) => ({
    id: slot.id,
    startAt: slot.startAt,
    endAt: slot.endAt,
    status: slot.status,
  }));
  const badge = verificationBadge(listing.org);
  const completeness = profileCompleteness(listing.org);
  const serviceItems = asProfileList(listing.org.servicesJson, ["services", "packages"]);
  const spaceItems = asProfileList(listing.org.spacesJson, ["spaces", "rooms"]);
  const paymentProfile = listing.org.paymentsJson && typeof listing.org.paymentsJson === "object" ? listing.org.paymentsJson as Record<string, unknown> : null;
  const availabilityProfile = listing.org.availabilityJson && typeof listing.org.availabilityJson === "object" ? listing.org.availabilityJson as Record<string, unknown> : null;
  const locationLabel = [listing.city ?? listing.org.city, listing.state ?? listing.org.state].filter(Boolean).join(", ");
  const eventReturnHref = eventContext ? returnTo ?? (eventContext.slug ? `/pro/planner/vault/${eventContext.slug}` : null) : null;

  return (
    <>
      <LandingHeader currentUser={user} />
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="space-y-6">
          {eventContextLabel ? (
            <Card className="border-indigo-200 bg-indigo-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-indigo-950">Viewing this listing for {eventContextLabel}</div>
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
            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span>{formatListingType(listing.type)} • {formatListingCategory(listing.category)}</span>
              {locationLabel ? <span>{locationLabel}</span> : null}
              {listing.ratingAvg > 0 && <Stars rating={listing.ratingAvg} />}
              <span>{listing.ratingCount} review{listing.ratingCount === 1 ? "" : "s"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span title={badge.description} className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">{badge.label}</span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">{completeness.label}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{responseSignal(listing.org)}</span>
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

          {(listing.description || listing.org.about) && (
            <Card className="p-4">
              <h2 className="mb-2 font-semibold">About</h2>
              {listing.description ? <p className="text-sm text-slate-700">{listing.description}</p> : null}
              {listing.org.about && listing.org.about !== listing.description ? (
                <p className="mt-3 text-sm text-slate-700">{listing.org.about}</p>
              ) : null}
            </Card>
          )}

          <Card className="p-4">
            <h2 className="mb-3 font-semibold">Trust and request readiness</h2>
            <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              <div>
                <div className="font-medium text-slate-900">Verification</div>
                <p>{badge.description}</p>
              </div>
              <div>
                <div className="font-medium text-slate-900">Contract/payment readiness</div>
                <p>{contractReadinessLabel(listing.org)}</p>
              </div>
              <div>
                <div className="font-medium text-slate-900">Provider contact</div>
                <p>{listing.org.contactEmail ?? listing.email ?? "Contact email available after request"}</p>
                <p>{listing.org.contactPhone ?? listing.phone ?? "Phone not listed"}</p>
              </div>
              <div>
                <div className="font-medium text-slate-900">Last updated</div>
                <p>{new Date(listing.updatedAt).toLocaleDateString()} listing • {new Date(listing.org.updatedAt).toLocaleDateString()} profile</p>
              </div>
            </div>
          </Card>

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

          {(listing.offers.length > 0 || serviceItems.length > 0 || spaceItems.length > 0) ? (
            <Card className="p-4">
              <h2 className="mb-3 font-semibold">Packages, services, and spaces</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {listing.offers.map((offer) => (
                  <div key={offer.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="font-medium text-slate-900">{offer.name}</div>
                    {offer.description ? <p className="mt-1 text-sm text-slate-600">{offer.description}</p> : null}
                    <p className="mt-2 text-sm font-medium text-slate-800">{offer.priceCents ? `${formatCents(offer.priceCents)}${offer.unit ? ` / ${offer.unit}` : ""}` : "Quote required"}</p>
                  </div>
                ))}
                {[...serviceItems, ...spaceItems].map((item, index) => {
                  const name = typeof item.name === "string" ? item.name : typeof item.title === "string" ? item.title : `Profile item ${index + 1}`;
                  const description = typeof item.description === "string" ? item.description : typeof item.notes === "string" ? item.notes : null;
                  const price = typeof item.priceCents === "number" ? item.priceCents : typeof item.startingPrice === "number" ? item.startingPrice * 100 : null;
                  const max = typeof item.maxCapacity === "number" ? item.maxCapacity : typeof item.maxGuests === "number" ? item.maxGuests : null;
                  return (
                    <div key={`${name}-${index}`} className="rounded-lg border border-slate-200 p-3">
                      <div className="font-medium text-slate-900">{name}</div>
                      {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                        {price ? <span>{formatCents(price)} starting</span> : null}
                        {max ? <span>Up to {max} guests</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          <Card className="p-4">
            <h2 className="mb-3 font-semibold">Availability</h2>
            <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <div className="font-medium text-slate-900">{selectedEventFitLabel(listing, eventContext)}</div>
              {eventContext ? (
                <div className="mt-1">
                  {eventContext.name} • {eventContext.startAt.toLocaleDateString()} • {eventContext.guestTarget ?? "unknown"} guests
                  {eventContext.venueCity ? ` • ${eventContext.venueCity}${eventContext.venueState ? `, ${eventContext.venueState}` : ""}` : ""}
                </div>
              ) : null}
              {availabilityProfile ? <div className="mt-1">Availability rules are on file from the provider profile.</div> : null}
              <div className="mt-1">{startingPriceLabel(listing)}</div>
            </div>
            <AvailabilityCalendar slots={availability} />
            <div className="mt-4 flex flex-wrap gap-3">
              {eventContext ? (
                <AddToShortlistButtonClient eventId={eventContext.id} listingId={listing.id} />
              ) : null}
              <BookingRequestButtonClient
                listingId={listing.id}
                listingTitle={listing.title}
                eventId={eventContext?.id}
                eventName={eventContext?.name}
                eventStartAt={formatDateTimeForInput(eventContext?.startAt)}
                eventEndAt={formatDateTimeForInput(eventContext?.endAt)}
                eventGuests={eventContext?.guestTarget ?? null}
                eventLocation={eventContext?.venueCity ? `${eventContext.venueCity}${eventContext.venueState ? `, ${eventContext.venueState}` : ""}` : null}
                eventReturnHref={eventReturnHref}
                responseLabel={responseSignal(listing.org)}
                emphasized={Boolean(eventContext)}
              />
            </div>
            {eventContext ? (
              <p className="mt-3 text-xs text-slate-500">
                Booking requests from this page will be linked to {eventContext.name}.
              </p>
            ) : (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Select or create an event to shortlist or request booking.
              </div>
            )}
          </Card>

          {paymentProfile ? (
            <Card className="p-4">
              <h2 className="mb-3 font-semibold">Policies</h2>
              <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                {Object.entries(paymentProfile).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium text-slate-900">{key.replace(/([A-Z])/g, " $1")}: </span>
                    <span>{typeof value === "string" || typeof value === "number" ? value : "On file"}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

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
