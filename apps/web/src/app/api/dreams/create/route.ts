import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBudget } from "@/lib/parsers/budget";
import { canonicalizeEventType } from "@/lib/parsers/eventType";
import { z } from "zod";

// Request validation schema for dreams
const createDreamSchema = z.object({
  title: z.string().min(1, "Title is required"),
  eventType: z.string().optional(), // Legacy field for backward compatibility
  event_type_raw: z.string().optional(), // New free-text field
  inspiration: z.string().optional(),
  style: z.string().optional(),
  budget: z.string().optional(), // Legacy field
  budget_raw: z.string().optional(), // New free-text field
  timeline: z.string().optional(),
  mustHaves: z.array(z.string()).optional(),
});

// For now, we'll save dreams as events with a special status or in a separate collection
// In a full implementation, you might create a DreamEvent model
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const body = await request.json();

    // Validate request body
    const validationResult = createDreamSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    // Use new free-text fields if available, fall back to legacy fields
    const eventTypeRaw = validated.event_type_raw || validated.eventType || 'Dream Event';
    const budgetRaw = validated.budget_raw || validated.budget || 'Not specified';

    // Parse budget from free text
    const parsedBudget = parseBudget(budgetRaw);
    const estimatedBudget = parsedBudget.max || parsedBudget.min || 0;

    // Canonicalize event type
    const eventTypeCanonical = canonicalizeEventType(eventTypeRaw);

    // Get or create a default org for the user
    let org = await prisma.organization.findFirst({
      where: { ownerId: userId },
    });

    if (!org) {
      const slug = `user-${userId.slice(0, 8)}`;
      org = await prisma.organization.create({
        data: {
          name: "My Events",
          slug,
          type: "CLIENT_AGENCY",
          ownerId: userId,
          members: { create: { userId, role: "OWNER" } },
          settings: { create: {} },
        },
      });
    }

    // Create a "dream" event (marked as PLANNING, but in practice could be a draft/dream status)
    // Store the dream-specific data in the objective/description fields
    const dreamData = JSON.stringify({
      inspiration: validated.inspiration,
      style: validated.style,
      budget: budgetRaw,
      timeline: validated.timeline,
      mustHaves: validated.mustHaves,
      isDream: true,
    });

    const slugBase = validated.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
    const slug = `dream-${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

    // Create future date based on timeline
    const now = new Date();
    const futureDate = new Date(now);
    if (validated.timeline === "3_MONTHS") futureDate.setMonth(futureDate.getMonth() + 3);
    else if (validated.timeline === "6_MONTHS") futureDate.setMonth(futureDate.getMonth() + 6);
    else if (validated.timeline === "1_YEAR") futureDate.setFullYear(futureDate.getFullYear() + 1);
    else futureDate.setFullYear(futureDate.getFullYear() + 2); // "Someday"

    const event = await prisma.event.create({
      data: {
        orgId: org.id,
        createdById: userId,
        name: validated.title,
        slug,
        type: "OTHER", // Default legacy enum value for backward compatibility
        eventTypeRaw: eventTypeRaw,
        eventTypeCanonical: eventTypeCanonical || null,
        budgetRaw: budgetRaw,
        budgetMin: parsedBudget.min || null,
        budgetMax: parsedBudget.max || null,
        budgetCurrency: parsedBudget.currency || null,
        objective: dreamData,
        description: validated.inspiration || null,
        startAt: futureDate,
        endAt: new Date(futureDate.getTime() + 4 * 60 * 60 * 1000), // 4 hours later
        status: "PLANNING",
        budgetCents: estimatedBudget,
      },
    });

    return NextResponse.json({ dreamId: event.id, slug: event.slug });
  } catch (error) {
    console.error("Error creating dream:", error);
    return NextResponse.json({ error: "Failed to create dream event" }, { status: 500 });
  }
}

