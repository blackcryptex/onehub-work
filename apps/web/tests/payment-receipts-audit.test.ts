import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma, canViewEvent } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  prisma: {
    payout: { findUnique: vi.fn() },
  },
  canViewEvent: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/rbac", () => ({ canViewEvent }));
vi.mock("@/lib/booking-classification", () => ({ resolveBookingClassification: () => "standard" }));
vi.mock("@/lib/fee-profile", () => ({
  resolveFeeProfile: () => ({
    grossAmountCents: 99999,
    platformFeeAmountCents: 1234,
    processingFeeAmountCents: 234,
    netAmountCents: 10877,
    platformFeePercent: 10,
  }),
}));

import { GET } from "../src/app/api/payments/receipts/[id]/route";

const receiptRequest = () => new Request("http://onehub.test/api/payments/receipts/payout-1") as never;
const params = { params: Promise.resolve({ id: "payout-1" }) };

const sentPayout = {
  id: "payout-1",
  amountCents: 12345,
  status: "SENT",
  createdAt: new Date("2026-01-03T12:00:00.000Z"),
  proposal: {
    currency: "USD",
    bookingClassification: "STANDARD",
    event: {
      id: "event-1",
      orgId: "org-1",
      name: "Launch Party",
      startAt: new Date("2026-01-02T12:00:00.000Z"),
      createdById: "planner-1",
      org: { ownerId: "owner-1", members: [{ userId: "member-1", role: "ADMIN" }] },
      stakeholders: [],
      shares: [],
    },
    listing: {
      id: "listing-1",
      title: "DJ Vendor",
      org: { contactEmail: "vendor@example.com" },
    },
    org: { type: "CLIENT" },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: "member-1", email: "member@example.com", role: "ADMIN" });
  prisma.payout.findUnique.mockResolvedValue(sentPayout);
  canViewEvent.mockReturnValue(true);
});

describe("payment receipts access and canonical fields", () => {
  it("returns 401 for unauthenticated receipt access before payout lookup", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await GET(receiptRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(prisma.payout.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an authenticated user who cannot view the payout event", async () => {
    canViewEvent.mockReturnValue(false);

    const response = await GET(receiptRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "You do not have permission to view this receipt" });
    expect(canViewEvent).toHaveBeenCalledWith(
      { id: "member-1", email: "member@example.com", role: "ADMIN" },
      sentPayout.proposal.event
    );
  });

  it("rejects a non-SENT payout receipt even for an authorized viewer", async () => {
    prisma.payout.findUnique.mockResolvedValue({ ...sentPayout, status: "PENDING" });

    const response = await GET(receiptRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Receipt only available for completed payouts" });
    expect(canViewEvent).not.toHaveBeenCalled();
  });

  it("renders a SENT payout receipt for an authorized viewer with canonical payout and fee fields", async () => {
    const response = await GET(receiptRequest(), params);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="receipt-payout-1.html"');
    expect(html).toContain("Receipt ID:</span>");
    expect(html).toContain("payout-1");
    expect(html).toContain("Launch Party");
    expect(html).toContain("DJ Vendor");
    expect(html).toContain("vendor@example.com");
    expect(html).toContain("Gross Payment:");
    expect(html).toContain("$123.45");
    expect(html).toContain("Platform Fee (10%):");
    expect(html).toContain("-$12.34");
    expect(html).toContain("Processing Fee:");
    expect(html).toContain("-$2.34");
    expect(html).toContain("Net Amount Paid:");
    expect(html).toContain("$108.77");
    expect(html).not.toContain("$999.99");
  });
});
