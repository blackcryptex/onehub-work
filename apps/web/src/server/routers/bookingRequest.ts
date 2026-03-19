import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner } from "@/lib/rbac";
import { recordActivity } from "@/server/lib/activity";
import { notify } from "@/server/routers/notification";

export const bookingRequestRouter = router({
  create: publicProcedure.input(z.object({ orgSlug: z.string(), eventId: z.string(), listingId: z.string(), startAt: z.date(), endAt: z.date(), guests: z.number().int().optional(), message: z.string().optional(), contact: z.object({ name: z.string(), email: z.string().email(), phone: z.string().optional() }) })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug } });
    if (!org) throw new Error("Org not found");
    const ev = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId } });
    if (ev.orgId !== org.id) throw new Error("Event not in org");
    const listing = await prisma.listing.findUniqueOrThrow({ where: { id: input.listingId } });
    const req = await prisma.bookingRequest.create({
      data: {
        orgId: org.id,
        eventId: input.eventId,
        listingId: input.listingId,
        startAt: input.startAt,
        endAt: input.endAt,
        guests: input.guests,
        message: input.message,
        contactName: input.contact.name,
        contactEmail: input.contact.email,
        contactPhone: input.contact.phone,
      },
    });
    await recordActivity({ orgId: org.id, eventId: input.eventId, actorId: userId, action: "BOOKING_REQUEST_CREATED", target: req.id });
    const listingOrg = await prisma.organization.findUniqueOrThrow({ where: { id: listing.orgId } });
    for (const m of await prisma.membership.findMany({ where: { orgId: listingOrg.id, role: { in: ["OWNER", "ADMIN"] } } })) {
      await notify(m.userId, { orgId: listingOrg.id, type: "BOOKING_REQUEST", title: `New booking request: ${listing.title}`, body: `From ${input.contact.name}`, link: `/app/requests` });
    }
    return req;
  }),
  listForListing: publicProcedure.input(z.object({ listingId: z.string() })).query(async ({ input }) => {
    const listing = await prisma.listing.findUniqueOrThrow({ where: { id: input.listingId }, include: { org: { include: { members: true } } } });
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = listing.org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, listing.org, mem)) throw new Error("Forbidden");
    return prisma.bookingRequest.findMany({ where: { listingId: input.listingId }, include: { event: true, org: true }, orderBy: { createdAt: "desc" } });
  }),
  listForOrg: publicProcedure.input(z.object({ orgSlug: z.string() })).query(async ({ input }) => {
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug } });
    if (!org) return [];
    return prisma.bookingRequest.findMany({ where: { orgId: org.id }, include: { listing: true, event: true }, orderBy: { createdAt: "desc" } });
  }),
  setStatus: publicProcedure.input(z.object({ id: z.string(), status: z.enum(["PENDING","HOLD","QUOTED","DECLINED","EXPIRED","WITHDRAWN"]) })).mutation(async ({ input }) => {
    const req = await prisma.bookingRequest.findUniqueOrThrow({ where: { id: input.id }, include: { listing: { include: { org: { include: { members: true } } } } } });
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = req.listing.org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, req.listing.org, mem)) throw new Error("Forbidden");
    const updated = await prisma.bookingRequest.update({ where: { id: input.id }, data: { status: input.status } });
    await recordActivity({ orgId: req.listing.orgId, actorId: user.id, action: "BOOKING_REQUEST_STATUS_SET", target: req.id, meta: { status: input.status } });
    return updated;
  }),
  quote: publicProcedure.input(z.object({ id: z.string(), quoteCents: z.number().int().nonnegative(), note: z.string().optional() })).mutation(async ({ input }) => {
    const req = await prisma.bookingRequest.findUniqueOrThrow({ where: { id: input.id }, include: { listing: { include: { org: { include: { members: true } } } } } });
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = req.listing.org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, req.listing.org, mem)) throw new Error("Forbidden");
    const updated = await prisma.bookingRequest.update({ where: { id: input.id }, data: { status: "QUOTED", quoteCents: input.quoteCents, notes: input.note } });
    // TODO: Find user by email and notify; for now, notification appears when viewing requests
    return updated;
  }),
});

