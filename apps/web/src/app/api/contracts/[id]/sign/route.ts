import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent, isOrgMember } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/demo-mode";
import { acceptanceInputSchema, CURRENT_ACCEPTANCE_VERSIONS, recordAcceptance } from "@/lib/acceptance";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { getLegalSurface } from "@/lib/legal-surface";

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

    if (existingSignature && existingSignature.signedAt) {
      return NextResponse.json(
        { error: "You have already signed this contract" },
        { status: 400 }
      );
    }

    // Create or update signature
    let signature;
    if (existingSignature) {
      signature = await prisma.signature.update({
        where: { id: existingSignature.id },
        data: {
          signerId: user.id,
          signerName,
          signerEmail,
          signedAt: new Date(),
          method: isDemoMode() ? "DEMO" : "ELECTRONIC",
        },
      });
    } else {
      signature = await prisma.signature.create({
        data: {
          contractId: contract.id,
          signerId: user.id,
          signerName,
          signerEmail,
          signedAt: new Date(),
          method: isDemoMode() ? "DEMO" : "ELECTRONIC",
        },
      });
    }

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

    // Demo mode: Log instead of sending email
    if (isDemoMode()) {
      console.log("[DEMO_MODE] Contract signed:", {
        contractId: contract.id,
        signerEmail,
        newStatus,
      });
    } else {
      // TODO: Send email notification
      // await sendEmail(...)
    }

    return NextResponse.json({ success: true, signature, status: newStatus });
  } catch (error) {
    console.error("[API] Error signing contract:", error);
    return NextResponse.json(
      { error: "Failed to sign contract" },
      { status: 500 }
    );
  }
}
