import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent, isOrgMember } from "@/lib/rbac";
import { db } from "@/server/db";
import { isDemoMode } from "@/lib/demo-mode";
import { acceptanceInputSchema, CURRENT_ACCEPTANCE_VERSIONS, recordAcceptance } from "@/lib/acceptance";
import { getLegalSurface } from "@/lib/legal-surface";
import { toRuntimeBookingClassification } from "@/lib/booking-classification";
import {
  buildAgreementSignedTransitionPlan,
  buildTransactionAuditEntry,
  extractBookingRequestIdFromProposalSummary,
} from "@/lib/transaction-loop";
import { recordActivity } from "@/server/lib/activity";
import {
  assertCanonicalContractSignableStatus,
  canonicalLifecycleHttpStatusForError,
  computeCanonicalSignatureStatus,
  normalizeSignerEmail,
} from "@/server/lib/lifecycle/proposal-contract-payment";

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

    const normalizedSignerEmail = normalizeSignerEmail(signerEmail);
    if (!user.email || normalizedSignerEmail !== normalizeSignerEmail(user.email)) {
      return NextResponse.json(
        { error: "Signer email must match the authenticated user" },
        { status: 403 }
      );
    }

    // Get contract with proposal, event, buyer org, and seller org context
    const contract = await db.contract.findUnique({
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

    try {
      assertCanonicalContractSignableStatus(contract.status);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Contract is not signable" },
        { status: 400 }
      );
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
      (s) => normalizeSignerEmail(s.signerEmail) === normalizedSignerEmail
    );

    if (existingSignature && existingSignature.signedAt) {
      return NextResponse.json(
        { error: "You have already signed this contract" },
        { status: 400 }
      );
    }

    // Create or update signature
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ua = request.headers.get("user-agent") || "unknown";
    let signature;
    if (existingSignature) {
      signature = await db.signature.update({
        where: { id: existingSignature.id },
        data: {
          signerId: user.id,
          signerName,
          signerEmail: normalizedSignerEmail,
          ip,
          ua,
          signedAt: new Date(),
          method: isDemoMode() ? "DEMO" : "ELECTRONIC",
        },
      });
    } else {
      signature = await db.signature.create({
        data: {
          contractId: contract.id,
          signerId: user.id,
          signerName,
          signerEmail: normalizedSignerEmail,
          ip,
          ua,
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

    const allSignatures = await db.signature.findMany({
      where: { contractId: contract.id },
      select: { signerId: true, signedAt: true },
    });

    const {
      buyerSigned,
      sellerSigned,
      nextStatus: newStatus,
    } = computeCanonicalSignatureStatus({
      contractStatus: contract.status,
      signatures: allSignatures,
      buyerUserIds: buyerMemberIds,
      sellerUserIds: sellerMemberIds,
    });

    await db.contract.update({
      where: { id: contract.id },
      data: { status: newStatus },
    });

    if (newStatus === "FULLY_SIGNED") {
      const bookingRequestId = extractBookingRequestIdFromProposalSummary(contract.proposal.summary);
      if (bookingRequestId) {
        const transition = buildAgreementSignedTransitionPlan({ requesterSigned: buyerSigned, providerSigned: sellerSigned });
        const audit = buildTransactionAuditEntry({
          bookingRequestId,
          actorRole: "SYSTEM",
          fromState: transition.fromState,
          toState: transition.toState,
          reason: transition.reason,
        });
        await recordActivity({
          orgId: contract.proposal.event.orgId,
          eventId: contract.proposal.eventId,
          actorId: user.id,
          action: audit.action,
          target: audit.target,
          meta: audit.meta,
        });
      }
    }

    const bookingClassification = toRuntimeBookingClassification((contract.proposal as UnsafeAny).bookingClassification) ?? "direct";
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
      bookingClassificationInput: {
        proposal: {
          bookingClassification: (contract.proposal as UnsafeAny).bookingClassification,
          listingId: contract.proposal.listingId,
        },
        event: { org: { type: (contract.proposal.event as UnsafeAny)?.org?.type } },
      },
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
        signerEmail: normalizedSignerEmail,
        newStatus,
      });
    } else {
      // TODO: Send email notification
      // await sendEmail(...)
    }

    return NextResponse.json({ success: true, signature, status: newStatus });
  } catch (error) {
    console.error("[API] Error signing contract:", error);
    const message = error instanceof Error ? error.message : "Failed to sign contract";
    return NextResponse.json(
      { error: message },
      { status: canonicalLifecycleHttpStatusForError(error) }
    );
  }
}
