import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canAccessDashboard } from "@/lib/rbac";
import { recordActivity } from "@/server/lib/activity";

export const dynamic = "force-dynamic";

type VendorSettingsInput = {
  orgName?: string;
  about?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  city?: string;
  state?: string;
  listingId?: string;
  listingTitle?: string;
  listingDescription?: string;
  listingEmail?: string;
  listingPhone?: string;
  listingWebsite?: string;
  priceTier?: number | null;
};

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function loadVendorOrg() {
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "VENDOR")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const admin = isAdmin(user);
  const org = await prisma.organization.findFirst({
    where: admin ? { type: "VENDOR" } : { ownerId: user.id, type: "VENDOR" },
    include: { listings: { orderBy: { updatedAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  if (!org) return { error: NextResponse.json({ error: "Vendor organization not found" }, { status: 404 }) };
  return { org, user };
}

export async function GET() {
  const result = await loadVendorOrg();
  if (result.error) return result.error;
  const listing = result.org!.listings[0] ?? null;

  return NextResponse.json({
    org: {
      id: result.org!.id,
      name: result.org!.name,
      slug: result.org!.slug,
      about: result.org!.about,
      contactEmail: result.org!.contactEmail,
      contactPhone: result.org!.contactPhone,
      website: result.org!.website,
      city: result.org!.city,
      state: result.org!.state,
    },
    listing: listing
      ? {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          email: listing.email,
          phone: listing.phone,
          website: listing.website,
          priceTier: listing.priceTier,
        }
      : null,
  });
}

export async function PATCH(request: NextRequest) {
  const result = await loadVendorOrg();
  if (result.error) return result.error;

  const body = (await request.json().catch(() => ({}))) as VendorSettingsInput;
  const orgName = clean(body.orgName);
  if (!orgName) return NextResponse.json({ error: "Business name is required" }, { status: 400 });

  const updatedOrg = await prisma.organization.update({
    where: { id: result.org!.id },
    data: {
      name: orgName,
      about: clean(body.about),
      contactEmail: clean(body.contactEmail),
      contactPhone: clean(body.contactPhone),
      website: clean(body.website),
      city: clean(body.city),
      state: clean(body.state),
      profileStatus: "DASHBOARD_UPDATED",
    },
  });

  let updatedListing = null;
  const listingId = body.listingId ?? result.org!.listings[0]?.id;
  if (listingId) {
    const listing = await prisma.listing.findFirst({ where: { id: listingId, orgId: result.org!.id } });
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    updatedListing = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        title: clean(body.listingTitle) ?? listing.title,
        description: clean(body.listingDescription),
        email: clean(body.listingEmail),
        phone: clean(body.listingPhone),
        website: clean(body.listingWebsite),
        priceTier: body.priceTier ?? null,
      },
    });
  }

  await recordActivity({
    orgId: updatedOrg.id,
    actorId: result.user!.id,
    action: "VENDOR_SETTINGS_UPDATED",
    target: updatedListing?.id ?? updatedOrg.id,
    meta: { source: "vendor-dashboard" },
  });

  return NextResponse.json({ org: updatedOrg, listing: updatedListing });
}
