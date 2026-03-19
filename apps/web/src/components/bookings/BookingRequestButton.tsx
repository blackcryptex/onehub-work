"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { BookingRequestModal } from "./BookingRequestModal";
import { useSearchParams } from "next/navigation";

interface BookingRequestButtonProps {
  listingId: string;
  listingTitle: string;
}

export function BookingRequestButton({ listingId, listingTitle }: BookingRequestButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") || undefined;

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Request Booking</Button>
      {isOpen && (
        <BookingRequestModal
          listingId={listingId}
          listingTitle={listingTitle}
          eventId={eventId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

