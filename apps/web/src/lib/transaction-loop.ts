type MembershipRole = "OWNER" | "ADMIN" | "MEMBER" | string;

type BookingResponseAction = "HOLD" | "DECLINED" | "QUOTED";

export type BookingTransactionState =
  | "PENDING"
  | "VENDOR_REVIEWING"
  | "PROPOSAL_SENT"
  | "ACCEPTED"
  | "AGREEMENT_SIGNED"
  | "EXPIRED"
  | "CANCELED";

export type BookingTransactionActorRole = "REQUESTER" | "PROVIDER" | "SYSTEM";

interface BookingTransactionSignatureState {
  requesterSigned?: boolean;
  providerSigned?: boolean;
}

interface BookingTransactionTransitionInput {
  currentState: BookingTransactionState;
  requestedState: BookingTransactionState;
  actorRole: BookingTransactionActorRole;
  signatures?: BookingTransactionSignatureState;
}

interface BookingBusinessRuleInput {
  state: BookingTransactionState;
  now?: Date;
  createdAt?: Date;
  proposalSentAt?: Date;
  acceptedAt?: Date;
  signatures?: BookingTransactionSignatureState;
}

interface BookingBusinessRuleResult {
  state: BookingTransactionState;
  reason: string;
}

interface TransactionAuditInput {
  bookingRequestId: string;
  actorId?: string | null;
  actorRole: BookingTransactionActorRole;
  fromState: BookingTransactionState;
  toState: BookingTransactionState;
  reason?: string;
  at?: Date;
}

const BOOKING_TRANSITION_RULES: Record<
  BookingTransactionState,
  Partial<Record<BookingTransactionState, BookingTransactionActorRole[]>>
> = {
  PENDING: {
    VENDOR_REVIEWING: ["PROVIDER"],
    CANCELED: ["REQUESTER", "SYSTEM"],
  },
  VENDOR_REVIEWING: {
    PROPOSAL_SENT: ["PROVIDER"],
    CANCELED: ["PROVIDER", "REQUESTER", "SYSTEM"],
  },
  PROPOSAL_SENT: {
    ACCEPTED: ["REQUESTER"],
    EXPIRED: ["SYSTEM"],
    CANCELED: ["REQUESTER", "SYSTEM"],
  },
  ACCEPTED: {
    AGREEMENT_SIGNED: ["SYSTEM"],
    CANCELED: ["SYSTEM"],
  },
  AGREEMENT_SIGNED: {},
  EXPIRED: {},
  CANCELED: {},
};

const PROPOSAL_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;
const BOOKING_RESPONSE_TIMEOUT_MS = 48 * 60 * 60 * 1000;
const AGREEMENT_SIGNATURE_TIMEOUT_MS = 14 * 24 * 60 * 60 * 1000;

function elapsedAtOrBeyond(start: Date | undefined, now: Date, durationMs: number): boolean {
  return Boolean(start && now.getTime() - start.getTime() >= durationMs);
}

function bothSignaturesComplete(signatures?: BookingTransactionSignatureState): boolean {
  return Boolean(signatures?.requesterSigned && signatures?.providerSigned);
}

export function getNextBookingTransactionState(input: BookingTransactionTransitionInput): BookingTransactionState {
  const allowedActors = BOOKING_TRANSITION_RULES[input.currentState]?.[input.requestedState];
  if (!allowedActors) {
    throw new Error(`invalid booking transition ${input.currentState} -> ${input.requestedState}`);
  }

  if (!allowedActors.includes(input.actorRole)) {
    throw new Error(`actor ${input.actorRole} cannot move booking request ${input.currentState} -> ${input.requestedState}`);
  }

  if (input.requestedState === "AGREEMENT_SIGNED" && !bothSignaturesComplete(input.signatures)) {
    throw new Error("both signatures are required before agreement signed state");
  }

  return input.requestedState;
}

export function enforceBookingBusinessRules(input: BookingBusinessRuleInput): BookingBusinessRuleResult | null {
  const now = input.now ?? new Date();

  if (
    input.state === "PROPOSAL_SENT" &&
    elapsedAtOrBeyond(input.proposalSentAt, now, PROPOSAL_EXPIRATION_MS)
  ) {
    return { state: "EXPIRED", reason: "proposal expired after 7 days" };
  }

  if (input.state === "PENDING" && elapsedAtOrBeyond(input.createdAt, now, BOOKING_RESPONSE_TIMEOUT_MS)) {
    return { state: "CANCELED", reason: "booking request auto-canceled after 48 hours without response" };
  }

  if (
    input.state === "ACCEPTED" &&
    !bothSignaturesComplete(input.signatures) &&
    elapsedAtOrBeyond(input.acceptedAt, now, AGREEMENT_SIGNATURE_TIMEOUT_MS)
  ) {
    return { state: "CANCELED", reason: "agreement signature window expired after 14 days" };
  }

  return null;
}

export function buildTransactionAuditEntry(input: TransactionAuditInput) {
  return {
    action: "BOOKING_REQUEST_STATE_TRANSITION" as const,
    target: input.bookingRequestId,
    meta: {
      actorRole: input.actorRole,
      fromState: input.fromState,
      toState: input.toState,
      ...(input.reason ? { reason: input.reason } : {}),
      transitionedAt: (input.at ?? new Date()).toISOString(),
      ...(input.actorId ? { actorId: input.actorId } : {}),
    },
  };
}

export function extractBookingRequestIdFromProposalSummary(summary?: string | null): string | null {
  const match = summary?.match(/Response to booking request ([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

interface ProviderPermissionInput {
  userId: string;
  listingOrgOwnerId?: string | null;
  listingOrgMembers: Array<{ userId: string; role: MembershipRole }>;
}

interface BookingResponseInput {
  action: BookingResponseAction;
  quoteDollars?: string | number | null;
  note?: string | null;
}

interface ProviderResponseTransitionPlanInput {
  currentStatus: string;
  action: BookingResponseAction;
}

export interface BookingTransitionAuditStep {
  fromState: BookingTransactionState;
  toState: BookingTransactionState;
  reason: string;
}

interface BookingRequestProposalInput {
  bookingRequestId: string;
  eventId: string;
  plannerOrgId: string;
  listingId: string;
  listingTitle: string;
  providerOrgName: string;
  quoteCents: number;
  note?: string | null;
  startAt: Date;
  endAt: Date;
}

export function canProviderRespondToBookingRequest(input: ProviderPermissionInput): boolean {
  if (input.listingOrgOwnerId === input.userId) return true;

  return input.listingOrgMembers.some(
    (member) =>
      member.userId === input.userId &&
      (member.role === "OWNER" || member.role === "ADMIN")
  );
}

function mapBookingStatusToTransactionState(status: string): BookingTransactionState {
  switch (status) {
    case "PENDING":
      return "PENDING";
    case "HOLD":
      return "VENDOR_REVIEWING";
    case "QUOTED":
      return "PROPOSAL_SENT";
    case "EXPIRED":
      return "EXPIRED";
    case "DECLINED":
    case "WITHDRAWN":
      return "CANCELED";
    default:
      throw new Error(`unsupported booking request status ${status}`);
  }
}

function mapProviderActionToTransactionState(action: BookingResponseAction): BookingTransactionState {
  switch (action) {
    case "HOLD":
      return "VENDOR_REVIEWING";
    case "QUOTED":
      return "PROPOSAL_SENT";
    case "DECLINED":
      return "CANCELED";
  }
}

function transitionReason(toState: BookingTransactionState): string {
  switch (toState) {
    case "VENDOR_REVIEWING":
      return "provider started reviewing booking request";
    case "PROPOSAL_SENT":
      return "provider sent quote-backed proposal";
    case "CANCELED":
      return "provider declined booking request";
    default:
      return `booking request moved to ${toState}`;
  }
}

export function buildProviderResponseTransitionPlan(
  input: ProviderResponseTransitionPlanInput
): BookingTransitionAuditStep[] {
  const fromState = mapBookingStatusToTransactionState(input.currentStatus);
  const targetState = mapProviderActionToTransactionState(input.action);

  if (fromState === targetState) return [];

  const steps: BookingTransitionAuditStep[] = [];
  let currentState = fromState;

  if (currentState === "PENDING" && targetState === "PROPOSAL_SENT") {
    const intermediateState = getNextBookingTransactionState({
      currentState,
      requestedState: "VENDOR_REVIEWING",
      actorRole: "PROVIDER",
    });
    steps.push({
      fromState: currentState,
      toState: intermediateState,
      reason: transitionReason(intermediateState),
    });
    currentState = intermediateState;
  }

  const nextState = getNextBookingTransactionState({
    currentState,
    requestedState: targetState,
    actorRole: "PROVIDER",
  });
  steps.push({
    fromState: currentState,
    toState: nextState,
    reason: transitionReason(nextState),
  });

  return steps;
}

export function buildRequesterAcceptanceTransitionPlan(): BookingTransitionAuditStep {
  const nextState = getNextBookingTransactionState({
    currentState: "PROPOSAL_SENT",
    requestedState: "ACCEPTED",
    actorRole: "REQUESTER",
  });

  return {
    fromState: "PROPOSAL_SENT",
    toState: nextState,
    reason: "requester accepted provider proposal",
  };
}

export function buildAgreementSignedTransitionPlan(
  signatures: BookingTransactionSignatureState
): BookingTransitionAuditStep {
  const nextState = getNextBookingTransactionState({
    currentState: "ACCEPTED",
    requestedState: "AGREEMENT_SIGNED",
    actorRole: "SYSTEM",
    signatures,
  });

  return {
    fromState: "ACCEPTED",
    toState: nextState,
    reason: "both parties signed agreement",
  };
}

function cleanNote(note?: string | null): string | undefined {
  const trimmed = note?.trim();
  return trimmed || undefined;
}

function parseQuoteCents(quoteDollars?: string | number | null): number {
  const normalized = typeof quoteDollars === "number" ? quoteDollars : Number(String(quoteDollars ?? "").trim());
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("quote amount is required for QUOTED responses");
  }
  return Math.round(normalized * 100);
}

export function buildBookingResponseUpdate(input: BookingResponseInput) {
  const notes = cleanNote(input.note);

  if (input.action === "QUOTED") {
    return {
      status: "QUOTED" as const,
      quoteCents: parseQuoteCents(input.quoteDollars),
      ...(notes ? { notes } : {}),
    };
  }

  return {
    status: input.action,
    ...(notes ? { notes } : {}),
  };
}

export function buildProviderProposalFromBookingRequest(input: BookingRequestProposalInput) {
  if (!Number.isFinite(input.quoteCents) || input.quoteCents <= 0) {
    throw new Error("quote amount is required for provider proposal creation");
  }

  const note = cleanNote(input.note);
  const serviceWindow = `${input.startAt.toISOString()} – ${input.endAt.toISOString()}`;

  return {
    orgId: input.plannerOrgId,
    eventId: input.eventId,
    listingId: input.listingId,
    title: `${input.listingTitle} proposal`,
    summary: [
      `Response to booking request ${input.bookingRequestId}.`,
      `Provider: ${input.providerOrgName}.`,
      `Service window: ${serviceWindow}.`,
      note ? `Provider note: ${note}` : null,
    ]
      .filter(Boolean)
      .join(" "),
    status: "SENT" as const,
    currency: "USD",
    subtotalCents: input.quoteCents,
    taxCents: 0,
    totalCents: input.quoteCents,
    terms: [
      "Manual-status-first Gate 4B proposal response.",
      "No live payment intent, payout, refund, holdback, or escrow automation is created by this response.",
      "Acceptance can generate the existing draft agreement/contract only after planner approval.",
      note ? `Provider response note: ${note}` : null,
    ]
      .filter(Boolean)
      .join("\n\n"),
    lineItems: {
      create: [
        {
          label: `${input.listingTitle} quoted services`,
          description: note ?? `Provider response for booking request ${input.bookingRequestId}`,
          qty: 1,
          unit: "package",
          unitPriceCents: input.quoteCents,
          totalCents: input.quoteCents,
        },
      ],
    },
    milestones: {
      create: [
        {
          title: "Manual confirmation milestone",
          description: "Manual-status-first milestone visibility only; no live payment action.",
          dueType: "OFFSET_FROM_EVENT_START" as const,
          dueOffsetDays: -14,
          amountCents: input.quoteCents,
          status: "PENDING" as const,
        },
      ],
    },
  };
}
