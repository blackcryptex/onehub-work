'use client';

import { Sparkles, FileText, Calculator, Mail } from 'lucide-react';
import type { EventItem } from '@/lib/types.event';
import type { NavigateToTab } from '@/lib/overview.links';
import { getProposalsKPI, getVendorsKPI, getBudgetKPI } from '@/lib/overview.selectors';

type Props = {
  event: EventItem | null;
  eventId: string | null;
  onNavigateToTab?: NavigateToTab;
};

export function SmartActions({ event, eventId, onNavigateToTab }: Props) {
  if (!event || !eventId) {
    return null;
  }
  
  const proposals = getProposalsKPI(event);
  const vendors = getVendorsKPI(event);
  const budget = getBudgetKPI(event);
  
  const actions = [];
  
  // Generate proposals from shortlist
  if (vendors.shortlisted > 0 && proposals.drafts === 0) {
    actions.push({
      id: 'generate-proposals',
      label: 'Generate proposals from shortlist',
      icon: FileText,
      tab: 'proposals',
    });
  }
  
  // Create contracts for accepted proposals
  if (proposals.accepted > 0) {
    actions.push({
      id: 'create-contracts',
      label: 'Create contracts for accepted proposals',
      icon: FileText,
      tab: 'contracts',
    });
  }
  
  // Rebalance budget
  if (budget.remaining < budget.total * 0.2 && budget.total > 0) {
    actions.push({
      id: 'rebalance-budget',
      label: 'Rebalance budget',
      icon: Calculator,
      tab: 'budget',
    });
  }
  
  // Remind guests to RSVP
  if (event.guests && event.guests.length > 0) {
    const rsvpCount = event.guests.filter(g => g.rsvp).length;
    if (rsvpCount < event.guests.length * 0.5) {
      actions.push({
        id: 'remind-guests',
        label: 'Remind guests to RSVP',
        icon: Mail,
        tab: 'guests',
      });
    }
  }
  
  if (actions.length === 0) {
    return null;
  }
  
  const handleClick = (tab: string) => {
    if (onNavigateToTab && eventId) {
      onNavigateToTab(eventId, tab);
    }
  };
  
  return (
    <div className="rounded-xl bg-[color:var(--oh-surface)] border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-600" aria-hidden="true" />
        Smart Actions
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.slice(0, 4).map(action => {
          const Icon = action.icon;
          
          return (
            <button
              key={action.id}
              onClick={() => handleClick(action.tab!)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label={action.label}
            >
              <Icon className="w-4 h-4 text-indigo-600 flex-shrink-0" aria-hidden="true" />
              <span className="text-slate-700">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

