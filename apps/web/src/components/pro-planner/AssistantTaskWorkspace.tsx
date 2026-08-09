'use client';

import * as React from "react";

type PersistedTask = {
  id: string;
  title: string;
  status?: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueAt?: string | Date | null;
  assigneeId?: string | null;
  assignee?: { id: string; name?: string | null; email?: string | null } | null;
};

type TeamMember = { id: string; label: string; staffRole?: string };
type ChecklistItem = { id: string; title: string; done: boolean };
const DEFAULT_TEAM_MEMBERS: TeamMember[] = [];
const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [];

function taskAssigneeLabel(task: PersistedTask) {
  return task.assignee?.name || task.assignee?.email || "Unassigned";
}

export function AssistantTaskWorkspace({
  eventId,
  mode,
  teamMembers = DEFAULT_TEAM_MEMBERS,
  checklistItems = DEFAULT_CHECKLIST_ITEMS,
}: {
  eventId?: string;
  mode: "planner" | "assistant";
  teamMembers?: TeamMember[];
  checklistItems?: ChecklistItem[];
}) {
  const [tasks, setTasks] = React.useState<PersistedTask[]>([]);
  const [checklist, setChecklist] = React.useState(checklistItems);
  const [error, setError] = React.useState<string | null>(null);

  const loadTasks = React.useCallback(async () => {
    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    const response = await fetch(`/api/assistant-collaboration/tasks${params.size ? `?${params.toString()}` : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load persisted tasks");
    const data = await response.json();
    setTasks(Array.isArray(data) ? data : []);
  }, [eventId]);

  React.useEffect(() => {
    setChecklist(checklistItems);
  }, [checklistItems]);

  React.useEffect(() => {
    loadTasks().catch((err) => setError(err instanceof Error ? err.message : "Failed to load persisted tasks"));
  }, [loadTasks]);

  async function patchTask(taskId: string, data: Record<string, unknown>) {
    setError(null);
    const response = await fetch(`/api/assistant-collaboration/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (!response.ok) throw new Error("Failed to persist task update");
    await response.json();
    await loadTasks();
  }

  async function assignTask(task: PersistedTask, assigneeId: string) {
    const member = teamMembers.find((entry) => entry.id === assigneeId);
    setTasks((current) => current.map((entry) => entry.id === task.id ? {
      ...entry,
      assigneeId: assigneeId || null,
      assignee: member ? { id: member.id, name: member.label, email: null } : null,
    } : entry));
    try {
      await patchTask(task.id, { assigneeId: assigneeId || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to persist task assignment");
    }
  }

  async function updateStatus(task: PersistedTask, status: string) {
    setTasks((current) => current.map((entry) => entry.id === task.id ? { ...entry, status: status as PersistedTask["status"] } : entry));
    try {
      await patchTask(task.id, { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to persist task status");
    }
  }

  async function toggleChecklistItem(item: ChecklistItem) {
    const nextDone = !item.done;
    setChecklist((current) => current.map((entry) => entry.id === item.id ? { ...entry, done: nextDone } : entry));
    try {
      const response = await fetch(`/api/assistant-collaboration/checklist-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nextDone }),
      });
      if (!response.ok) throw new Error("Failed to persist checklist update");
      await response.json();
    } catch (err) {
      setChecklist((current) => current.map((entry) => entry.id === item.id ? { ...entry, done: item.done } : entry));
      setError(err instanceof Error ? err.message : "Failed to persist checklist update");
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-950">Assistant task workspace</h3>
        <p className="mt-1 text-sm text-slate-600">
          {mode === "assistant" ? "Assigned persisted tasks only; title and assignment controls remain locked." : "Persist task assignment to the event workspace."}
        </p>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <article key={task.id} className="rounded-lg border p-3 space-y-2">
            <div className="font-medium">{task.title}</div>
            <div className="text-xs text-slate-500">Assigned to: {taskAssigneeLabel(task)}</div>
            {mode === "planner" && teamMembers.length > 0 ? (
              <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>Assign assistant</span>
                <select
                  aria-label={`Assign ${task.title}`}
                  className="rounded border px-2 py-1"
                  value={task.assigneeId || ""}
                  onChange={(event) => assignTask(task, event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.label}</option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="text-xs font-medium text-slate-600">My assigned task controls</div>
            )}
            {mode === "assistant" && (
              <label className="flex items-center gap-2 text-sm">
                <span>Status for {task.title}</span>
                <select
                  aria-label={`Status for ${task.title}`}
                  value={task.status ?? "TODO"}
                  onChange={(event) => updateStatus(task, event.target.value)}
                  className="rounded border px-2 py-1"
                >
                  <option value="TODO">To do</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="DONE">Done</option>
                </select>
              </label>
            )}
          </article>
        ))}
        {tasks.length === 0 && <p className="text-sm text-slate-500">No persisted tasks loaded.</p>}
      </div>
      {mode === "assistant" && checklist.length > 0 && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-semibold">Assigned checklist</p>
          {checklist.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input
                aria-label={`Toggle checklist ${item.title}`}
                type="checkbox"
                checked={item.done}
                onChange={() => toggleChecklistItem(item)}
              />
              <span>{item.title}</span>
            </label>
          ))}
        </div>
      )}
      {error && <p className="text-sm font-medium text-rose-700">{error}</p>}
    </section>
  );
}
