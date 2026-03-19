import * as React from "react";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date: Date;
  completed?: boolean;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  const sorted = [...items].sort((a, b) => a.date.getTime() - b.date.getTime());
  return (
    <div className="space-y-4">
      {sorted.map((item, idx) => (
        <div key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${item.completed ? "bg-green-500" : "bg-slate-300"}`} />
            {idx < sorted.length - 1 && <div className="w-px h-full min-h-[2rem] bg-slate-200" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="font-medium">{item.title}</div>
            {item.description && <div className="text-sm text-slate-600">{item.description}</div>}
            <div className="text-xs text-slate-500 mt-1">{item.date.toLocaleDateString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
