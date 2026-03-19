'use client';

import { Calendar, ChevronRight } from 'lucide-react';
import type { EventItem } from '@/lib/types.event';
import type { NavigateToTab, NavigateToEvent } from '@/lib/overview.links';

type Props = {
  events: EventItem[];
  onNavigateToEvent?: NavigateToEvent;
  onNavigateToTab?: NavigateToTab;
};

export function EventVaultMini({ events, onNavigateToEvent, onNavigateToTab }: Props) {
  
  if (events.length === 0) {
    return null;
  }
  
  // Get upcoming events (max 5)
  const now = new Date();
  const upcoming = events
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
  
  if (upcoming.length === 0) {
    return null;
  }
  
  const getProgressChip = (progress: number) => {
    if (progress >= 80) return { label: 'Almost done', color: 'bg-green-100 text-green-700' };
    if (progress >= 50) return { label: 'In progress', color: 'bg-blue-100 text-blue-700' };
    if (progress >= 25) return { label: 'Getting started', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Planning', color: 'bg-slate-100 text-slate-700' };
  };
  
  return (
    <div className="rounded-xl bg-[color:var(--oh-surface)] border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-indigo-600" aria-hidden="true" />
        Upcoming Events
      </h3>
      <div className="space-y-2">
        {upcoming.map(event => {
          const progressChip = getProgressChip(event.progress);
          const eventDate = new Date(event.date);
          return (
            <div
              key={event.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <button
                onClick={() => onNavigateToEvent && onNavigateToEvent(event.id)}
                className="flex-1 flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                aria-label={`Open ${event.name}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-600">
                      {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${progressChip.color} font-medium`}>
                      {progressChip.label}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-900 truncate">{event.name}</div>
                  {event.city && (
                    <div className="text-xs text-slate-500">{event.city}</div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => onNavigateToTab && onNavigateToTab(event.id, 'budget')}
                  className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label={`View budget for ${event.name}`}
                  title="Budget"
                >
                  $
                </button>
                <button
                  onClick={() => onNavigateToTab && onNavigateToTab(event.id, 'guests')}
                  className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label={`View guests for ${event.name}`}
                  title="Guests"
                >
                  👥
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

