"use client";

interface MilestoneActionsProps {
  status: string;
}

export function MilestoneActions({ status }: MilestoneActionsProps) {
  if (status === "PENDING" || status === "IN_ESCROW") {
    return <p className="text-xs text-slate-500">Payment action pending canonical release flow.</p>;
  }

  return null;
}
