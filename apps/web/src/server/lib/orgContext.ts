import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const OrgSlug = z.string().min(2);

export async function getOrgContextBySlug(slug: string) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return { userId: undefined, org: undefined, membership: undefined };
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return { userId, org: undefined, membership: undefined };
  const membership = await prisma.membership.findUnique({ where: { userId_orgId: { userId, orgId: org.id } } });
  return { userId, org, membership };
}
