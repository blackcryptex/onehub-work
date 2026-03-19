import { Prisma } from "@prisma/client";

// Single source of truth for Event Vault query
export const eventVaultInclude = Prisma.validator<Prisma.EventInclude>()({
  // Core relations
  org: {
    include: {
      owner: { select: { name: true, email: true } },
      members: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  },
  createdBy: { select: { name: true, email: true } },
  proposals: {
    include: {
      milestones: { select: { id: true, status: true, amountCents: true } },
      payouts: { select: { id: true, status: true, amountCents: true, proposalId: true } },
    },
    orderBy: { createdAt: "desc" },
  },
  bookingRequests: {
    include: { listing: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  },
  checklists: {
    include: { items: { select: { id: true, done: true, title: true } } },
    orderBy: { title: "asc" },
  },
  guestLists: {
    include: {
      guests: {
        include: { invitations: { select: { respondedAt: true, sentAt: true } } },
      },
    },
  },
  milestones: { orderBy: { dueAt: "asc" } },
  budgetLines: { select: { plannedCents: true, actualCents: true, category: true } },
  activities: { orderBy: { at: "desc" }, take: 20 },
});

export type EventVaultPayload = Prisma.EventGetPayload<{
  include: typeof eventVaultInclude;
}>;

// Helper types for component usage
export type Checklist = EventVaultPayload["checklists"][number];
export type ChecklistItem = Checklist["items"][number];
export type GuestList = EventVaultPayload["guestLists"][number];
export type Guest = GuestList["guests"][number];
export type Milestone = EventVaultPayload["milestones"][number];
export type Proposal = EventVaultPayload["proposals"][number];
// Payout is nested under Proposal - extract from the included payouts
export type Payout = NonNullable<Proposal["payouts"]>[number];
export type BookingRequest = EventVaultPayload["bookingRequests"][number];
export type Activity = EventVaultPayload["activities"][number];
export type BudgetLine = EventVaultPayload["budgetLines"][number];
export type Organization = EventVaultPayload["org"];

