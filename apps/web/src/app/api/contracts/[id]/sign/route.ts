import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent, isOrgMember } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { acceptanceInputSchema, CURRENT_ACCEPTANCE_VERSIONS, recordAcceptance } from "@/lib/acceptance";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { getLegalSurface } from "@/lib/legal-surface";
import { checkRateLimit } from "@/server/lib/rateLimit";

function contractSignRateLimitKey(request: NextRequest, contractId: string, userId: string) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : request.headers.get("x-real-ip");
  return `contract-sign:${contractId}:${userId}:${ip || "unknown"}`;
}

function tooManyContractSignAttempts(resetAt: number) {
  return NextResponse.json(
    { error: "Too many contract signing attempts", retryAfter: Math.ceil((resetAt - Date.now()) / 1000) },
    { status: 429 }
  );
}

const SIGNABLE_CONTRACT_STATUSES = new Set(["OUT_FOR_SIGNATURE", "PARTIALLY_SIGNED"]);

function signableContractError(status: string) {
  return status === "DRAFT"
    ? "This contract is still a draft. Send it for signature before signing."
    : "This contract is not in a signable state.";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const limit = checkRateLimit(contractSignRateLimitKey(request, resolvedParams.id, user.id), { windowMs: 60_000, maxRequests: 10 });
    if (!limit.allowed) return tooManyContractSignAttempts(limit.resetAt);

    const body = await request.json();
    const { signerName, signerEmail } = body;
    const acceptance = acceptanceInputSchema.parse(body.acceptance);
    if (acceptance.legalVersion !== CURRENT_ACCEPTANCE_VERSIONS.contract) {
      return NextResponse.json({ error: "Contract acceptance version mismatch" }, { status: 400 });
    }

    if (!signerName || !signerEmail) {
      return NextResponse.json(
        { error: "Signer name and email are required" },
        { status: 400 }
      );
    }

    if (!user.email || signerEmail.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Signer email must match the authenticated user" },
        { status: 403 }
      );
    }

    // Get contract with proposal, event, buyer org, and seller org context
    const contract = await prisma.contract.findUnique({
      where: { id: resolvedParams.id },
      include: {
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  select: {
                    id: true,
                    ownerId: true,
                    members: {
                      select: {
                        userId: true,
                        role: true,
                      },
                    },
                  },
                },
              },
            },
            listing: {
              include: {
                org: {
                  select: {
                    id: true,
                    ownerId: true,
                    members: {
                      select: {
                        userId: true,
                        role: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        signatures: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    if (!SIGNABLE_CONTRACT_STATUSES.has(contract.status)) {
      return NextResponse.json({ error: signableContractError(contract.status) }, { status: 400 });
    }

    const canManageBuyerSide = canManageEvent(user, contract.proposal.event);
    const canSignSellerSide =
      !!contract.proposal.listing?.org &&
      (contract.proposal.listing.org.ownerId === user.id ||
        isOrgMember(user, contract.proposal.listing.org));

    if (!canManageBuyerSide && !canSignSellerSide) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Check if user already signed
    const existingSignature = contract.signatures.find(
      (s) => s.signerEmail.toLowerCase() === signerEmail.toLowerCase()
    );

    if (!existingSignature) {
      return NextResponse.json(
        { error: "Only an intended signer row can sign this contract" },
        { status: 403 }
      );
    }

    if (existingSignature.signedAt) {
      return NextResponse.json(
        { error: "You have already signed this contract" },
        { status: 400 }
      );
    }

    const signature = await prisma.signature.update({
      where: { id: existingSignature.id },
      data: {
        signerId: user.id,
        signerName,
        signerEmail,
        signedAt: new Date(),
        method: "ELECTRONIC",
      },
    });

    // Update contract status based on true dual-party execution
    const buyerMemberIds = new Set([
      contract.proposal.event.org.ownerId,
      ...contract.proposal.event.org.members.map((member) => member.userId),
    ]);
    const sellerMemberIds = new Set(
      [
        contract.proposal.listing?.org?.ownerId,
        ...(contract.proposal.listing?.org.members ?? []).map((member) => member.userId),
      ].filter((id): id is string => Boolean(id))
    );

    const allSignatures = await prisma.signature.findMany({
      where: { contractId: contract.id },
      select: { signerId: true, signedAt: true },
    });

    const buyerSigned = allSignatures.some(
      (signature) => Boolean(signature.signedAt && signature.signerId && buyerMemberIds.has(signature.signerId))
    );
    const sellerSigned = allSignatures.some(
      (signature) => Boolean(signature.signedAt && signature.signerId && sellerMemberIds.has(signature.signerId))
    );

    let newStatus = contract.status;
    if (buyerSigned && sellerSigned) {
      newStatus = "FULLY_SIGNED";
    } else if (buyerSigned || sellerSigned) {
      newStatus = "PARTIALLY_SIGNED";
    }

    await prisma.contract.update({
      where: { id: contract.id },
      data: { status: newStatus },
    });

    const bookingClassificationInput = {
      proposal: {
        bookingClassification: (contract.proposal as any).bookingClassification,
        listingId: contract.proposal.listingId,
      },
      event: { org: { type: (contract.proposal.event as any)?.org?.type } },
    };
    const bookingClassification = resolveBookingClassification(bookingClassificationInput);
    await recordAcceptance({
      actorId: user.id,
      actorRole: user.role,
      orgId: contract.proposal.event.orgId,
      grossAmountCents: contract.proposal.totalCents,
      legalSurface: getLegalSurface("contract", bookingClassification),
      legalVersion: acceptance.legalVersion,
      sourceSurface: "contract.sign",
      requestContextId: request.headers.get("x-request-id") || undefined,
      proposalId: contract.proposal.id,
      contractId: contract.id,
      bookingClassificationInput,
      metadata: {
        requiredVersion: CURRENT_ACCEPTANCE_VERSIONS.contract,
        signatureId: signature.id,
        contractStatusAfter: newStatus,
      },
    });

    return NextResponse.json({ success: true, signature, status: newStatus });
  } catch (error) {
    console.error("[API] Error signing contract:", error);
    return NextResponse.json(
      { error: "Failed to sign contract" },
      { status: 500 }
    );
  }
}
