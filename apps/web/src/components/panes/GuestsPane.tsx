'use client';

import { useEffect, useMemo, useState } from 'react';

import { EventItem, Guest } from '@/lib/types.event';
import { aiGuestSeed } from '@/lib/ai.service';

export default function GuestsPane({ event, onUpdate }:{ event: EventItem; onUpdate:(patch: Partial<EventItem>)=>void }) {
  const [guests, setGuests] = useState<Guest[]>(event.guests ?? []);

  useEffect(() => {
    setGuests(event.guests ?? []);
  }, [event]);

  useEffect(() => {
    if ((event.guests ?? []).length === 0) {
      aiGuestSeed(event).then((seededGuests) => {
        setGuests(seededGuests);
        onUpdate({ guests: seededGuests });
      });
    }
  }, [event, onUpdate]);
  function edit(id:string, patch:Partial<Guest>){ const next=guests.map(g=>g.id===id?{...g,...patch}:g); setGuests(next); onUpdate({ guests: next }); }
  function addGuest(){ const g:Guest={ id:`g-${Date.now()}`, name:'New Guest', rsvp:'maybe' }; const next=[g,...guests]; setGuests(next); onUpdate({ guests: next }); }

  const counts = useMemo(()=>({
    yes: guests.filter(g=>g.rsvp==='yes').length,
    no: guests.filter(g=>g.rsvp==='no').length,
    maybe: guests.filter(g=>g.rsvp==='maybe').length,
  }),[guests]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Guest List</h3>
          <button onClick={addGuest} className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50">Add Guest</button>
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
              <input className="sm:col-span-2 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" defaultValue={g.name} onChange={e=>edit(g.id,{ name:e.target.value })}/>
              <input className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="email" defaultValue={g.email} onChange={e=>edit(g.id,{ email:e.target.value })}/>
              <input className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="phone" defaultValue={g.phone} onChange={e=>edit(g.id,{ phone:e.target.value })}/>
              <select className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" defaultValue={g.meal ?? 'standard'} onChange={e=>edit(g.id,{ meal: e.target.value as Guest['meal'] })}>
                <option>standard</option><option>vegetarian</option><option>vegan</option><option>gluten-free</option><option>kosher</option><option>halal</option><option>other</option>
              </select>
              <select
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                defaultValue={g.rsvp ?? 'maybe'}
                onChange={(event) => edit(g.id, { rsvp: event.target.value as Guest['rsvp'] })}
              >
                <option value="yes">yes</option><option value="maybe">maybe</option><option value="no">no</option>
              </select>
            </li>
          ))}
          {guests.length===0 && <li className="text-sm text-slate-500">No guests yet.</li>}
        </ul>
      </div>
    </section>
  );
}

