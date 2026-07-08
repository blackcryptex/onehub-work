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

          return tx.organization.update({
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

          return tx.organization.create({
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
