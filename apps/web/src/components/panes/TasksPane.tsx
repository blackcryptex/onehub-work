'use client';

import { useEffect, useState } from 'react';

import { EventItem, Task, Milestone } from '@/lib/types.event';
import { aiPlanTasks } from '@/lib/ai.service';

export default function TasksPane({ event, onUpdate }:{ event: EventItem; onUpdate:(patch: Partial<EventItem>)=>void }) {
  const [tasks, setTasks] = useState<Task[]>(event.tasks ?? []);
  const [miles, setMiles] = useState<Milestone[]>(event.milestones ?? []);

  useEffect(() => {
    setTasks(event.tasks ?? []);
    setMiles(event.milestones ?? []);
  }, [event]);

  useEffect(() => {
    if ((event.tasks ?? []).length === 0 && (event.milestones ?? []).length === 0) {
      aiPlanTasks(event).then(({ tasks: t, milestones: m }) => {
        setTasks(t);
        setMiles(m);
        onUpdate({ tasks: t, milestones: m });
      });
    }
  }, [event, onUpdate]);
  function toggle(id:string){ const next=tasks.map(t=>t.id===id?{...t,done:!t.done}:t); setTasks(next); onUpdate({ tasks: next }); }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <h3 className="font-semibold">Tasks</h3>
        <ul className="mt-3 space-y-2">
          {tasks.map(t=>(
            <li key={t.id} className="flex items-center justify-between rounded border p-2">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-slate-500">{new Date(t.due).toLocaleDateString()}</div>
              </div>
              <input type="checkbox" className="h-4 w-4" checked={t.done} onChange={()=>toggle(t.id)} />
            </li>
          ))}
          {tasks.length===0 && <li className="text-sm text-slate-500">No tasks yet.</li>}
        </ul>
      </div>

      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <h3 className="font-semibold">Milestones</h3>
        <ul className="mt-3 space-y-2">
          {miles.map(m=>(
            <li key={m.id} className="flex items-center justify-between rounded border p-2">
              <div>
                <div className="font-medium">{m.title}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 capitalize">{m.status}</span>
            </li>
          ))}
          {miles.length===0 && <li className="text-sm text-slate-500">No milestones yet.</li>}
        </ul>
      </div>
    </section>
  );
}

