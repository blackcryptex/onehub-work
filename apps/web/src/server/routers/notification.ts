import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";

export async function notify(userId: string, data: { orgId: string; type: string; title: string; body?: string; link?: string }) {
  return db.notification.create({ data: { userId, orgId: data.orgId, type: data.type, title: data.title, body: data.body, link: data.link } });
}

export const notificationRouter = router({
  listMy: protectedProcedure.query(async ({ ctx }) => {
    return db.notification.findMany({ where: { userId: ctx.user.id, read: false }, orderBy: { createdAt: "desc" }, take: 20 });
  }),
  markRead: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const userId = ctx.user.id;
    const result = await db.notification.updateMany({
      where: { id: input.id, userId },
      data: { read: true },
    });
    if (result.count === 0) throw new Error("Notification not found");
    return db.notification.findFirst({ where: { id: input.id, userId } });
  }),
});
