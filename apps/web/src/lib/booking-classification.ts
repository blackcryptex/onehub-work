import { getBookingClassificationHooks as getCanonicalBookingClassificationHooks } from "@/lib/legal-surface";

export type PersistedBookingClassification = "MARKETPLACE" | "PLANNER_MEDIATED" | "DIRECT";

export const BOOKING_CLASSIFICATIONS = ["marketplace", "planner-mediated", "direct"] as const;

export type BookingClassification = (typeof BOOKING_CLASSIFICATIONS)[number];

const PERSISTED_TO_RUNTIME_BOOKING_CLASSIFICATION: Record<PersistedBookingClassification, BookingClassification> = {
  MARKETPLACE: "marketplace",
  PLANNER_MEDIATED: "planner-mediated",
  DIRECT: "direct",
};

const RUNTIME_TO_PERSISTED_BOOKING_CLASSIFICATION: Record<BookingClassification, PersistedBookingClassification> = {
  "marketplace": "MARKETPLACE",
  "planner-mediated": "PLANNER_MEDIATED",
  direct: "DIRECT",
};

export type BookingClassificationInput = {
  proposal?: {
    bookingClassification?: PersistedBookingClassification | BookingClassification | string | null;
    listingId?: string | null;
  } | null;
  event?: {
    org?: {
      type?: string | null;
    } | null;
  } | null;
  source?: {
    sourcedViaMarketplace?: boolean | null;
    plannerIsOperationalLead?: boolean | null;
  } | null;
};

export function toRuntimeBookingClassification(
  classification?: PersistedBookingClassification | BookingClassification | string | null
): BookingClassification | null {
  if (!classification) return null;

  if (classification in PERSISTED_TO_RUNTIME_BOOKING_CLASSIFICATION) {
    return (
      PERSISTED_TO_RUNTIME_BOOKING_CLASSIFICATION[
        classification as PersistedBookingClassification
      ] || null
    );
  }

  if (BOOKING_CLASSIFICATIONS.includes(classification as BookingClassification)) {
    return classification as BookingClassification;
  }

  return null;
}

export function toPersistedBookingClassification(
  classification: BookingClassification
): PersistedBookingClassification {
  return RUNTIME_TO_PERSISTED_BOOKING_CLASSIFICATION[classification];
}

export function resolveBookingClassification(input: BookingClassificationInput): BookingClassification {
  const persisted = toRuntimeBookingClassification(input.proposal?.bookingClassification);
  if (persisted) {
    return persisted;
  }

  const sourcedViaMarketplace = Boolean(
    input.source?.sourcedViaMarketplace ?? input.proposal?.listingId
  );
  if (sourcedViaMarketplace) return "marketplace";

  const plannerIsOperationalLead = Boolean(
    input.source?.plannerIsOperationalLead ?? (input.event?.org?.type === "PLANNER")
  );
  if (plannerIsOperationalLead) return "planner-mediated";

  return "direct";
}

export function getBookingClassificationHooks(classification: BookingClassification) {
  return getCanonicalBookingClassificationHooks(classification);
}

export function canAdminOverrideBookingClassification(classification: BookingClassification) {
  return classification !== "marketplace";
}
