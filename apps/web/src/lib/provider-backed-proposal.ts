import type { PrismaClient } from "@prisma/client";

export const PROVIDER_PROPOSAL_SUBMITTED_ACTION = "PROVIDER_PROPOSAL_SUBMITTED";
export const PROVIDER_BACKED_PROPOSAL_ERROR =
  "Only provider-submitted proposals with listing context can be approved";
export const PROVIDER_BACKED_CONTRACT_ERROR =
  "Proposal is missing provider-submitted evidence and cannot be converted into a contract.";

export type ProviderBackedProposalInput = {
  id: string;
  orgId?: string | null;
  eventId?: string | null;
  listingId?: string | null;
  listing?: { id?: string | null } | null;
};

type ProviderEvidenceDb = Pick<PrismaClient, "activity">;

export function hasProviderListingContext(proposal: ProviderBackedProposalInput) {
  return Boolean(proposal.listingId && proposal.listing?.id);
}

export async function hasProviderSubmittedEvidence(
  db: ProviderEvidenceDb,
  proposal: ProviderBackedProposalInput,
) {
  if (!hasProviderListingContext(proposal)) {
    return false;
  }

  const providerSubmission = await db.activity.findFirst({
    where: {
      action: PROVIDER_PROPOSAL_SUBMITTED_ACTION,
      target: proposal.id,
      ...(proposal.orgId ? { orgId: proposal.orgId } : {}),
      ...(proposal.eventId ? { eventId: proposal.eventId } : {}),
    },
    select: { id: true },
  });

  return Boolean(providerSubmission);
}
