import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProposalFromContext } from "@/lib/ai/generateProposal";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import {
  resolveBookingClassification,
  toPersistedBookingClassification,
} from "@/lib/booking-classification";
import { resolveFeeProfile } from "@/lib/fee-profile";

/**
 * POST /api/proposals/generate
 * Generate an AI proposal for an event and vendor/venue
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[API] Proposal generation request received");
    const session = await auth();
    const user = await getCurrentUser();

    if (!session?.user || !user) {
      console.error("[API] Unauthorized proposal generation attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, listingId } = body;

    console.log("[API] Proposal generation params:", { eventId, listingId, userId: user.id });

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    // Load event with relations
    const event = await prisma.event.findUnique({
      where: { id: eventId },
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
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check permissions
    if (!canManageEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load listing (vendor or venue) - optional
    let listing = null;
    let vendorOrg = null;

    if (listingId) {
      listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
          org: true,
        },
      });

      if (!listing) {
        return NextResponse.json(
          { error: "Listing not found" },
          { status: 404 }
        );
      }

      vendorOrg = listing.org;
    }

    // Build proposal context
    const planner = event.createdBy;
    const plannerOrg = event.org;

    const proposalContext = {
      event: {
        name: event.name,
        startAt: event.startAt,
        endAt: event.endAt,
        venueCity: event.venueCity,
        venueState: event.venueState,
        venueCountry: event.venueCountry,
        guestTarget: event.guestTarget,
        description: event.description,
        objective: event.objective,
        budgetRaw: event.budgetRaw,
        budgetMin: event.budgetMin,
        budgetMax: event.budgetMax,
        budgetCurrency: event.budgetCurrency,
      },
      vendor:
        listing && listing.type === "VENDOR" && listing.org
          ? {
              name: listing.org.name,
              category: listing.category,
              description: listing.description,
              about: listing.org.about,
              city: listing.city || listing.org.city,
              state: listing.state || listing.org.state,
              website: listing.website || listing.org.website,
              contactEmail: listing.email || listing.org.contactEmail,
              contactPhone: listing.phone || listing.org.contactPhone,
            }
          : null,
      venue:
        listing && listing.type === "VENUE" && listing.org
          ? {
              name: listing.org.name,
              category: listing.category,
              description: listing.description,
              about: listing.org.about,
              city: listing.city || listing.org.city,
              state: listing.state || listing.org.state,
              website: listing.website || listing.org.website,
              contactEmail: listing.email || listing.org.contactEmail,
              contactPhone: listing.phone || listing.org.contactPhone,
            }
          : null,
      planner: {
        name: planner.name,
        email: planner.email,
        orgName: plannerOrg.name,
      },
    };

    // Generate proposal using AI
    console.log("[API] Calling AI to generate proposal...");
    const generated = await generateProposalFromContext(proposalContext);
    console.log("[API] AI proposal generated:", {
      title: generated.title,
      sectionsCount: generated.sections.length,
      lineItemsCount: generated.lineItems.length,
      milestonesCount: generated.milestones.length,
    });

    // Calculate totals from line items
    const subtotalCents = generated.lineItems.reduce(
      (sum, item) => sum + item.unitPriceCents * item.qty,
      0
    );
    const totalCents = generated.totalPriceEstimate || subtotalCents;
    console.log("[API] Calculated totals:", { subtotalCents, totalCents });

    const bookingClassification = resolveBookingClassification({
      proposal: {
        listingId: listingId || null,
      },
      event,
      source: {
        sourcedViaMarketplace: Boolean(listingId),
        plannerIsOperationalLead: event.org.type === "PLANNER",
      },
    });

    const feeProfile = resolveFeeProfile({
      bookingClassification,
      grossAmountCents: totalCents,
    });

    // Create proposal in database
    console.log("[API] Saving proposal to database...", { bookingClassification, feeProfile });
    const proposal = await (prisma as any).proposal.create({
      data: {
        orgId: event.orgId,
        eventId: event.id,
        listingId: listingId || null,
        title: generated.title,
        summary: generated.summary,
        status: "DRAFT",
        bookingClassification: toPersistedBookingClassification(bookingClassification),
        currency: generated.currency || "USD",
        subtotalCents,
        taxCents: 0,
        totalCents,
        terms: generated.terms || generated.sections.find((s) => s.heading.toLowerCase().includes("term"))?.body,
        lineItems: {
          create: generated.lineItems.map((item) => ({
            label: item.label,
            description: item.description,
            qty: item.qty,
            unit: item.unit,
            unitPriceCents: item.unitPriceCents,
            totalCents: item.unitPriceCents * item.qty,
          })),
        },
        milestones: {
          create: generated.milestones.map((m) => ({
            title: m.title,
            description: m.description,
            dueType: m.dueType as "DATE_ABSOLUTE" | "OFFSET_FROM_EVENT_START",
            dueDate: m.dueDate || null,
            dueOffsetDays: m.dueOffsetDays || null,
            amountCents: m.amountCents,
            status: "PENDING",
          })),
        },
        sections: {
          create: generated.sections.map((section, index) => ({
            heading: section.heading,
            body: section.body,
            order: index,
          })),
        },
      },
      include: {
        lineItems: true,
        milestones: true,
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    console.log("[API] Proposal created successfully:", {
      proposalId: proposal.id,
      title: proposal.title,
      feeProfile,
    });
    return NextResponse.json({
      ...proposal,
      feeProfile,
    });
  } catch (error) {
    console.error("[API] Error generating proposal:", error);
    if (error instanceof Error) {
      console.error("[API] Error stack:", error.stack);
      console.error("[API] Error message:", error.message);
    }
    const message =
      error instanceof Error ? error.message : "Failed to generate proposal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

