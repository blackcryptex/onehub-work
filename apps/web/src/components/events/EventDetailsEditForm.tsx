"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type EditableEvent = {
  slug: string;
  name: string;
  eventTypeRaw?: string | null;
  startAt: string | Date;
  venueCity?: string | null;
  venueState?: string | null;
  guestTarget?: number | null;
  budgetRaw?: string | null;
  objective?: string | null;
  description?: string | null;
  status?: string | null;
};

type EventDetailsEditFormProps = {
  event: EditableEvent;
};

function dateValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function EventDetailsEditForm({ event }: EventDetailsEditFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: event.name || "",
    eventTypeRaw: event.eventTypeRaw || "",
    date: dateValue(event.startAt),
    city: event.venueCity || "",
    state: event.venueState || "",
    headcount: event.guestTarget ? String(event.guestTarget) : "",
    budgetRaw: event.budgetRaw || "",
    objective: event.objective || "",
    style: event.description || "",
    status: event.status || "PLANNING",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (eventSubmit: React.FormEvent) => {
    eventSubmit.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/events/${event.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update event" }));
        throw new Error(data.error || "Failed to update event");
      }

      setMessage("Event details saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="event-name">Event name</label>
          <input id="event-name" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.name} onChange={(e) => updateField("name", e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="event-type">Event type</label>
          <input id="event-type" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.eventTypeRaw} onChange={(e) => updateField("eventTypeRaw", e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="event-date">Event date</label>
          <input id="event-date" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="date" value={formData.date} onChange={(e) => updateField("date", e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="event-status">Status</label>
          <select
            id="event-status"
            value={formData.status}
            onChange={(e) => updateField("status", e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="event-city">City</label>
          <input id="event-city" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.city} onChange={(e) => updateField("city", e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="event-state">State</label>
          <input id="event-state" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={2} value={formData.state} onChange={(e) => updateField("state", e.target.value.toUpperCase())} required />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="event-guests">Guest count</label>
          <input id="event-guests" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="number" min="1" value={formData.headcount} onChange={(e) => updateField("headcount", e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="event-budget">Budget</label>
          <input id="event-budget" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.budgetRaw} onChange={(e) => updateField("budgetRaw", e.target.value)} required />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="event-objective">Objective</label>
        <textarea
          id="event-objective"
          value={formData.objective}
          onChange={(e) => updateField("objective", e.target.value)}
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="event-style">Style / notes</label>
        <textarea
          id="event-style"
          value={formData.style}
          onChange={(e) => updateField("style", e.target.value)}
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save event details"}</Button>
        {message && <p className="text-sm text-slate-600" role="status">{message}</p>}
      </div>
    </form>
  );
}
