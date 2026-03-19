"use client";

import * as React from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";
import { Label } from "./Label";

export function RequestQuoteDrawer({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (data: { startAt: string; endAt: string; guests?: number; message?: string }) => void }) {
  const [startAt, setStartAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");
  const [guests, setGuests] = React.useState("");
  const [message, setMessage] = React.useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Request Quote</h3>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ startAt, endAt, guests: guests ? parseInt(guests) : undefined, message }); }}>
          <div>
            <Label htmlFor="startAt">Start Date</Label>
            <Input id="startAt" type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="endAt">End Date</Label>
            <Input id="endAt" type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="guests">Number of Guests</Label>
            <Input id="guests" type="number" value={guests} onChange={(e) => setGuests(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <textarea id="message" className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Send Request</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

