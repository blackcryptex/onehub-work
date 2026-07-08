import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canCreateDeposit, canViewEvent } from "@/lib/rbac";
import { getStripeOrThrow } from "@/server/lib/stripe";
import { z } from "zod";

const createDepositSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
});

/**
 * Phase 7A: Create a deposit for an event
 * 
 * POST /api/events/[eventSlug]/deposits
 * 
 * Only CLIENT users who are stakeholders can create deposits.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> }
) {
  const resolvedParams = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only CLIENT users can create deposits
    if (user.role !== "CLIENT") {
      return NextResponse.json({ error: "Forbidden: Only clients can create deposits" }, { status: 403 });
    }

    // Fetch event with stakeholders and shares
    const event = await prisma.event.findFirst({
      where: { slug: resolvedParams.eventSlug },
      include: {
        org: true,
        stakeholders: {
          where: { userId: user.id },
        },
        shares: {
          where: { viewerUserId: user.id, scope: "SUMMARY" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user can create deposit (stakeholder + share or stakeholder only)
    if (!canCreateDeposit(user, event)) {
      return NextResponse.json(
        { error: "Forbidden: You must be a stakeholder to create deposits for this event" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amountCents, currency, notes } = createDepositSchema.parse(body);

    // Create Stripe PaymentIntent
    const stripe = getStripeOrThrow();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      metadata: {
        type: "deposit",
        eventId: event.id,
        eventSlug: event.slug,
        clientUserId: user.id,
        proOrgId: event.orgId,
      },
    });

    // Create Deposit record
    const deposit = await prisma.deposit.create({
      data: {
        eventId: event.id,
        clientUserId: user.id,
        proOrgId: event.orgId,
        amountCents,
        currency,
        status: "PENDING",
        stripePaymentIntentId: paymentIntent.id,
        notes: notes || null,
      },
      include: {
        event: {
          select: {
            name: true,
            slug: true,
          },
        },
        clientUser: {
          select: {
            name: true,
            email: true,
          },
        },
        proOrg: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      deposit: {
        id: deposit.id,
        amountCents: deposit.amountCents,
        currency: deposit.currency,
        status: deposit.status,
        createdAt: deposit.createdAt,
      },
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating deposit:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create deposit" }, { status: 500 });
  }
}

/**
 * Phase 7A: Get deposits for an event
 * 
 * GET /api/events/[eventSlug]/deposits
 * 
 * Clients can see their own deposits.
 * Pro Planners can see all deposits for their events.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> }
) {
  const resolvedParams = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch event
    const event = await prisma.event.findFirst({
      where: { slug: resolvedParams.eventSlug },
      include: {
        org: true,
        stakeholders: {
          where: { userId: user.id },
        },
        shares: {
          where: { viewerUserId: user.id, scope: "SUMMARY" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user can view this event
    if (!canViewEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build where clause based on role
    const where: any = { eventId: event.id };
    
    if (user.role === "CLIENT") {
      // Clients can only see their own deposits
      where.clientUserId = user.id;
    } else if (user.role === "PRO_PLANNER" || user.role === "DIY_PLANNER") {
      // Planners can see all deposits for their events
      // No additional filter needed
    } else {
      // Other roles cannot view deposits
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deposits = await prisma.deposit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        clientUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      deposits: deposits.map((d) => ({
        id: d.id,
        amountCents: d.amountCents,
        currency: d.currency,
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        notes: d.notes,
        clientName: d.clientUser.name,
        clientEmail: d.clientUser.email,
      })),
    });
  } catch (error) {
    console.error("Error fetching deposits:", error);
    return NextResponse.json({ error: "Failed to fetch deposits" }, { status: 500 });
  }
}
