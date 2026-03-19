import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Activity action constants for money & contracts
 * These follow the existing naming pattern (e.g., PROPOSAL_CREATED, DISPUTE_OPENED)
 */
export const ACTIVITY_ACTIONS = {
  // Payments / milestones
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  ESCROW_FUNDED: "ESCROW_FUNDED",
  MILESTONE_MARKED_COMPLETE: "MILESTONE_MARKED_COMPLETE",
  MILESTONE_FUNDS_RELEASED: "MILESTONE_FUNDS_RELEASED",
  MILESTONE_REFUND_INITIATED: "MILESTONE_REFUND_INITIATED",
  MILESTONE_REFUND_COMPLETED: "MILESTONE_REFUND_COMPLETED",
  
  // Contracts
  CONTRACT_SENT_FOR_SIGNATURE: "CONTRACT_SENT_FOR_SIGNATURE",
  CONTRACT_SIGNED: "CONTRACT_SIGNED",
  CHANGE_ORDER_ADDED: "CHANGE_ORDER_ADDED",
  CHANGE_ORDER_APPROVED: "CHANGE_ORDER_APPROVED",
  CHANGE_ORDER_REJECTED: "CHANGE_ORDER_REJECTED",
  
  // Proposals
  PROPOSAL_REJECTED: "PROPOSAL_REJECTED",
} as const;

export async function recordActivity(params: {
  orgId: string;
  eventId?: string | null;
  actorId?: string | null;
  action: string;
  target?: string | null;
  meta?: Prisma.JsonValue;
}) {
  return prisma.activity.create({
    data: {
      orgId: params.orgId,
      eventId: params.eventId ?? undefined,
      actorId: params.actorId ?? undefined,
      action: params.action,
      target: params.target ?? undefined,
      meta: params.meta ?? undefined,
    },
  });
}
