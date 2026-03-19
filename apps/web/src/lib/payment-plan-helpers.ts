/**
 * Payment Plan Helpers
 * Utilities for working with deposit/payout lines stored in existing Prisma models
 * 
 * Storage Strategy (no schema changes):
 * - DEPOSIT lines: PaymentMilestone with description = JSON({"lineType":"deposit"})
 * - PAYOUT lines: Payout model (has listingId for payee)
 */

export interface DepositLineMetadata {
  lineType: "deposit";
}

export interface PaymentMilestoneWithMetadata {
  id: string;
  title: string;
  amountCents: number;
  status: string;
  description: string | null;
  dueDate: Date | null;
  proposalId: string;
}

export function parseDepositMetadata(description: string | null): DepositLineMetadata | null {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description);
    if (parsed?.lineType === "deposit") {
      return parsed as DepositLineMetadata;
    }
  } catch {
    // Not JSON or invalid format
  }
  return null;
}

export function isDepositLine(milestone: PaymentMilestoneWithMetadata): boolean {
  return parseDepositMetadata(milestone.description) !== null;
}

export function encodeDepositMetadata(): string {
  return JSON.stringify({ lineType: "deposit" });
}

