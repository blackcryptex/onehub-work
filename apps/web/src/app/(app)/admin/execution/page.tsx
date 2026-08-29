import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canAccessDashboard } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

const taskInclude = {
  assignee: { select: { name: true, email: true, role: true } },
  event: { select: { id: true, slug: true, name: true, orgId: true } },
  dependencies: { include: { dependsOnTask: { select: { title: true, status: true } } } },
  proofs: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.TaskInclude;

type AdminExecutionTask = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function formatDate(date: Date | null | undefined) {
  if (!date) return "No deadline";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function ownerLabel(task: AdminExecutionTask) {
  return task.assignee?.name || task.assignee?.email || "Unassigned";
}

export default async function AdminExecutionPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) redirect("/app");

  const [tasks, milestones] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [
          { status: "BLOCKED" },
          { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, priority: "CRITICAL" },
          { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, dueAt: { lt: new Date() } },
          { status: "DONE", completedAt: { not: null } },
        ],
      },
      include: taskInclude,
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }],
      take: 50,
    }),
    prisma.milestone.findMany({
      where: { done: false, dueAt: { lt: new Date() } },
      include: { event: { select: { slug: true, name: true } } },
      orderBy: { dueAt: "asc" },
      take: 25,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Admin execution accountability</p>
        <h1 className="text-2xl font-bold text-slate-950">Task, blocker, dependency, and proof drill-down</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Oversight-only view of canonical task records. Task completion does not release payments, approve refunds, change contracts, or make legal/trust decisions.
        </p>
      </div>

      <section className="space-y-3" aria-label="Execution risk task records">
        <h2 className="font-semibold text-slate-900">Task records</h2>
        {tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No blocked, critical, overdue, or completed-proof tasks found.</p>
        ) : tasks.map((task) => (
          <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{task.event.name}</p>
                <h3 className="font-semibold text-slate-950">{task.title}</h3>
                <p className="text-sm text-slate-600">Owner: {ownerLabel(task)} • Status: {task.status} • Priority: {task.priority} • Due: {formatDate(task.dueAt)}</p>
              </div>
              <Link className="text-sm font-semibold text-indigo-700 underline" href={`/events/${task.event.slug}/tasks#task-${task.id}`}>Open event task</Link>
            </div>
            {task.blockerReason && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Blocker: {task.blockerReason}</p>}
            {task.dependencies.length > 0 && (
              <p className="mt-3 text-sm text-slate-600">Dependencies: {task.dependencies.map((dependency) => `${dependency.dependsOnTask.title} (${dependency.dependsOnTask.status})`).join(", ")}</p>
            )}
            {(task.completionNote || task.proofs.length > 0) && (
              <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Proof: {task.completionNote || task.proofs[0]?.label || "Proof attached"}</p>
            )}
          </article>
        ))}
      </section>

      <section className="space-y-3" aria-label="Overdue operational milestones">
        <h2 className="font-semibold text-slate-900">Overdue milestones</h2>
        {milestones.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No overdue operational milestones.</p>
        ) : milestones.map((milestone) => (
          <article key={milestone.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">{milestone.title}</p>
            <p>{milestone.event.name} • Due {formatDate(milestone.dueAt)}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
