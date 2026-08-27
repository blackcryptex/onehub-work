import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { NextRequest } from "next/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { auth, getCurrentUser, prisma, routerRefresh } = vi.hoisted(() => {
  const prisma = {
    event: { findUnique: vi.fn() },
    listing: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    organization: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    user: { update: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  return {
    auth: vi.fn(),
    getCurrentUser: vi.fn(),
    prisma,
    routerRefresh: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser, isAdmin: () => false }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
  useRouter: () => ({ refresh: routerRefresh }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("lucide-react", () => ({
  CheckCircle2: () => <span aria-hidden="true" />,
  Loader2: () => <span aria-hidden="true" />,
  Plus: () => <span aria-hidden="true" />,
  X: () => <span aria-hidden="true" />,
}));

import MarketplacePage from "../src/app/marketplace/page";
import ListingProfile from "../src/app/marketplace/[slug]/page";
import { BookingRequestModal } from "../src/components/bookings/BookingRequestModal";
import { POST } from "../src/app/api/providers/profile/route";

const providerOrg = {
  id: "provider-org-1",
  name: "Avery Florals LLC",
  type: "VENDOR",
  ownerId: "provider-user-1",
  profileStatus: "PUBLISHED",
  about: "Family-owned floral studio with documented wedding packages.",
  contactEmail: "hello@avery.example",
  contactPhone: "555-0100",
  website: "https://avery.example",
  instagram: "averyflorals",
  facebook: null,
  addressLine1: "1 Peachtree St",
  city: "Atlanta",
  state: "GA",
  postalCode: "30303",
  country: "US",
  servicesJson: {
    services: [
      { name: "Premium floral package", description: "Ceremony flowers and reception centerpieces.", startingPrice: 2500, maxGuests: 180 },
    ],
  },
  spacesJson: null,
  availabilityJson: { minNoticeDays: 14 },
  paymentsJson: { depositPercent: "25%", finalDue: "14 days before event" },
  mediaJson: { gallery: [{ url: "https://img.example/cover.jpg" }] },
  notificationsJson: { responseTimeLabel: "Usually responds within 1 business day" },
  updatedAt: new Date("2026-08-20T00:00:00.000Z"),
};

const listing = {
  id: "listing-1",
  orgId: "provider-org-1",
  slug: "avery-florals",
  title: "Avery Florals",
  type: "VENDOR",
  category: "DECOR_FLORAL",
  description: "Wedding floral design with on-platform booking requests.",
  website: "https://avery.example",
  phone: "555-0100",
  email: "hello@avery.example",
  minGuests: 25,
  maxGuests: 180,
  priceTier: 3,
  street: null,
  city: "Atlanta",
  state: "GA",
  country: "US",
  postalCode: "30303",
  latitude: null,
  longitude: null,
  coverImageUrl: null,
  ratingAvg: 4.8,
  ratingCount: 7,
  org: providerOrg,
  tags: [{ id: "tag-1", value: "Weddings" }],
  gallery: [],
  offers: [{ id: "offer-1", name: "Ceremony florals", description: "Bouquets and ceremony arch", priceCents: 250000, unit: "event" }],
  availSlots: [{ id: "slot-1", startAt: new Date("2027-06-14T00:00:00.000Z"), endAt: new Date("2027-06-15T23:59:00.000Z"), status: "AVAILABLE" }],
  reviews: [],
  updatedAt: new Date("2026-08-21T00:00:00.000Z"),
};

const event = {
  id: "event-1",
  name: "Smith Wedding Weekend",
  slug: "smith-wedding-weekend",
  orgId: "planner-org-1",
  createdById: "planner-user-1",
  type: "WEDDING",
  eventTypeCanonical: "Wedding",
  eventTypeRaw: null,
  startAt: new Date("2027-06-14T17:00:00.000Z"),
  endAt: new Date("2027-06-15T02:00:00.000Z"),
  venueCity: "Atlanta",
  venueState: "GA",
  guestTarget: 150,
  budgetCents: 5000000,
  org: { ownerId: "planner-user-1", members: [{ userId: "planner-user-1", role: "OWNER" }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: "planner-user-1", role: "PRO_PLANNER" });
  auth.mockResolvedValue({ user: { id: "provider-user-1" } });
  prisma.event.findUnique.mockResolvedValue(event);
  prisma.listing.findMany.mockResolvedValue([listing]);
  prisma.listing.findUnique.mockResolvedValue(listing);
  prisma.listing.findFirst.mockResolvedValue(null);
  prisma.listing.create.mockResolvedValue({ id: "listing-new", slug: "avery-florals-ab12" });
  prisma.organization.findFirst.mockResolvedValue(null);
  prisma.organization.create.mockResolvedValue({ id: "provider-org-1", slug: "avery-florals-xy12", name: "Avery Florals LLC", profileStatus: "PUBLISHED" });
  prisma.organization.update.mockResolvedValue({ id: "provider-org-1", slug: "avery-florals-xy12", name: "Avery Florals LLC", profileStatus: "PUBLISHED" });
  prisma.user.update.mockResolvedValue({ id: "provider-user-1", role: "VENDOR" });
});

describe("provider profile publish, marketplace discovery, and event-smart request flow", () => {
  it("syncs a published provider profile to a real on-platform marketplace listing", async () => {
    const response = await POST(new Request("http://localhost/api/providers/profile", {
      method: "POST",
      body: JSON.stringify({
        providerType: "vendor",
        draft: false,
        businessName: "Avery Florals LLC",
        providerCategory: "florist",
        contactEmail: "hello@avery.example",
        contactPhone: "555-0100",
        website: "https://avery.example",
        city: "Atlanta",
        state: "GA",
        about: "Family-owned floral studio.",
        servicesJson: { services: [{ name: "Premium floral package", startingPrice: 2500, maxGuests: 180 }] },
        mediaJson: { gallery: [{ url: "https://img.example/cover.jpg" }] },
      }),
    }) as unknown as NextRequest);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ listingSynced: true, status: "PUBLISHED" }));
    expect(prisma.listing.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orgId: "provider-org-1",
        title: "Avery Florals LLC",
        type: "VENDOR",
        category: "DECOR_FLORAL",
        city: "Atlanta",
        maxGuests: 180,
      }),
    }));
  });

  it("renders marketplace cards with trust, fit, response, review count, and preserved event context", async () => {
    render(await MarketplacePage({
      searchParams: Promise.resolve({
        eventId: "event-1",
        eventSlug: "smith-wedding-weekend",
        eventName: "Smith Wedding Weekend",
        location: "Atlanta",
        returnTo: "/pro/planner/vault/smith-wedding-weekend",
        verified: "on-platform",
      }),
    }));

    expect(screen.getByText("Browsing for Smith Wedding Weekend")).toBeInTheDocument();
    expect(screen.getByText("On-platform profile")).toBeInTheDocument();
    expect(screen.getByText("Selected event appears available")).toBeInTheDocument();
    expect(screen.getByText("Usually responds within 1 business day")).toBeInTheDocument();
    expect(screen.getByText("⭐ 4.8 (7 reviews)")).toBeInTheDocument();
    expect(screen.getByText("View details, shortlist, or request").closest("a")).toHaveAttribute(
      "href",
      expect.stringContaining("eventId=event-1"),
    );
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
    expect(screen.queryByText("Create account")).not.toBeInTheDocument();
  });

  it("strips stale or unauthorized event query context from marketplace discovery links", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "other-planner", role: "PRO_PLANNER" });

    render(await MarketplacePage({
      searchParams: Promise.resolve({
        eventId: "event-1",
        eventSlug: "smith-wedding-weekend",
        eventName: "Smith Wedding Weekend",
        location: "Atlanta",
        returnTo: "/pro/planner/vault/smith-wedding-weekend",
      }),
    }));

    expect(screen.queryByText("Browsing for Smith Wedding Weekend")).not.toBeInTheDocument();
    expect(screen.getByText("View trusted profile").closest("a")).toHaveAttribute(
      "href",
      "/marketplace/avery-florals?location=Atlanta",
    );
    expect(screen.queryByText("View details, shortlist, or request")).not.toBeInTheDocument();
  });

  it("renders listing detail profile trust fields, packages, policies, and event-smart request defaults", async () => {
    render(await ListingProfile({
      params: Promise.resolve({ slug: "avery-florals" }),
      searchParams: Promise.resolve({
        eventId: "event-1",
        eventSlug: "smith-wedding-weekend",
        eventName: "Smith Wedding Weekend",
        returnTo: "/pro/planner/vault/smith-wedding-weekend",
      }),
    }));

    expect(screen.getByText("Trust and request readiness")).toBeInTheDocument();
    expect(screen.getByText(/not a license, insurance, availability, or payment guarantee/i)).toBeInTheDocument();
    expect(screen.getByText("Premium floral package")).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request booking for this event" }));
    expect(screen.getByText("Event context attached")).toBeInTheDocument();
    expect(screen.getByDisplayValue("150")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Requesting availability and quote for Smith Wedding Weekend/)).toBeInTheDocument();
  });

  it("does not render event-linked shortlist or request actions for unauthorized event context", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "other-planner", role: "PRO_PLANNER" });

    render(await ListingProfile({
      params: Promise.resolve({ slug: "avery-florals" }),
      searchParams: Promise.resolve({
        eventId: "event-1",
        eventSlug: "smith-wedding-weekend",
        eventName: "Smith Wedding Weekend",
        eventDate: "2027-06-14T17:00",
        guests: "150",
        location: "Atlanta",
        returnTo: "/pro/planner/vault/smith-wedding-weekend",
      }),
    }));

    expect(screen.queryByText("Viewing this listing for Smith Wedding Weekend")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add to shortlist/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request booking for this event" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request from event workspace" })).toBeDisabled();
    expect(screen.queryByText(/Booking requests from this page will be linked/i)).not.toBeInTheDocument();
    expect(screen.getByText("Select or create an event to shortlist or request booking.")).toBeInTheDocument();
  });

  it("posts event-smart booking request payload without inventing fallback listing ids", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ success: true, id: "request-1" }) } as Response);
    render(
      <BookingRequestModal
        listingId="listing-1"
        listingTitle="Avery Florals"
        eventId="event-1"
        eventName="Smith Wedding Weekend"
        eventStartAt="2027-06-14T17:00"
        eventEndAt="2027-06-15T02:00"
        eventGuests={150}
        eventLocation="Atlanta, GA"
        onClose={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText("Contact Name *"), { target: { value: "Maya Client" } });
    fireEvent.change(screen.getByLabelText("Contact Email *"), { target: { value: "maya@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/bookings/request", expect.objectContaining({ method: "POST" }));
    });
    const payload = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(payload).toEqual(expect.objectContaining({
      listingId: "listing-1",
      eventId: "event-1",
      guests: 150,
      message: expect.stringContaining("Smith Wedding Weekend"),
    }));
    expect(payload.listingId).not.toMatch(/fallback|sample/i);
    fetchMock.mockRestore();
  });
});
