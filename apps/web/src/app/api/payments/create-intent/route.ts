import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getStripeOrThrow } from "@/server/lib/stripe";

const createIntentSchema = z.object({
  contractId: z.string(),
  milestoneId: z.string().optional(),
  amountCents: z.number().int().positive().optional(), // Optional if milestoneId provided
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const body = await request.json();
    const { contractId, milestoneId, amountCents } = createIntentSchema.parse(body);

    // Fetch contract with proposal and milestones
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        proposal: {
          include: {
            milestones: true,
            escrowAccount: true,
          },
        },
        event: {
          include: {
            org: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Verify user is the buyer
    // Note: buyerId/sellerId fields will be available after Prisma migration
    if ((contract as any).buyerId !== userId) {
      return NextResponse.json({ error: "Only the buyer can create payment intents" }, { status: 403 });
    }

    // Determine amount and milestone
    let amount: number;
    let targetMilestone: { id: string; amountCents: number } | null = null;

    if (milestoneId) {
      const milestone = contract.proposal.milestones.find((m) => m.id === milestoneId);
      if (!milestone) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }
      // Note: OVERDUE status will be available after Prisma migration
      if (milestone.status !== "PENDING" && (milestone.status as string) !== "OVERDUE") {
        return NextResponse.json({ error: "Milestone is not payable" }, { status: 400 });
      }
      amount = milestone.amountCents;
      targetMilestone = { id: milestone.id, amountCents: milestone.amountCents };
    } else if (amountCents) {
      amount = amountCents;
    } else {
      return NextResponse.json({ error: "Either milestoneId or amountCents must be provided" }, { status: 400 });
    }

    // Determine payee (seller)
    // Note: sellerId field will be available after Prisma migration
    const sellerId = (contract as any).sellerId;
    if (!sellerId) {
      return NextResponse.json({ error: "Contract seller not set" }, { status: 400 });
    }

    // Create or get escrow account
    let escrowAccount = contract.proposal.escrowAccount;
    if (!escrowAccount) {
      escrowAccount = await prisma.escrowAccount.create({
        data: {
          orgId: contract.event.orgId,
          eventId: contract.eventId,
          proposalId: contract.proposalId,
          currency: contract.proposal.currency,
        },
      });
    }

    // Check for existing payment intent for this contract/milestone
    // Idempotency: reuse existing payment intent if one exists
    const existingPaymentIntent = await (prisma as any).paymentIntent.findFirst({
      where: {
        contractId: contract.id,
        milestoneId: targetMilestone?.id || null,
        status: { in: ["REQUIRES_PAYMENT", "PROCESSING"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingPaymentIntent && existingPaymentIntent.stripeIntentId) {
      // Return existing payment intent
      const stripe = getStripeOrThrow();
      const existingStripeIntent = await stripe.paymentIntents.retrieve(existingPaymentIntent.stripeIntentId);
      return NextResponse.json({
        paymentIntentId: existingPaymentIntent.id,
        clientSecret: existingStripeIntent.client_secret,
        amountCents: existingPaymentIntent.amountCents,
        currency: existingPaymentIntent.currency,
      });
    }

    // Generate stable idempotency key for Stripe
    const idempotencyKey = targetMilestone
      ? `contract-${contract.id}-milestone-${targetMilestone.id}`
      : `contract-${contract.id}-full-${amount}`;

    // Create Stripe Payment Intent with idempotency key
    const stripe = getStripeOrThrow();
    const stripeIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: contract.proposal.currency.toLowerCase(),
        metadata: {
          contractId: contract.id,
          proposalId: contract.proposalId,
          escrowAccountId: escrowAccount.id,
          milestoneId: targetMilestone?.id || "",
          payerId: userId,
          payeeId: sellerId,
        },
      },
      {
        idempotencyKey,
      }
    );

    // Create PaymentIntent record
    // Note: PaymentIntent model will be available after Prisma migration
    // Use upsert to handle race conditions (unique constraint on stripeIntentId will prevent duplicates)
    const paymentIntent = await (prisma as any).paymentIntent.upsert({
      where: { stripeIntentId: stripeIntent.id },
      update: {}, // If exists, return existing
      create: {
        contractId: contract.id,
        milestoneId: targetMilestone?.id,
        payerId: userId,
        payeeId: sellerId,
        amountCents: amount,
        currency: contract.proposal.currency,
        status: "REQUIRES_PAYMENT",
        stripeIntentId: stripeIntent.id,
      },
    });

    // Update escrow account with Stripe intent (only if not already set)
    if (!escrowAccount.stripeIntent) {
      await prisma.escrowAccount.update({
        where: { id: escrowAccount.id },
        data: { stripeIntent: stripeIntent.id },
      });
    }

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: stripeIntent.client_secret,
      amountCents: amount,
      currency: contract.proposal.currency,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}

