'use client';

import { useMemo } from 'react';
import { Milestone, Task } from '@/lib/types.event';

interface MilestoneListProps {
  milestones: Milestone[];
  tasks: Task[];
  onViewTasks: (taskIds: string[]) => void;
  milestoneRefs?: (id: string, el: HTMLDivElement | null) => void;
}

export default function MilestoneList({ milestones, tasks, onViewTasks, milestoneRefs }: MilestoneListProps) {
  // Compute status and progress for each milestone
  const computed = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return milestones.map(m => {
      const linkedTasks = tasks.filter(t => m.linkedTaskIds.includes(t.id));
      const doneCount = linkedTasks.filter(t => t.done).length;
      const totalCount = linkedTasks.length;
      const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

      const targetDate = new Date(m.targetDate);
      targetDate.setHours(0, 0, 0, 0);

      // Auto status rules
      let status: 'planned'|'at risk'|'achieved'|'slipped' = 'planned';

      const allDone = totalCount > 0 && doneCount === totalCount;
      const isAchieved = allDone && today <= targetDate;
      const isSlipped = today > targetDate && !allDone;

      if (isAchieved) {
        status = 'achieved';
      } else if (isSlipped) {
        status = 'slipped';
      } else {
        // Check for at risk: unknown critical linked task overdue OR >50% linked tasks overdue
        const overdueTasks = linkedTasks.filter(t => {
          const dueDate = new Date(t.due);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < today && !t.done;
        });
        const hasCriticalOverdue = overdueTasks.some(t => t.priority === 'high');
        const moreThanHalfOverdue = totalCount > 0 && overdueTasks.length > totalCount * 0.5;

        if (hasCriticalOverdue || moreThanHalfOverdue) {
          status = 'at risk';
        }
      }

      return { ...m, computedStatus: status, progress, doneCount, totalCount };
    });
  }, [milestones, tasks]);

  function getStatusColor(status: 'planned'|'at risk'|'achieved'|'slipped') {
    switch (status) {
      case 'achieved': return 'bg-green-100 text-green-700';
      case 'at risk': return 'bg-amber-100 text-amber-700';
      case 'slipped': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  return (
    <div className="space-y-3">
      {computed.map(m => (
        <div
          key={m.id}
          id={`milestone-${m.id}`}
          ref={el => milestoneRefs?.(m.id, el)}
          className="rounded-xl border p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{m.title}</h4>
                {m.critical && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Critical</span>
                )}
              </div>
              <div className="text-sm text-slate-600 mb-2">
                Target: {new Date(m.targetDate).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Progress: </span>
                  <span className="font-medium">{m.progress}%</span>
                  <span className="text-slate-500"> ({m.doneCount}/{m.totalCount} tasks)</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(m.computedStatus)}`}>
                  {m.computedStatus}
                </span>
              </div>
            </div>
            <button
              onClick={() => onViewTasks(m.linkedTaskIds)}
              className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50"
            >
              View tasks
            </button>
          </div>
        </div>
      ))}
      {computed.length === 0 && (
        <div className="text-sm text-slate-500 text-center py-4">No milestones yet.</div>
      )}
    </div>
  );
}

