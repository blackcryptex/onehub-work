import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateContractFromProposal } from "@/lib/ai/generateContract";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { resolveFeeProfile } from "@/lib/fee-profile";

/**
 * POST /api/contracts/from-proposal
 * Generate a contract from an approved proposal
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = await getCurrentUser();

    if (!session?.user || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { proposalId } = body;

    if (!proposalId) {
      return NextResponse.json(
        { error: "proposalId is required" },
        { status: 400 }
      );
    }

    // Load proposal with all relations
    const proposal = await (prisma as any).proposal.findUnique({
      where: { id: proposalId },
      include: {
        event: {
          include: {
            org: {
              include: {
                owner: { select: { name: true, email: true } },
                members: {
                  where: { userId: user.id },
                  include: { user: { select: { name: true, email: true } } },
                },
              },
            },
            createdBy: { select: { name: true, email: true } },
          },
        },
        listing: {
          include: {
            org: true,
          },
        },
        lineItems: true,
        milestones: true,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (!canManageEvent(user, proposal.event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if proposal is approved/accepted
    if (proposal.status !== "ACCEPTED" && proposal.status !== "CONVERTED") {
      return NextResponse.json(
        {
          error:
            "Proposal must be accepted before generating a contract. Current status: " +
            proposal.status,
        },
        { status: 400 }
      );
    }

    // Check if contract already exists
    const existingContract = await prisma.contract.findUnique({
      where: { proposalId: proposal.id },
    });

    if (existingContract) {
      return NextResponse.json(
        {
          error: "Contract already exists for this proposal",
          contractId: existingContract.id,
        },
        { status: 400 }
      );
    }

    // Validate required listing context before contract generation
    const listing = proposal.listing;
    if (!listing) {
      return NextResponse.json(
        {
          error:
            "Proposal is missing listing context and cannot be converted into a contract.",
        },
        { status: 400 }
      );
    }

    // Build contract context
    const vendorOrg = listing.org || null;
    const planner = proposal.event.createdBy;
    const bookingClassification = resolveBookingClassification({
      proposal: {
        bookingClassification: proposal.bookingClassification,
        listingId: proposal.listingId,
      },
      event: { org: { type: (proposal.event as any)?.org?.type } },
    });
    const feeProfile = resolveFeeProfile({
      bookingClassification,
      grossAmountCents: proposal.totalCents,
    });

    const contractContext = {
      proposal: {
        title: proposal.title,
        summary: proposal.summary,
        terms: proposal.terms,
        lineItems: proposal.lineItems.map((item: any) => ({
          label: item.label,
          description: item.description,
          qty: item.qty,
          unit: item.unit,
          unitPriceCents: item.unitPriceCents,
          totalCents: item.totalCents,
        })),
        milestones: proposal.milestones.map((m: any) => ({
          title: m.title,
          description: m.description,
          dueType: m.dueType,
          dueDate: m.dueDate,
          dueOffsetDays: m.dueOffsetDays,
          amountCents: m.amountCents,
        })),
        totalCents: proposal.totalCents,
        currency: proposal.currency,
        bookingClassification,
        legalSurface: feeProfile.hooks.legalSurface,
        acceptanceSurface: feeProfile.hooks.acceptanceSurface,
      },
      event: {
        name: proposal.event.name,
        startAt: proposal.event.startAt,
        endAt: proposal.event.endAt,
        venueCity: proposal.event.venueCity,
        venueState: proposal.event.venueState,
        venueCountry: proposal.event.venueCountry,
        guestTarget: proposal.event.guestTarget,
      },
      vendor:
        listing && listing.type === "VENDOR"
          ? {
              name: listing.org.name,
              category: listing.category,
              contactEmail: listing.email || listing.org.contactEmail,
              contactPhone: listing.phone || listing.org.contactPhone,
            }
          : null,
      venue:
        listing && listing.type === "VENUE"
          ? {
              name: listing.org.name,
              category: listing.category,
              contactEmail: listing.email || listing.org.contactEmail,
              contactPhone: listing.phone || listing.org.contactPhone,
            }
          : null,
      planner: {
        name: planner.name,
        email: planner.email,
        orgName: proposal.event.org.name,
      },
      vendorOrg: vendorOrg
        ? {
            name: vendorOrg.name,
            legalEntity: (vendorOrg as any).legalEntity || null,
          }
        : null,
    };

    // Generate contract using AI
    const generated = await generateContractFromProposal(contractContext);

    // Determine buyer and seller IDs
    // Buyer = planner's org, Seller = vendor/venue org
    const buyerId = proposal.event.orgId;
    const sellerId = listing?.orgId || null;

    // Create contract in database
    const contract = await prisma.contract.create({
      data: {
        proposalId: proposal.id,
        orgId: proposal.orgId,
        eventId: proposal.eventId,
        title: generated.title,
        bodyMd: generated.bodyMd,
        version: 1,
        status: "DRAFT",
        buyerId,
        sellerId,
        platformFeePercent: feeProfile.platformFeePercent,
      },
    });

    // Update proposal status to CONVERTED if not already
    if (proposal.status !== "CONVERTED") {
      await prisma.proposal.update({
        where: { id: proposal.id },
        data: { status: "CONVERTED" },
      });
    }

    return NextResponse.json({
      ...contract,
      feeProfile,
    });
  } catch (error) {
    console.error("[API] Error generating contract:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate contract";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

