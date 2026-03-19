import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function recordAudit(params: {
  actorId?: string | null;
  orgId?: string | null;
  ip?: string | null;
  action: string;
  target?: string | null;
  metadata?: Prisma.JsonValue;
}) {
  const { actorId, orgId, ip, action, target, metadata } = params;
  await prisma.auditLog.create({
    data: {
      actorId: actorId ?? undefined,
      orgId: orgId ?? undefined,
      ip: ip ?? undefined,
      action,
      target: target ?? undefined,
      metadata: metadata ?? undefined,
    },
  });
}
