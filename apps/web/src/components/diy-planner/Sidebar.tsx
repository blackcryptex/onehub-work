"use client";

import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { EventCard } from "./EventCard";
import type { EventItem } from "@/lib/types";

interface SidebarProps {
  events: EventItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function Sidebar({ events, selectedId, onSelect, onCreate }: SidebarProps) {
  // Sort events by date ascending
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <aside className="w-64 bg-[color:var(--oh-sidebar)] text-white lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto">
      <div className="p-4 flex flex-col gap-4">
        {/* Create Event Button */}
        <Button 
          onClick={onCreate} 
          className="w-full bg-[color:var(--oh-primary)] hover:bg-[color:var(--oh-primary-700)] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>

        {/* Dashboard Label */}
        <div className="px-3 py-2 text-sm font-medium text-[color:var(--oh-muted)] opacity-70">
          Dashboard
        </div>

        {/* Event Vault Section */}
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white mb-3 px-3">Event Vault</h2>
          
          {/* Event Cards List */}
          <div className="space-y-2">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-8 px-3">
                <p className="text-sm text-[color:var(--oh-muted)] opacity-70">
                  No events yet. Create your first event!
                </p>
              </div>
            ) : (
              sortedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isActive={selectedId === event.id}
                  onClick={() => onSelect(event.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
