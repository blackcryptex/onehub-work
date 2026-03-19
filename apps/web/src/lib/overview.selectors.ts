/**
 * Pure selector functions for Overview dashboard
 * Computes KPIs, alerts, and data summaries from event data
 */

import type { 
  EventItem
} from './types.event';

type OverviewInput = {
  events: EventItem[];
  selectedEventId: string | null;
};

type NextEvent = {
  name: string;
  dateISO: string;
  city?: string;
  daysToGo: number;
};

type BudgetKPI = {
  total: number;
  plannedSum: number;
  projectedSum: number;
  actualSum: number;
  remaining: number;
  onTrack: boolean;
};

type TasksKPI = {
  dueToday: number;
  dueThisWeek: number;
  overdue: number;
};

type ProposalsKPI = {
  drafts: number;
  sent: number;
  pending: number;
  accepted: number;
  rejected: number;
};

type ContractsKPI = {
  draft: number;
  sent: number;
  signed: number;
  completed: number;
  rejected: number;
};

type GuestsKPI = {
  yes: number;
  maybe: number;
  no: number;
  total: number;
};

type VendorsKPI = {
  secured: number;
  shortlisted: number;
  total: number;
};

type PaymentsKPI = {
  nextDueISO?: string;
  overdueCount: number;
};

type Alert = {
  severity: 'info' | 'warn' | 'error';
  message: string;
  cta?: { label: string; href: string; tab?: string; eventId?: string };
};

type WeekPeekItem = {
  id: string;
  type: 'task' | 'milestone' | 'payment' | 'event';
  title: string;
  dateISO: string;
  href: string;
  tab?: string;
};

type RecentActivityItem = {
  tsISO: string;
  summary: string;
  href?: string;
  tab?: string;
};

type AISuggestion = {
  id: string;
  title: string;
  body: string;
  cta?: { label: string; href: string; tab?: string; eventId?: string };
};

/**
 * Get current event (closest upcoming or last edited)
 */
export function getCurrentEvent(input: OverviewInput): EventItem | null {
  const { events, selectedEventId } = input;
  
  if (selectedEventId) {
    const found = events.find(e => e.id === selectedEventId);
    if (found) return found;
  }
  
  // Find closest upcoming event
  const now = new Date();
  const upcoming = events
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (upcoming.length > 0) return upcoming[0] || null;
  
  // Fallback to most recent
  return events.length > 0 
    ? (events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null)
    : null;
}

/**
 * Get upcoming events (max 5)
 */
export function getUpcomingEvents(input: OverviewInput): EventItem[] {
  const { events } = input;
  const now = new Date();
  
  return events
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
}

/**
 * Compute Next Event KPI
 */
export function getNextEventKPI(event: EventItem | null): NextEvent | null {
  if (!event) return null;
  
  const eventDate = new Date(event.date);
  const now = new Date();
  const daysToGo = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    name: event.name,
    dateISO: event.date,
    city: event.city,
    daysToGo: Math.max(0, daysToGo),
  };
}

/**
 * Compute Budget KPI
 */
export function getBudgetKPI(event: EventItem | null): BudgetKPI {
  if (!event?.budget) {
    return {
      total: 0,
      plannedSum: 0,
      projectedSum: 0,
      actualSum: 0,
      remaining: 0,
      onTrack: true,
    };
  }
  
  const budget = event.budget;
  const total = budget.total || 0;
  const allocations = budget.allocations || [];
  
  const plannedSum = allocations.reduce((sum, a) => sum + (a.planned || 0), 0);
  const projectedSum = allocations.reduce((sum, a) => sum + (a.projected || 0), 0);
  const actualSum = allocations.reduce((sum, a) => sum + (a.actual || 0), 0);
  
  const spent = actualSum > 0 ? actualSum : projectedSum;
  const remaining = total - spent;
  const onTrack = remaining >= 0 && (spent / total) < 1.1; // Allow 10% overage
  
  return {
    total,
    plannedSum,
    projectedSum,
    actualSum,
    remaining,
    onTrack,
  };
}

/**
 * Compute Tasks KPI
 */
export function getTasksKPI(event: EventItem | null): TasksKPI {
  if (!event?.tasks) {
    return { dueToday: 0, dueThisWeek: 0, overdue: 0 };
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const tasks = event.tasks.filter(t => !t.done);
  
  const dueToday = tasks.filter(t => {
    const due = new Date(t.due);
    return due >= today && due < new Date(today.getTime() + 86400000);
  }).length;
  
  const dueThisWeek = tasks.filter(t => {
    const due = new Date(t.due);
    return due >= today && due < weekEnd;
  }).length;
  
  const overdue = tasks.filter(t => {
    const due = new Date(t.due);
    return due < today;
  }).length;
  
  return { dueToday, dueThisWeek, overdue };
}

/**
 * Compute Proposals KPI
 */
export function getProposalsKPI(event: EventItem | null): ProposalsKPI {
  if (!event?.proposals) {
    return { drafts: 0, sent: 0, pending: 0, accepted: 0, rejected: 0 };
  }
  
  const proposals = event.proposals;
  
  return {
    drafts: proposals.filter(p => p.status === 'draft').length,
    sent: proposals.filter(p => p.status === 'sent').length,
    pending: proposals.filter(p => p.status === 'pending').length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  };
}

/**
 * Compute Contracts KPI
 */
export function getContractsKPI(event: EventItem | null): ContractsKPI {
  if (!event?.contracts) {
    return { draft: 0, sent: 0, signed: 0, completed: 0, rejected: 0 };
  }
  
  const contracts = event.contracts;
  
  return {
    draft: contracts.filter(c => c.status === 'draft').length,
    sent: contracts.filter(c => c.status === 'sent').length,
    signed: contracts.filter(c => c.status === 'signed').length,
    completed: contracts.filter(c => c.status === 'completed').length,
    rejected: contracts.filter(c => c.status === 'rejected').length,
  };
}

/**
 * Compute Guests KPI
 */
export function getGuestsKPI(event: EventItem | null): GuestsKPI {
  if (!event?.guests) {
    return { yes: 0, maybe: 0, no: 0, total: 0 };
  }
  
  const guests = event.guests;
  
  return {
    yes: guests.filter(g => g.rsvp === 'yes').length,
    maybe: guests.filter(g => g.rsvp === 'maybe').length,
    no: guests.filter(g => g.rsvp === 'no').length,
    total: guests.length,
  };
}

/**
 * Compute Vendors KPI
 */
export function getVendorsKPI(event: EventItem | null): VendorsKPI {
  if (!event?.vendors) {
    return { secured: 0, shortlisted: 0, total: 0 };
  }
  
  const vendors = event.vendors || [];
  
  return {
    secured: vendors.filter(v => v.secured).length,
    shortlisted: vendors.filter(v => v.shortlisted).length,
    total: vendors.length,
  };
}

/**
 * Compute Payments KPI (simplified - using milestones as proxy)
 */
export function getPaymentsKPI(event: EventItem | null): PaymentsKPI {
  if (!event?.milestones) {
    return { overdueCount: 0 };
  }
  
  const now = new Date();
  const milestones = event.milestones.filter(m => {
    const status = m.status || 'planned';
    return status === 'planned' || status === 'at risk';
  });
  
  const overdue = milestones.filter(m => {
    const due = new Date(m.targetDate);
    return due < now;
  });
  
  const upcoming = milestones
    .filter(m => new Date(m.targetDate) >= now)
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  
  return {
    nextDueISO: upcoming.length > 0 && upcoming[0] ? upcoming[0].targetDate : undefined,
    overdueCount: overdue.length,
  };
}

/**
 * Generate Priority Alerts (max 3)
 */
export function getPriorityAlerts(
  event: EventItem | null,
  eventId: string | null
): Alert[] {
  if (!event || !eventId) return [];
  
  const alerts: Alert[] = [];
  
  // Budget alerts
  const budget = getBudgetKPI(event);
  if (budget.remaining < 0) {
    alerts.push({
      severity: 'error',
      message: `Budget projected to exceed by $${Math.abs(budget.remaining).toLocaleString()}—rebalance now`,
      cta: { label: 'View Budget', href: '', tab: 'budget', eventId },
    });
  } else if (budget.remaining < budget.total * 0.1) {
    alerts.push({
      severity: 'warn',
      message: `Budget running low—only $${budget.remaining.toLocaleString()} remaining`,
      cta: { label: 'View Budget', href: '', tab: 'budget', eventId },
    });
  }
  
  // Tasks alerts
  const tasks = getTasksKPI(event);
  if (tasks.overdue > 0) {
    alerts.push({
      severity: 'warn',
      message: `${tasks.overdue} task${tasks.overdue > 1 ? 's' : ''} overdue`,
      cta: { label: 'View Tasks', href: '', tab: 'tasks', eventId },
    });
  }
  
  // Proposals alerts
  const proposals = getProposalsKPI(event);
  if (proposals.pending > 0) {
    alerts.push({
      severity: 'info',
      message: `${proposals.pending} proposal${proposals.pending > 1 ? 's' : ''} awaiting response`,
      cta: { label: 'View Proposals', href: '', tab: 'proposals', eventId },
    });
  }
  
  return alerts.slice(0, 3);
}

/**
 * Get Week Peek items (this week)
 */
export function getWeekPeekItems(
  event: EventItem | null,
  eventId: string | null
): WeekPeekItem[] {
  if (!event || !eventId) return [];
  
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const items: WeekPeekItem[] = [];
  
  // Tasks
  if (event.tasks) {
    event.tasks.forEach(task => {
      const due = new Date(task.due);
      if (due >= weekStart && due < weekEnd) {
        items.push({
          id: task.id,
          type: 'task',
          title: task.title,
          dateISO: task.due,
          href: '',
          tab: 'tasks',
        });
      }
    });
  }
  
  // Milestones
  if (event.milestones) {
    event.milestones.forEach(milestone => {
      const date = new Date(milestone.targetDate);
      if (date >= weekStart && date < weekEnd) {
        items.push({
          id: milestone.id,
          type: 'milestone',
          title: milestone.title,
          dateISO: milestone.targetDate,
          href: '',
          tab: 'milestones',
        });
      }
    });
  }
  
  // Event itself if in week
  const eventDate = new Date(event.date);
  if (eventDate >= weekStart && eventDate < weekEnd) {
    items.push({
      id: event.id,
      type: 'event',
      title: event.name,
      dateISO: event.date,
      href: '',
    });
  }
  
  return items.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
}

/**
 * Get Recent Activity (simplified - using last updated timestamps)
 */
export function getRecentActivity(
  event: EventItem | null,
  eventId: string | null
): RecentActivityItem[] {
  if (!event || !eventId) return [];
  
  const items: RecentActivityItem[] = [];
  
  // Proposals
  if (event.proposals) {
    event.proposals.forEach(p => {
      if (p.lastUpdated) {
        items.push({
          tsISO: p.lastUpdated,
          summary: `Proposal ${p.vendorName || 'draft'} ${p.status}`,
          href: '',
          tab: 'proposals',
        });
      }
    });
  }
  
  // Contracts
  if (event.contracts) {
    event.contracts.forEach(c => {
      if (c.lastUpdated) {
        items.push({
          tsISO: c.lastUpdated,
          summary: `Contract with ${c.counterparty} ${c.status}`,
          href: '',
          tab: 'contracts',
        });
      }
    });
  }
  
  // Sort by timestamp
  return items
    .sort((a, b) => new Date(b.tsISO).getTime() - new Date(a.tsISO).getTime())
    .slice(0, 8);
}

/**
 * Get AI Suggestions (stub with safe defaults)
 */
export function getAISuggestions(
  event: EventItem | null,
  eventId: string | null
): AISuggestion[] {
  if (!event || !eventId) return [];
  
  const suggestions: AISuggestion[] = [];
  
  const proposals = getProposalsKPI(event);
  const vendors = getVendorsKPI(event);
  const budget = getBudgetKPI(event);
  
  // Generate proposals suggestion
  if (vendors.shortlisted > 0 && proposals.drafts === 0) {
    suggestions.push({
      id: 'suggest-proposals',
      title: 'Generate Proposals',
      body: `You have ${vendors.shortlisted} shortlisted vendor${vendors.shortlisted > 1 ? 's' : ''}. Generate proposals to get quotes.`,
      cta: { label: 'Generate from Shortlist', href: '', tab: 'proposals', eventId },
    });
  }
  
  // Budget rebalance suggestion
  if (budget.remaining < budget.total * 0.2 && budget.total > 0) {
    suggestions.push({
      id: 'suggest-budget',
      title: 'Review Budget',
      body: `Your budget is running low. Consider rebalancing allocations to stay on track.`,
      cta: { label: 'View Budget', href: '', tab: 'budget', eventId },
    });
  }
  
  // Contracts suggestion
  if (proposals.accepted > 0) {
    suggestions.push({
      id: 'suggest-contracts',
      title: 'Create Contracts',
      body: `You have ${proposals.accepted} accepted proposal${proposals.accepted > 1 ? 's' : ''}. Generate contracts to secure vendors.`,
      cta: { label: 'Generate Contracts', href: '', tab: 'contracts', eventId },
    });
  }
  
  return suggestions.slice(0, 3);
}

