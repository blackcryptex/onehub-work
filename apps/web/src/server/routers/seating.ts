import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { recordActivity } from "@/server/lib/activity";

export const seatingRouter = router({
  getPlan: publicProcedure.input(z.object({ eventId: z.string() })).query(async ({ input }) => {
    const plan = await db.seatingPlan.findUnique({
      where: { eventId: input.eventId },
      include: { tables: { include: { seats: { include: { guest: true } } } } },
    });
    return plan;
  }),

  createPlan: publicProcedure.input(z.object({
    eventId: z.string(),
    title: z.string().optional(),
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const event = await db.event.findUniqueOrThrow({ where: { id: input.eventId }, include: { org: { include: { members: true } } } });
    const membership = event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
    const plan = await db.seatingPlan.upsert({
      where: { eventId: input.eventId },
      create: { eventId: input.eventId, title: input.title ?? "Main Floor" },
      update: { title: input.title ?? "Main Floor" },
    });
    await recordActivity({ orgId: event.orgId, eventId: input.eventId, actorId: userId, action: "SEATING_PLAN_CREATED", target: plan.id });
    return plan;
  }),

  createTable: publicProcedure.input(z.object({
    seatingPlanId: z.string(),
    name: z.string(),
    capacity: z.number().int().min(1),
    x: z.number().int().optional(),
    y: z.number().int().optional(),
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const plan = await db.seatingPlan.findUniqueOrThrow({ where: { id: input.seatingPlanId }, include: { event: { include: { org: { include: { members: true } } } } } });
    const membership = plan.event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
    const table = await db.table.create({
      data: {
        seatingPlanId: input.seatingPlanId,
        name: input.name,
        capacity: input.capacity,
        x: input.x ?? 0,
        y: input.y ?? 0,
      },
    });
    const seats = await Promise.all(
      Array.from({ length: input.capacity }, (_, i) =>
        db.seat.create({ data: { tableId: table.id, number: i + 1 } })
      )
    );
    return { ...table, seats };
  }),

  updateTable: publicProcedure.input(z.object({
    tableId: z.string(),
    name: z.string().optional(),
    capacity: z.number().int().min(1).optional(),
    x: z.number().int().optional(),
    y: z.number().int().optional(),
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const table = await db.table.findUniqueOrThrow({ where: { id: input.tableId }, include: { seatingPlan: { include: { event: { include: { org: { include: { members: true } } } } } } } });
    const membership = table.seatingPlan.event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
    const { tableId, capacity, ...data } = input;
    if (capacity !== undefined && capacity !== table.capacity) {
      const currentSeats = await db.seat.count({ where: { tableId } });
      if (capacity > currentSeats) {
        await Promise.all(
          Array.from({ length: capacity - currentSeats }, (_, i) =>
            db.seat.create({ data: { tableId, number: currentSeats + i + 1 } })
          )
        );
      } else if (capacity < currentSeats) {
        const seatsToRemove = await db.seat.findMany({ where: { tableId }, orderBy: { number: "desc" }, take: currentSeats - capacity });
        await db.seat.deleteMany({ where: { id: { in: seatsToRemove.map((s) => s.id) } } });
      }
    }
    return db.table.update({ where: { id: tableId }, data });
  }),

  deleteTable: publicProcedure.input(z.object({ tableId: z.string() })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const table = await db.table.findUniqueOrThrow({ where: { id: input.tableId }, include: { seatingPlan: { include: { event: { include: { org: { include: { members: true } } } } } } } });
    const membership = table.seatingPlan.event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
    await db.table.delete({ where: { id: input.tableId } });
    return { success: true };
  }),

  assignSeat: publicProcedure.input(z.object({
    guestId: z.string(),
    seatId: z.string().nullable(),
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const guest = await db.guest.findUniqueOrThrow({ where: { id: input.guestId }, include: { guestList: { include: { event: { include: { org: { include: { members: true } } } } } } } });
    const membership = guest.guestList.event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
    if (input.seatId) {
      const _seat = await db.seat.findUniqueOrThrow({ where: { id: input.seatId } });
      await db.guest.update({ where: { id: input.guestId }, data: { seatId: input.seatId } });
      await recordActivity({ orgId: guest.guestList.event.orgId, eventId: guest.guestList.eventId, actorId: userId, action: "SEAT_ASSIGNED", target: input.guestId, meta: { seatId: input.seatId } });
    } else {
      await db.guest.update({ where: { id: input.guestId }, data: { seatId: null } });
    }
    return { success: true };
  }),

  autoAssign: publicProcedure.input(z.object({
    eventId: z.string(),
    strategy: z.enum(["RANDOM", "BY_GROUP", "BY_SIDE"]).optional(),
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const event = await db.event.findUniqueOrThrow({ where: { id: input.eventId }, include: { org: { include: { members: true } } } });
    const membership = event.org.members.find((m) => m.userId === userId);
    if (!membership) throw new Error("Forbidden");
    const plan = await db.seatingPlan.findUnique({ where: { eventId: input.eventId }, include: { tables: { include: { seats: true } } } });
    if (!plan) throw new Error("Seating plan not found");
    const guestList = await db.guestList.findUnique({ where: { eventId: input.eventId }, include: { guests: { where: { status: "ACCEPTED" } } } });
    if (!guestList) throw new Error("Guest list not found");
    const availableSeats = plan.tables.flatMap((t) => t.seats).filter((s) => !guestList.guests.some((g) => g.seatId === s.id));
    const guestsToAssign = guestList.guests.filter((g) => !g.seatId);
    let assigned = 0;
    for (const guest of guestsToAssign) {
      if (availableSeats.length === 0) break;
      const seat = availableSeats.pop()!;
      await db.guest.update({ where: { id: guest.id }, data: { seatId: seat.id } });
      assigned++;
    }
    await recordActivity({ orgId: event.orgId, eventId: input.eventId, actorId: userId, action: "SEATS_AUTO_ASSIGNED", target: plan.id, meta: { strategy: input.strategy ?? "RANDOM", count: assigned } });
    return { assigned };
  }),
});
