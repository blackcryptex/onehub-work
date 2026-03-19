import * as React from "react";

type MediaItem = { id: string; url: string; caption?: string | null };

export function MediaGrid({ items }: { items: MediaItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {items.map((m) => (
        <div key={m.id} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
          <img src={m.url} alt={m.caption || ""} className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

