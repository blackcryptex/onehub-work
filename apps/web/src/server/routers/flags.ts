import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { resolveFlags } from "@/server/lib/flags";

async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export const flagsRouter = router({
  listFlags: protectedProcedure.query(() => db.featureFlag.findMany()),
  setFlag: protectedProcedure.input(z.object({ key: z.string(), enabled: z.boolean() })).mutation(async ({ input }) => {
    if (!(await isAdmin())) throw new Error("Forbidden");
    return db.featureFlag.upsert({ where: { key: input.key }, create: { key: input.key, enabled: input.enabled }, update: { enabled: input.enabled } });
  }),
  setUserFlag: protectedProcedure.input(z.object({ userId: z.string(), key: z.string(), enabled: z.boolean() })).mutation(async ({ input }) => {
    if (!(await isAdmin())) throw new Error("Forbidden");
    return db.userFeatureFlag.upsert({ where: { userId_key: { userId: input.userId, key: input.key } }, create: { userId: input.userId, key: input.key, enabled: input.enabled }, update: { enabled: input.enabled } });
  }),
  setOrgFlag: protectedProcedure.input(z.object({ orgId: z.string(), key: z.string(), enabled: z.boolean() })).mutation(async ({ input }) => {
    if (!(await isAdmin())) throw new Error("Forbidden");
    return db.orgFeatureFlag.upsert({ where: { orgId_key: { orgId: input.orgId, key: input.key } }, create: { orgId: input.orgId, key: input.key, enabled: input.enabled }, update: { enabled: input.enabled } });
  }),
  resolveFlags: publicProcedure.input(z.object({ userId: z.string().optional(), orgId: z.string().optional() })).query(({ input }) => resolveFlags(input)),
});
