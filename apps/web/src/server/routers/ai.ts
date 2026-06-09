import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import type { Prisma, ListingCategory } from "@prisma/client";

export const aiRouter = router({
  suggestChecklist: publicProcedure.input(z.object({ eventId: z.string() })).query(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const event = await db.event.findUniqueOrThrow({ where: { id: input.eventId }, include: { org: { include: { members: true } } } });
    const membership = event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
    // TODO: Use AI/ML to generate suggestions; for now, return template-based suggestions
    const suggestions: string[] = [];
    if (event.type === "WEDDING") {
      suggestions.push("Book venue", "Hire photographer", "Order flowers", "Select catering", "Send save-the-dates");
    } else if (event.type === "CORPORATE_GALA") {
      suggestions.push("Book venue", "Hire AV equipment", "Confirm keynote speakers", "Arrange catering", "Send invitations");
    } else {
      suggestions.push("Book venue", "Arrange catering", "Send invitations");
    }
    return { suggestions };
  }),

  suggestVendors: publicProcedure.input(z.object({
    eventId: z.string(),
    category: z.string().optional(),
  })).query(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const event = await db.event.findUniqueOrThrow({ where: { id: input.eventId }, include: { org: { include: { members: true } } } });
    const membership = event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
    // TODO: Use AI/ML to search marketplace based on event type, location, budget, etc.
    // For now, return basic marketplace search results
    const where: Prisma.ListingWhereInput = {};
    if (input.category) {
      where.category = input.category as ListingCategory;
    }
    if (event.venueCity) {
      where.city = event.venueCity;
    }
    const listings = await db.listing.findMany({
      where,
      include: { org: true, tags: true, gallery: true },
      take: 10,
      orderBy: { ratingAvg: "desc" },
    });
    return { listings };
  }),

  draftMessage: publicProcedure.input(z.object({
    context: z.object({
      type: z.enum(["negotiation", "reminder", "thank_you", "follow_up"]),
      proposalId: z.string().optional(),
      listingId: z.string().optional(),
      eventId: z.string().optional(),
      customPrompt: z.string().optional(),
    }),
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    // TODO: Use AI/ML to draft messages; for now, return template-based drafts
    const templates: Record<string, string> = {
      negotiation: "Hi,\n\nI'd like to discuss the pricing for your services. Could we schedule a call to review the proposal?\n\nBest regards",
      reminder: "Hi,\n\nJust a friendly reminder about the upcoming event. Please confirm your availability.\n\nThank you",
      thank_you: "Hi,\n\nThank you for your excellent service at our event. We really appreciate it!\n\nBest regards",
      follow_up: "Hi,\n\nFollowing up on our previous conversation. Let me know if you have any questions.\n\nBest regards",
    };
    const draft = input.context.customPrompt || templates[input.context.type] || "Hi,\n\nBest regards";
    return { draft };
  }),
});
