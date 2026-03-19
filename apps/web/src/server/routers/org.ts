import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner, isOrgOwner, canEditVendorOrgProfile } from "@/lib/rbac";
import { recordAudit } from "@/server/lib/audit";

const createOrgSchema = z.object({ name: z.string().min(2), type: z.enum(["PLANNER","VENDOR","VENUE","CLIENT_AGENCY"]) });
const updateOrgSchema = z.object({ id: z.string(), name: z.string().min(2).optional(), type: z.enum(["PLANNER","VENDOR","VENUE","CLIENT_AGENCY"]).optional(), settings: z.object({ locale: z.string().optional(), timezone: z.string().optional(), currency: z.string().optional(), legalEntity: z.string().optional(), billingEmail: z.string().email().optional() }).optional() });

export const orgRouter = router({
  createOrg: publicProcedure.input(createOrgSchema).mutation(async ({ input, ctx: _ctx }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
    const org = await prisma.organization.create({ data: { name: input.name, slug, type: input.type, ownerId: userId, members: { create: { userId, role: "OWNER" } }, settings: { create: {} } } });
    await recordAudit({ actorId: userId, orgId: org.id, action: "org.create", target: org.id });
    return org;
  }),
  getMyOrgs: publicProcedure.query(async () => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) return [];
    return prisma.organization.findMany({ where: { members: { some: { userId } } } });
  }),
  getOrgBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => {
    return prisma.organization.findUnique({ where: { slug: input.slug } });
  }),
  updateOrg: publicProcedure.input(updateOrgSchema).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await prisma.organization.findUnique({ where: { id: input.id }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: vendors/venues can edit their own org: see apps/web/src/lib/rbac.ts
    const mem = org.members.find((m) => m.userId === user.id);
    if (!canEditVendorOrgProfile(user, org, mem)) throw new Error("Forbidden");
    const updatedOrg = await prisma.organization.update({ where: { id: input.id }, data: { name: input.name, type: input.type, settings: input.settings ? { upsert: { create: input.settings, update: input.settings } } : undefined } });
    await recordAudit({ actorId: user.id, orgId: updatedOrg.id, action: "org.update", target: updatedOrg.id, metadata: input.settings });
    return updatedOrg;
  }),
  deleteOrg: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await prisma.organization.findUnique({ where: { id: input.id } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    if (!isOrgOwner(user, org)) throw new Error("Forbidden");
    const deletedOrg = await prisma.organization.delete({ where: { id: input.id } });
    await recordAudit({ actorId: user.id, orgId: input.id, action: "org.delete", target: input.id });
    return deletedOrg;
  }),
});
