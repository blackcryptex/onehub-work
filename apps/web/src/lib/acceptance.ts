import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { resolveFeeProfile } from "@/lib/fee-profile";
import { CURRENT_ACCEPTANCE_VERSIONS } from "@/lib/acceptance-versions";

export const acceptanceInputSchema = z.object({
  legalVersion: z.string().min(1),
  accepted: z.literal(true),
});

export async function recordAcceptance(input: {
  actorId: string;
  actorRole: string;
  orgId?: string | null;
  grossAmountCents: number;
  legalSurface: string;
  legalVersion: string;
  sourceSurface: string;
  requestContextId?: string | null;
  proposalId?: string | null;
  contractId?: string | null;
  paymentIntentId?: string | null;
  adminOverrideId?: string | null;
  metadata?: Record<string, unknown>;
  bookingClassificationInput: Parameters<typeof resolveBookingClassification>[0];
}) {
  const bookingClassification = resolveBookingClassification(input.bookingClassificationInput);
  const feeProfile = resolveFeeProfile({
    bookingClassification,
    grossAmountCents: input.grossAmountCents,
  });

  return (prisma as any).acceptanceCapture.create({
    data: {
      actorId: input.actorId,
      actorRole: input.actorRole,
      orgId: input.orgId ?? undefined,
      bookingClassification,
      feeProfileSnapshot: feeProfile,
      legalSurface: input.legalSurface,
      legalVersion: input.legalVersion,
      acceptedAt: new Date(),
      sourceSurface: input.sourceSurface,
      requestContextId: input.requestContextId ?? undefined,
      proposalId: input.proposalId ?? undefined,
      contractId: input.contractId ?? undefined,
      paymentIntentId: input.paymentIntentId ?? undefined,
      adminOverrideId: input.adminOverrideId ?? undefined,
      metadata: input.metadata,
    },
  });
}

export async function requireAcceptanceProof(where: {
  proposalId?: string;
  contractId?: string;
  paymentIntentId?: string;
  adminOverrideId?: string;
  legalSurface?: string;
}) {
  const proof = await (prisma as any).acceptanceCapture.findFirst({
    where,
    orderBy: { acceptedAt: "desc" },
  });

  if (!proof) {
    throw new Error("Required acceptance proof is missing");
  }

  return proof;
}

export async function listAcceptanceProof(where: {
  proposalId?: string;
  contractId?: string;
  paymentIntentId?: string;
  adminOverrideId?: string;
}) {
  return (prisma as any).acceptanceCapture.findMany({
    where,
    orderBy: { acceptedAt: "desc" },
  });
}

export { CURRENT_ACCEPTANCE_VERSIONS };
