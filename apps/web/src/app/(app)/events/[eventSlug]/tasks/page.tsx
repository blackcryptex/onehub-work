import { KanbanBoard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";
import { canEditEvent } from "@/lib/rbac";
import type { Task } from "@prisma/client";

export default async function EventTasks({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const { user, event: authorizedEvent } = await requireAuthorizedEventBySlug(resolvedParams.eventSlug, "view");
  const canManageTasks = canEditEvent(user, authorizedEvent);
  const baseWhere = {
    eventId: authorizedEvent.id,
    ...(canManageTasks ? {} : { assigneeId: user.id }),
  };

  const [todo, inprog, blocked, done] = await Promise.all([
    prisma.task.findMany({ where: { ...baseWhere, status: "TODO" } }),
    prisma.task.findMany({ where: { ...baseWhere, status: "IN_PROGRESS" } }),
    prisma.task.findMany({ where: { ...baseWhere, status: "BLOCKED" } }),
    prisma.task.findMany({ where: { ...baseWhere, status: "DONE" } }),
  ]);

  return (
    <KanbanBoard
      columns={[
        { key: "todo", title: "To Do", items: todo },
        { key: "inprog", title: "In Progress", items: inprog },
        { key: "blocked", title: "Blocked", items: blocked },
        { key: "done", title: "Done", items: done },
      ]}
      renderItem={(task: Task) => (
        <div>
          <div>{task.title}</div>
          {!canManageTasks && <div className="text-xs text-slate-500">Assistant task access</div>}
        </div>
      )}
    />
  );
}
