import { z } from "zod";

type ProposalStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CONVERTED" | string;
type ContractStatus = "DRAFT" | "OUT_FOR_SIGNATURE" | "PARTIALLY_SIGNED" | "FULLY_SIGNED" | "IN_PAYMENT" | "ACTIVE" | "COMPLETED" | "CANCELED" | string;

export function assertCanonicalProposalApprovalStatus(status: ProposalStatus): { kind: "approve" } {
  if (status === "SENT") {
    return { kind: "approve" };
  }

  if (status === "DRAFT") {
    throw new Error("Proposal must be SENT before approval");
  }

  if (status === "CONVERTED") {
    throw new Error("Proposal has already been converted to a contract");
  }

  throw new Error(`Proposal cannot be approved from status ${status}`);
}

export function resolveCanonicalContractGeneration({
  proposalStatus,
  existingContractId,
}: {
  proposalStatus: ProposalStatus;
  existingContractId?: string | null;
}): { kind: "create" } | { kind: "existing"; contractId: string } {
  if (existingContractId) {
    return { kind: "existing", contractId: existingContractId };
  }

  if (proposalStatus === "CONVERTED") {
    throw new Error("Converted proposal is missing its contract");
  }

  if (proposalStatus !== "ACCEPTED") {
    throw new Error(`Proposal must be accepted before generating a contract. Current status: ${proposalStatus}`);
  }

  return { kind: "create" };
}

/**
 * Contract.buyerId and Contract.sellerId are currently organization ids in the
 * canonical lifecycle. Keep this explicit until a schema rename to buyerOrgId / sellerOrgId
 * is separately approved.
 */
export function verifyCanonicalContractOrgIds({
  buyerOrgId,
  sellerOrgId,
  actorUserId,
}: {
  buyerOrgId?: string | null;
  sellerOrgId?: string | null;
  actorUserId?: string | null;
}): { buyerId: string; sellerId: string } {
  if (!buyerOrgId) {
    throw new Error("Contract buyer organization is required");
  }

  if (!sellerOrgId) {
    throw new Error("Contract seller organization is required");
  }

  if (actorUserId && buyerOrgId === actorUserId) {
    throw new Error("Contract.buyerId must store the buyer organization id, not the acting user id");
  }

  if (actorUserId && sellerOrgId === actorUserId) {
    throw new Error("Contract.sellerId must store the seller organization id, not the acting user id");
  }

  if (buyerOrgId === sellerOrgId) {
    throw new Error("Self-contracting is not supported in the canonical lifecycle");
  }

  return { buyerId: buyerOrgId, sellerId: sellerOrgId };
}

export function assertCanonicalContractSignableStatus(status: ContractStatus): { kind: "signable" } {
  if (status === "OUT_FOR_SIGNATURE" || status === "PARTIALLY_SIGNED") {
    return { kind: "signable" };
  }

  throw new Error("Contract must be OUT_FOR_SIGNATURE or PARTIALLY_SIGNED before signing");
}

export function normalizeSignerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function computeCanonicalSignatureStatus({
  contractStatus,
  signatures,
  buyerUserIds,
  sellerUserIds,
}: {
  contractStatus: ContractStatus;
  signatures: Array<{ signerId?: string | null; signerEmail?: string | null; signedAt?: Date | string | null }>;
  buyerUserIds: Iterable<string | null | undefined>;
  sellerUserIds: Iterable<string | null | undefined>;
}): { buyerSigned: boolean; sellerSigned: boolean; nextStatus: "PARTIALLY_SIGNED" | "FULLY_SIGNED" } {
  assertCanonicalContractSignableStatus(contractStatus);

  const buyerIds = new Set(Array.from(buyerUserIds).filter((id): id is string => Boolean(id)));
  const sellerIds = new Set(Array.from(sellerUserIds).filter((id): id is string => Boolean(id)));

  const buyerSigned = signatures.some(
    (signature) => Boolean(signature.signedAt && signature.signerId && buyerIds.has(signature.signerId))
  );
  const sellerSigned = signatures.some(
    (signature) => Boolean(signature.signedAt && signature.signerId && sellerIds.has(signature.signerId))
  );

  return {
    buyerSigned,
    sellerSigned,
    nextStatus: buyerSigned && sellerSigned ? "FULLY_SIGNED" : "PARTIALLY_SIGNED",
  };
}

export function assertFullContractAmountMatchesMilestones({
  requestedAmountCents,
  milestoneAmountsCents,
}: {
  requestedAmountCents: number;
  milestoneAmountsCents: number[];
}): number {
  const serverDerivedTotal = milestoneAmountsCents.reduce((sum, amount) => sum + amount, 0);
  if (requestedAmountCents !== serverDerivedTotal) {
    throw new Error("Amount must match the server-derived contract total");
  }

  return serverDerivedTotal;
}

export function canonicalLifecycleHttpStatusForError(error: unknown): 400 | 500 {
  return error instanceof z.ZodError ? 400 : 500;
}
