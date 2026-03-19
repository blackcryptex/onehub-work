import * as React from "react";

export type CalendarViewMode = "month" | "week" | "day";

export interface CalendarEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  allDay?: boolean;
  location?: string;
}

export function CalendarView({ events, mode = "month", onEventClick }: { events: CalendarEvent[]; mode?: CalendarViewMode; onEventClick?: (event: CalendarEvent) => void }) {
  // Simple month view implementation
  const today = new Date();
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const monthEvents = events.filter((e) => {
    const d = new Date(e.startAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const getDayEvents = (day: number) => monthEvents.filter((e) => new Date(e.startAt).getDate() === day);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } else setCurrentMonth(currentMonth - 1); }}>←</button>
        <div className="font-semibold">{new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
        <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } else setCurrentMonth(currentMonth + 1); }}>→</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="p-2 text-center text-sm font-medium">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="p-2" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = getDayEvents(day);
          return (
            <div key={day} className="p-2 border min-h-[4rem]">
              <div className="text-sm font-medium">{day}</div>
              <div className="space-y-1 mt-1">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div key={ev.id} className="text-xs bg-blue-100 px-1 rounded cursor-pointer" onClick={() => onEventClick?.(ev)}>
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && <div className="text-xs text-slate-500">+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
