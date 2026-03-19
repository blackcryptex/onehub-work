import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner } from "@/lib/rbac";
import { recordAudit } from "@/server/lib/audit";
import { randomUUID } from "crypto";

export const inviteRouter = router({
  createInvite: publicProcedure.input(z.object({ orgId: z.string(), email: z.string().email(), role: z.enum(["OWNER","ADMIN","MEMBER","VIEWER"]).default("MEMBER") })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await prisma.organization.findUnique({ where: { id: input.orgId }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, org, mem)) throw new Error("Forbidden");
    const token = randomUUID();
    const invite = await prisma.invite.create({ data: { orgId: input.orgId, email: input.email, role: input.role, token, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) } });
    // Stub email
    // eslint-disable-next-line no-console
    console.log("Resend stub: invite", { to: input.email, token });
    await recordAudit({ actorId: user.id, orgId: input.orgId, action: "invite.create", target: invite.id, metadata: { email: input.email } });
    return invite;
  }),
  getInvites: publicProcedure.input(z.object({ orgId: z.string() })).query(({ input }) => {
    return prisma.invite.findMany({ where: { orgId: input.orgId, accepted: false } });
  }),
  revokeInvite: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const inv = await prisma.invite.findUniqueOrThrow({ where: { id: input.id }, include: { org: { include: { members: true } } } });
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = inv.org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, inv.org, mem)) throw new Error("Forbidden");
    await prisma.invite.delete({ where: { id: input.id } });
    await recordAudit({ actorId: user.id, orgId: inv.orgId, action: "invite.revoke", target: input.id });
    return true;
  }),
  addMemberByInvite: publicProcedure.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const inv = await prisma.invite.findUnique({ where: { token: input.token } });
    if (!inv || inv.expiresAt < new Date() || inv.accepted) throw new Error("Invalid invite");
    await prisma.membership.upsert({
      where: { userId_orgId: { userId, orgId: inv.orgId } },
      create: { userId, orgId: inv.orgId, role: inv.role },
      update: { role: inv.role },
    });
    await prisma.invite.update({ where: { id: inv.id }, data: { accepted: true } });
    await recordAudit({ actorId: userId, orgId: inv.orgId, action: "member.add.byInvite", target: userId });
    return true;
  }),
});
