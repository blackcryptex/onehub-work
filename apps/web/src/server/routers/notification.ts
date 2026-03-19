import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";

export async function notify(userId: string, data: { orgId: string; type: string; title: string; body?: string; link?: string }) {
  return prisma.notification.create({ data: { userId, orgId: data.orgId, type: data.type, title: data.title, body: data.body, link: data.link } });
}

export const notificationRouter = router({
  listMy: publicProcedure.query(async () => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) return [];
    return prisma.notification.findMany({ where: { userId, read: false }, orderBy: { createdAt: "desc" }, take: 20 });
  }),
  markRead: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const note = await prisma.notification.update({ where: { id: input.id }, data: { read: true } });
    return note;
  }),
});
