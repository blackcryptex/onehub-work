import * as React from "react";

type Activity = { id: string; at: string | Date; action: string; target?: string | null };

export function ActivityList({ items }: { items: Activity[] }) {
  return (
    <ul className="divide-y rounded-2xl border border-slate-200 bg-white">
      {items.map((a) => (
        <li key={a.id} className="px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{a.action}</span>
            <span className="text-xs text-slate-600">{new Date(a.at).toLocaleString()}</span>
          </div>
          {a.target && <div className="text-xs text-slate-600">{a.target}</div>}
        </li>
      ))}
    </ul>
  );
}
