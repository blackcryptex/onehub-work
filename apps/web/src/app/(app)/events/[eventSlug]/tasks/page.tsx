import { KanbanBoard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import type { Task } from "@prisma/client";

export default async function EventTasks({ params }: { params: { eventSlug: string } }) {
  const ev = await prisma.event.findFirst({ where: { slug: params.eventSlug } });
  if (!ev) return null;
  const [todo, inprog, blocked, done] = await Promise.all([
    prisma.task.findMany({ where: { eventId: ev.id, status: "TODO" } }),
    prisma.task.findMany({ where: { eventId: ev.id, status: "IN_PROGRESS" } }),
    prisma.task.findMany({ where: { eventId: ev.id, status: "BLOCKED" } }),
    prisma.task.findMany({ where: { eventId: ev.id, status: "DONE" } }),
  ]);
  return (
    <KanbanBoard
      columns={[
        { key: "todo", title: "To Do", items: todo },
        { key: "inprog", title: "In Progress", items: inprog },
        { key: "blocked", title: "Blocked", items: blocked },
        { key: "done", title: "Done", items: done },
      ]}
      renderItem={(task: Task) => <div>{task.title}</div>}
    />
  );
}
