import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner } from "@/lib/rbac";
import { recordAudit } from "@/server/lib/audit";

export const membershipRouter = router({
  getMembers: publicProcedure.input(z.object({ orgId: z.string() })).query(({ input }) => {
    return prisma.membership.findMany({ where: { orgId: input.orgId }, include: { user: true, team: true } });
  }),
  removeMember: publicProcedure.input(z.object({ orgId: z.string(), userId: z.string() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await prisma.organization.findUnique({ where: { id: input.orgId }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, org, mem)) throw new Error("Forbidden");
    await prisma.membership.delete({ where: { userId_orgId: { userId: input.userId, orgId: input.orgId } } });
    await recordAudit({ actorId: user.id, orgId: input.orgId, action: "member.remove", target: input.userId });
    return true;
  }),
  setMemberRole: publicProcedure.input(z.object({ orgId: z.string(), userId: z.string(), role: z.enum(["OWNER","ADMIN","MEMBER","VIEWER"]) })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await prisma.organization.findUnique({ where: { id: input.orgId }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, org, mem)) throw new Error("Forbidden");
    const updated = await prisma.membership.update({ where: { userId_orgId: { userId: input.userId, orgId: input.orgId } }, data: { role: input.role } });
    await recordAudit({ actorId: user.id, orgId: input.orgId, action: "member.role.set", target: input.userId, metadata: { role: input.role } });
    return updated;
  }),
});
