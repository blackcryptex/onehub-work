import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canManageEvent, canViewBudget, isAdmin } from "@/lib/rbac";
import type { AppUser } from "@/lib/auth-helpers";
import {
  PROVIDER_PROPOSAL_SUBMITTED_ACTION,
  hasProviderListingContext,
} from "@/lib/provider-backed-proposal";

const COMMITTED_PROPOSAL_STATUSES = new Set(["ACCEPTED", "CONVERTED"]);
const PENDING_PROPOSAL_STATUSES = new Set(["SENT"]);
const PAYABLE_MILESTONE_STATUSES = new Set(["PENDING", "OVERDUE"]);
const HELD_MILESTONE_STATUSES = new Set(["IN_ESCROW", "HELD"]);
const PAID_MILESTONE_STATUSES = new Set(["PAID"]);

type FinancialSummaryDb = Pick<PrismaClient, "event" | "activity">;

type SummaryBudgetLine = {
  plannedCents?: number | null;
  actualCents?: number | null;
};

type SummaryMilestone = {
  id?: string | null;
  title?: string | null;
  amountCents?: number | null;
  status?: string | null;
};

type SummaryChangeOrder = {
  id?: string | null;
  number?: number | null;
  title?: string | null;
  deltaCents?: number | null;
  status?: string | null;
};

type SummaryProposal = {
  id: string;
  title?: string | null;
  eventId?: string | null;
  orgId?: string | null;
  listingId?: string | null;
  listing?: { id?: string | null; title?: string | null; type?: string | null } | null;
  status?: string | null;
  currency?: string | null;
  totalCents?: number | null;
  milestones?: SummaryMilestone[] | null;
  contract?: {
    id?: string | null;
    title?: string | null;
    status?: string | null;
    changeOrders?: SummaryChangeOrder[] | null;
  } | null;
};

type SummaryEvent = {
  id: string;
  name?: string | null;
  slug?: string | null;
  orgId: string;
  createdById: string;
  budgetCents?: number | null;
  budgetCurrency?: string | null;
  org?: { ownerId: string; members?: Array<{ userId: string; role?: string }> };
  stakeholders?: Array<{ userId: string; role: "CLIENT" | "STAKEHOLDER" }>;
  shares?: Array<{ viewerUserId: string; scope: "SUMMARY" }>;
  budgetLines?: SummaryBudgetLine[] | null;
  proposals?: SummaryProposal[] | null;
};

export type EventFinancialSummary = {
  eventId: string;
  eventName: string | null;
  eventSlug: string | null;
  currency: string;
  budgetTotalCents: number;
  plannedCents: number;
  actualCents: number;
  committedCents: number;
  pendingProposalExposureCents: number;
  pendingChangeOrderDeltaCents: number;
  approvedChangeOrderDeltaCents: number;
  payableCents: number;
  heldCents: number;
  paidCents: number;
  owedCents: number;
  remainingCents: number;
  overrunCents: number;
  riskLevel: "clear" | "watch" | "overrun" | "unknown";
  warnings: string[];
  sourceBreakdown: {
    committedProposals: Array<{ id: string; title: string; totalCents: number; status: string }>;
    pendingProposals: Array<{ id: string; title: string; totalCents: number; status: string }>;
    approvedChangeOrders: Array<{ id: string; title: string; number: number; deltaCents: number }>;
    pendingChangeOrders: Array<{ id: string; title: string; number: number; deltaCents: number }>;
  };
};

export type EventFinancialRisk = EventFinancialSummary & {
  riskReason: string;
};

function cents(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function title(value: string | null | undefined, fallback: string) {
  return value && value.trim().length > 0 ? value : fallback;
}

function providerBackedProposalIds(event: SummaryEvent, providerSubmittedTargets: Set<string>) {
  return new Set(
    (event.proposals ?? [])
      .filter((proposal) => hasProviderListingContext(proposal))
      .filter((proposal) => providerSubmittedTargets.has(proposal.id))
      .map((proposal) => proposal.id),
  );
}

export function computeEventFinancialSummary(
  event: SummaryEvent,
  providerSubmittedTargets: Set<string> = new Set(),
): EventFinancialSummary {
  const warnings: string[] = [];
  const currency = (event.budgetCurrency || "USD").toUpperCase();
  const budgetTotalCents = cents(event.budgetCents);
  const lines = event.budgetLines ?? [];
  const proposals = event.proposals ?? [];
  const providerBackedIds = providerBackedProposalIds(event, providerSubmittedTargets);

  const plannedCents = lines.reduce((sum, line) => sum + cents(line.plannedCents), 0);
  const actualCents = lines.reduce((sum, line) => sum + cents(line.actualCents), 0);
  const committedProposals: EventFinancialSummary["sourceBreakdown"]["committedProposals"] = [];
  const pendingProposals: EventFinancialSummary["sourceBreakdown"]["pendingProposals"] = [];
  const approvedChangeOrders: EventFinancialSummary["sourceBreakdown"]["approvedChangeOrders"] = [];
  const pendingChangeOrders: EventFinancialSummary["sourceBreakdown"]["pendingChangeOrders"] = [];
  let payableCents = 0;
  let heldCents = 0;
  let paidCents = 0;
  let currencyMismatch = false;

  for (const proposal of proposals) {
    const proposalCurrency = (proposal.currency || currency).toUpperCase();
    if (proposalCurrency !== currency) {
      currencyMismatch = true;
      continue;
    }

    const status = proposal.status ?? "UNKNOWN";
    const totalCents = cents(proposal.totalCents);
    const isProviderBacked = providerBackedIds.has(proposal.id);

    if (isProviderBacked && COMMITTED_PROPOSAL_STATUSES.has(status)) {
      committedProposals.push({
        id: proposal.id,
        title: title(proposal.title, "Accepted proposal"),
        totalCents,
        status,
      });

      for (const milestone of proposal.milestones ?? []) {
        const amount = cents(milestone.amountCents);
        const milestoneStatus = milestone.status ?? "PENDING";
        if (PAYABLE_MILESTONE_STATUSES.has(milestoneStatus)) payableCents += amount;
        if (HELD_MILESTONE_STATUSES.has(milestoneStatus)) heldCents += amount;
        if (PAID_MILESTONE_STATUSES.has(milestoneStatus)) paidCents += amount;
      }

      for (const changeOrder of proposal.contract?.changeOrders ?? []) {
        const order = {
          id: changeOrder.id ?? `${proposal.id}:change-order`,
          title: title(changeOrder.title, "Change order"),
          number: changeOrder.number ?? 0,
          deltaCents: cents(changeOrder.deltaCents),
        };
        if (changeOrder.status === "APPROVED") approvedChangeOrders.push(order);
        if (changeOrder.status === "PENDING") pendingChangeOrders.push(order);
      }
    } else if (isProviderBacked && PENDING_PROPOSAL_STATUSES.has(status)) {
      pendingProposals.push({
        id: proposal.id,
        title: title(proposal.title, "Pending proposal"),
        totalCents,
        status,
      });
    }
  }

  if (currencyMismatch) {
    warnings.push("Some proposal/payment records use a different currency and were excluded; no cross-currency conversion was applied.");
  }

  const committedCents = committedProposals.reduce((sum, proposal) => sum + proposal.totalCents, 0);
  const pendingProposalExposureCents = pendingProposals.reduce((sum, proposal) => sum + proposal.totalCents, 0);
  const approvedChangeOrderDeltaCents = approvedChangeOrders.reduce((sum, order) => sum + order.deltaCents, 0);
  const pendingChangeOrderDeltaCents = pendingChangeOrders.reduce((sum, order) => sum + order.deltaCents, 0);
  const committedWithApprovedChangesCents = committedCents + approvedChangeOrderDeltaCents;
  const owedCents = Math.max(0, committedWithApprovedChangesCents - heldCents - paidCents);
  const projectedExposureCents = committedWithApprovedChangesCents + Math.max(0, pendingChangeOrderDeltaCents);
  const remainingCents = budgetTotalCents - projectedExposureCents;
  const overrunCents = Math.max(0, -remainingCents);

  if (budgetTotalCents <= 0) {
    warnings.push("No approved event budget is recorded; overrun risk is shown as unknown until budget is set.");
  }
  if (pendingChangeOrderDeltaCents !== 0) {
    warnings.push("Pending change orders are shown as risk exposure only; they do not change payable/paid state until approved.");
  }
  if (heldCents > 0) {
    warnings.push("Held funds mean buyer payment is held pending review/release; they are not counted as provider-paid.");
  }
  if (overrunCents > 0) {
    warnings.push("Projected committed exposure exceeds the approved event budget.");
  }

  const riskLevel = budgetTotalCents <= 0
    ? "unknown"
    : overrunCents > 0
      ? "overrun"
      : pendingChangeOrderDeltaCents > 0 || pendingProposalExposureCents > 0
        ? "watch"
        : "clear";

  return {
    eventId: event.id,
    eventName: event.name ?? null,
    eventSlug: event.slug ?? null,
    currency,
    budgetTotalCents,
    plannedCents,
    actualCents,
    committedCents: committedWithApprovedChangesCents,
    pendingProposalExposureCents,
    pendingChangeOrderDeltaCents,
    approvedChangeOrderDeltaCents,
    payableCents,
    heldCents,
    paidCents,
    owedCents,
    remainingCents,
    overrunCents,
    riskLevel,
    warnings,
    sourceBreakdown: {
      committedProposals,
      pendingProposals,
      approvedChangeOrders,
      pendingChangeOrders,
    },
  };
}

const eventFinancialInclude = {
  org: { include: { members: true } },
  stakeholders: { select: { userId: true, role: true } },
  shares: { select: { viewerUserId: true, scope: true } },
  budgetLines: { select: { plannedCents: true, actualCents: true } },
  proposals: {
    include: {
      listing: { select: { id: true, title: true, type: true } },
      milestones: { select: { id: true, title: true, amountCents: true, status: true } },
      contract: {
        select: {
          id: true,
          title: true,
          status: true,
          changeOrders: {
            select: { id: true, number: true, title: true, deltaCents: true, status: true },
            orderBy: { number: "asc" },
          },
        },
      },
    },
  },
} as const;

export async function getEventFinancialSummary({
  eventId,
  actor,
  db = prisma,
}: {
  eventId: string;
  actor?: AppUser | null;
  db?: FinancialSummaryDb;
}) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: eventFinancialInclude,
  }) as SummaryEvent | null;

  if (!event) return null;
  if (actor && !canViewBudget(actor, event)) {
    throw new Error("Forbidden");
  }

  const providerSubmitted = await db.activity.findMany({
    where: {
      eventId,
      action: PROVIDER_PROPOSAL_SUBMITTED_ACTION,
      target: { in: (event.proposals ?? []).map((proposal) => proposal.id) },
    },
    select: { target: true },
  }) as Array<{ target?: string | null }>;

  return computeEventFinancialSummary(
    event,
    new Set(providerSubmitted.map((activity) => activity.target).filter(Boolean) as string[]),
  );
}

export async function getAdminEventFinancialRisks({
  db = prisma,
  take = 5,
}: {
  db?: FinancialSummaryDb;
  take?: number;
} = {}): Promise<EventFinancialRisk[]> {
  const events = await db.event.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: eventFinancialInclude,
  }) as SummaryEvent[];
  const eventIds = events.map((event) => event.id);
  const providerSubmitted = await db.activity.findMany({
    where: {
      eventId: { in: eventIds },
      action: PROVIDER_PROPOSAL_SUBMITTED_ACTION,
    },
    select: { eventId: true, target: true },
  }) as Array<{ eventId?: string | null; target?: string | null }>;

  const providerTargetsByEvent = new Map<string, Set<string>>();
  for (const activity of providerSubmitted) {
    if (!activity.eventId || !activity.target) continue;
    if (!providerTargetsByEvent.has(activity.eventId)) providerTargetsByEvent.set(activity.eventId, new Set());
    providerTargetsByEvent.get(activity.eventId)?.add(activity.target);
  }

  return events
    .map((event) => computeEventFinancialSummary(event, providerTargetsByEvent.get(event.id) ?? new Set()))
    .filter((summary) => summary.riskLevel === "overrun" || summary.riskLevel === "watch")
    .map((summary) => ({
      ...summary,
      riskReason: summary.overrunCents > 0
        ? `${summary.eventName ?? "Event"} is over budget by ${summary.overrunCents} cents.`
        : `${summary.eventName ?? "Event"} has pending proposal/change-order exposure to review.`,
    }))
    .sort((a, b) => b.overrunCents - a.overrunCents || b.pendingChangeOrderDeltaCents - a.pendingChangeOrderDeltaCents)
    .slice(0, take);
}

export function canUserApproveContractChangeOrder(
  user: AppUser | null | undefined,
  contract: {
    buyerId?: string | null;
    sellerId?: string | null;
    proposal?: {
      event?: SummaryEvent | null;
      listing?: { orgId?: string | null; org?: { ownerId: string; members?: Array<{ userId: string; role?: string }> } } | null;
    } | null;
  } | null | undefined,
) {
  if (!user || !contract?.proposal?.event) return false;
  if (isAdmin(user)) return true;
  const event = contract.proposal.event;
  if (canManageEvent(user, event) && contract.buyerId === event.orgId) return true;
  const sellerOrg = contract.proposal.listing?.org;
  const sellerOrgId = contract.proposal.listing?.orgId;
  const isSellerOrgParty = Boolean(contract.sellerId && sellerOrgId && contract.sellerId === sellerOrgId);
  const isSellerMember = Boolean(
    sellerOrg && (
      sellerOrg.ownerId === user.id ||
      sellerOrg.members?.some((member) => member.userId === user.id)
    ),
  );
  return isSellerOrgParty && isSellerMember;
}
