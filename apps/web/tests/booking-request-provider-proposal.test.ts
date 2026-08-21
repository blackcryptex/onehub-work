import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getCurrentUser, isOrgAdminOrOwner, db, recordActivity, notify } = vi.hoisted(() => {
  const db = {
    bookingRequest: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    proposal: { create: vi.fn() },
  };
  return {
    auth: vi.fn(),
    getCurrentUser: vi.fn(),
    isOrgAdminOrOwner: vi.fn(),
    db,
    recordActivity: vi.fn(),
    notify: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/rbac", () => ({ isOrgAdminOrOwner }));
vi.mock("@/server/db", () => ({ db }));
vi.mock("@/server/lib/activity", () => ({ recordActivity }));
vi.mock("@/server/routers/notification", () => ({ notify }));

import { bookingRequestRouter } from "../src/server/routers/bookingRequest";

function caller() {
  return bookingRequestRouter.createCaller({});
}

const bookingRequest = {
  id: "request-1",
  orgId: "planner-org-1",
  eventId: "event-1",
  listingId: "listing-1",
  contactName: "Maya Client",
  contactEmail: "maya@example.com",
  startAt: new Date("2027-06-14T17:00:00.000Z"),
  endAt: new Date("2027-06-15T02:00:00.000Z"),
  guests: 150,
  status: "PENDING",
  event: { id: "event-1", name: "Smith Wedding Weekend", orgId: "planner-org-1" },
  listing: {
    id: "listing-1",
    title: "Avery Florals",
    type: "VENDOR",
    category: "DECOR_FLORAL",
    orgId: "provider-org-1",
    org: { id: "provider-org-1", name: "Avery Florals LLC", members: [{ userId: "provider-1", role: "OWNER" }] },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "provider-1" } });
  getCurrentUser.mockResolvedValue({ id: "provider-1", role: "VENDOR" });
  isOrgAdminOrOwner.mockReturnValue(true);
  db.bookingRequest.findUniqueOrThrow.mockResolvedValue(bookingRequest);
  db.bookingRequest.update.mockResolvedValue({ ...bookingRequest, status: "QUOTED", quoteCents: 250000, notes: "Includes premium floral package." });
  db.proposal.create.mockResolvedValue({
    id: "proposal-1",
    status: "SENT",
    listingId: "listing-1",
    orgId: "planner-org-1",
    eventId: "event-1",
    totalCents: 250000,
  });
  recordActivity.mockResolvedValue(undefined);
});

describe("booking request quote to provider-backed proposal handoff", () => {
  it("persists provider quote responses as non-draft proposals with real listing context", async () => {
    const result = await caller().quote({ id: "request-1", quoteCents: 250000, note: "Includes premium floral package." });

    expect(db.proposal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orgId: "planner-org-1",
        eventId: "event-1",
        listingId: "listing-1",
        status: "SENT",
        title: "Avery Florals quote for Smith Wedding Weekend",
        summary: expect.stringContaining("Provider-submitted quote from Avery Florals"),
        totalCents: 250000,
        subtotalCents: 250000,
        bookingClassification: "MARKETPLACE",
      }),
    }));
    expect(result).toEqual(expect.objectContaining({
      bookingRequest: expect.objectContaining({ id: "request-1", status: "QUOTED" }),
      proposal: expect.objectContaining({ id: "proposal-1", status: "SENT", listingId: "listing-1" }),
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "PROVIDER_PROPOSAL_SUBMITTED",
      target: "proposal-1",
      meta: expect.objectContaining({ bookingRequestId: "request-1", listingId: "listing-1" }),
    }));
  });
});
