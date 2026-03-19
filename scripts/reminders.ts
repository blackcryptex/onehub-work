import { PrismaClient } from "@prisma/client";
import { findDueItems } from "../apps/web/src/server/lib/reminders";

const prisma = new PrismaClient();

async function main() {
  const { tasks, checklistItems } = await findDueItems(24);
  for (const t of tasks) {
    const ev = await prisma.event.findUnique({ where: { id: t.eventId } });
    if (!ev) continue;
    await prisma.notification.create({
      data: {
        userId: t.assigneeId ?? ev.createdById,
        orgId: ev.orgId,
        type: "TASK_DUE",
        title: `Task due soon: ${t.title}`,
        link: `/app/events/${ev.slug}/tasks`,
      },
    });
  }
  for (const ci of checklistItems) {
    const ev = ci.checklist.event;
    await prisma.notification.create({
      data: {
        userId: ci.assigneeId ?? ev.createdById,
        orgId: ev.orgId,
        type: "CHECKLIST_ITEM_DUE",
        title: `Checklist item due: ${ci.title}`,
        link: `/app/events/${ev.slug}/checklists`,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log("Reminders processed", { tasks: tasks.length, checklistItems: checklistItems.length });
}

main().finally(() => prisma.$disconnect());
