import * as React from "react";

const statusColors: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  NEEDS_INFO: "bg-blue-100 text-blue-800",
  ESCALATED: "bg-red-100 text-red-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-slate-100 text-slate-800",
};

export function DisputeBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status] ?? "bg-slate-100"}`}>
      {status}
    </span>
  );
}

