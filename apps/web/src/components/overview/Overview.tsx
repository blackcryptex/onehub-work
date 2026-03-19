'use client';

import type { EventItem } from '@/lib/types.event';
import type { NavigateToTab, NavigateToEvent } from '@/lib/overview.links';
import { getCurrentEvent, getPriorityAlerts } from '@/lib/overview.selectors';
import { KpiCards } from './KpiCards';
import { PriorityAlerts } from './PriorityAlerts';
import { SmartActions } from './SmartActions';
import { EventVaultMini } from './EventVaultMini';
import { WeekPeek } from './WeekPeek';
import { AiSuggestions } from './AiSuggestions';
import { RecentActivity } from './RecentActivity';
import { EmptyStateOnboarding } from './EmptyStateOnboarding';

type Props = {
  events: EventItem[];
  selectedEventId: string | null;
  onCreateEvent?: () => void;
  onNavigateToTab?: NavigateToTab;
  onNavigateToEvent?: NavigateToEvent;
};

export function Overview({ 
  events, 
  selectedEventId, 
  onCreateEvent,
  onNavigateToTab,
  onNavigateToEvent,
}: Props) {
  const currentEvent = getCurrentEvent({ events, selectedEventId });
  const alerts = currentEvent ? getPriorityAlerts(currentEvent, selectedEventId) : [];
  
  // Show onboarding if no events
  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyStateOnboarding onCreateEvent={onCreateEvent || (() => {})} />
      </div>
    );
  }
  
  // Show overview content
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">At a Glance</h2>
        <KpiCards 
          event={currentEvent} 
          eventId={selectedEventId}
          onNavigateToTab={onNavigateToTab}
          onNavigateToEvent={onNavigateToEvent}
        />
      </div>
      
      {/* Priority Alerts */}
      {alerts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Priority Alerts</h2>
          <PriorityAlerts 
            alerts={alerts}
            onNavigateToTab={onNavigateToTab}
          />
        </div>
      )}
      
      {/* Smart Actions */}
      <div>
        <SmartActions 
          event={currentEvent} 
          eventId={selectedEventId}
          onNavigateToTab={onNavigateToTab}
        />
      </div>
      
      {/* Main Grid: Event Vault, Week Peek, AI Suggestions, Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <EventVaultMini 
            events={events} 
            onNavigateToEvent={onNavigateToEvent}
            onNavigateToTab={onNavigateToTab}
          />
          <WeekPeek 
            event={currentEvent} 
            eventId={selectedEventId}
            onNavigateToTab={onNavigateToTab}
          />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          <AiSuggestions 
            event={currentEvent} 
            eventId={selectedEventId}
            onNavigateToTab={onNavigateToTab}
          />
          <RecentActivity 
            event={currentEvent} 
            eventId={selectedEventId}
            onNavigateToTab={onNavigateToTab}
          />
        </div>
      </div>
    </div>
  );
}

