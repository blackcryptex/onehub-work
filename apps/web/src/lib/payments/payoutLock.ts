import { PrismaClient } from "@prisma/client";

/**
 * Generate a unique lock key for a payout
 */
export function lockKey(payoutId: string): string {
  return `payout_lock_${payoutId}`;
}

/**
 * Get lock state map for multiple payouts
 * Returns a record where key is payoutId and value is true if locked
 */
export async function getLockMap(
  prisma: PrismaClient,
  payoutIds: string[]
): Promise<Record<string, boolean>> {
  if (payoutIds.length === 0) {
    return {};
  }

  const lockKeys = payoutIds.map(lockKey);
  const lockRecords = await prisma.moneyTx.findMany({
    where: {
      stripeId: { in: lockKeys },
      type: "PAYOUT_LOCK",
    },
    select: {
      stripeId: true,
      meta: true,
    },
  });

  const lockMap: Record<string, boolean> = {};
  for (const record of lockRecords) {
    // Extract payoutId from stripeId (format: "payout_lock_${payoutId}")
    const payoutId = record.stripeId.replace("payout_lock_", "");
    lockMap[payoutId] = true;
  }

  return lockMap;
}

/**
 * Set lock state for a payout
 * @param prisma - Prisma client
 * @param payoutId - Payout ID
 * @param proposalId - Proposal ID (required for lock metadata)
 * @param milestoneId - Milestone ID (optional, can be null)
 * @param locked - Whether to lock (true) or unlock (false)
 */
export async function setLocked(
  prisma: PrismaClient,
  payoutId: string,
  proposalId: string,
  milestoneId: string | null,
  locked: boolean
): Promise<void> {
  const key = lockKey(payoutId);

  if (locked) {
    // Create or update lock record
    await prisma.moneyTx.upsert({
      where: { stripeId: key },
      update: {
        type: "PAYOUT_LOCK",
        proposalId,
        milestoneId,
        amountCents: 0,
        currency: "USD",
        meta: {
          payoutId,
          proposalId,
          lockedToProposal: true,
        },
      },
      create: {
        type: "PAYOUT_LOCK",
        proposalId,
        milestoneId,
        amountCents: 0,
        currency: "USD",
        stripeId: key,
        meta: {
          payoutId,
          proposalId,
          lockedToProposal: true,
        },
      },
    });
  } else {
    // Remove lock record (ignore if doesn't exist)
    await prisma.moneyTx
      .delete({
        where: { stripeId: key },
      })
      .catch(() => {
        // Ignore if record doesn't exist
        return null;
      });
  }
}

