import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner } from "@/lib/rbac";
import { sendOutboundEmail } from "@/lib/outbound";
import { recordAudit } from "@/server/lib/audit";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export const inviteRouter = router({
  createInvite: publicProcedure.input(z.object({ orgId: z.string(), email: z.string().email(), role: z.enum(["OWNER","ADMIN","MEMBER","VIEWER"]).default("MEMBER") })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await db.organization.findUnique({ where: { id: input.orgId }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, org, mem)) throw new Error("Forbidden");
    const token = randomUUID();
    const invite = await db.invite.create({ data: { orgId: input.orgId, email: input.email, role: input.role, token, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) } });
    const acceptPath = `/signup?invite=${token}`;
    const appBaseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const delivery = await sendOutboundEmail({
      to: input.email,
      subject: "You have been invited to join OneHub",
      text: [
        "You have been invited to join OneHub.",
        "",
        `Accept the invitation: ${new URL(acceptPath, appBaseUrl).toString()}`,
        "",
        "If you were not expecting this invitation, you can ignore this message.",
      ].join("\n"),
    });
    await recordAudit({ actorId: user.id, orgId: input.orgId, action: "invite.create", target: invite.id, metadata: { email: input.email } });
    return { ...invite, acceptPath, delivery };
  }),
  getInvites: publicProcedure.input(z.object({ orgId: z.string() })).query(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    const org = await db.organization.findUnique({ where: { id: input.orgId }, include: { members: true } });
    if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Org not found" });
    const mem = org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, org, mem)) throw new TRPCError({ code: "FORBIDDEN", message: "Forbidden" });
    return db.invite.findMany({
      where: { orgId: input.orgId, accepted: false, expiresAt: { gt: new Date() } },
      select: { id: true, orgId: true, email: true, role: true, expiresAt: true, accepted: true, createdAt: true },
    });
  }),
  revokeInvite: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const inv = await db.invite.findUniqueOrThrow({ where: { id: input.id }, include: { org: { include: { members: true } } } });
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = inv.org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, inv.org, mem)) throw new Error("Forbidden");
    await db.invite.delete({ where: { id: input.id } });
    await recordAudit({ actorId: user.id, orgId: inv.orgId, action: "invite.revoke", target: input.id });
    return true;
  }),
  addMemberByInvite: publicProcedure.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    const userEmail = normalizeEmail(session?.user?.email);
    if (!userId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    const inv = await db.invite.findUnique({ where: { token: input.token } });
    if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invite link is invalid" });
    if (inv.accepted) throw new TRPCError({ code: "BAD_REQUEST", message: "Invite has already been used" });
    if (inv.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Invite has expired" });
    if (normalizeEmail(inv.email) !== userEmail) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Invite email does not match the signed-in account" });
    }

    const existingMembership = await db.membership.findUnique({
      where: { userId_orgId: { userId, orgId: inv.orgId } },
    });
    if (existingMembership) {
      throw new TRPCError({ code: "CONFLICT", message: "Account is already a member of this organization" });
    }

    await db.$transaction(async (tx) => {
      await tx.membership.create({ data: { userId, orgId: inv.orgId, role: inv.role } });
      const accepted = await tx.invite.updateMany({ where: { id: inv.id, accepted: false }, data: { accepted: true } });
      if (accepted.count !== 1) {
        throw new TRPCError({ code: "CONFLICT", message: "Invite has already been used" });
      }
    });
    await recordAudit({ actorId: userId, orgId: inv.orgId, action: "member.add.byInvite", target: userId });
    return true;
  }),
});
