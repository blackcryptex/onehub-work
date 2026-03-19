import { prisma } from "@/lib/prisma";

type ResolveInput = { userId?: string | null; orgId?: string | null };
export type ResolvedFlags = Record<string, boolean>;

/**
 * Resolve feature flags in priority: global → org → user.
 */
export async function resolveFlags({ userId, orgId }: ResolveInput): Promise<ResolvedFlags> {
  const [globalFlags, orgFlags, userFlags] = await Promise.all([
    prisma.featureFlag.findMany(),
    orgId ? prisma.orgFeatureFlag.findMany({ where: { orgId } }) : Promise.resolve([]),
    userId ? prisma.userFeatureFlag.findMany({ where: { userId } }) : Promise.resolve([]),
  ]);
  const out: ResolvedFlags = {};
  for (const f of globalFlags) out[f.key] = f.enabled;
  for (const f of orgFlags) out[f.key] = f.enabled;
  for (const f of userFlags) out[f.key] = f.enabled;
  return out;
}
