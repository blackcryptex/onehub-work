'use client';

import { useState } from 'react';
import { Task, Milestone } from '@/lib/types.event';

type Filters = {
  assignee?: string;
  linkedTo?: 'vendor'|'proposal'|'contract'|'guest'|'milestone'|null;
  status?: 'done'|'undone';
  taskIds?: string[];
};

interface TaskListProps {
  tasks: Task[];
  milestones: Milestone[];
  filters: Filters;
  onToggle: (id: string) => void;
  onEdit: (id: string, patch: Partial<Task>) => void;
  onFilterChange: (filters: Filters) => void;
  onJumpToMilestone: (milestoneId: string) => void;
}

export default function TaskList({ tasks, milestones, filters, onToggle, onEdit, onFilterChange, onJumpToMilestone }: TaskListProps) {
  const [showChecklist, setShowChecklist] = useState<Record<string, boolean>>({});

  // Get unique assignees for filter
  const assignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean)));

  // Apply filters
  const filtered = tasks.filter(t => {
    if (filters.assignee && t.assignee !== filters.assignee) return false;
    if (filters.linkedTo !== undefined && t.linkedTo !== filters.linkedTo) return false;
    if (filters.status === 'done' && !t.done) return false;
    if (filters.status === 'undone' && t.done) return false;
    if (filters.taskIds && !filters.taskIds.includes(t.id)) return false;
    return true;
  });

  function toggleChecklistItem(taskId: string, itemId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.checklist) return;
    const nextChecklist = task.checklist.map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    onEdit(taskId, { checklist: nextChecklist });
  }

  function getMilestoneForTask(task: Task): Milestone | undefined {
    if (task.linkedTo !== 'milestone' || !task.linkedId) return undefined;
    return milestones.find(m => m.id === task.linkedId);
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-slate-600">Assignee:</span>
          <select
            className="rounded border px-2 py-1"
            value={filters.assignee || ''}
            onChange={e => onFilterChange({ ...filters, assignee: e.target.value || undefined })}
          >
            <option value="">All</option>
            {assignees.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-slate-600">Linked:</span>
          <select
            className="rounded border px-2 py-1"
            value={filters.linkedTo ?? ''}
            onChange={e => {
              const value = e.target.value;
              onFilterChange({ 
                ...filters, 
                linkedTo: value === '' ? null : (value as 'vendor'|'proposal'|'contract'|'guest'|'milestone'|null)
              });
            }}
          >
            <option value="">All</option>
            <option value="vendor">Vendor</option>
            <option value="proposal">Proposal</option>
            <option value="contract">Contract</option>
            <option value="guest">Guest</option>
            <option value="milestone">Milestone</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-slate-600">Status:</span>
          <select
            className="rounded border px-2 py-1"
            value={filters.status || ''}
            onChange={(event) => {
              const { value } = event.target;
              onFilterChange({
                ...filters,
                status: value === '' ? undefined : (value as Filters['status']),
              });
            }}
          >
            <option value="">All</option>
            <option value="undone">Undone</option>
            <option value="done">Done</option>
          </select>
        </label>

        {filters.taskIds && (
          <button
            className="text-xs text-slate-500 hover:text-slate-700"
            onClick={() => onFilterChange({ ...filters, taskIds: undefined })}
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Tasks List */}
      <div className="space-y-2">
        {filtered.map(t => {
          const milestone = getMilestoneForTask(t);
          const isOverdue = new Date(t.due) < new Date() && !t.done;
          return (
            <div key={t.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 mt-1"
                      checked={t.done}
                      onChange={() => onToggle(t.id)}
                      aria-label={`Mark ${t.title} as ${t.done ? 'undone' : 'done'}`}
                    />
                    <div className="flex-1">
                      <div className={`font-medium ${t.done ? 'line-through text-slate-500' : ''}`}>
                        {t.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span>Due: {new Date(t.due).toLocaleDateString()}</span>
                        {t.assignee && <span>• {t.assignee}</span>}
                        {t.priority && (
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            t.priority === 'high' ? 'bg-red-100 text-red-700' :
                            t.priority === 'med' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {t.priority}
                          </span>
                        )}
                        {isOverdue && (
                          <span className="text-red-600 font-medium">Overdue</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {milestone && (
                  <button
                    onClick={() => onJumpToMilestone(milestone.id)}
                    className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                  >
                    {milestone.title}
                  </button>
                )}
              </div>

              {t.checklist && t.checklist.length > 0 && (
                <div className="ml-6">
                  <button
                    className="text-xs text-slate-500 hover:text-slate-700"
                    onClick={() => setShowChecklist(s => ({ ...s, [t.id]: !s[t.id] }))}
                  >
                    {showChecklist[t.id] ? 'Hide' : 'Show'} checklist ({t.checklist.filter(i => i.done).length}/{t.checklist.length})
                  </button>
                  {showChecklist[t.id] && (
                    <ul className="mt-2 space-y-1">
                      {t.checklist.map(item => (
                        <li key={item.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={item.done}
                            onChange={() => toggleChecklistItem(t.id, item.id)}
                          />
                          <span className={item.done ? 'line-through text-slate-500' : ''}>
                            {item.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-4">No tasks match the filters.</div>
        )}
      </div>
    </div>
  );
}

