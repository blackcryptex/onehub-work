import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgMember, canManageEvent, canViewEvent, canEditEvent, canDeleteEvent, isPlanner } from "@/lib/rbac";
import { recordActivity } from "@/server/lib/activity";
import type { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { trackError } from "@/lib/errorTracker";

const createSchema = z.object({
  orgSlug: z.string(),
  name: z.string().min(2),
  type: z.enum(["WEDDING","CORPORATE_GALA","FUNDRAISER","BIRTHDAY","CONFERENCE","FESTIVAL","SPORTS","OTHER"]),
  startAt: z.string().or(z.date()).transform((v) => new Date(v as string | Date)),
  endAt: z.string().or(z.date()).transform((v) => new Date(v as string | Date)),
  objective: z.string().optional(),
  guestTarget: z.number().int().optional(),
  location: z.object({ city: z.string().optional(), state: z.string().optional(), country: z.string().optional() }).optional(),
});

export const eventRouter = router({
  create: publicProcedure.input(createSchema).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    if (!isOrgMember(user, org)) throw new Error("Forbidden");
    const slugBase = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    const ev = await prisma.event.create({
      data: {
        orgId: org.id,
        createdById: user.id,
        name: input.name,
        slug,
        type: input.type,
        objective: input.objective,
        startAt: input.startAt,
        endAt: input.endAt,
        venueCity: input.location?.city,
        venueState: input.location?.state,
        venueCountry: input.location?.country ?? "US",
        guestTarget: input.guestTarget,
      },
    });
    await recordActivity({ orgId: org.id, eventId: ev.id, actorId: user.id, action: "EVENT_CREATED", target: ev.id });
    
    // Structured logging
    logger.info({
      userId: user.id,
      orgId: org.id,
      eventId: ev.id,
      eventSlug: ev.slug,
      eventName: ev.name,
      route: "trpc.event.create",
    }, "event.created");
    
    return ev;
  }),
  list: publicProcedure.input(z.object({ orgSlug: z.string(), status: z.enum(["PLANNING","ACTIVE","ON_HOLD","COMPLETED","CANCELED"]).optional(), q: z.string().optional(), cursor: z.string().optional(), limit: z.number().min(1).max(100).default(20) })).query(async ({ input }) => {
    const user = await getCurrentUser();
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug } });
    if (!org) return { items: [], nextCursor: undefined };
    
    // Planner isolation: planners only see events they created
    const where: Prisma.EventWhereInput = { orgId: org.id };
    if (user && isPlanner(user)) {
      // Planner can only see their own events
      where.createdById = user.id;
    }
    // Admin and org owners see all events in the org (no createdById filter)
    
    if (input.status) where.status = input.status;
    if (input.q) where.name = { contains: input.q, mode: "insensitive" };
    const items = await prisma.event.findMany({ where, take: input.limit + 1, orderBy: { createdAt: "desc" }, cursor: input.cursor ? { id: input.cursor } : undefined });
    let nextCursor: string | undefined;
    if (items.length > input.limit) {
      const next = items.pop();
      nextCursor = next?.id;
    }
    return { items, nextCursor };
  }),
  getBySlug: publicProcedure.input(z.object({ orgSlug: z.string(), eventSlug: z.string() })).query(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    const ev = await prisma.event.findFirst({ where: { orgId: org.id, slug: input.eventSlug }, include: { budgetLines: true, tasks: true, milestones: true, org: { include: { members: true } } } });
    if (!ev) throw new Error("Event not found");
    // Centralized permission check with planner isolation: see apps/web/src/lib/rbac.ts
    if (!canViewEvent(user, ev)) throw new Error("Forbidden");
    return ev;
  }),
  update: publicProcedure.input(z.object({ eventId: z.string(), data: z.object({ name: z.string().optional(), objective: z.string().optional(), description: z.string().optional(), startAt: z.date().optional(), endAt: z.date().optional(), guestTarget: z.number().int().optional() }) })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const ev0 = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId }, include: { org: { include: { members: true } } } });
    // Centralized permission check with planner isolation: see apps/web/src/lib/rbac.ts
    if (!canEditEvent(user, ev0)) throw new Error("Forbidden");

    // Ensure only valid fields and coerce Date -> ISO for activity meta
    const updateData: Record<string, any> = {};
    if ('name' in input.data) updateData.name = input.data.name;
    if ('objective' in input.data) updateData.objective = input.data.objective;
    if ('description' in input.data) updateData.description = input.data.description;
    if ('startAt' in input.data) updateData.startAt = input.data.startAt;
    if ('endAt' in input.data) updateData.endAt = input.data.endAt;
    if ('guestTarget' in input.data) updateData.guestTarget = input.data.guestTarget;

    const ev = await prisma.event.update({ where: { id: input.eventId }, data: updateData });

    // For recordActivity.meta, ensure no Date fields: convert to ISO string if needed
    const meta: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value instanceof Date) {
        meta[key] = value.toISOString();
      } else {
        meta[key] = value;
      }
    }

    await recordActivity({
      orgId: ev.orgId,
      eventId: ev.id,
      actorId: user.id,
      action: "EVENT_UPDATED",
      target: ev.id,
      meta,
    });

    return ev;
  }),
  setStatus: publicProcedure.input(z.object({ eventId: z.string(), status: z.enum(["PLANNING","ACTIVE","ON_HOLD","COMPLETED","CANCELED"]) })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const ev0 = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId }, include: { org: { include: { members: true } } } });
    // Centralized permission check with planner isolation: see apps/web/src/lib/rbac.ts
    if (!canEditEvent(user, ev0)) throw new Error("Forbidden");
    const ev = await prisma.event.update({ where: { id: input.eventId }, data: { status: input.status } });
    await recordActivity({ orgId: ev.orgId, eventId: ev.id, actorId: user.id, action: "EVENT_STATUS_SET", target: ev.id, meta: { status: input.status } });
    return ev;
  }),
});
