import { prisma } from "@/lib/prisma";
import { requireAcceptanceProof } from "@/lib/acceptance";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { resolveFeeProfile } from "@/lib/fee-profile";
import { evaluateHoldbackForPaymentIntent } from "@/lib/holdback";
import { recordActivity, ACTIVITY_ACTIONS } from "@/server/lib/activity";

const CONFIRMABLE_PAYMENT_STATES = new Set(["REQUIRES_PAYMENT", "PROCESSING"]);

type StripeIntentSnapshot = {
  id: string;
  status?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string | undefined> | null;
  payment_method?: unknown;
  payment_method_types?: string[];
  latest_charge?: string | null | { id?: string } | unknown;
};

export class ConfirmPaymentError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ConfirmPaymentError";
  }
}

function latestChargeId(stripeIntent: StripeIntentSnapshot) {
  const charge = stripeIntent.latest_charge;
  if (!charge) return undefined;
  if (typeof charge === "string") return charge;
  if (typeof charge === "object" && "id" in charge && typeof charge.id === "string") return charge.id;
  return undefined;
}

function paymentMethod(stripeIntent: StripeIntentSnapshot) {
  return stripeIntent.payment_method
    ? String(stripeIntent.payment_method)
    : stripeIntent.payment_method_types?.[0] || "card";
}

export function stripeIntentMatchesLocal(
  stripeIntent: StripeIntentSnapshot,
  paymentIntent: {
    id: string;
    contractId: string;
    milestoneId?: string | null;
    amountCents: number;
    currency: string;
  },
  expectedStripeAmountCents: number
) {
  const metadata = stripeIntent.metadata ?? {};
  const expectedMilestoneId = paymentIntent.milestoneId ?? "";

  return {
    amountMatches: stripeIntent.amount === expectedStripeAmountCents &&
      stripeIntent.currency?.toUpperCase() === paymentIntent.currency.toUpperCase(),
    metadataMatches: metadata.paymentIntentId === paymentIntent.id &&
      metadata.contractId === paymentIntent.contractId &&
      (metadata.milestoneId ?? "") === expectedMilestoneId,
  };
}

export async function findInternalPaymentIntentByStripeIntent(stripeIntent: StripeIntentSnapshot) {
  const stripeIntentId = stripeIntent.id;
  const metadataPaymentIntentId = stripeIntent.metadata?.paymentIntentId;

  const internalPaymentIntent = await (prisma as any).paymentIntent.findUnique({
    where: { stripeIntentId },
    include: {
      contract: {
        include: {
          proposal: {
            include: {
              milestones: true,
              escrowAccount: true,
              event: {
                select: {
                  orgId: true,
                  org: { select: { type: true } },
                },
              },
            },
          },
        },
      },
      milestone: true,
    },
  });

  if (internalPaymentIntent) return internalPaymentIntent;
  if (!metadataPaymentIntentId) return null;

  return (prisma as any).paymentIntent.update({
    where: { id: metadataPaymentIntentId },
    data: { stripeIntentId },
    include: {
      contract: {
        include: {
          proposal: {
            include: {
              milestones: true,
              escrowAccount: true,
              event: {
                select: {
                  orgId: true,
                  org: { select: { type: true } },
                },
              },
            },
          },
        },
      },
      milestone: true,
    },
  });
}

export async function applyConfirmedPaymentIntent(input: {
  paymentIntentId: string;
  stripeIntent: StripeIntentSnapshot;
  actorId?: string;
  requireSucceededStripeStatus?: boolean;
}) {
  const paymentIntent = await (prisma as any).paymentIntent.findUnique({
    where: { id: input.paymentIntentId },
    include: {
      contract: {
        include: {
          proposal: {
            include: {
              milestones: true,
              escrowAccount: true,
              event: {
                select: {
                  orgId: true,
                  org: { select: { type: true } },
                },
              },
            },
          },
        },
      },
      milestone: true,
    },
  });

  if (!paymentIntent) {
    throw new ConfirmPaymentError("Payment intent not found", 404);
  }

  if (paymentIntent.status === "SUCCEEDED") {
    return { alreadyConfirmed: true, paymentIntent };
  }

  if (!CONFIRMABLE_PAYMENT_STATES.has(paymentIntent.status)) {
    throw new ConfirmPaymentError("Payment intent is not confirmable", 409);
  }

  if (input.requireSucceededStripeStatus !== false && input.stripeIntent.status !== "succeeded") {
    if (paymentIntent.status !== "PROCESSING") {
      await (prisma as any).paymentIntent.update({
        where: { id: input.paymentIntentId },
        data: { status: "PROCESSING" },
      });
    }
    return { processing: true, paymentIntent };
  }

  const bookingClassification = resolveBookingClassification({
    proposal: {
      bookingClassification: paymentIntent.contract.proposal.bookingClassification,
      listingId: paymentIntent.contract.proposal.listingId,
    },
    event: paymentIntent.contract.proposal.event,
  });
  const feeProfile = resolveFeeProfile({
    bookingClassification,
    grossAmountCents: paymentIntent.amountCents,
  });

  const stripeMatch = stripeIntentMatchesLocal(input.stripeIntent, paymentIntent, feeProfile.totalChargeAmountCents);
  if (!stripeMatch.metadataMatches) {
    throw new ConfirmPaymentError("Stripe payment intent does not match local payment record", 409);
  }

  if (!stripeMatch.amountMatches) {
    throw new ConfirmPaymentError("Stripe payment intent amount or currency mismatch", 409);
  }

  await requireAcceptanceProof({
    paymentIntentId: input.paymentIntentId,
    legalSurface: `payment.${bookingClassification}`,
  });

  const stripeChargeId = latestChargeId(input.stripeIntent);
  const actorId = input.actorId || paymentIntent.payerId;

  await prisma.$transaction(async (tx) => {
    const currentPaymentIntent = await (tx as any).paymentIntent.findUnique({
      where: { id: input.paymentIntentId },
      include: {
        contract: {
          include: {
            proposal: {
              include: {
                milestones: true,
                escrowAccount: true,
                event: {
                  select: {
                    orgId: true,
                    org: { select: { type: true } },
                  },
                },
              },
            },
          },
        },
        milestone: true,
      },
    });

    if (!currentPaymentIntent) {
      throw new ConfirmPaymentError("Payment intent not found", 404);
    }

    if (currentPaymentIntent.status === "SUCCEEDED") {
      return;
    }

    if (!CONFIRMABLE_PAYMENT_STATES.has(currentPaymentIntent.status)) {
      throw new ConfirmPaymentError("Payment intent is not confirmable", 409);
    }

    const currentBookingClassification = resolveBookingClassification({
      proposal: {
        bookingClassification: currentPaymentIntent.contract.proposal.bookingClassification,
        listingId: currentPaymentIntent.contract.proposal.listingId,
      },
      event: currentPaymentIntent.contract.proposal.event,
    });
    const currentFeeProfile = resolveFeeProfile({
      bookingClassification: currentBookingClassification,
      grossAmountCents: currentPaymentIntent.amountCents,
    });
    const platformFeeCents = currentFeeProfile.platformFeeAmountCents;
    const netAmountCents = currentFeeProfile.netAmountCents;

    await (tx as any).paymentIntent.update({
      where: { id: input.paymentIntentId },
      data: {
        status: "SUCCEEDED",
        fundedAt: new Date(),
        paymentMethod: paymentMethod(input.stripeIntent),
      },
    });

    if (currentPaymentIntent.milestoneId) {
      await tx.paymentMilestone.update({
        where: { id: currentPaymentIntent.milestoneId },
        data: { status: "IN_ESCROW" as any },
      });
    }

    const escrowAccount = currentPaymentIntent.contract.proposal.escrowAccount;
    if (escrowAccount) {
      await tx.escrowAccount.update({
        where: { id: escrowAccount.id },
        data: {
          balanceCents: { increment: currentPaymentIntent.amountCents },
          status: escrowAccount.balanceCents === 0 ? "FUNDED" : "PARTIALLY_RELEASED",
        },
      });
    }

    await (tx as any).transaction.create({
      data: {
        paymentIntentId: currentPaymentIntent.id,
        payerId: currentPaymentIntent.payerId,
        payeeId: currentPaymentIntent.payeeId,
        netAmountCents,
        platformFeeCents,
        totalAmountCents: currentPaymentIntent.amountCents,
        currency: currentPaymentIntent.currency,
        stripeChargeId,
        processedAt: new Date(),
      },
    });

    await evaluateHoldbackForPaymentIntent({
      paymentIntentId: currentPaymentIntent.id,
      tx,
    });

    if (currentPaymentIntent.contract.status === "FULLY_SIGNED") {
      await tx.contract.update({
        where: { id: currentPaymentIntent.contractId },
        data: { status: "IN_PAYMENT" as any },
      });
    }

    await recordActivity({
      orgId: currentPaymentIntent.contract.proposal.event.orgId,
      eventId: currentPaymentIntent.contract.eventId,
      actorId,
      action: ACTIVITY_ACTIONS.PAYMENT_CONFIRMED,
      target: currentPaymentIntent.id,
      meta: {
        paymentIntentId: currentPaymentIntent.id,
        milestoneId: currentPaymentIntent.milestoneId,
        amountCents: currentPaymentIntent.amountCents,
        currency: currentPaymentIntent.currency,
        platformFeeCents,
        netAmountCents,
        stripeChargeId,
        milestoneStatusBefore: currentPaymentIntent.milestone?.status,
        milestoneStatusAfter: "IN_ESCROW",
        escrowStatusBefore: escrowAccount?.status,
        escrowStatusAfter: escrowAccount?.balanceCents === 0 ? "FUNDED" : "PARTIALLY_RELEASED",
        contractStatusBefore: currentPaymentIntent.contract.status,
        contractStatusAfter: currentPaymentIntent.contract.status === "FULLY_SIGNED"
          ? "IN_PAYMENT"
          : currentPaymentIntent.contract.status,
        bookingClassification: currentBookingClassification,
        feeProfile: currentFeeProfile,
        confirmedBy: input.actorId ? "explicit-confirm" : "stripe-webhook",
      },
    });
  });

  return { success: true, paymentIntent };
}
