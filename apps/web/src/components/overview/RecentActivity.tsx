'use client';

import { Clock } from 'lucide-react';
import type { EventItem } from '@/lib/types.event';
import type { NavigateToTab } from '@/lib/overview.links';
import { getRecentActivity } from '@/lib/overview.selectors';

type Props = {
  event: EventItem | null;
  eventId: string | null;
  onNavigateToTab?: NavigateToTab;
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecentActivity({ event, eventId, onNavigateToTab }: Props) {
  if (!event || !eventId) {
    return null;
  }
  
  const activities = getRecentActivity(event, eventId);
  
  if (activities.length === 0) {
    return (
      <div className="rounded-xl bg-[color:var(--oh-surface)] border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" aria-hidden="true" />
          Recent Activity
        </h3>
        <p className="text-sm text-slate-500">No recent activity.</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-xl bg-[color:var(--oh-surface)] border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-indigo-600" aria-hidden="true" />
        Recent Activity
      </h3>
      <div className="space-y-2">
        {activities.map((activity, idx) => {
          const date = new Date(activity.tsISO);
          const tab = activity.tab;
          const isClickable = !!tab && !!onNavigateToTab;
          
          const content = (
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900">{activity.summary}</p>
                <p className="text-xs text-slate-500 mt-0.5">{timeAgo(date)}</p>
              </div>
            </div>
          );
          
          if (isClickable && tab) {
            return (
              <button
                key={idx}
                onClick={() => onNavigateToTab(eventId, tab)}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label={`${activity.summary}, ${timeAgo(date)}`}
              >
                {content}
              </button>
            );
          }
          
          return (
            <div key={idx} className="p-2">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

