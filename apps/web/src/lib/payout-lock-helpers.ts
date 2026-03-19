/**
 * Payout Lock Helpers
 * Utilities for locking payout lines to accepted proposals
 * 
 * Storage Strategy (no schema changes):
 * Since Payout model doesn't have a metadata field, we use a convention:
 * - Check if payout.amountCents matches proposal.totalCents to determine if locked
 * - Store lock state by checking proposalId relationship
 * - For more complex metadata, we could use a separate lookup map, but for now
 *   we'll use the proposal relationship + amount matching as the lock indicator
 * 
 * Alternative: Since we need to store complex metadata (phase, ratio, etc.),
 * we'll use a memory/application-level convention:
 * - Locked payouts are those where amountCents === proposal.totalCents (for SINGLE mode)
 * - For THREE_PHASE mode, we'd need metadata... but since we don't have a metadata field,
 *   we'll start with SINGLE mode only and use proposalId + amount matching
 */

export interface PayoutLockMetadata {
  type: "PAYOUT";
  proposalId: string;
  lockedToProposal: boolean;
  listingId?: string | null;
  vendorName?: string;
  source: "accepted_proposal" | "manual";
  split: {
    mode: "SINGLE" | "THREE_PHASE";
    phase?: "DEPOSIT" | "MID" | "FINAL";
    ratio?: number;
  };
}

/**
 * Since we can't store metadata in Payout model, we'll use a workaround:
 * For SINGLE mode: locked payout amount must equal proposal.totalCents
 * We'll store minimal state and compute lock status dynamically
 */
export function isPayoutLockedToProposal(
  payoutAmountCents: number,
  proposalTotalCents: number
): boolean {
  // For SINGLE mode, locked means amounts match
  return payoutAmountCents === proposalTotalCents;
}

/**
 * Compute payout amount from proposal based on split mode
 */
export function computePayoutAmountFromProposal(
  proposalTotalCents: number,
  splitMode: "SINGLE" | "THREE_PHASE" = "SINGLE",
  phase?: "DEPOSIT" | "MID" | "FINAL"
): number {
  if (splitMode === "SINGLE") {
    return proposalTotalCents;
  }

  // THREE_PHASE mode (for future use)
  const phaseRatios: Record<"DEPOSIT" | "MID" | "FINAL", number> = {
    DEPOSIT: 0.3,
    MID: 0.4,
    FINAL: 0.3,
  };

  const ratio = phase ? phaseRatios[phase] : 1.0;
  return Math.round(proposalTotalCents * ratio);
}

/**
 * Create lock metadata object (for reference, not stored in DB)
 */
export function createLockMetadata(
  proposalId: string,
  locked: boolean,
  listingId?: string | null,
  vendorName?: string,
  source: "accepted_proposal" | "manual" = "manual",
  splitMode: "SINGLE" | "THREE_PHASE" = "SINGLE",
  phase?: "DEPOSIT" | "MID" | "FINAL"
): PayoutLockMetadata {
  return {
    type: "PAYOUT",
    proposalId,
    lockedToProposal: locked,
    listingId,
    vendorName,
    source,
    split: {
      mode: splitMode,
      phase,
      ratio: splitMode === "SINGLE" ? 1 : (phase === "DEPOSIT" ? 0.3 : phase === "MID" ? 0.4 : 0.3),
    },
  };
}

