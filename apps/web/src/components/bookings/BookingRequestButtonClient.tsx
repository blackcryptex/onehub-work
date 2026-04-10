"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { BookingRequestModal } from "./BookingRequestModal";

interface BookingRequestButtonClientProps {
  listingId: string;
  listingTitle: string;
  eventId?: string | null;
  emphasized?: boolean;
}

export function BookingRequestButtonClient({
  listingId,
  listingTitle,
  eventId,
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
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}

