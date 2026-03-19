"use client";

import * as React from "react";

type Slot = { id: string; startAt: Date | string; endAt: Date | string; status: string };

export function AvailabilityCalendar({ slots }: { slots: Slot[] }) {
  const statusColors: Record<string, string> = { AVAILABLE: "bg-emerald-100", HOLD: "bg-amber-100", BOOKED: "bg-slate-200", UNAVAILABLE: "bg-rose-100" };
  return (
    <div className="space-y-2">
      {slots.map((s) => (
        <div key={s.id} className={`rounded-lg p-2 text-sm ${statusColors[s.status] ?? "bg-slate-100"}`}>
          <div>{new Date(s.startAt).toLocaleDateString()} – {new Date(s.endAt).toLocaleDateString()}</div>
          <div className="text-xs text-slate-600">{s.status}</div>
        </div>
      ))}
      {slots.length === 0 && <div className="text-sm text-slate-600">No availability set</div>}
    </div>
  );
}

