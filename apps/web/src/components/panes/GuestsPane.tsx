'use client';

import { useEffect, useMemo, useState } from 'react';

import { EventItem, Guest } from '@/lib/types.event';

export default function GuestsPane({ event }:{ event: EventItem; onUpdate:(patch: Partial<EventItem>)=>void }) {
  const [guests, setGuests] = useState<Guest[]>(event.guests ?? []);

  useEffect(() => {
    setGuests(event.guests ?? []);
  }, [event]);

  const counts = useMemo(()=>({
    yes: guests.filter(g=>g.rsvp==='yes').length,
    no: guests.filter(g=>g.rsvp==='no').length,
    maybe: guests.filter(g=>g.rsvp==='maybe').length,
  }),[guests]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Guest List</h3>
            <p className="mt-1 text-xs text-slate-500">
              Showing persisted guest records loaded for this event. Add/import and invite guests from the event guest list route so RSVP counts stay server-backed.
            </p>
          </div>
        </div>
        <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded border p-2">RSVP Yes: <b>{counts.yes}</b></div>
          <div className="rounded border p-2">RSVP Maybe: <b>{counts.maybe}</b></div>
          <div className="rounded border p-2">RSVP No: <b>{counts.no}</b></div>
        </div>
      </div>
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <ul className="space-y-2">
          {guests.map(g=>(
            <li key={g.id} className="rounded-lg border p-3 grid sm:grid-cols-6 gap-2 text-sm">
              <input readOnly className="sm:col-span-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900" defaultValue={g.name}/>
              <input readOnly className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900" placeholder="email" defaultValue={g.email}/>
              <input readOnly className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900" placeholder="phone" defaultValue={g.phone}/>
              <select disabled className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900" defaultValue={g.meal ?? 'standard'}>
                <option>standard</option><option>vegetarian</option><option>vegan</option><option>gluten-free</option><option>kosher</option><option>halal</option><option>other</option>
              </select>
              <select
                disabled
                className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900"
                defaultValue={g.rsvp ?? 'maybe'}
              >
                <option value="yes">yes</option><option value="maybe">maybe</option><option value="no">no</option>
              </select>
            </li>
          ))}
          {guests.length===0 && (
            <li className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              No persisted guests are attached yet. Use the event guest list route to import real guests and prepare RSVP invitations; OneHub no longer shows sample guests as event data.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

