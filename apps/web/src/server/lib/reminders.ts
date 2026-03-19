import { prisma } from "@/lib/prisma";

/**
 * Find items due within the next N hours.
 */
export async function findDueItems(hours = 24) {
  const now = new Date();
  const until = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const tasks = await prisma.task.findMany({ where: { dueAt: { gte: now, lte: until }, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } } });
  const checklistItems = await prisma.checklistItem.findMany({ where: { dueAt: { gte: now, lte: until }, done: false }, include: { checklist: { include: { event: true } } } });
  return { tasks, checklistItems };
}
