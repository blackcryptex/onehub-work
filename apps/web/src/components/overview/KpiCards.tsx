'use client';

import type { EventItem } from '@/lib/types.event';
import type { NavigateToTab, NavigateToEvent } from '@/lib/overview.links';
import {
  getNextEventKPI,
  getBudgetKPI,
  getTasksKPI,
  getProposalsKPI,
  getContractsKPI,
  getGuestsKPI,
  getVendorsKPI,
  getPaymentsKPI,
} from '@/lib/overview.selectors';

type Props = {
  event: EventItem | null;
  eventId: string | null;
  onNavigateToTab?: NavigateToTab;
  onNavigateToEvent?: NavigateToEvent;
};

export function KpiCards({ event, eventId, onNavigateToTab, onNavigateToEvent }: Props) {
  if (!event || !eventId) {
    return null;
  }
  
  const nextEvent = getNextEventKPI(event);
  const budget = getBudgetKPI(event);
  const tasks = getTasksKPI(event);
  const proposals = getProposalsKPI(event);
  const contracts = getContractsKPI(event);
  const guests = getGuestsKPI(event);
  const vendors = getVendorsKPI(event);
  const payments = getPaymentsKPI(event);
  
  const handleClick = (id: string) => {
    if (!eventId) return;
    
    if (id === 'next-event' && onNavigateToEvent) {
      onNavigateToEvent(eventId);
    } else if (onNavigateToTab) {
      const tabMap: Record<string, string> = {
        'budget': 'budget',
        'tasks': 'tasks',
        'proposals': 'proposals',
        'contracts': 'contracts',
        'guests': 'guests',
        'vendors': 'vendors',
        'payments': 'budget', // payments go to budget
      };
      const tab = tabMap[id];
      if (tab) {
        onNavigateToTab(eventId, tab);
      }
    }
  };
  
  const cards = [
    {
      id: 'next-event',
      title: 'Next Event',
      value: nextEvent ? `${nextEvent.daysToGo} days` : 'N/A',
      caption: nextEvent ? nextEvent.name : 'No upcoming events',
      color: 'indigo',
    },
    {
      id: 'budget',
      title: 'Budget',
      value: `$${budget.remaining.toLocaleString()}`,
      caption: `of $${budget.total.toLocaleString()} ${budget.onTrack ? 'On track' : 'At risk'}`,
      color: budget.onTrack ? 'green' : 'orange',
    },
    {
      id: 'tasks',
      title: 'Tasks',
      value: `${tasks.dueToday} today`,
      caption: `${tasks.dueThisWeek} this week · ${tasks.overdue} overdue`,
      color: tasks.overdue > 0 ? 'red' : 'blue',
    },
    {
      id: 'proposals',
      title: 'Proposals',
      value: `${proposals.drafts + proposals.sent + proposals.pending}`,
      caption: `${proposals.accepted} accepted · ${proposals.rejected} rejected`,
      color: 'purple',
    },
    {
      id: 'contracts',
      title: 'Contracts',
      value: `${contracts.sent + contracts.signed}`,
      caption: `${contracts.signed} signed · ${contracts.draft} draft`,
      color: 'teal',
    },
    {
      id: 'guests',
      title: 'Guests',
      value: `${guests.yes} yes`,
      caption: `${guests.maybe} maybe · ${guests.no} no · ${guests.total} total`,
      color: 'pink',
      progress: guests.total > 0 ? (guests.yes / guests.total) * 100 : 0,
    },
    {
      id: 'vendors',
      title: 'Vendors',
      value: `${vendors.secured} secured`,
      caption: `${vendors.shortlisted} shortlisted · ${vendors.total} total`,
      color: 'amber',
    },
    {
      id: 'payments',
      title: 'Payments',
      value: payments.nextDueISO
        ? new Date(payments.nextDueISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'None',
      caption: payments.overdueCount > 0 ? `${payments.overdueCount} overdue` : 'All current',
      color: payments.overdueCount > 0 ? 'red' : 'slate',
    },
  ];
  
  const colorClasses = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  };
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <button
          key={card.id}
          onClick={() => handleClick(card.id)}
          className={`rounded-xl border p-4 text-left hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 ${colorClasses[card.color as keyof typeof colorClasses]}`}
          aria-label={`${card.title}: ${card.value}`}
        >
          <div className="text-sm font-medium text-slate-600 mb-1">{card.title}</div>
          <div className="text-2xl font-bold mb-1">{card.value}</div>
          <div className="text-xs text-slate-600">{card.caption}</div>
          {card.id === 'guests' && card.progress !== undefined && (
            <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: `${card.progress}%` }}
                aria-label={`${card.progress.toFixed(0)}% confirmed`}
              />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

