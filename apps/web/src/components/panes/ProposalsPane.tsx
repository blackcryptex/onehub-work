'use client';

import { useMemo, useState, useEffect } from 'react';

import { EventItem, Proposal, ProposalLine, Vendor, VendorCategory } from '@/lib/types.event';
import { aiProposalChecklist, aiGenerateProposals, aiProposalFromVendor, aiProposalFromCategory } from '@/lib/ai.service';
import { sendProposalEmail } from '@/lib/email.service';
import ProposalPreviewModal from '@/components/ProposalPreviewModal';
import { useShortlist } from '@/hooks/useShortlist';

export default function ProposalsPane({ event, onUpdate }:{ event: EventItem; onUpdate:(patch: Partial<EventItem>)=>void }) {
  const vendors = useMemo(()=> (event.vendors ?? []) as Vendor[], [event.vendors]);
  const { shortlistedVendorIds } = useShortlist(event.id);
  const shortlistIdSet = useMemo(() => new Set(shortlistedVendorIds), [shortlistedVendorIds]);
  const shortlistedVendorObjects = useMemo(
    () => vendors.filter((vendor) => shortlistIdSet.has(vendor.id)),
    [vendors, shortlistIdSet],
  );
  const [checklist, setChecklist] = useState<ProposalLine[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Proposal[]>(event.proposals ?? []);
  const [loading, setLoading] = useState(false);
  const [previewedIds, setPreviewedIds] = useState<Set<string>>(new Set());
  const [previewProposal, setPreviewProposal] = useState<Proposal | null>(null);

  // Sync with event changes
  useEffect(() => {
    if (event.proposals) {
      setDrafts(event.proposals);
    }
  }, [event.proposals]);

  async function loadDefaults(){ setLoading(true); const items=await aiProposalChecklist(event); setChecklist(items); setSelected(items.reduce((a,i)=>({ ...a, [i.id]: true }),{})); setLoading(false); }
  function toggle(id:string){ setSelected(s=>({ ...s, [id]: !s[id] })); }
  function addOther(){ const id=`pl-${Date.now()}`; const next=[{ id, category:'other' as const, title:'Custom line item' }, ...checklist]; setChecklist(next); setSelected(s=>({ [id]:true, ...s })); }
  async function generate(){ setLoading(true); const lines=checklist.filter(i=>selected[i.id]); const created=await aiGenerateProposals(event, lines, vendors); const next=[...created, ...(drafts??[])]; setDrafts(next); setLoading(false); onUpdate({ proposals: next }); }

  async function generateFromShortlist() {
    setLoading(true);
    const shortlisted = shortlistedVendorObjects;
    const newProposals: Proposal[] = [];

    if (shortlisted.length > 0) {
      // Generate proposals for each shortlisted vendor
      for (const vendor of shortlisted) {
        const proposal = await aiProposalFromVendor(event, vendor);
        newProposals.push(proposal);
      }
    } else {
      // Fallback to category-based generation for top categories
      const topCategories: VendorCategory[] = event.type === 'wedding'
        ? ['venue', 'catering', 'photo', 'music', 'florist', 'decor']
        : ['venue', 'catering', 'photo', 'music', 'decor', 'other'];
      
      for (const category of topCategories.slice(0, 6)) {
        const proposal = await aiProposalFromCategory(event, category);
        newProposals.push(proposal);
      }
    }

    const next = [...newProposals, ...drafts];
    setDrafts(next);
    setLoading(false);
    onUpdate({ proposals: next });
  }

  function editLine(pid:string, idx:number, patch:Partial<ProposalLine>){
    const next = drafts.map(p => p.id===pid ? { ...p, lines: p.lines.map((l,i)=> i===idx?{...l,...patch}:l) } : p);
    setDrafts(next); onUpdate({ proposals: next });
  }

  function openPreview(p: Proposal) {
    setPreviewProposal(p);
  }

  function markPreviewed(id: string) {
    setPreviewedIds(prev => new Set([...prev, id]));
  }

  async function send(p: Proposal) {
    if (!previewedIds.has(p.id)) {
      alert('Please preview the proposal before sending.');
      return;
    }

    // Validate at least one line has a title
    if (!p.lines.some(l => l.title)) {
      alert('Please add at least one line item with a title.');
      return;
    }

    // Update status & email vendor (if available)
    const next = drafts.map(d => d.id===p.id ? { ...d, status:'sent' as const, lastUpdated: new Date().toISOString() } : d);
    setDrafts(next); onUpdate({ proposals: next });
    const to = vendors.find(v=>v.id===p.vendorId)?.email;
    if (to) {
      await sendProposalEmail(to, `Proposal for ${event.name}`, 'Please review the attached proposal.');
    }
  }

  function approve(p: Proposal) {
    const next = drafts.map(d => d.id===p.id ? { ...d, status:'accepted' as const, lastUpdated: new Date().toISOString() } : d);
    setDrafts(next); onUpdate({ proposals: next });
  }

  function reject(p: Proposal) {
    const next = drafts.map(d => d.id===p.id ? { ...d, status:'rejected' as const, lastUpdated: new Date().toISOString() } : d);
    setDrafts(next); onUpdate({ proposals: next });
  }

  return (
    <section className="space-y-6">
      {/* Generate from Shortlist - Primary Action */}
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Generate Proposals</h3>
            <p className="text-sm text-slate-600 mt-1">
              {shortlistedVendorObjects.length > 0
                ? `${shortlistedVendorObjects.length} vendor(s) shortlisted`
                : 'No vendors shortlisted. Will generate by category.'}
            </p>
          </div>
          <button
            onClick={generateFromShortlist}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-semibold bg-[color:var(--oh-primary)] text-white hover:bg-[color:var(--oh-primary-700)] disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate from Shortlist'}
          </button>
        </div>
      </div>

      {/* Legacy Checklist (keep for backwards compatibility) */}
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Proposal Checklist (Legacy)</h3>
          <div className="flex gap-2">
            <button onClick={loadDefaults} disabled={loading} className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50">{loading?'Loading…':'Load defaults'}</button>
            <button onClick={addOther} className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50">Add Other</button>
            <button onClick={generate} disabled={loading || checklist.every(i=>!selected[i.id])} className="rounded-lg px-3 py-1.5 text-sm border bg-white hover:bg-slate-50">{loading?'Generating…':'Generate Proposals'}</button>
          </div>
        </div>
        <ul className="mt-3 grid md:grid-cols-2 gap-2">
          {checklist.map(item=>(
            <li key={item.id} className="flex items-center gap-2 rounded-lg border p-2">
              <input type="checkbox" checked={!!selected[item.id]} onChange={()=>toggle(item.id)} />
              <div className="min-w-0">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-slate-500 capitalize">{item.category}</div>
              </div>
            </li>
          ))}
          {checklist.length===0 && <li className="text-sm text-slate-500">Click “Load defaults” to start.</li>}
        </ul>
      </div>

      {/* Proposal Drafts */}
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <h3 className="font-semibold">Proposal Drafts &amp; Status</h3>
        <ul className="mt-3 space-y-3">
          {drafts.map(p=>(
            <li key={p.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{p.vendorName || 'Unassigned vendor'}</div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 capitalize">{p.status}</span>
              </div>
              {p.lines.map((ln, idx)=>(
                <div key={ln.id} className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" defaultValue={ln.title} onChange={e=>editLine(p.id, idx, { title: e.target.value })}/>
                  <input className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Qty" type="number" onChange={e=>editLine(p.id, idx, { qty: Number(e.target.value)||undefined })}/>
                  <input className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Unit Price" type="number" onChange={e=>editLine(p.id, idx, { unitPrice: Number(e.target.value)||undefined })}/>
                  <input className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Total" type="number" onChange={e=>editLine(p.id, idx, { total: Number(e.target.value)||undefined })}/>
                </div>
              ))}
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  onClick={() => openPreview(p)}
                  className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50"
                >
                  Preview
                </button>
                <button
                  onClick={() => send(p)}
                  disabled={!previewedIds.has(p.id) || p.lines.every(l => !l.title)}
                  className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!previewedIds.has(p.id) ? 'Preview required before sending' : ''}
                >
                  Send
                </button>
                {p.status === 'pending' && (
                  <>
                    <button onClick={() => approve(p)} className="rounded-lg px-3 py-1.5 text-sm border bg-green-50 hover:bg-green-100 text-green-700">
                      Approve
                    </button>
                    <button onClick={() => reject(p)} className="rounded-lg px-3 py-1.5 text-sm border bg-red-50 hover:bg-red-100 text-red-700">
                      Reject
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
          {drafts.length===0 && <li className="text-sm text-slate-500">No drafts yet. Click “Generate from Shortlist” to create proposals.</li>}
        </ul>
      </div>

      {previewProposal && (
        <ProposalPreviewModal
          proposal={previewProposal}
          isOpen={!!previewProposal}
          onClose={() => setPreviewProposal(null)}
          onMarkPreviewed={() => markPreviewed(previewProposal.id)}
        />
      )}
    </section>
  );
}
