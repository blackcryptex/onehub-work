import { EventItem as LegacyEventItem, VendorLink as LegacyVendor, Proposal as LegacyProposal, Contract as LegacyContract, Task as LegacyTask, Milestone as LegacyMilestone, Guest as LegacyGuest, Status as LegacyStatus } from './types';
import {
  EventItem as DomainEvent,
  Vendor,
  Proposal,
  Contract,
  Guest,
  Task,
  Milestone,
  BudgetSnapshot,
  VendorCategory,
  RSVP,
} from './types.event';
import { toVendorCategory } from './vendors/category';

type LegacyVendorCategory = LegacyVendor['category'];

const LEGACY_CATEGORY_FROM_DOMAIN: Record<VendorCategory, LegacyVendorCategory> = {
  venue: 'venue',
  catering: 'catering',
  florist: 'florist',
  music: 'music',
  photo: 'photo',
  video: 'other',
  planner: 'other',
  decor: 'other',
  officiant: 'other',
  transport: 'other',
  cake: 'other',
  other: 'other',
} as const satisfies Record<VendorCategory, LegacyVendorCategory>;

const MILESTONE_STATUS_FROM_LEGACY: Record<LegacyStatus, Milestone['status']> = {
  draft: 'planned',
  sent: 'planned',
  pending: 'planned',
  accepted: 'achieved',
  rejected: 'slipped',
  signed: 'achieved',
  completed: 'achieved',
} as const;

const LEGACY_STATUS_FROM_MILESTONE: Record<Exclude<Milestone['status'], undefined>, LegacyStatus> = {
  planned: 'pending',
  'at risk': 'pending',
  achieved: 'completed',
  slipped: 'pending',
};

/**
 * Converts nullable numeric input to a finite number or undefined.
 */
function coerceNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const result = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(result) ? result : undefined;
}

/**
 * Computes completion percentage based on completed tasks and milestones.
 */
function computeProgress(tasks: readonly Task[] = [], milestones: readonly Milestone[] = []): number {
  const total = tasks.length + milestones.length;
  if (!total) {
    return 0;
  }

  const completedTasks = tasks.filter((task) => task.done).length;
  const achievedMilestones = milestones.filter((milestone) => milestone.status === 'achieved').length;
  return Math.min(100, Math.round(((completedTasks + achievedMilestones) / total) * 100));
}

/**
 * Safely maps a legacy vendor to the richer domain Vendor shape.
 */
function mapLegacyVendor(vendor: LegacyVendor): Vendor {
  return {
    id: vendor.id,
    name: vendor.name,
    category: toVendorCategory(vendor.category),
    shortlisted: Boolean(vendor.shortlisted),
    secured: vendor.secured ?? false,
  };
}

/**
 * Maps a legacy proposal to a domain proposal.
 */
function mapLegacyProposal(eventId: string, proposal: LegacyProposal): Proposal {
  const total = coerceNumber(proposal.amount) ?? 0;
  const nowIso = new Date().toISOString();
  return {
    id: proposal.id,
    eventId,
    vendorName: proposal.vendorName,
    status: proposal.status,
    lines: total > 0
      ? [{
          id: `${proposal.id}-line`,
          category: toVendorCategory('other'),
          title: proposal.vendorName || 'Proposal',
          total,
        }]
      : [],
    createdAt: proposal.sentAt ?? nowIso,
    lastUpdated: proposal.sentAt ?? nowIso,
  };
}

/**
 * Maps a legacy contract to a domain contract.
 */
function mapLegacyContract(eventId: string, contract: LegacyContract): Contract {
  return {
    id: contract.id,
    eventId,
    fromProposalId: contract.id,
    counterparty: contract.counterparty,
    status: contract.status,
    clauses: [],
    lastUpdated: contract.lastUpdated ?? new Date().toISOString(),
    value: undefined,
  };
}

/**
 * Normalizes a legacy milestone status into domain milestone status.
 */
function normalizeMilestoneStatus(status: LegacyStatus): Milestone['status'] {
  return MILESTONE_STATUS_FROM_LEGACY[status] ?? 'planned';
}

/**
 * Normalizes a domain milestone status into the legacy Status enum.
 */
function mapMilestoneStatusToLegacy(status: Milestone['status'] | undefined): LegacyStatus {
  if (!status) {
    return 'pending';
  }
  return LEGACY_STATUS_FROM_MILESTONE[status] ?? 'pending';
}

/**
 * Converts a legacy RSVP value into the domain RSVP union.
 */
function normalizeRSVP(value: LegacyGuest['rsvp']): RSVP | undefined {
  if (!value) return undefined;
  return value;
}

/**
 * Converts accumulated allocations from legacy budget (if present).
 */
function mapLegacyBudget(legacy: LegacyEventItem['budget']): BudgetSnapshot | undefined {
  if (!legacy) return undefined;
  const total = coerceNumber(legacy.total);
  const spent = coerceNumber(legacy.spent);
  const remaining = total !== undefined && spent !== undefined ? total - spent : undefined;
  return {
    total,
    spent,
    remaining,
  };
}

/**
 * Converts a legacy event (used by the historical DIY planner code) into the richer domain event shape
 * consumed by the current UI. All numbers are normalized and any missing arrays are replaced with empty ones.
 */
export function adaptEventToNewFormat(legacyEvent: LegacyEventItem): DomainEvent {
  const vendors = (legacyEvent.vendors ?? []).map(mapLegacyVendor);
  const proposals = (legacyEvent.proposals ?? []).map((proposal) => mapLegacyProposal(legacyEvent.id, proposal));
  const contracts = (legacyEvent.contracts ?? []).map((contract) => mapLegacyContract(legacyEvent.id, contract));
  const guests = (legacyEvent.guests ?? []).map((guest, index): Guest => ({
    id: guest.email ?? `${legacyEvent.id}-guest-${index}`,
    name: guest.name,
    email: guest.email,
    rsvp: normalizeRSVP(guest.rsvp),
  }));
const tasks = (legacyEvent.tasks ?? []).map((task): Task => ({
    id: task.id,
    title: task.title,
    due: task.due,
    done: task.done,
    assignee: task.assignee,
  }));
  const milestones = (legacyEvent.milestones ?? []).map((milestone): Milestone => ({
    id: milestone.id,
    title: milestone.title,
    targetDate: milestone.due,
    status: normalizeMilestoneStatus(milestone.status),
    critical: false,
    linkedTaskIds: [],
  }));

  const budget = mapLegacyBudget(legacyEvent.budget);
  const progress = legacyEvent.progress ?? computeProgress(tasks, milestones);

  return {
    id: legacyEvent.id,
    name: legacyEvent.name ?? 'Untitled Event',
    date: legacyEvent.date,
    location: legacyEvent.location,
    city: legacyEvent.city,
    description: legacyEvent.description,
    progress,
    budget,
    vendors,
    proposals,
    contracts,
    guests,
    tasks,
    milestones,
  };
}

/**
 * Converts a domain event back to the legacy event shape understood by older scripts and tests.
 * This is primarily used for backwards compatibility when persisting back to historical JSON fixtures.
 */
export function adaptEventToOldFormat(domainEvent: DomainEvent): LegacyEventItem {
  const vendors: LegacyVendor[] = (domainEvent.vendors ?? []).map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    category: LEGACY_CATEGORY_FROM_DOMAIN[vendor.category],
    secured: Boolean(vendor.secured),
    contactEmail: vendor.email,
    shortlisted: vendor.shortlisted,
  }));

  const proposals: LegacyProposal[] = (domainEvent.proposals ?? []).map((proposal) => ({
    id: proposal.id,
    vendorName: proposal.vendorName ?? 'Vendor',
    amount: proposal.lines.reduce((sum, line) => sum + (line.total ?? 0), 0) || undefined,
    status: proposal.status,
    sentAt: proposal.lastUpdated,
  }));

  const contracts: LegacyContract[] = (domainEvent.contracts ?? []).map((contract) => ({
    id: contract.id,
    counterparty: contract.counterparty,
    status: contract.status,
    lastUpdated: contract.lastUpdated,
  }));

  const guests: LegacyGuest[] = (domainEvent.guests ?? []).map((guest) => ({
    name: guest.name,
    email: guest.email,
    rsvp: guest.rsvp,
  }));

  const tasks: LegacyTask[] = (domainEvent.tasks ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    due: task.due,
    done: task.done,
    assignee: task.assignee,
  }));

  const milestones: LegacyMilestone[] = (domainEvent.milestones ?? []).map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    due: milestone.targetDate,
    status: mapMilestoneStatusToLegacy(milestone.status),
  }));

  return {
    id: domainEvent.id,
    name: domainEvent.name,
    date: domainEvent.date,
    location: domainEvent.location,
    description: domainEvent.description,
    progress: domainEvent.progress,
    budget: domainEvent.budget
      ? {
          total: domainEvent.budget.total,
          spent: domainEvent.budget.spent,
        }
      : undefined,
    city: domainEvent.city,
    vendors,
    proposals,
    contracts,
    guests,
    tasks,
    milestones,
  };
}
