'use client';

import { Calendar, CheckSquare, Target, DollarSign } from 'lucide-react';
import type { EventItem } from '@/lib/types.event';
import type { NavigateToTab, NavigateToEvent } from '@/lib/overview.links';
import { getWeekPeekItems } from '@/lib/overview.selectors';

type Props = {
  event: EventItem | null;
  eventId: string | null;
  onNavigateToTab?: NavigateToTab;
  onNavigateToEvent?: NavigateToEvent;
};

export function WeekPeek({ event, eventId, onNavigateToTab, onNavigateToEvent }: Props) {
  if (!event || !eventId) {
    return null;
  }
  
  const items = getWeekPeekItems(event, eventId);
  
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-[color:var(--oh-surface)] border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">This Week</h3>
        <p className="text-sm text-slate-500">No items scheduled for this week.</p>
      </div>
    );
  }
  
  const typeConfig = {
    task: {
      icon: CheckSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    milestone: {
      icon: Target,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    payment: {
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    event: {
      icon: Calendar,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  };
  
  return (
    <div className="rounded-xl bg-[color:var(--oh-surface)] border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">This Week</h3>
      <div className="space-y-2">
        {items.map(item => {
          const config = typeConfig[item.type];
          const Icon = config.icon;
          const date = new Date(item.dateISO);
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.type === 'event' && onNavigateToEvent && eventId) {
                  onNavigateToEvent(eventId);
                } else if (item.tab && onNavigateToTab && eventId) {
                  onNavigateToTab(eventId, item.tab);
                }
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label={`${item.type}: ${item.title}`}
            >
              <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${config.color}`} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-slate-900 truncate">{item.title}</div>
                <div className="text-xs text-slate-500">
                  {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

