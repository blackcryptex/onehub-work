import { describe, expect, it } from "vitest";

import {
  buildBookingResponseUpdate,
  buildAgreementSignedTransitionPlan,
  buildProviderProposalFromBookingRequest,
  buildProviderResponseTransitionPlan,
  buildRequesterAcceptanceTransitionPlan,
  buildTransactionAuditEntry,
  canProviderRespondToBookingRequest,
  enforceBookingBusinessRules,
  extractBookingRequestIdFromProposalSummary,
  getNextBookingTransactionState,
  type BookingTransactionState,
} from "../src/lib/transaction-loop";

describe("Gate 4B provider booking request response", () => {
  it("allows only owner/admin members of the listing organization to respond", () => {
    expect(
      canProviderRespondToBookingRequest({
        userId: "vendor-owner",
        listingOrgOwnerId: "vendor-owner",
        listingOrgMembers: [],
      })
    ).toBe(true);

    expect(
      canProviderRespondToBookingRequest({
        userId: "vendor-admin",
        listingOrgOwnerId: "someone-else",
        listingOrgMembers: [{ userId: "vendor-admin", role: "ADMIN" }],
      })
    ).toBe(true);

    expect(
      canProviderRespondToBookingRequest({
        userId: "planner",
        listingOrgOwnerId: "vendor-owner",
        listingOrgMembers: [{ userId: "planner", role: "MEMBER" }],
      })
    ).toBe(false);
  });

  it("normalizes HOLD, DECLINED, and QUOTED updates without live payment fields", () => {
    expect(buildBookingResponseUpdate({ action: "HOLD", note: "Checking availability" })).toEqual({
      status: "HOLD",
      notes: "Checking availability",
    });

    expect(buildBookingResponseUpdate({ action: "DECLINED", note: "Unavailable" })).toEqual({
      status: "DECLINED",
      notes: "Unavailable",
    });

    expect(buildBookingResponseUpdate({ action: "QUOTED", quoteDollars: "1250.50", note: "Includes staff" })).toEqual({
      status: "QUOTED",
      quoteCents: 125050,
      notes: "Includes staff",
    });
  });

  it("rejects quoted responses without a positive quote amount", () => {
    expect(() => buildBookingResponseUpdate({ action: "QUOTED", quoteDollars: "0" })).toThrow(
      "quote amount is required"
    );
    expect(() => buildBookingResponseUpdate({ action: "QUOTED", quoteDollars: "abc" })).toThrow(
      "quote amount is required"
    );
  });
});

describe("Gate 4B provider proposal continuity", () => {
  it("builds a sent manual-status-first proposal from booking request context", () => {
    const payload = buildProviderProposalFromBookingRequest({
      bookingRequestId: "br_123",
      eventId: "evt_1",
      plannerOrgId: "planner_org",
      listingId: "listing_1",
      listingTitle: "Delicious Catering",
      providerOrgName: "Delicious Catering LLC",
      quoteCents: 250000,
      note: "Includes buffet, staffing, and setup.",
      startAt: new Date("2026-08-01T18:00:00.000Z"),
      endAt: new Date("2026-08-02T02:00:00.000Z"),
    });

    expect(payload).toMatchObject({
      orgId: "planner_org",
      eventId: "evt_1",
      listingId: "listing_1",
      status: "SENT",
      currency: "USD",
      subtotalCents: 250000,
      taxCents: 0,
      totalCents: 250000,
    });
    expect(payload.title).toContain("Delicious Catering");
    expect(payload.summary).toContain("Response to booking request br_123");
    expect(payload.terms).toContain("Manual-status-first");
    expect(payload.lineItems.create).toEqual([
      expect.objectContaining({ label: "Delicious Catering quoted services", totalCents: 250000 }),
    ]);
    expect(payload.milestones.create).toEqual([
      expect.objectContaining({ title: "Manual confirmation milestone", status: "PENDING" }),
    ]);
  });
});

describe("Gate 4C booking transaction state machine", () => {
  it("allows the selected-event happy path in the approved actor order", () => {
    let state: BookingTransactionState = "PENDING";

    state = getNextBookingTransactionState({
      currentState: state,
      requestedState: "VENDOR_REVIEWING",
      actorRole: "PROVIDER",
    });
    expect(state).toBe("VENDOR_REVIEWING");

    state = getNextBookingTransactionState({
      currentState: state,
      requestedState: "PROPOSAL_SENT",
      actorRole: "PROVIDER",
    });
    expect(state).toBe("PROPOSAL_SENT");

    state = getNextBookingTransactionState({
      currentState: state,
      requestedState: "ACCEPTED",
      actorRole: "REQUESTER",
    });
    expect(state).toBe("ACCEPTED");

    state = getNextBookingTransactionState({
      currentState: state,
      requestedState: "AGREEMENT_SIGNED",
      actorRole: "SYSTEM",
      signatures: { requesterSigned: true, providerSigned: true },
    });
    expect(state).toBe("AGREEMENT_SIGNED");
  });

  it("blocks invalid transition order and wrong actors", () => {
    expect(() =>
      getNextBookingTransactionState({
        currentState: "PENDING",
        requestedState: "ACCEPTED",
        actorRole: "REQUESTER",
      })
    ).toThrow("invalid booking transition");

    expect(() =>
      getNextBookingTransactionState({
        currentState: "PROPOSAL_SENT",
        requestedState: "ACCEPTED",
        actorRole: "PROVIDER",
      })
    ).toThrow("actor PROVIDER cannot move booking request");

    expect(() =>
      getNextBookingTransactionState({
        currentState: "ACCEPTED",
        requestedState: "AGREEMENT_SIGNED",
        actorRole: "SYSTEM",
        signatures: { requesterSigned: true, providerSigned: false },
      })
    ).toThrow("both signatures are required");
  });

  it("enforces proposal, booking-response, and agreement timing boxes without payment actions", () => {
    const now = new Date("2026-08-08T12:00:00.000Z");

    expect(
      enforceBookingBusinessRules({
        state: "PROPOSAL_SENT",
        proposalSentAt: new Date("2026-08-01T11:59:59.000Z"),
        now,
      })
    ).toEqual({ state: "EXPIRED", reason: "proposal expired after 7 days" });

    expect(
      enforceBookingBusinessRules({
        state: "PENDING",
        createdAt: new Date("2026-08-06T11:59:59.000Z"),
        now,
      })
    ).toEqual({ state: "CANCELED", reason: "booking request auto-canceled after 48 hours without response" });

    expect(
      enforceBookingBusinessRules({
        state: "ACCEPTED",
        acceptedAt: new Date("2026-07-24T12:00:00.000Z"),
        now,
        signatures: { requesterSigned: true, providerSigned: false },
      })
    ).toEqual({ state: "CANCELED", reason: "agreement signature window expired after 14 days" });
  });

  it("builds audit metadata for every transition", () => {
    expect(
      buildTransactionAuditEntry({
        bookingRequestId: "br_123",
        actorId: "vendor-user",
        actorRole: "PROVIDER",
        fromState: "VENDOR_REVIEWING",
        toState: "PROPOSAL_SENT",
        reason: "provider sent quote-backed proposal",
        at: new Date("2026-08-01T12:00:00.000Z"),
      })
    ).toEqual({
      action: "BOOKING_REQUEST_STATE_TRANSITION",
      target: "br_123",
      meta: {
        actorRole: "PROVIDER",
        fromState: "VENDOR_REVIEWING",
        toState: "PROPOSAL_SENT",
        reason: "provider sent quote-backed proposal",
        transitionedAt: "2026-08-01T12:00:00.000Z",
        actorId: "vendor-user",
      },
    });
  });

  it("plans provider response audit transitions from legacy booking statuses", () => {
    expect(buildProviderResponseTransitionPlan({ currentStatus: "PENDING", action: "QUOTED" })).toEqual([
      { fromState: "PENDING", toState: "VENDOR_REVIEWING", reason: "provider started reviewing booking request" },
      { fromState: "VENDOR_REVIEWING", toState: "PROPOSAL_SENT", reason: "provider sent quote-backed proposal" },
    ]);

    expect(buildProviderResponseTransitionPlan({ currentStatus: "HOLD", action: "QUOTED" })).toEqual([
      { fromState: "VENDOR_REVIEWING", toState: "PROPOSAL_SENT", reason: "provider sent quote-backed proposal" },
    ]);

    expect(() => buildProviderResponseTransitionPlan({ currentStatus: "QUOTED", action: "HOLD" })).toThrow(
      "invalid booking transition"
    );
  });

  it("plans requester acceptance and system agreement-signed audit transitions", () => {
    expect(buildRequesterAcceptanceTransitionPlan()).toEqual({
      fromState: "PROPOSAL_SENT",
      toState: "ACCEPTED",
      reason: "requester accepted provider proposal",
    });

    expect(
      buildAgreementSignedTransitionPlan({ requesterSigned: true, providerSigned: true })
    ).toEqual({
      fromState: "ACCEPTED",
      toState: "AGREEMENT_SIGNED",
      reason: "both parties signed agreement",
    });

    expect(() =>
      buildAgreementSignedTransitionPlan({ requesterSigned: true, providerSigned: false })
    ).toThrow("both signatures are required");
  });

  it("extracts booking request ids from manual-status-first proposal summaries", () => {
    expect(
      extractBookingRequestIdFromProposalSummary("Response to booking request br_123. Provider: Delicious Catering.")
    ).toBe("br_123");

    expect(extractBookingRequestIdFromProposalSummary("Standalone direct proposal")).toBeNull();
  });
});
