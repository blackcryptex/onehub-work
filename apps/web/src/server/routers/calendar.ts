import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgMember } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

export const calendarRouter = router({
  list: publicProcedure.input(z.object({
    orgSlug: z.string(),
    eventId: z.string().optional(),
    from: z.date().optional(),
    to: z.date().optional(),
  })).query(async ({ input }) => {
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug } });
    if (!org) return [];
    const where: Prisma.CalendarEventWhereInput = { orgId: org.id };
    if (input.eventId) {
      where.eventId = input.eventId;
    }
    if (input.from || input.to) {
      if (input.from && input.to) {
        const windowConditions: Prisma.CalendarEventWhereInput[] = [
          { startAt: { gte: input.from, lte: input.to } },
          { endAt: { gte: input.from, lte: input.to } },
        ];
        where.OR = windowConditions;
      } else if (input.from) {
        where.endAt = { gte: input.from };
      } else if (input.to) {
        where.startAt = { lte: input.to };
      }
    }
    return prisma.calendarEvent.findMany({ where, orderBy: { startAt: "asc" } });
  }),

  create: publicProcedure.input(z.object({
    orgSlug: z.string(),
    eventId: z.string().optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    startAt: z.date(),
    endAt: z.date(),
    allDay: z.boolean().optional(),
    location: z.string().optional(),
    visibility: z.enum(["public", "private"]).optional(),
  })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    if (!isOrgMember(user, org)) throw new Error("Forbidden");
    return prisma.calendarEvent.create({
      data: {
        orgId: org.id,
        eventId: input.eventId,
        title: input.title,
        description: input.description,
        startAt: input.startAt,
        endAt: input.endAt,
        allDay: input.allDay ?? false,
        location: input.location,
        visibility: input.visibility,
        createdById: user.id,
      },
    });
  }),

  update: publicProcedure.input(z.object({
    id: z.string(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    startAt: z.date().optional(),
    endAt: z.date().optional(),
    allDay: z.boolean().optional(),
    location: z.string().optional(),
    visibility: z.enum(["public", "private"]).optional(),
  })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const evt = await prisma.calendarEvent.findUniqueOrThrow({ where: { id: input.id }, include: { org: { include: { members: true } } } });
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    if (!isOrgMember(user, evt.org)) throw new Error("Forbidden");
    const { id, ...data } = input;
    return prisma.calendarEvent.update({ where: { id: input.id }, data });
  }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const evt = await prisma.calendarEvent.findUniqueOrThrow({ where: { id: input.id }, include: { org: { include: { members: true } } } });
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    if (!isOrgMember(user, evt.org)) throw new Error("Forbidden");
    await prisma.calendarEvent.delete({ where: { id: input.id } });
    return { success: true };
  }),

  sync: router({
    google: router({
      connect: publicProcedure.mutation(async () => {
        const session = await auth();
        const userId = session?.user?.id as string | undefined;
        if (!userId) throw new Error("Unauthorized");
        // TODO: Return Google OAuth URL; for now, stub
        console.log("[STUB] Google Calendar connect for user", userId);
        return { url: "https://accounts.google.com/oauth/authorize?client_id=...&redirect_uri=...&scope=https://www.googleapis.com/auth/calendar" };
      }),
      pull: publicProcedure.input(z.object({ accountId: z.string() })).mutation(async ({ input }) => {
        const session = await auth();
        const userId = session?.user?.id as string | undefined;
        if (!userId) throw new Error("Unauthorized");
        const account = await prisma.calendarAccount.findFirst({ where: { id: input.accountId, userId } });
        if (!account) throw new Error("Account not found");
        // TODO: Pull events from Google Calendar API
        console.log("[STUB] Pulling events from Google Calendar for account", input.accountId);
        return { count: 0 };
      }),
      push: publicProcedure.input(z.object({ accountId: z.string(), eventIds: z.array(z.string()) })).mutation(async ({ input }) => {
        const session = await auth();
        const userId = session?.user?.id as string | undefined;
        if (!userId) throw new Error("Unauthorized");
        const account = await prisma.calendarAccount.findFirst({ where: { id: input.accountId, userId } });
        if (!account) throw new Error("Account not found");
        // TODO: Push events to Google Calendar API
        console.log("[STUB] Pushing events to Google Calendar for account", input.accountId, "events", input.eventIds);
        return { count: input.eventIds.length };
      }),
    }),
    outlook: router({
      connect: publicProcedure.mutation(async () => {
        const session = await auth();
        const userId = session?.user?.id as string | undefined;
        if (!userId) throw new Error("Unauthorized");
        // TODO: Return Outlook OAuth URL
        console.log("[STUB] Outlook Calendar connect for user", userId);
        return { url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=...&redirect_uri=...&scope=https://graph.microsoft.com/Calendars.ReadWrite" };
      }),
      pull: publicProcedure.input(z.object({ accountId: z.string() })).mutation(async ({ input }) => {
        const session = await auth();
        const userId = session?.user?.id as string | undefined;
        if (!userId) throw new Error("Unauthorized");
        const account = await prisma.calendarAccount.findFirst({ where: { id: input.accountId, userId } });
        if (!account) throw new Error("Account not found");
        console.log("[STUB] Pulling events from Outlook Calendar for account", input.accountId);
        return { count: 0 };
      }),
      push: publicProcedure.input(z.object({ accountId: z.string(), eventIds: z.array(z.string()) })).mutation(async ({ input }) => {
        const session = await auth();
        const userId = session?.user?.id as string | undefined;
        if (!userId) throw new Error("Unauthorized");
        const account = await prisma.calendarAccount.findFirst({ where: { id: input.accountId, userId } });
        if (!account) throw new Error("Account not found");
        console.log("[STUB] Pushing events to Outlook Calendar for account", input.accountId, "events", input.eventIds);
        return { count: input.eventIds.length };
      }),
    }),
  }),
});
