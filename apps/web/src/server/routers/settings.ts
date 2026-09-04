import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner } from "@/lib/rbac";
import { recordAudit } from "@/server/lib/audit";
import { forbidden, notFound } from "@/server/lib/access";

const userSettingsPartial = z.object({
  locale: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  marketingEmails: z.boolean().optional(),
  smsAlerts: z.boolean().optional(),
});

const orgSettingsPartial = z.object({
  locale: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  legalEntity: z.string().optional(),
  billingEmail: z.string().email().optional(),
});

export const settingsRouter = router({
  getUserSettings: protectedProcedure.query(async () => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    return db.userSettings.findUnique({ where: { userId } });
  }),
  updateUserSettings: protectedProcedure.input(userSettingsPartial).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const settings = await db.userSettings.upsert({ where: { userId }, create: { userId, ...input }, update: { ...input } });
    await recordAudit({ actorId: userId, action: "user.settings.update", target: userId, metadata: input });
    return settings;
  }),
  getOrgSettings: protectedProcedure.input(z.object({ orgId: z.string() })).query(async ({ input, ctx }) => {
    const org = await db.organization.findUnique({ where: { id: input.orgId }, include: { members: true } });
    if (!org) throw notFound("Org not found");
    const mem = org.members.find((m) => m.userId === ctx.user.id);
    if (!isOrgAdminOrOwner(ctx.user, org, mem)) throw forbidden();
    return db.orgSettings.findUnique({ where: { orgId: input.orgId } });
  }),
  updateOrgSettings: protectedProcedure.input(z.object({ orgId: z.string(), data: orgSettingsPartial })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await db.organization.findUnique({ where: { id: input.orgId }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, org, mem)) throw new Error("Forbidden");
    const settings = await db.orgSettings.upsert({ where: { orgId: input.orgId }, create: { orgId: input.orgId, ...input.data }, update: { ...input.data } });
    await recordAudit({ actorId: user.id, orgId: input.orgId, action: "org.settings.update", target: input.orgId, metadata: input.data });
    return settings;
  }),
});
