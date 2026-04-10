import type { BookingClassification } from "@/lib/booking-classification";
import { getBookingClassificationHooks } from "@/lib/legal-surface";

export type FeeOwner = "buyer" | "seller" | "platform";

export type FeeOverrideHook = {
  allowed: boolean;
  policyKey: string;
  reasonRequired: boolean;
  auditRequired: boolean;
};

export type CanonicalFeeProfile = {
  bookingClassification: BookingClassification;
  platformFeeOwner: FeeOwner;
  processingFeeOwner: FeeOwner;
  platformFeePercent: number;
  platformFeeBps: number;
  platformFeeRule: string;
  platformFeeAmountCents: number;
  processingFeeRule: string;
  processingFeeAmountCents: number;
  processingFeeTreatment: "charged_to_buyer" | "platform_absorbed";
  grossAmountCents: number;
  totalChargeAmountCents: number;
  netAmountCents: number;
  payoutBasisAmountCents: number;
  overrideHook: FeeOverrideHook;
  hooks: {
    legalSurface: string;
    acceptanceSurface: string;
    refundDisputeRoute: string;
    adminOverridePolicy: string;
  };
};

const PLATFORM_FEE_PERCENT = 5;
const PLATFORM_FEE_BPS = PLATFORM_FEE_PERCENT * 100;
const PROCESSING_FEE_RATE = 0.029;
const PROCESSING_FEE_FIXED_CENTS = 30;

function roundCents(amount: number) {
  return Math.round(amount);
}

export function calculateProcessingFeeCents(amountCents: number) {
  return roundCents(amountCents * PROCESSING_FEE_RATE + PROCESSING_FEE_FIXED_CENTS);
}

export function resolveFeeProfile(input: {
  bookingClassification: BookingClassification;
  grossAmountCents: number;
}): CanonicalFeeProfile {
  const grossAmountCents = input.grossAmountCents;
  const platformFeeAmountCents = roundCents(grossAmountCents * (PLATFORM_FEE_PERCENT / 100));
  const processingFeeAmountCents = calculateProcessingFeeCents(grossAmountCents);

  const sharedHooks = getBookingClassificationHooks(input.bookingClassification);

  if (input.bookingClassification === "direct") {
    return {
      bookingClassification: input.bookingClassification,
      platformFeeOwner: "seller",
      processingFeeOwner: "buyer",
      platformFeePercent: PLATFORM_FEE_PERCENT,
      platformFeeBps: PLATFORM_FEE_BPS,
      platformFeeRule: "seller_pays_platform_fee",
      platformFeeAmountCents,
      processingFeeRule: "buyer_pays_processing_cost",
      processingFeeAmountCents,
      processingFeeTreatment: "charged_to_buyer",
      grossAmountCents,
      totalChargeAmountCents: grossAmountCents + processingFeeAmountCents,
      netAmountCents: grossAmountCents - platformFeeAmountCents,
      payoutBasisAmountCents: grossAmountCents - platformFeeAmountCents,
      overrideHook: {
        allowed: false,
        policyKey: sharedHooks.adminOverridePolicy,
        reasonRequired: true,
        auditRequired: true,
      },
      hooks: sharedHooks,
    };
  }

  return {
    bookingClassification: input.bookingClassification,
    platformFeeOwner: "seller",
    processingFeeOwner: "platform",
    platformFeePercent: PLATFORM_FEE_PERCENT,
    platformFeeBps: PLATFORM_FEE_BPS,
    platformFeeRule: "seller_pays_platform_fee",
    platformFeeAmountCents,
    processingFeeRule: "platform_absorbs_processing_cost_until_explicit_policy_override",
    processingFeeAmountCents,
    processingFeeTreatment: "platform_absorbed",
    grossAmountCents,
    totalChargeAmountCents: grossAmountCents,
    netAmountCents: grossAmountCents - platformFeeAmountCents,
    payoutBasisAmountCents: grossAmountCents - platformFeeAmountCents,
    overrideHook: {
      allowed: input.bookingClassification === "planner-mediated",
      policyKey: sharedHooks.adminOverridePolicy,
      reasonRequired: true,
      auditRequired: true,
    },
    hooks: sharedHooks,
  };
}
