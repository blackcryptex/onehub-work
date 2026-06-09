import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { recordActivity } from "@/server/lib/activity";
import { randomBytes } from "crypto";

export const guestRouter = router({
  list: publicProcedure.input(z.object({ eventId: z.string() })).query(async ({ input }) => {
    const event = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId }, include: { guestLists: { include: { guests: { include: { group: true, seat: true, invitations: true } } } } } });
    const guestList = event.guestLists;
    if (!guestList) return [];
    return guestList.guests;
  }),

  createMany: publicProcedure.input(z.object({
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
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const event = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId }, include: { org: { include: { members: true } } } });
    const membership = event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
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
    await recordActivity({ orgId: event.orgId, eventId: input.eventId, actorId: userId, action: "GUESTS_IMPORTED", target: guestList.id, meta: { count: guests.count } });
    return { count: guests.count };
  }),

  update: publicProcedure.input(z.object({
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
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const guest = await prisma.guest.findUniqueOrThrow({ where: { id: input.guestId }, include: { guestList: { include: { event: { include: { org: { include: { members: true } } } } } } } });
    const membership = guest.guestList.event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
    const { guestId, ...data } = input;
    return prisma.guest.update({ where: { id: guestId }, data: { ...data, tags: data.tags as unknown as string[] } });
  }),

  remove: publicProcedure.input(z.object({ guestId: z.string() })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const guest = await prisma.guest.findUniqueOrThrow({ where: { id: input.guestId }, include: { guestList: { include: { event: { include: { org: { include: { members: true } } } } } } } });
    const membership = guest.guestList.event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
    await prisma.guest.delete({ where: { id: input.guestId } });
    await prisma.guestList.update({ where: { id: guest.guestListId }, data: { invited: { decrement: 1 } } });
    return { success: true };
  }),

  invite: publicProcedure.input(z.object({
    guestIds: z.array(z.string()).optional(),
    eventId: z.string(),
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const event = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId }, include: { org: { include: { members: true } } } });
    const membership = event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
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
        // TODO: Send email via Wave 1/2 placeholder
        console.log(`[STUB] Sending invitation email to ${guest.email} for event ${input.eventId}`);
        await prisma.invitation.update({ where: { id: invitation.id }, data: { sentAt: new Date() } });
        return invitation;
      })
    );
    await recordActivity({ orgId: event.orgId, eventId: input.eventId, actorId: userId, action: "INVITATIONS_SENT", target: guestList.id, meta: { count: invitations.filter(Boolean).length } });
    return { count: invitations.filter(Boolean).length };
  }),

  rsvp: publicProcedure.input(z.object({
    token: z.string(),
    status: z.enum(["ACCEPTED", "DECLINED"]),
    dietary: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const invitation = await prisma.invitation.findUniqueOrThrow({ where: { token: input.token }, include: { guest: { include: { guestList: true } } } });
    const guest = invitation.guest;
    await prisma.guest.update({
      where: { id: guest.id },
      data: {
        status: input.status,
        dietary: input.dietary,
        notes: input.notes,
      },
    });
    await prisma.invitation.update({ where: { id: invitation.id }, data: { respondedAt: new Date() } });
    const rsvpCount = await prisma.guest.count({ where: { guestListId: guest.guestListId, status: { in: ["ACCEPTED", "DECLINED"] } } });
    await prisma.guestList.update({ where: { id: guest.guestListId }, data: { rsvped: rsvpCount } });
    return { success: true, guestId: guest.id };
  }),
});
