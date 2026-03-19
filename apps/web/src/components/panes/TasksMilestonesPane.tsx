'use client';

import { useState, useEffect, useRef } from 'react';
import { EventItem, Task, Milestone } from '@/lib/types.event';
import { aiPlanTasks } from '@/lib/ai.service';
import TaskList from '@/components/tasks/TaskList';
import MilestoneList from '@/components/milestones/MilestoneList';

type Filters = {
  assignee?: string;
  linkedTo?: 'vendor'|'proposal'|'contract'|'guest'|'milestone'|null;
  status?: 'done'|'undone';
  taskIds?: string[];
};

interface TasksMilestonesPaneProps {
  event: EventItem;
  onUpdate: (patch: Partial<EventItem>) => void;
  initialSubTab?: 'tasks'|'milestones';
}

export default function TasksMilestonesPane({ event, onUpdate, initialSubTab = 'tasks' }: TasksMilestonesPaneProps) {
  const [subTab, setSubTab] = useState<'tasks'|'milestones'>(initialSubTab);
  const [tasks, setTasks] = useState<Task[]>(event.tasks ?? []);
  const [milestones, setMilestones] = useState<Milestone[]>(event.milestones ?? []);
  const [filters, setFilters] = useState<Filters>({});
  const milestoneRefs = useRef<Record<string, HTMLDivElement>>({});

  // Initialize from AI if empty
  useEffect(() => {
    if ((event.tasks ?? []).length === 0 && (event.milestones ?? []).length === 0) {
      aiPlanTasks(event).then(({ tasks: t, milestones: m }) => {
        setTasks(t);
        setMilestones(m);
        onUpdate({ tasks: t, milestones: m });
      });
    }
  }, [event, onUpdate]);

  // Sync with event changes
  useEffect(() => {
    setTasks(event.tasks ?? []);
    setMilestones(event.milestones ?? []);
  }, [event]);

  function handleToggle(id: string) {
    const next = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(next);
    onUpdate({ tasks: next });
  }

  function handleEdit(id: string, patch: Partial<Task>) {
    const next = tasks.map(t => t.id === id ? { ...t, ...patch } : t);
    setTasks(next);
    onUpdate({ tasks: next });
  }

  function handleJumpToMilestone(milestoneId: string) {
    setSubTab('milestones');
    setFilters({}); // Clear task filter when jumping
    // Scroll to milestone after tab switch
    setTimeout(() => {
      const el = milestoneRefs.current[milestoneId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus for a11y
        el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
      }
    }, 100);
  }

  function handleViewTasks(taskIds: string[]) {
    setSubTab('tasks');
    setFilters({ taskIds }); // Set filter to show only these tasks
  }

  return (
    <section className="space-y-6">
      {/* Local sub-tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setSubTab('tasks')}
          className={`px-4 py-2 text-sm font-semibold transition border-b-2 ${
            subTab === 'tasks'
              ? 'border-[color:var(--oh-primary)] text-[color:var(--oh-primary)]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
          aria-current={subTab === 'tasks' ? 'page' : undefined}
        >
          Tasks
        </button>
        <button
          onClick={() => setSubTab('milestones')}
          className={`px-4 py-2 text-sm font-semibold transition border-b-2 ${
            subTab === 'milestones'
              ? 'border-[color:var(--oh-primary)] text-[color:var(--oh-primary)]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
          aria-current={subTab === 'milestones' ? 'page' : undefined}
        >
          Milestones
        </button>
      </div>

      {/* Content */}
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        {subTab === 'tasks' ? (
          <TaskList
            tasks={tasks}
            milestones={milestones}
            filters={filters}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onFilterChange={setFilters}
            onJumpToMilestone={handleJumpToMilestone}
          />
        ) : (
          <MilestoneList
            milestones={milestones}
            tasks={tasks}
            onViewTasks={handleViewTasks}
            milestoneRefs={(id, el) => {
              if (el) milestoneRefs.current[id] = el;
            }}
          />
        )}
      </div>
    </section>
  );
}

