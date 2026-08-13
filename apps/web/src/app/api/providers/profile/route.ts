import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for provider profile data
const providerProfileSchema = z.object({
  providerType: z.enum(["vendor", "venue"]),
  draft: z.boolean().default(false),
  // Step 1: Business Profile
  businessName: z.string().min(1).optional(),
  providerCategory: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  facebook: z.string().url().optional().or(z.literal("")),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  about: z.string().optional(),
  // Step 2-6: JSON fields
  servicesJson: z.any().optional().nullable(),
  spacesJson: z.any().optional().nullable(),
  availabilityJson: z.any().optional().nullable(),
  paymentsJson: z.any().optional().nullable(),
  mediaJson: z.any().optional().nullable(),
  notificationsJson: z.any().optional().nullable(),
});

type ProviderProfileData = z.infer<typeof providerProfileSchema>;

function slugify(value: string, maxLength = 50) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, maxLength);
  return slug || "provider-profile";
}

function listingCategoryFor(providerType: ProviderProfileData["providerType"], providerCategory?: string | null) {
  if (providerType === "venue") return "VENUE_SPACE";

  const normalized = (providerCategory || "").toLowerCase();
  if (normalized.includes("cater")) return "CATERING";
  if (normalized.includes("flor") || normalized.includes("decor")) return "DECOR_FLORAL";
  if (normalized.includes("entertain") || normalized.includes("music") || normalized.includes("dj")) return "ENTERTAINMENT";
  if (normalized.includes("photo") || normalized.includes("video")) return "PHOTO_VIDEO";
  if (normalized.includes("transport")) return "TRANSPORT";
  if (normalized.includes("staff")) return "STAFFING";
  if (normalized.includes("plan")) return "PLANNING_SERVICES";
  if (normalized.includes("rental")) return "RENTALS";
  return "OTHER";
}

function firstNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function listingDescription(data: ProviderProfileData) {
  if (data.about?.trim()) return data.about.trim();

  const service = Array.isArray(data.servicesJson) ? data.servicesJson[0] : null;
  if (service && typeof service === "object") {
    const description = (service as { description?: unknown }).description;
    if (typeof description === "string" && description.trim()) return description.trim();
  }

  const space = Array.isArray(data.spacesJson) ? data.spacesJson[0] : null;
  if (space && typeof space === "object") {
    const notes = (space as { notes?: unknown }).notes;
    if (typeof notes === "string" && notes.trim()) return notes.trim();
  }

  return null;
}

function listingCapacity(data: ProviderProfileData) {
  const firstSpace = Array.isArray(data.spacesJson) ? data.spacesJson[0] : null;
  if (!firstSpace || typeof firstSpace !== "object") return { minGuests: null, maxGuests: null };
  return {
    minGuests: firstNumber((firstSpace as { capacityMin?: unknown }).capacityMin),
    maxGuests: firstNumber((firstSpace as { capacityMax?: unknown }).capacityMax),
  };
}

function coverImageUrl(mediaJson: unknown) {
  if (!mediaJson || typeof mediaJson !== "object") return null;
  const media = mediaJson as { heroImageUrl?: unknown; logoUrl?: unknown; galleryUrls?: unknown };
  if (typeof media.heroImageUrl === "string" && media.heroImageUrl.trim()) return media.heroImageUrl.trim();
  if (Array.isArray(media.galleryUrls) && typeof media.galleryUrls[0] === "string") return media.galleryUrls[0];
  if (typeof media.logoUrl === "string" && media.logoUrl.trim()) return media.logoUrl.trim();
  return null;
}

async function syncPublishedListing(tx: any, org: { id: string; slug: string; name: string }, data: ProviderProfileData) {
  const listingType = data.providerType === "vendor" ? "VENDOR" : "VENUE";
  const title = data.businessName || org.name;
  const listingSlugBase = slugify(title);
  const capacity = listingCapacity(data);
  const listingData = {
    title,
    type: listingType,
    category: listingCategoryFor(data.providerType, data.providerCategory),
    description: listingDescription(data),
    website: data.website || null,
    phone: data.contactPhone || null,
    email: data.contactEmail || null,
    city: data.city || null,
    state: data.state || null,
    country: data.country || "US",
    postalCode: data.postalCode || null,
    coverImageUrl: coverImageUrl(data.mediaJson),
    minGuests: capacity.minGuests,
    maxGuests: capacity.maxGuests,
  };

  const existingListing = await tx.listing.findFirst({
    where: {
      orgId: org.id,
      type: listingType,
      OR: [
        { title },
        { slug: { startsWith: listingSlugBase } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existingListing) {
    return tx.listing.update({
      where: { id: existingListing.id },
      data: listingData,
    });
  }

  return tx.listing.create({
    data: {
      orgId: org.id,
      slug: `${listingSlugBase}-${Math.random().toString(36).slice(2, 6)}`,
      ...listingData,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    
    // Validate the request body
    const validationResult = providerProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    const { providerType, draft, businessName, ...profileData } = data;

    // If publishing (not draft), require auth
    if (!draft && !session?.user?.id) {
      return NextResponse.json({ error: "Authentication required to publish" }, { status: 401 });
    }

    const userId = session?.user?.id as string | undefined;
    const orgType = providerType === "vendor" ? "VENDOR" : "VENUE";
    const targetUserRole = providerType === "vendor" ? "VENDOR" : "VENUE";
    const name = businessName || `${providerType} Profile`;

    // For drafts without auth, just return success (could store in sessionStorage or a drafts table later)
    if (draft && !userId) {
      return NextResponse.json({
        success: true,
        message: "Draft saved locally",
        providerType,
        businessName: data.businessName,
        servicesJson: data.servicesJson,
        spacesJson: data.spacesJson,
        availabilityJson: data.availabilityJson,
        paymentsJson: data.paymentsJson,
        mediaJson: data.mediaJson,
        notificationsJson: data.notificationsJson,
      });
    }

    // For publish or authenticated draft, save to database
    if (userId) {
      // Generate slug
      const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
      const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

      // Check if user already has an org of this type
      const existingOrg = await prisma.organization.findFirst({
        where: {
          ownerId: userId,
          type: orgType,
        },
      });

      const profileStatus = draft ? "DRAFT" : "PUBLISHED";

      if (existingOrg) {
        // Update existing org with all provider profile data
        const updatedOrg = await prisma.$transaction(async (tx: any) => {
          if (!draft) {
            await tx.user.update({
              where: { id: userId },
              data: { role: targetUserRole },
            });
          }

          const updatedOrg = await tx.organization.update({
            where: { id: existingOrg.id },
            data: {
              name: businessName || name,
              contactEmail: profileData.contactEmail || null,
              contactPhone: profileData.contactPhone || null,
              website: profileData.website || null,
              instagram: profileData.instagram || null,
              facebook: profileData.facebook || null,
              addressLine1: profileData.addressLine1 || null,
              addressLine2: profileData.addressLine2 || null,
              city: profileData.city || null,
              state: profileData.state || null,
              postalCode: profileData.postalCode || null,
              country: profileData.country || "US",
              about: profileData.about || null,
              servicesJson: profileData.servicesJson || null,
              spacesJson: profileData.spacesJson || null,
              availabilityJson: profileData.availabilityJson || null,
              paymentsJson: profileData.paymentsJson || null,
              mediaJson: profileData.mediaJson || null,
              notificationsJson: profileData.notificationsJson || null,
              profileStatus,
            } as any, // Type assertion needed until TypeScript server picks up regenerated Prisma types
          });

          if (!draft) {
            await syncPublishedListing(tx, updatedOrg, data);
          }

          return updatedOrg;
        });
        return NextResponse.json({
          orgId: updatedOrg.id,
          slug: updatedOrg.slug,
          name: updatedOrg.name,
          providerType,
          businessName: updatedOrg.name,
          status: (updatedOrg as any).profileStatus,
          // Echo back the JSON fields that were sent (whether saved to DB or not)
          servicesJson: profileData.servicesJson ?? null,
          spacesJson: profileData.spacesJson ?? null,
          availabilityJson: profileData.availabilityJson ?? null,
          paymentsJson: profileData.paymentsJson ?? null,
          mediaJson: profileData.mediaJson ?? null,
          notificationsJson: profileData.notificationsJson ?? null,
        });
      } else {
        // Create new org with all provider profile data
        const org = await prisma.$transaction(async (tx: any) => {  // typed as any to avoid ambient Prisma type drift in current repo state
          if (!draft) {
            await tx.user.update({
              where: { id: userId },
              data: { role: targetUserRole },
            });
          }

          const org = await tx.organization.create({
            data: {
              name: businessName || name,
              slug,
              type: orgType,
              ownerId: userId,
              contactEmail: profileData.contactEmail || null,
              contactPhone: profileData.contactPhone || null,
              website: profileData.website || null,
              instagram: profileData.instagram || null,
              facebook: profileData.facebook || null,
              addressLine1: profileData.addressLine1 || null,
              addressLine2: profileData.addressLine2 || null,
              city: profileData.city || null,
              state: profileData.state || null,
              postalCode: profileData.postalCode || null,
              country: profileData.country || "US",
              about: profileData.about || null,
              servicesJson: profileData.servicesJson || null,
              spacesJson: profileData.spacesJson || null,
              availabilityJson: profileData.availabilityJson || null,
              paymentsJson: profileData.paymentsJson || null,
              mediaJson: profileData.mediaJson || null,
              notificationsJson: profileData.notificationsJson || null,
              profileStatus,
              members: { create: { userId, role: "OWNER" } },
              settings: { create: {} },
            } as any, // Type assertion needed until TypeScript server picks up regenerated Prisma types
          });

          if (!draft) {
            await syncPublishedListing(tx, org, data);
          }

          return org;
        });
        return NextResponse.json({
          orgId: org.id,
          slug: org.slug,
          name: org.name,
          providerType,
          businessName: org.name,
          status: (org as any).profileStatus,
          // Echo back the JSON fields that were sent (whether saved to DB or not)
          servicesJson: profileData.servicesJson ?? null,
          spacesJson: profileData.spacesJson ?? null,
          availabilityJson: profileData.availabilityJson ?? null,
          paymentsJson: profileData.paymentsJson ?? null,
          mediaJson: profileData.mediaJson ?? null,
          notificationsJson: profileData.notificationsJson ?? null,
        });
      }
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Error saving provider profile:", error);
    const prismaError = error as { code?: unknown; message?: unknown };
    if (prismaError && prismaError.code === "P2002") {
      return NextResponse.json({ error: "A profile with this name already exists" }, { status: 400 });
    }
    const message =
      typeof prismaError.message === "string" && prismaError.message.length > 0
        ? prismaError.message
        : "Failed to save profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
