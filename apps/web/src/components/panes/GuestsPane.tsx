'use client';

import { useEffect, useMemo, useState } from 'react';

import { EventItem, Guest } from '@/lib/types.event';
import { aiGuestSeed } from '@/lib/ai.service';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function blankGuest(): Guest {
  return { id: `draft-${Date.now()}`, name: 'New Guest', rsvp: 'maybe' };
}

function parseImportRows(raw: string): Guest[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, email, phone, rsvp] = line.split(',').map((part) => part?.trim());
      return {
        id: `import-${Date.now()}-${index}`,
        name: name || 'Guest',
        email: email || undefined,
        phone: phone || undefined,
        rsvp: rsvp === 'yes' || rsvp === 'no' || rsvp === 'maybe' ? rsvp : 'maybe',
      };
    });
}

export default function GuestsPane({ event, onUpdate }:{ event: EventItem; onUpdate:(patch: Partial<EventItem>)=>void }) {
  const [guests, setGuests] = useState<Guest[]>(event.guests ?? []);
  const [importText, setImportText] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setGuests(event.guests ?? []);
    setSaveState('idle');
    setMessage('');
  }, [event.id, event.guests]);

  useEffect(() => {
    if ((event.guests ?? []).length === 0) {
      aiGuestSeed(event).then((seededGuests) => {
        setGuests((current) => (current.length ? current : seededGuests));
      });
    }
  }, [event]);

  function updateLocal(next: Guest[]) {
    setGuests(next);
    onUpdate({ guests: next });
  }

  function edit(id:string, patch:Partial<Guest>){
    updateLocal(guests.map(g=>g.id===id?{...g,...patch}:g));
  }

  async function createGuests(rows: Guest[]) {
    setSaveState('saving');
    setMessage('Saving guest list…');
    try {
      const response = await fetch(`/api/diy/events/${event.id}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests: rows }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to save guests');
      const savedGuests = (data.guests ?? []) as Guest[];
      const draftIds = new Set(rows.map((row) => row.id));
      const next = [...guests.filter((guest) => !draftIds.has(guest.id)), ...savedGuests];
      updateLocal(next);
      setSaveState('saved');
      setMessage(`${savedGuests.length} guest${savedGuests.length === 1 ? '' : 's'} saved.`);
      return savedGuests;
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Failed to save guests');
      return [];
    }
  }

  async function saveGuest(guest: Guest) {
    if (!guest.name?.trim() && !guest.email?.trim()) {
      setSaveState('error');
      setMessage('Guest needs at least a name or email.');
      return;
    }

    if (guest.id.startsWith('draft-') || guest.id.startsWith('import-') || guest.id.startsWith(`${event.id}-guest-`)) {
      await createGuests([guest]);
      return;
    }

    setSaveState('saving');
    setMessage('Saving guest…');
    try {
      const response = await fetch(`/api/diy/events/${event.id}/guests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guest),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to update guest');
      const savedGuest = data.guest as Guest;
      updateLocal(guests.map((item) => (item.id === guest.id ? savedGuest : item)));
      setSaveState('saved');
      setMessage('Guest saved.');
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Failed to update guest');
    }
  }

  async function deleteGuest(guest: Guest) {
    if (guest.id.startsWith('draft-') || guest.id.startsWith('import-')) {
      updateLocal(guests.filter((item) => item.id !== guest.id));
      return;
    }

    setSaveState('saving');
    setMessage('Deleting guest…');
    try {
      const response = await fetch(`/api/diy/events/${event.id}/guests?guestId=${encodeURIComponent(guest.id)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to delete guest');
      updateLocal(guests.filter((item) => item.id !== guest.id));
      setSaveState('saved');
      setMessage('Guest deleted.');
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Failed to delete guest');
    }
  }

  function addGuest(){
    updateLocal([blankGuest(), ...guests]);
    setMessage('New guest row added. Fill it out and click Save.');
  }

  async function importGuests() {
    const rows = parseImportRows(importText);
    if (!rows.length) {
      setSaveState('error');
      setMessage('Paste one guest per line: Name, email, phone, rsvp.');
      return;
    }
    const saved = await createGuests(rows);
    if (saved.length) setImportText('');
  }

  const counts = useMemo(()=>({
    yes: guests.filter(g=>g.rsvp==='yes').length,
    no: guests.filter(g=>g.rsvp==='no').length,
    maybe: guests.filter(g=>g.rsvp==='maybe').length,
  }),[guests]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">Guest List</h3>
            <p className="mt-1 text-sm text-slate-600">Add, import, edit, and save guests for this event.</p>
          </div>
          <button onClick={addGuest} className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50">Add Guest</button>
        </div>
        <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded border p-2">RSVP Yes: <b>{counts.yes}</b></div>
          <div className="rounded border p-2">RSVP Maybe: <b>{counts.maybe}</b></div>
          <div className="rounded border p-2">RSVP No: <b>{counts.no}</b></div>
        </div>
        {message && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${saveState === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">Quick import</h3>
            <p className="mt-1 text-sm text-slate-600">Paste one guest per line: Name, email, phone, rsvp.</p>
          </div>
          <button onClick={importGuests} disabled={saveState === 'saving'} className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50 disabled:opacity-50">Import pasted guests</button>
        </div>
        <textarea
          className="mt-3 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Jane Smith, jane@example.com, 555-123-4567, yes"
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
        />
      </div>

      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <ul className="space-y-2">
          {guests.map(g=>(
            <li key={g.id} className="rounded-lg border p-3 grid gap-2 text-sm lg:grid-cols-[2fr_1.4fr_1.2fr_1fr_auto]">
              <input aria-label="Guest name" className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={g.name} onChange={e=>edit(g.id,{ name:e.target.value })}/>
              <input aria-label="Guest email" className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="email" value={g.email ?? ''} onChange={e=>edit(g.id,{ email:e.target.value })}/>
              <input aria-label="Guest phone" className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="phone" value={g.phone ?? ''} onChange={e=>edit(g.id,{ phone:e.target.value })}/>
              <select aria-label="Guest RSVP" className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={g.rsvp ?? 'maybe'} onChange={(event) => edit(g.id, { rsvp: event.target.value as Guest['rsvp'] })}>
                <option value="yes">yes</option><option value="maybe">maybe</option><option value="no">no</option>
              </select>
              <div className="flex gap-2">
                <button type="button" disabled={saveState === 'saving'} onClick={() => saveGuest(g)} className="rounded border px-3 py-1 hover:bg-slate-50 disabled:opacity-50">Save</button>
                <button type="button" disabled={saveState === 'saving'} onClick={() => deleteGuest(g)} className="rounded border px-3 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50">Delete</button>
              </div>
            </li>
          ))}
          {guests.length===0 && <li className="rounded-lg border border-dashed p-4 text-sm text-slate-500">No guests yet. Add one manually or paste a list above.</li>}
        </ul>
      </div>
    </section>
  );
}
