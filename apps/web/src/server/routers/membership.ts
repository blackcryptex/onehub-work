import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner } from "@/lib/rbac";
import { recordAudit } from "@/server/lib/audit";
import { forbidden, notFound } from "@/server/lib/access";

export const membershipRouter = router({
  getMembers: protectedProcedure.input(z.object({ orgId: z.string() })).query(async ({ input, ctx }) => {
    const org = await db.organization.findUnique({ where: { id: input.orgId }, include: { members: true } });
    if (!org) throw notFound("Org not found");
    const mem = org.members.find((m) => m.userId === ctx.user.id);
    if (!isOrgAdminOrOwner(ctx.user, org, mem)) throw forbidden();
    const memberships = await db.membership.findMany({
      where: { orgId: input.orgId },
      select: {
        userId: true,
        orgId: true,
        role: true,
        user: { select: { id: true, email: true, name: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });
    return memberships.map((membership) => ({
      ...membership,
      user: membership.user
        ? {
            id: membership.user.id,
            email: membership.user.email,
            name: membership.user.name,
            role: membership.user.role,
          }
        : null,
      team: membership.team
        ? {
            id: membership.team.id,
            name: membership.team.name,
          }
        : null,
    }));
  }),
  removeMember: publicProcedure.input(z.object({ orgId: z.string(), userId: z.string() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await db.organization.findUnique({ where: { id: input.orgId }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, org, mem)) throw new Error("Forbidden");
    await db.membership.delete({ where: { userId_orgId: { userId: input.userId, orgId: input.orgId } } });
    await recordAudit({ actorId: user.id, orgId: input.orgId, action: "member.remove", target: input.userId });
    return true;
  }),
  setMemberRole: publicProcedure.input(z.object({ orgId: z.string(), userId: z.string(), role: z.enum(["OWNER","ADMIN","MEMBER","VIEWER"]) })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await db.organization.findUnique({ where: { id: input.orgId }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, org, mem)) throw new Error("Forbidden");
    const updated = await db.membership.update({ where: { userId_orgId: { userId: input.userId, orgId: input.orgId } }, data: { role: input.role } });
    await recordAudit({ actorId: user.id, orgId: input.orgId, action: "member.role.set", target: input.userId, metadata: { role: input.role } });
    return updated;
  }),
});
