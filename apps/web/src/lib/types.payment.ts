/**
 * Shared payment types and utilities for unified payment flow across all dashboards
 */

export type PaymentIntentStatus = 
  | "REQUIRES_PAYMENT"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export type MilestoneStatus =
  | "PENDING"
  | "HELD"
  | "IN_ESCROW"
  | "PARTIALLY_PAID"
  | "PAID"
  | "REFUNDED"
  | "OVERDUE";

export type ContractStatus =
  | "DRAFT"
  | "OUT_FOR_SIGNATURE"
  | "PARTIALLY_SIGNED"
  | "FULLY_SIGNED"
  | "ACCEPTED"
  | "IN_PAYMENT"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELED";

export interface PaymentMilestone {
  id: string;
  proposalId: string;
  title: string;
  description?: string | null;
  dueType: "DATE_ABSOLUTE" | "OFFSET_FROM_EVENT_START";
  dueDate?: Date | null;
  dueOffsetDays?: number | null;
  amountCents: number;
  status: MilestoneStatus;
}

export interface PaymentIntent {
  id: string;
  contractId: string;
  milestoneId?: string | null;
  payerId: string;
  payeeId: string;
  amountCents: number;
  currency: string;
  status: PaymentIntentStatus;
  stripeIntentId?: string | null;
  paymentMethod?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contract {
  id: string;
  proposalId: string;
  orgId: string;
  eventId: string;
  title: string;
  status: ContractStatus;
  buyerId?: string | null;
  sellerId?: string | null;
  platformFeePercent: number;
  milestones?: PaymentMilestone[];
  paymentIntents?: PaymentIntent[];
}

/**
 * Get the next unpaid milestone for a contract
 */
export function getNextUnpaidMilestone(milestones: PaymentMilestone[]): PaymentMilestone | null {
  const unpaid = milestones.filter(
    (m) => m.status === "PENDING" || m.status === "OVERDUE"
  );
  if (unpaid.length === 0) return null;
  
  // Sort by due date (earliest first)
  unpaid.sort((a, b) => {
    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return dateA - dateB;
  });
  
  return unpaid[0] || null;
}

/**
 * Calculate total amount due for unpaid milestones
 */
export function calculateTotalDue(milestones: PaymentMilestone[]): number {
  return milestones
    .filter((m) => m.status === "PENDING" || m.status === "OVERDUE")
    .reduce((sum, m) => sum + m.amountCents, 0);
}

/**
 * Calculate total amount in escrow
 */
export function calculateEscrowAmount(milestones: PaymentMilestone[]): number {
  return milestones
    .filter((m) => m.status === "IN_ESCROW")
    .reduce((sum, m) => sum + m.amountCents, 0);
}

/**
 * Calculate total amount paid
 */
export function calculatePaidAmount(milestones: PaymentMilestone[]): number {
  return milestones
    .filter((m) => m.status === "PAID")
    .reduce((sum, m) => sum + m.amountCents, 0);
}

/**
 * Format cents to currency string
 */
export function formatCurrency(cents: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Check if user can pay (is the buyer)
 */
export function canUserPay(contract: Contract, userId: string): boolean {
  return contract.buyerId === userId;
}

/**
 * Check if user can receive payment (is the seller)
 */
export function canUserReceive(contract: Contract, userId: string): boolean {
  return contract.sellerId === userId;
}

/**
 * Check if contract is in a payment state
 */
export function isContractInPayment(contract: Contract): boolean {
  return contract.status === "ACCEPTED" || 
         contract.status === "IN_PAYMENT" || 
         contract.status === "ACTIVE";
}

