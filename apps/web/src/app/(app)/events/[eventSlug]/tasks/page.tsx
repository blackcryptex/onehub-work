import { prisma } from "@/lib/prisma";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";
import type { Prisma } from "@prisma/client";

const taskInclude = {
  assignee: { select: { name: true, email: true, role: true } },
  dependencies: { include: { dependsOnTask: { select: { id: true, title: true, status: true } } } },
  proofs: { orderBy: { createdAt: "desc" } },
  blockedBy: { select: { name: true, email: true } },
  completedBy: { select: { name: true, email: true } },
} satisfies Prisma.TaskInclude;

type AccountableTask = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

const columns: Array<{ status: AccountableTask["status"]; title: string; empty: string }> = [
  { status: "TODO", title: "To Do", empty: "No unstarted accountable work." },
  { status: "IN_PROGRESS", title: "In Progress", empty: "No active owner work." },
  { status: "BLOCKED", title: "Blocked", empty: "No blockers recorded." },
  { status: "DONE", title: "Done", empty: "No completed proof recorded yet." },
];

function formatDate(date: Date | null) {
  if (!date) return "No deadline";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function ownerLabel(task: AccountableTask) {
  if (!task.assignee) return "Unassigned";
  return task.assignee.name || task.assignee.email || task.assignee.role;
}

function TaskCard({ task }: { task: AccountableTask }) {
  const overdue = task.dueAt && task.status !== "DONE" && task.dueAt.getTime() < Date.now();
  return (
    <article id={`task-${task.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">{task.title}</h3>
          {task.description && <p className="mt-1 text-sm text-slate-600">{task.description}</p>}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{task.priority}</span>
      </div>

      <dl className="mt-3 grid gap-2 text-sm text-slate-700">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Owner</dt>
          <dd className="text-right font-medium">{ownerLabel(task)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Deadline</dt>
          <dd className={overdue ? "text-right font-semibold text-red-700" : "text-right font-medium"}>{formatDate(task.dueAt)}{overdue ? " · overdue" : ""}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Escalation</dt>
          <dd className="text-right font-medium">Level {task.escalationLevel}{task.escalatedAt ? ` · ${formatDate(task.escalatedAt)}` : ""}</dd>
        </div>
      </dl>

      {task.dependencies.length > 0 && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">Dependencies</p>
          <ul className="mt-1 list-disc pl-5 text-slate-600">
            {task.dependencies.map((dependency) => (
              <li key={dependency.id}>{dependency.dependsOnTask.title} · {dependency.dependsOnTask.status}</li>
            ))}
          </ul>
        </div>
      )}

      {task.status === "BLOCKED" && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Blocker: {task.blockerType || "OTHER"}</p>
          <p>{task.blockerReason || "No blocker reason recorded."}</p>
          <p className="mt-1 text-xs">Blocked by {task.blockedBy?.name || task.blockedBy?.email || "unknown"} {task.blockedAt ? `on ${formatDate(task.blockedAt)}` : ""}</p>
        </div>
      )}

      {task.status === "DONE" && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-semibold">Completion proof</p>
          <p>{task.completionNote || "Completion note not recorded."}</p>
          <p className="mt-1 text-xs">Completed by {task.completedBy?.name || task.completedBy?.email || "unknown"} {task.completedAt ? `on ${formatDate(task.completedAt)}` : ""}</p>
          {task.proofs.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {task.proofs.map((proof) => (
                <li key={proof.id}><a className="font-medium underline" href={proof.urlOrMediaId}>{proof.label}</a></li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

export default async function EventTasks({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const { event: authorizedEvent } = await requireAuthorizedEventBySlug(resolvedParams.eventSlug, "manage");
  const tasks = await prisma.task.findMany({
    where: { eventId: authorizedEvent.id },
    include: taskInclude,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Tasks &amp; accountability</p>
        <h1 className="text-2xl font-bold text-slate-950">{authorizedEvent.name} work records</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Persisted accountability board: owner, deadline, blocker/dependency context, escalation state, and completion proof stay attached to each task record.
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-4" aria-label="Persisted event task accountability board">
        {columns.map((column) => {
          const items = tasks.filter((task) => task.status === column.status);
          return (
            <div key={column.status} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{column.title}</h2>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.length ? items.map((task) => <TaskCard key={task.id} task={task} />) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">{column.empty}</p>}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}