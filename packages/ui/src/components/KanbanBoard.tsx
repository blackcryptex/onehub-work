import * as React from "react";

export type KanbanColumn<T> = { key: string; title: string; items: T[] };

export function KanbanBoard<T>({ columns, renderItem }: { columns: KanbanColumn<T>[]; renderItem: (item: T) => React.ReactNode }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {columns.map((col) => (
        <div key={col.key} className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b px-3 py-2 text-sm font-semibold">{col.title}</div>
          <div className="p-2 space-y-2">
            {col.items.map((it, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm">
                {renderItem(it)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
