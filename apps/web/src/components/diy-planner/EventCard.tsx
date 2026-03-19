"use client";

import type { EventItem } from "@/lib/types";

interface EventCardProps {
  event: EventItem;
  isActive: boolean;
  onClick: () => void;
}

export function EventCard({ event, isActive, onClick }: EventCardProps) {
  const date = new Date(event.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg transition-all hover:shadow-md ${
        isActive
          ? "bg-indigo-50 border-l-4 border-[color:var(--oh-primary)] border"
          : "bg-[color:var(--oh-surface)] border border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="mb-2">
        <div className="text-xs text-[color:var(--oh-muted)] mb-1">{formattedDate}</div>
        <div className="text-sm font-semibold text-slate-900">{event.name}</div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              event.progress >= 75 ? "bg-green-600" : event.progress >= 50 ? "bg-[color:var(--oh-primary)]" : "bg-amber-600"
            }`}
            style={{ width: `${event.progress}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-900">{event.progress}%</span>
      </div>
    </button>
  );
}
