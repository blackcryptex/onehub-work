import * as React from "react";

type Milestone = { id: string; title: string; dueAt: string | Date; done?: boolean };

export function MilestoneTimeline({ items }: { items: Milestone[] }) {
  return (
    <ul className="space-y-3">
      {items.map((m) => (
        <li key={m.id} className="flex items-start gap-3">
          <span className={`mt-1 inline-block h-3 w-3 rounded-full ${m.done ? "bg-emerald-500" : "bg-slate-300"}`} />
          <div>
            <div className="font-medium">{m.title}</div>
            <div className="text-xs text-slate-600">{new Date(m.dueAt).toLocaleDateString()}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
