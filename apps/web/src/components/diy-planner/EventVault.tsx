"use client";

import { Calendar } from "lucide-react";
import { EventCard } from "./EventCard";
import type { EventItem } from "@/lib/types";

interface EventVaultProps {
  events: EventItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function EventVault({ events, selectedId, onSelect }: EventVaultProps) {
  // Sort events by date (upcoming first)
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sortedEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-600">No events yet</p>
        <p className="text-xs text-slate-500 mt-1">Create your first event to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedEvents.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          isActive={selectedId === event.id}
          onClick={() => onSelect(event.id)}
        />
      ))}
    </div>
  );
}

