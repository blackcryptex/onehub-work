'use client';

import { Sparkles, ArrowRight } from 'lucide-react';
import type { EventItem } from '@/lib/types.event';
import type { NavigateToTab } from '@/lib/overview.links';
import { getAISuggestions } from '@/lib/overview.selectors';

type Props = {
  event: EventItem | null;
  eventId: string | null;
  onNavigateToTab?: NavigateToTab;
};

export function AiSuggestions({ event, eventId, onNavigateToTab }: Props) {
  if (!event || !eventId) {
    return null;
  }
  
  const suggestions = getAISuggestions(event, eventId);
  
  if (suggestions.length === 0) {
    return null;
  }
  
  return (
    <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-600" aria-hidden="true" />
        AI Suggestions
      </h3>
      <div className="space-y-3">
        {suggestions.map(suggestion => (
          <div
            key={suggestion.id}
            className="bg-white rounded-lg p-3 border border-indigo-100"
          >
            <h4 className="text-sm font-medium text-slate-900 mb-1">{suggestion.title}</h4>
            <p className="text-xs text-slate-600 mb-2">{suggestion.body}</p>
            {suggestion.cta && (
              <button
                onClick={() => {
                  if (suggestion.cta?.tab && suggestion.cta.eventId && onNavigateToTab) {
                    onNavigateToTab(suggestion.cta.eventId, suggestion.cta.tab);
                  }
                }}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                aria-label={suggestion.cta.label}
              >
                {suggestion.cta.label}
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

