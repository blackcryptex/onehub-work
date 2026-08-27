"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { BookingRequestModal } from "./BookingRequestModal";

interface BookingRequestButtonClientProps {
  listingId: string;
  listingTitle: string;
  eventId?: string | null;
  eventName?: string | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  eventGuests?: number | null;
  eventLocation?: string | null;
  eventReturnHref?: string | null;
  responseLabel?: string | null;
  emphasized?: boolean;
}

export function BookingRequestButtonClient({
  listingId,
  listingTitle,
  eventId,
  eventName,
  eventStartAt,
  eventEndAt,
  eventGuests,
  eventLocation,
  eventReturnHref,
  responseLabel,
  emphasized = false,
}: BookingRequestButtonClientProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)} disabled={!eventId} variant={emphasized ? "default" : "secondary"}>
        {eventId ? "Request booking for this event" : "Request from event workspace"}
      </Button>
      {isOpen ? (
        <BookingRequestModal
          listingId={listingId}
          listingTitle={listingTitle}
          eventId={eventId}
          eventName={eventName}
          eventStartAt={eventStartAt}
          eventEndAt={eventEndAt}
          eventGuests={eventGuests}
          eventLocation={eventLocation}
          eventReturnHref={eventReturnHref}
          responseLabel={responseLabel}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}

