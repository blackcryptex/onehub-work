import type { BookingClassification } from "@/lib/booking-classification";
import { CURRENT_ACCEPTANCE_VERSIONS } from "@/lib/acceptance-versions";

export type LegalAction = "proposal" | "contract" | "payment" | "refund" | "dispute" | "holdback" | "adminOverride";

export const PUBLIC_LEGAL_PAGES = {
  terms: "/terms",
  payments: "/legal/payments",
  refunds: "/legal/refunds",
  disputes: "/legal/disputes",
  bookingClasses: "/legal/booking-classification",
  fees: "/legal/fees",
} as const;

export function getBookingClassificationHooks(classification: BookingClassification) {
  return {
    legalSurface: `legal.${classification}`,
    acceptanceSurface: `acceptance.${classification}`,
    refundDisputeRoute: `refund-dispute.${classification}`,
    adminOverridePolicy: `admin.booking-classification.${classification}`,
  } as const;
}

export function getLegalSurface(action: LegalAction, classification: BookingClassification) {
  return `${action}.${classification}`;
}

export function getLegalVersion(action: Extract<LegalAction, "proposal" | "contract" | "payment" | "adminOverride">) {
  if (action === "adminOverride") return CURRENT_ACCEPTANCE_VERSIONS.adminOverride;
  return CURRENT_ACCEPTANCE_VERSIONS[action];
}

export function getLegalPageForAction(action: LegalAction) {
  switch (action) {
    case "proposal":
    case "contract":
      return PUBLIC_LEGAL_PAGES.terms;
    case "payment":
    case "holdback":
    case "adminOverride":
      return PUBLIC_LEGAL_PAGES.payments;
    case "refund":
      return PUBLIC_LEGAL_PAGES.refunds;
    case "dispute":
      return PUBLIC_LEGAL_PAGES.disputes;
  }
}
