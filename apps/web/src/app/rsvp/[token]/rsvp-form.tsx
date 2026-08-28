"use client";

import { Button } from "@onehub/ui";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RSVPForm({ token, currentStatus }: { token: string; currentStatus: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [dietary, setDietary] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (s: "ACCEPTED" | "DECLINED") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rsvp/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s, dietary, notes }),
      });
      if (res.ok) {
        setStatus(s);
        router.refresh();
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error || "We could not record your RSVP. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("We could not record your RSVP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status || currentStatus !== "PENDING") {
    return (
      <div className="text-center">
        <div className="text-green-600 font-medium">Thank you for your RSVP!</div>
        <div className="text-sm text-slate-600 mt-2">Status: {status || currentStatus}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Dietary Restrictions</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
          placeholder="e.g., Vegetarian, Gluten-free"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          className="w-full border rounded px-3 py-2"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional information..."
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={() => handleSubmit("ACCEPTED")} disabled={loading} className="flex-1 bg-green-600">
          Accept
        </Button>
        <Button onClick={() => handleSubmit("DECLINED")} disabled={loading} variant="secondary" className="flex-1">
          Decline
        </Button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
