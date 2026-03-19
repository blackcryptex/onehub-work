"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { BookingRequestModal } from "./BookingRequestModal";

interface BookingRequestButtonClientProps {
  listingId: string;
  listingTitle: string;
}

export function BookingRequestButtonClient({
  listingId,
  listingTitle,
}: BookingRequestButtonClientProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Request Booking</Button>
      {isOpen && (
        <BookingRequestModal
          listingId={listingId}
          listingTitle={listingTitle}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

