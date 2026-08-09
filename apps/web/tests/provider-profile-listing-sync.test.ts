import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, prisma, tx } = vi.hoisted(() => {
  const tx = {
    user: { update: vi.fn() },
    organization: {
      create: vi.fn(),
      update: vi.fn(),
    },
    listing: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    auth: vi.fn(),
    tx,
    prisma: {
      organization: { findFirst: vi.fn() },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    },
  };
});

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { POST } from "@/app/api/providers/profile/route";

function request(body: Record<string, unknown>) {
  return new Request("http://test.local/api/providers/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const baseProfile = {
  businessName: "Atlas Catering Co",
  providerCategory: "Catering",
  contactEmail: "hello@atlascatering.test",
  contactPhone: "555-0100",
  website: "https://atlascatering.test",
  city: "Austin",
  state: "TX",
  postalCode: "78701",
  country: "US",
  about: "Full-service catering for trust-centered events.",
  servicesJson: [
    {
      name: "Dinner service",
      category: "Catering",
      description: "Plated and buffet dinner service.",
      startingPrice: 8000,
      addOns: [],
    },
  ],
  availabilityJson: { serviceAreaRadiusMiles: 50 },
  paymentsJson: { depositType: "percent", depositValue: 25 },
  mediaJson: { heroImageUrl: "https://cdn.test/hero.jpg", logoUrl: null, galleryUrls: [] },
  notificationsJson: { emailEnabled: true },
};

describe("provider profile listing sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "provider-user-1" } });
    prisma.organization.findFirst.mockResolvedValue(null);
    tx.user.update.mockResolvedValue({});
    tx.organization.create.mockResolvedValue({
      id: "org-1",
      slug: "atlas-catering-co-abcd",
      name: "Atlas Catering Co",
      profileStatus: "PUBLISHED",
    });
    tx.organization.update.mockResolvedValue({
      id: "org-1",
      slug: "atlas-catering-co-abcd",
      name: "Atlas Catering Co",
      profileStatus: "PUBLISHED",
    });
    tx.listing.findFirst.mockResolvedValue(null);
    tx.listing.create.mockResolvedValue({ id: "listing-1", slug: "atlas-catering-co-abcd" });
    tx.listing.update.mockResolvedValue({ id: "listing-1", slug: "atlas-catering-co-existing" });
  });

  it("creates a public marketplace listing when a vendor publishes a profile", async () => {
    const response = await POST(request({ providerType: "vendor", draft: false, ...baseProfile }));

    expect(response.status).toBe(200);
    expect(tx.listing.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: "org-1",
        title: "Atlas Catering Co",
        type: "VENDOR",
        category: "CATERING",
        description: "Full-service catering for trust-centered events.",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        country: "US",
        website: "https://atlascatering.test",
        email: "hello@atlascatering.test",
        phone: "555-0100",
        coverImageUrl: "https://cdn.test/hero.jpg",
      }),
    });
  });

  it("updates an existing primary venue listing instead of creating a duplicate", async () => {
    prisma.organization.findFirst.mockResolvedValueOnce({ id: "org-venue-1", slug: "grand-hall", name: "Grand Hall" });
    tx.organization.update.mockResolvedValueOnce({
      id: "org-venue-1",
      slug: "grand-hall",
      name: "Grand Hall Updated",
      profileStatus: "PUBLISHED",
    });
    tx.listing.findFirst.mockResolvedValueOnce({ id: "listing-venue-1", slug: "grand-hall-main" });

    const response = await POST(request({
      providerType: "venue",
      draft: false,
      ...baseProfile,
      businessName: "Grand Hall Updated",
      providerCategory: "Venue Space",
      about: "A flexible downtown venue for private events.",
      spacesJson: [{ name: "Main hall", capacityMin: 50, capacityMax: 300, notes: "Ballroom" }],
    }));

    expect(response.status).toBe(200);
    expect(tx.listing.create).not.toHaveBeenCalled();
    expect(tx.listing.update).toHaveBeenCalledWith({
      where: { id: "listing-venue-1" },
      data: expect.objectContaining({
        title: "Grand Hall Updated",
        type: "VENUE",
        category: "VENUE_SPACE",
        description: "A flexible downtown venue for private events.",
      }),
    });
  });

  it("does not create a public listing for an unauthenticated local draft", async () => {
    auth.mockResolvedValueOnce(null);

    const response = await POST(request({ providerType: "vendor", draft: true, ...baseProfile }));

    expect(response.status).toBe(200);
    expect(tx.listing.create).not.toHaveBeenCalled();
    expect(tx.listing.update).not.toHaveBeenCalled();
  });
});
