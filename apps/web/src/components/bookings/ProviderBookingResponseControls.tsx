"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ProviderBookingResponseControlsProps = {
  bookingRequestId: string;
  currentStatus: string;
  canRespond: boolean;
};

export function ProviderBookingResponseControls({
  bookingRequestId,
  currentStatus,
  canRespond,
}: ProviderBookingResponseControlsProps) {
  const router = useRouter();
  const [action, setAction] = useState("QUOTED");
  const [quoteDollars, setQuoteDollars] = useState("");
  const [note, setNote] = useState("");
  const [createProposal, setCreateProposal] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canRespond) {
    return null;
  }

  async function submitResponse() {
    setMessage(null);
    const response = await fetch("/api/bookings/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingRequestId,
        action,
        quoteDollars: action === "QUOTED" ? quoteDollars : undefined,
        note,
        createProposal: action === "QUOTED" ? createProposal : false,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(payload.error || "Could not update booking request.");
      return;
    }

    setMessage(
      payload.proposalId
        ? "Response saved and proposal sent to the planner."
        : "Response saved."
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 text-sm font-semibold text-slate-900">Provider response</div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Status</span>
          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={isPending}
          >
            <option value="QUOTED">Quote</option>
            <option value="HOLD">Hold</option>
            <option value="DECLINED">Decline</option>
          </select>
        </label>

        {action === "QUOTED" ? (
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-600">Quote amount</span>
            <input
              value={quoteDollars}
              onChange={(event) => setQuoteDollars(event.target.value)}
              placeholder="1250.00"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={isPending}
            />
          </label>
        ) : null}

        <label className="text-sm md:col-span-1">
          <span className="mb-1 block text-xs font-medium text-slate-600">Note</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={currentStatus === "PENDING" ? "Response note" : `Update from ${currentStatus}`}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={isPending}
          />
        </label>
      </div>

      {action === "QUOTED" ? (
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={createProposal}
            onChange={(event) => setCreateProposal(event.target.checked)}
            disabled={isPending}
          />
          Create and send a manual-status-first proposal from this quote
        </label>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void submitResponse()}
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save response"}
        </button>
        {message ? <span className="text-sm text-slate-600">{message}</span> : null}
      </div>
    </div>
  );
}
