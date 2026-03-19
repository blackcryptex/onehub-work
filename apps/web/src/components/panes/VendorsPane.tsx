'use client';

import { useEffect, useMemo, useState } from 'react';

import { EventItem, Vendor } from '@/lib/types.event';
import { aiSuggestVendors } from '@/lib/ai.service';
import { sendEmail } from '@/lib/email.service';
import { openVendorChatThread } from '@/lib/chat.service';
import { useShortlist } from '@/hooks/useShortlist';

interface VendorsPaneProps {
  event: EventItem;
  onUpdate: (patch: Partial<EventItem>) => void;
  onNavigateToProposals?: () => void;
}

export default function VendorsPane({ event, onUpdate, onNavigateToProposals }: VendorsPaneProps) {
  const { shortlistedVendorIds, isShortlisted, toggleShortlist } = useShortlist(event.id);
  const [list, setList] = useState<Vendor[]>(event.vendors ?? []);
  const [loading, setLoading] = useState(false);

  const shortlistKey = useMemo(
    () => Array.from(shortlistedVendorIds).sort().join('|'),
    [shortlistedVendorIds],
  );

  useEffect(() => {
    const base = event.vendors ?? [];
    const withShortlist = base.map((vendor) => ({
      ...vendor,
      shortlisted: isShortlisted(vendor.id),
    }));
    setList(withShortlist);
  }, [event.vendors, shortlistKey, isShortlisted]);

  function applyShortlistState(vendors: Vendor[]): Vendor[] {
    return vendors.map((vendor) => ({
      ...vendor,
      shortlisted: isShortlisted(vendor.id),
    }));
  }

  async function generate() {
    setLoading(true);
    const data = await aiSuggestVendors(event);
    const next = applyShortlistState(data);
    setList(next);
    setLoading(false);
    onUpdate({ vendors: next });
  }

  function handleToggleShortlist(vendor: Vendor, checked: boolean) {
    const next = list.map((item) =>
      item.id === vendor.id ? { ...item, shortlisted: checked } : item,
    );
    setList(next);
    onUpdate({ vendors: next });
    toggleShortlist({ id: vendor.id, name: vendor.name }, checked);
  }

  function addOther() {
    const vendor: Vendor = {
      id: `v-${Date.now()}`,
      name: 'Other vendor',
      category: 'other',
      shortlisted: true,
    };
    const next = [vendor, ...list];
    setList(next);
    onUpdate({ vendors: next });
    toggleShortlist({ id: vendor.id, name: vendor.name }, true);
  }
  async function emailVendor(v:Vendor){ if(!v.email) return; await sendEmail(v.email, `Inquiry for ${event.name}`, `Hello ${v.name}...`); }
  async function chatVendor(v:Vendor){ await openVendorChatThread(v.id); }

  return (
    <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Vendors</h3>
        <div className="flex gap-2">
          <button onClick={generate} disabled={loading} className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50">{loading?'Generating…':'Generate'}</button>
          <button onClick={addOther} className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50">Add Other</button>
          {onNavigateToProposals && list.some(v => v.shortlisted) && (
            <button
              onClick={onNavigateToProposals}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-[color:var(--oh-primary)] text-white hover:bg-[color:var(--oh-primary-700)]"
            >
              Use Shortlist in Proposals
            </button>
          )}
        </div>
      </div>
      <ul className="space-y-2">
        {list.map(v=>(
          <li key={v.id} className="rounded-lg border p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{v.name}</div>
              <div className="text-xs text-slate-500 capitalize">{v.category}{v.city?` • ${v.city}`:''}</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={!!v.shortlisted}
                  onChange={(e) => handleToggleShortlist(v, e.target.checked)}
                />
                Shortlist
              </label>
              <button onClick={()=>emailVendor(v)} className="rounded-lg px-2 py-1 text-xs border hover:bg-slate-50">Email</button>
              <button onClick={()=>chatVendor(v)} className="rounded-lg px-2 py-1 text-xs border hover:bg-slate-50">Chat</button>
            </div>
          </li>
        ))}
        {list.length===0 && <li className="text-sm text-slate-500">Click “Generate” to auto-populate vendors for this event.</li>}
      </ul>
    </section>
  );
}

