import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, canViewEvent, prisma } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  canViewEvent: vi.fn(),
  prisma: {
    event: { findUnique: vi.fn() },
    listing: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/rbac", () => ({ canViewEvent }));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { POST } from "@/app/api/ai/source-vendors-venues/route";

function request(body: Record<string, unknown>) {
  return new Request("http://test.local/api/ai/source-vendors-venues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("source vendors/venues marketplace discoverability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "planner-user-1", role: "PRO_PLANNER" });
    canViewEvent.mockReturnValue(true);
    prisma.event.findUnique.mockResolvedValue({
      id: "event-1",
      name: "Atlas Provider Flow Event 20260809091630",
      type: "WEDDING",
      startAt: new Date("2026-09-01T00:00:00.000Z"),
      venueCity: "Chicago",
      venueState: "IL",
      description: "Preview smoke event",
      createdById: "planner-user-1",
      orgId: "planner-org-1",
      org: { ownerId: "planner-user-1", members: [] },
      stakeholders: [],
      shares: [],
    });
    prisma.listing.findMany.mockResolvedValue([
      {
        id: "listing-atlas-vendor",
        title: "Atlas Flow Vendor 20260809091630",
        type: "VENDOR",
        category: "CATERING",
        city: "Chicago",
        state: "IL",
        website: "https://atlas-flow-vendor.test",
        org: { name: "Atlas Flow Vendor 20260809091630" },
      },
      {
        id: "listing-atlas-venue",
        title: "Atlas Flow Venue 20260809091630",
        type: "VENUE",
        category: "VENUE_SPACE",
        city: "Chicago",
        state: "IL",
        website: "https://atlas-flow-venue.test",
        org: { name: "Atlas Flow Venue 20260809091630" },
      },
    ]);
  });

  it("queries event-linked sourcing with newest published marketplace listings first", async () => {
    const response = await POST(request({ eventId: "event-1", limitVerified: 8, limitUnverified: 1 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        category: { in: ["VENUE_SPACE", "CATERING", "DECOR_FLORAL", "ENTERTAINMENT", "PHOTO_VIDEO", "RENTALS"] },
        state: "IL",
      },
      take: 8,
      orderBy: [
        { updatedAt: "desc" },
        { ratingAvg: "desc" },
        { ratingCount: "desc" },
      ],
    }));
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "VERIFIED",
        listingId: "listing-atlas-vendor",
        title: "Atlas Flow Vendor 20260809091630",
        listingType: "VENDOR",
      }),
      expect.objectContaining({
        kind: "VERIFIED",
        listingId: "listing-atlas-venue",
        title: "Atlas Flow Venue 20260809091630",
        listingType: "VENUE",
      }),
    ]));
  });
});
