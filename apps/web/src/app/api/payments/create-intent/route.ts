import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { z } from "zod";
import { getStripeOrThrow } from "@/server/lib/stripe";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { resolveFeeProfile } from "@/lib/fee-profile";
import { acceptanceInputSchema, CURRENT_ACCEPTANCE_VERSIONS, recordAcceptance } from "@/lib/acceptance";
import { getLegalSurface } from "@/lib/legal-surface";
import { buildPaymentIntentFundingPlan, ensureTestModeStripeSecret, normalizeStripeCurrency, validatePaymentIntentCreationPolicy } from "@/lib/payments/money-state";
import { assertFullContractAmountMatchesMilestones } from "@/server/lib/lifecycle/proposal-contract-payment";

const createIntentSchema = z.object({
  contractId: z.string(),
  milestoneId: z.string().optional(),
  amountCents: z.number().int().positive().optional(),
  acceptance: acceptanceInputSchema,
});

const PAYABLE_CONTRACT_STATES = new Set(["FULLY_SIGNED", "IN_PAYMENT"]);
const PAYABLE_MILESTONE_STATES = new Set(["PENDING", "OVERDUE"]);
const ACTIVE_PAYMENT_STATES = ["REQUIRES_PAYMENT", "PROCESSING"] as const;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const body = await request.json();
    const { contractId, milestoneId, amountCents, acceptance } = createIntentSchema.parse(body);
    if (acceptance.legalVersion !== CURRENT_ACCEPTANCE_VERSIONS.payment) {
      return NextResponse.json({ error: "Payment acceptance version mismatch" }, { status: 400 });
    }

    const contract = await (db as UnsafeAny).contract.findUnique({
      where: { id: contractId },
      include: {
        proposal: {
          include: {
            milestones: true,
            escrowAccount: true,
            listing: {
              include: {
                org: {
                  select: {
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
        event: {
          include: {
            org: {
              select: {
                ownerId: true,
                members: {
                  where: { userId },
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const isBuyerSideUser = Boolean(
      contract.buyerId &&
      contract.buyerId === contract.event.orgId &&
      (
        contract.event.org.ownerId === userId ||
        contract.event.org.members.some((member: UnsafeAny) => member.userId === userId)
      )
    );

    if (!isBuyerSideUser) {
      return NextResponse.json({ error: "Only an authorized buyer-side user can create payment intents" }, { status: 403 });
    }

    if (!PAYABLE_CONTRACT_STATES.has(contract.status)) {
      return NextResponse.json({ error: "Contract is not in a payable state" }, { status: 400 });
    }
    if (!contract.sellerId) {
      return NextResponse.json({ error: "Contract seller not set" }, { status: 400 });
    }

    const payeeUserId = contract.proposal.listing?.org?.ownerId;
    if (!payeeUserId) {
      return NextResponse.json({ error: "Contract seller payee not set" }, { status: 400 });
    }

    const bookingClassification = resolveBookingClassification({
      proposal: {
        bookingClassification: contract.proposal.bookingClassification,
        listingId: contract.proposal.listingId,
      },
      event: {
        org: {
          type: (contract.event as UnsafeAny)?.org?.type,
        },
      },
    });

    let amount: number;
    let targetMilestone: { id: string; amountCents: number; status: string } | null = null;

    if (milestoneId) {
      const milestone = contract.proposal.milestones.find((m: { id: string; amountCents: number; status: string }) => m.id === milestoneId);
      if (!milestone) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }
      if (!PAYABLE_MILESTONE_STATES.has(milestone.status)) {
        return NextResponse.json({ error: "Milestone is not payable" }, { status: 400 });
      }
      validatePaymentIntentCreationPolicy({
        contractStatus: contract.status,
        milestoneStatus: milestone.status,
        amountCents: milestone.amountCents,
        currency: contract.proposal.currency,
        target: "milestone",
      });
      amount = milestone.amountCents;
      targetMilestone = {
        id: milestone.id,
        amountCents: milestone.amountCents,
        status: milestone.status,
      };
    } else {
      if (!amountCents) {
        return NextResponse.json({ error: "Either milestoneId or amountCents must be provided" }, { status: 400 });
      }
      let totalMilestoneAmount: number;
      try {
        totalMilestoneAmount = assertFullContractAmountMatchesMilestones({
          requestedAmountCents: amountCents,
          milestoneAmountsCents: contract.proposal.milestones.map((milestone: { amountCents: number }) => milestone.amountCents),
        });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Amount must match the server-derived contract total" },
          { status: 400 }
        );
      }
      validatePaymentIntentCreationPolicy({
        contractStatus: contract.status,
        amountCents: totalMilestoneAmount,
        currency: contract.proposal.currency,
        target: "contract-total",
      });
      amount = totalMilestoneAmount;
    }

    const feeProfile = resolveFeeProfile({
      bookingClassification,
      grossAmountCents: amount,
    });
    const fundingPlan = buildPaymentIntentFundingPlan({
      grossAmountCents: amount,
      feeProfile,
    });

    let escrowAccount = contract.proposal.escrowAccount;
    if (!escrowAccount) {
      escrowAccount = await db.escrowAccount.create({
        data: {
          orgId: contract.event.orgId,
          eventId: contract.eventId,
          proposalId: contract.proposalId,
          currency: contract.proposal.currency,
        },
      });
    }

    const existingPaymentIntent = await db.paymentIntent.findFirst({
      where: {
        contractId: contract.id,
        milestoneId: targetMilestone?.id ?? null,
        status: { in: [...ACTIVE_PAYMENT_STATES] },
      },
      orderBy: { createdAt: "desc" },
    });

    const stripe = getStripeOrThrow();
    ensureTestModeStripeSecret(process.env.STRIPE_SECRET_KEY);

    if (existingPaymentIntent?.stripeIntentId) {
      const existingStripeIntent = await stripe.paymentIntents.retrieve(existingPaymentIntent.stripeIntentId);
      const allowRedirects = existingStripeIntent.automatic_payment_methods?.allow_redirects;
      const existingMatchesFundingPlan =
        existingPaymentIntent.amountCents === fundingPlan.localPaymentIntentAmountCents &&
        existingStripeIntent.amount === fundingPlan.stripeChargeAmountCents &&
        normalizeStripeCurrency(existingPaymentIntent.currency) === normalizeStripeCurrency(contract.proposal.currency) &&
        normalizeStripeCurrency(existingStripeIntent.currency) === normalizeStripeCurrency(contract.proposal.currency);

      if (allowRedirects === "never" && existingMatchesFundingPlan) {
        return NextResponse.json({
          paymentIntentId: existingPaymentIntent.id,
          clientSecret: existingStripeIntent.client_secret,
          amountCents: fundingPlan.grossAmountCents,
          chargeAmountCents: fundingPlan.stripeChargeAmountCents,
          payoutBasisAmountCents: fundingPlan.payoutBasisAmountCents,
          currency: existingPaymentIntent.currency,
          feeProfile,
        });
      }

      if (existingStripeIntent.status !== "succeeded" && existingStripeIntent.status !== "canceled") {
        await stripe.paymentIntents.cancel(existingStripeIntent.id).catch(() => null);
      }

      await db.paymentIntent.update({
        where: { id: existingPaymentIntent.id },
        data: { status: "CANCELLED" },
      });
    }

    const paymentIntent = await db.paymentIntent.create({
      data: {
        contractId: contract.id,
        milestoneId: targetMilestone?.id,
        payerId: userId,
        payeeId: payeeUserId,
        amountCents: fundingPlan.localPaymentIntentAmountCents,
        currency: contract.proposal.currency,
        status: "REQUIRES_PAYMENT",
      },
    });

    await recordAcceptance({
      actorId: userId,
      actorRole: (session.user as UnsafeAny).role || "CLIENT",
      orgId: contract.event.orgId,
      grossAmountCents: amount,
      legalSurface: getLegalSurface("payment", bookingClassification),
      legalVersion: acceptance.legalVersion,
      sourceSurface: "payment.checkout",
      requestContextId: request.headers.get("x-request-id") || undefined,
      proposalId: contract.proposalId,
      contractId: contract.id,
      paymentIntentId: paymentIntent.id,
      bookingClassificationInput: {
        proposal: {
          bookingClassification: (contract.proposal as UnsafeAny).bookingClassification,
          listingId: contract.proposal.listingId,
        },
        event: { org: { type: (contract.event as UnsafeAny)?.org?.type } },
      },
      metadata: {
        requiredVersion: CURRENT_ACCEPTANCE_VERSIONS.payment,
        milestoneId: targetMilestone?.id ?? null,
        amountCents: amount,
      },
    });

    const idempotencyKey = targetMilestone
      ? `test:contract:${contract.id}:milestone:${targetMilestone.id}:gross:${amount}:charge:${fundingPlan.stripeChargeAmountCents}:currency:${contract.proposal.currency}:redirects-never:v3`
      : `test:contract:${contract.id}:full:gross:${amount}:charge:${fundingPlan.stripeChargeAmountCents}:currency:${contract.proposal.currency}:redirects-never:v3`;

    const stripeIntent = await stripe.paymentIntents.create(
      {
        amount: fundingPlan.stripeChargeAmountCents,
        currency: contract.proposal.currency.toLowerCase(),
        metadata: {
          contractId: contract.id,
          proposalId: contract.proposalId,
          escrowAccountId: escrowAccount.id,
          milestoneId: targetMilestone?.id || "",
          payerId: userId,
          payeeId: payeeUserId,
          paymentIntentId: paymentIntent.id,
          bookingClassification,
          grossAmountCents: String(fundingPlan.grossAmountCents),
          chargeAmountCents: String(fundingPlan.stripeChargeAmountCents),
          payoutBasisAmountCents: String(fundingPlan.payoutBasisAmountCents),
          feeProfileJson: JSON.stringify(feeProfile),
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
      },
      { idempotencyKey }
    );

    await db.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: {
        stripeIntentId: stripeIntent.id,
        status: stripeIntent.status === "processing" ? "PROCESSING" : "REQUIRES_PAYMENT",
      },
    });

    if (!escrowAccount.stripeIntent) {
      await db.escrowAccount.update({
        where: { id: escrowAccount.id },
        data: { stripeIntent: stripeIntent.id },
      });
    }

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: stripeIntent.client_secret,
      amountCents: fundingPlan.grossAmountCents,
      chargeAmountCents: fundingPlan.stripeChargeAmountCents,
      payoutBasisAmountCents: fundingPlan.payoutBasisAmountCents,
      currency: contract.proposal.currency,
      feeProfile,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}
