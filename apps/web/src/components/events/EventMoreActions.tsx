"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { Download, MoreHorizontal, Printer, Share2 } from "lucide-react";
import type { Role } from "@onehub/types/src/roles";
import { vaultDetail } from "@/lib/routes";

type EventMoreActionsProps = {
  role?: Role;
  eventSlug: string;
  eventName: string;
  eventDate?: string | Date | null;
  eventLocation?: string | null;
};

function asDisplayDate(value?: string | Date | null) {
  if (!value) return "Date not set";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Date not set" : date.toLocaleString();
}

export function EventMoreActions({
  role = "PRO_PLANNER",
  eventSlug,
  eventName,
  eventDate,
  eventLocation,
}: EventMoreActionsProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const eventPath = vaultDetail(role, eventSlug);
  const absoluteEventUrl = useMemo(() => {
    if (typeof window === "undefined") return eventPath;
    return new URL(eventPath, window.location.origin).toString();
  }, [eventPath]);

  const shareEvent = async () => {
    try {
      await navigator.clipboard?.writeText(absoluteEventUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this event link", absoluteEventUrl);
    }
  };

  const exportEvent = () => {
    const payload = {
      name: eventName,
      date: asDisplayDate(eventDate),
      location: eventLocation || "Location not set",
      url: absoluteEventUrl,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventSlug || "event"}-details.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printEvent = () => {
    window.print();
  };

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        aria-label="More event actions"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" />
        More
      </Button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close event actions menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <button
              type="button"
              onClick={shareEvent}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Share2 className="h-4 w-4 text-indigo-600" />
              {copied ? "Event link copied" : "Share event link"}
            </button>
            <button
              type="button"
              onClick={exportEvent}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4 text-indigo-600" />
              Export event details
            </button>
            <button
              type="button"
              onClick={printEvent}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4 text-indigo-600" />
              Print event page
            </button>
          </div>
        </>
      )}
    </div>
  );
}
