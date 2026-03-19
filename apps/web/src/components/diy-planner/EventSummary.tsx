"use client";

import { Card, Button } from "@/components/ui";
import { Calendar, MapPin, CheckCircle2, DollarSign, Users } from "lucide-react";
import type { EventItem } from "@/lib/types";

interface EventSummaryProps {
  event: EventItem | null;
  onEdit: () => void;
}

export function EventSummary({ event, onEdit }: EventSummaryProps) {
  if (!event) {
    return (
      <Card className="p-12 text-center bg-[color:var(--oh-surface)]">
        <p className="text-[color:var(--oh-muted)]">Select an event from the vault to view details</p>
      </Card>
    );
  }

  const date = new Date(event.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Calculate stats
  const tasksThisWeek = event.tasks?.filter((task) => {
    const taskDate = new Date(task.due);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return taskDate >= now && taskDate <= weekFromNow && !task.done;
  }).length || 0;

  const openVendors = event.vendors?.length || 0;
  const budgetUsed = event.budget?.spent && event.budget?.total
    ? Math.round((event.budget.spent / event.budget.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-[color:var(--oh-surface)]">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{event.name}</h2>
          <div className="flex items-center gap-4 text-sm text-[color:var(--oh-muted)]">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-[color:var(--oh-muted)] mb-2">
            <span>Overall Progress</span>
            <span>{event.progress}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full transition-all ${
                event.progress >= 75 ? "bg-green-600" : event.progress >= 50 ? "bg-[color:var(--oh-primary)]" : "bg-amber-600"
              }`}
              style={{ width: `${event.progress}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-[color:var(--oh-muted)]" />
              <div className="text-xs text-[color:var(--oh-muted)]">Tasks Due This Week</div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{tasksThisWeek}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-[color:var(--oh-muted)]" />
              <div className="text-xs text-[color:var(--oh-muted)]">Open Vendor Items</div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{openVendors}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-[color:var(--oh-muted)]" />
              <div className="text-xs text-[color:var(--oh-muted)]">Budget Used</div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{budgetUsed}%</div>
            {event.budget?.spent && event.budget?.total && (
              <div className="text-xs text-[color:var(--oh-muted)] mt-1">
                ${event.budget.spent.toLocaleString()} of ${event.budget.total.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">Open Details</Button>
          <Button variant="ghost" onClick={onEdit}>Edit</Button>
        </div>
      </Card>
    </div>
  );
}
