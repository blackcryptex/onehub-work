import * as React from "react";

export type RSVPStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "WAITLIST";

export function RSVPBadge({ status }: { status: RSVPStatus }) {
  const colors: Record<RSVPStatus, string> = {
    PENDING: "bg-slate-200 text-slate-700",
    ACCEPTED: "bg-green-200 text-green-700",
    DECLINED: "bg-red-200 text-red-700",
    WAITLIST: "bg-yellow-200 text-yellow-700",
  };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
}
