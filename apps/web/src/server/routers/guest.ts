import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { db } from "@/server/db";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { recordActivity } from "@/server/lib/activity";
import { sendOutboundEmail } from "@/lib/outbound";
import { randomBytes } from "crypto";
import { submitGuestRsvp } from "@/lib/guest-rsvp";
import { requireEventAccess, requireEventEditAccess } from "@/server/lib/access";

export const guestRouter = router({
  list: protectedProcedure.input(z.object({ eventId: z.string() })).query(async ({ input, ctx }) => {
    await requireEventAccess(ctx.user, input.eventId);
    const guestLists = await db.guestList.findMany({
      where: { eventId: input.eventId },
      include: {
        guests: {
          include: {
            group: true,
            seat: true,
            invitations: { select: { id: true, eventId: true, guestId: true, sentAt: true, respondedAt: true, channel: true } },
          },
        },
      },
    });
    return guestLists.flatMap((guestList) =>
      guestList.guests.map((guest) => ({
        ...guest,
        invitations: guest.invitations
          ? {
              id: guest.invitations.id,
              eventId: guest.invitations.eventId,
              guestId: guest.invitations.guestId,
              sentAt: guest.invitations.sentAt,
              respondedAt: guest.invitations.respondedAt,
              channel: guest.invitations.channel,
            }
          : null,
      }))
    );
  }),

  createMany: protectedProcedure.input(z.object({
    eventId: z.string(),
    rows: z.array(z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      group: z.string().optional(),
      plusOnes: z.number().int().optional(),
      tags: z.array(z.string()).optional(),
      side: z.string().optional(),
    })),
  })).mutation(async ({ input, ctx }) => {
    const event = await requireEventEditAccess(ctx.user, input.eventId);
    let guestList = await prisma.guestList.findUnique({ where: { eventId: input.eventId } });
    if (!guestList) {
      guestList = await prisma.guestList.create({ data: { eventId: input.eventId, title: "Guest List" } });
    }
    const groups: Record<string, string> = {};
    for (const row of input.rows) {
      if (row.group && !groups[row.group]) {
        const group = await prisma.guestGroup.upsert({
          where: { id: `${guestList.id}-${row.group}` },
          create: { guestListId: guestList.id, name: row.group },
          update: {},
        });
        groups[row.group] = group.id;
      }
    }
    const guests = await prisma.guest.createMany({
      data: input.rows.map((row) => ({
        guestListId: guestList!.id,
        groupId: row.group ? groups[row.group] : undefined,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        plusOnes: row.plusOnes ?? 0,
        tags: row.tags ? (row.tags as unknown as string[]) : undefined,
        side: row.side,
        status: "PENDING",
      })),
    });
    await prisma.guestList.update({ where: { id: guestList.id }, data: { invited: { increment: guests.count } } });
    await recordActivity({ orgId: event.orgId, eventId: input.eventId, actorId: ctx.user.id, action: "GUESTS_IMPORTED", target: guestList.id, meta: { count: guests.count } });
    return { count: guests.count };
  }),

  update: protectedProcedure.input(z.object({
    guestId: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    groupId: z.string().nullable().optional(),
    plusOnes: z.number().int().optional(),
    tags: z.array(z.string()).optional(),
    side: z.string().optional(),
    status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "WAITLIST"]).optional(),
    dietary: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const guest = await prisma.guest.findUniqueOrThrow({ where: { id: input.guestId }, include: { guestList: { select: { eventId: true } } } });
    await requireEventEditAccess(ctx.user, guest.guestList.eventId);
    const { guestId, ...data } = input;
    return prisma.guest.update({ where: { id: guestId }, data: { ...data, tags: data.tags as unknown as string[] } });
  }),

  remove: protectedProcedure.input(z.object({ guestId: z.string() })).mutation(async ({ input, ctx }) => {
    const guest = await prisma.guest.findUniqueOrThrow({ where: { id: input.guestId }, include: { guestList: { select: { id: true, eventId: true } } } });
    await requireEventEditAccess(ctx.user, guest.guestList.eventId);
    await prisma.guest.delete({ where: { id: input.guestId } });
    await prisma.guestList.update({ where: { id: guest.guestListId }, data: { invited: { decrement: 1 } } });
    return { success: true };
  }),

  invite: protectedProcedure.input(z.object({
    guestIds: z.array(z.string()).optional(),
    eventId: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const event = await requireEventEditAccess(ctx.user, input.eventId);
    const guestList = await prisma.guestList.findUniqueOrThrow({ where: { eventId: input.eventId }, include: { guests: true } });
    const guests = input.guestIds ? guestList.guests.filter((g) => input.guestIds!.includes(g.id)) : guestList.guests;
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const invitations = await Promise.all(
      guests.map(async (guest) => {
        if (!guest.email) return null;
        const token = randomBytes(32).toString("hex");
        const invitation = await prisma.invitation.upsert({
          where: { guestId: guest.id },
          create: {
            eventId: input.eventId,
            guestId: guest.id,
            token,
            invitationUrl: `${baseUrl}/rsvp/${token}`,
            channel: "email",
          },
          update: {
            token,
            invitationUrl: `${baseUrl}/rsvp/${token}`,
          },
        });
        const delivery = await sendOutboundEmail({
          to: guest.email,
          subject: `RSVP for ${event.name}`,
          text: `You have been invited to ${event.name}. RSVP here: ${baseUrl}/rsvp/${token}`,
          html: `<p>You have been invited to ${event.name}.</p><p><a href="${baseUrl}/rsvp/${token}">RSVP here</a></p>`,
        });
        if (delivery.status === "SENT") {
          await prisma.invitation.update({ where: { id: invitation.id }, data: { sentAt: new Date() } });
        }
        return { invitation, delivery };
      })
    );
    const prepared = invitations.filter(Boolean).length;
    const delivered = invitations.filter((item) => item?.delivery.status === "SENT").length;
    const notConfigured = invitations.filter((item) => item?.delivery.status === "NOT_CONFIGURED").length;
    const failed = invitations.filter((item) => item?.delivery.status === "FAILED").length;
    await recordActivity({
      orgId: event.orgId,
      eventId: input.eventId,
      actorId: ctx.user.id,
      action: delivered > 0 ? "INVITATIONS_SENT" : "INVITATIONS_PREPARED",
      target: guestList.id,
      meta: { prepared, delivered, notConfigured, failed },
    });
    return {
      count: prepared,
      delivered,
      status: delivered > 0 ? "SENT" : notConfigured > 0 ? "NOT_CONFIGURED" : failed > 0 ? "FAILED" : "NOT_CONFIGURED",
      message: delivered > 0
        ? `${delivered} guest invitation email${delivered === 1 ? "" : "s"} sent through the configured outbound provider.`
        : failed > 0
          ? "Guest invitation links were prepared, but outbound email delivery failed; no sent claim was recorded."
          : "Guest invitation links were prepared, but outbound email is not configured; no guest email was sent by OneHub.",
    };
  }),

  rsvp: publicProcedure.input(z.object({
    token: z.string(),
    status: z.enum(["ACCEPTED", "DECLINED"]),
    dietary: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    return submitGuestRsvp(input);
  }),
});
