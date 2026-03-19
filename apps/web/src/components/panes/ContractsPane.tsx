'use client';

import { useMemo, useState, useEffect } from 'react';

import { EventItem, Proposal, Contract } from '@/lib/types.event';
import { aiContractFromProposal } from '@/lib/ai.service';
import { sendContractForESign } from '@/lib/esign.service';
import ContractPreviewModal from '@/components/ContractPreviewModal';

export default function ContractsPane({ event, onUpdate }:{ event: EventItem; onUpdate:(patch: Partial<EventItem>)=>void }) {
  const accepted = useMemo(()=> (event.proposals ?? []).filter(p=>p.status==='accepted'), [event.proposals]);
  const [drafts, setDrafts] = useState<Contract[]>(event.contracts ?? []);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [previewedIds, setPreviewedIds] = useState<Set<string>>(new Set());
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);

  // Sync with event changes
  useEffect(() => {
    if (event.contracts) {
      setDrafts(event.contracts);
    }
  }, [event.contracts]);

  async function gen(p:Proposal){
    setBusy(b=>({ ...b, [p.id]: true }));
    const c = await aiContractFromProposal(event, p);
    const next = [c, ...drafts];
    setDrafts(next); onUpdate({ contracts: next });
    setBusy(b=>({ ...b, [p.id]: false }));
  }
  function editClause(cid:string, idx:number, patch:Partial<Contract['clauses'][number]>){
    const next = drafts.map(d=> d.id!==cid ? d : { ...d, clauses: d.clauses.map((cl,i)=> i!==idx? cl : { ...cl, ...patch }) });
    setDrafts(next); onUpdate({ contracts: next });
  }

  function openPreview(c: Contract) {
    setPreviewContract(c);
  }

  function markPreviewed(id: string) {
    setPreviewedIds(prev => new Set([...prev, id]));
  }

  async function sendForESign(c: Contract) {
    if (!previewedIds.has(c.id)) {
      alert('Please preview the contract before sending.');
      return;
    }

    const next = drafts.map(d => d.id === c.id ? { ...d, status: 'sent' as const, lastUpdated: new Date().toISOString() } : d);
    setDrafts(next);
    onUpdate({ contracts: next });
    
    // Stub: would send to counterparty email if available
    await sendContractForESign();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <h3 className="font-semibold">Generate from Accepted Proposals</h3>
        <ul className="mt-3 space-y-2">
          {accepted.map(p=>(
            <li key={p.id} className="flex items-center justify-between rounded-lg border p-2">
              <div className="font-medium truncate">{p.vendorName || 'Vendor'}</div>
              <button onClick={()=>gen(p)} disabled={busy[p.id]} className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50">{busy[p.id]?'Generating…':'Generate Contract'}</button>
            </li>
          ))}
          {accepted.length===0 && <li className="text-sm text-slate-500">No accepted proposals yet.</li>}
        </ul>
      </div>

      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <h3 className="font-semibold">Contract Drafts</h3>
        <ul className="mt-3 space-y-3">
          {drafts.map(c=>(
            <li key={c.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{c.counterparty}</div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 capitalize">{c.status}</span>
              </div>
              <div className="mt-2 space-y-2">
                {c.clauses.map((cl, idx)=>(
                  <div key={cl.id} className="rounded-lg border p-2">
                    <input className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" defaultValue={cl.title} onChange={e=>editClause(c.id, idx, { title: e.target.value })}/>
                    <textarea className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" rows={3} defaultValue={cl.body} onChange={e=>editClause(c.id, idx, { body: e.target.value })}/>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openPreview(c)}
                  className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50"
                >
                  Preview
                </button>
                <button
                  onClick={() => sendForESign(c)}
                  disabled={!previewedIds.has(c.id)}
                  className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!previewedIds.has(c.id) ? 'Preview required before sending' : ''}
                >
                  Send for e-sign
                </button>
              </div>
            </li>
          ))}
          {drafts.length===0 && <li className="text-sm text-slate-500">No contracts yet.</li>}
        </ul>
      </div>

      {previewContract && (
        <ContractPreviewModal
          contract={previewContract}
          isOpen={!!previewContract}
          onClose={() => setPreviewContract(null)}
          onMarkPreviewed={() => markPreviewed(previewContract.id)}
        />
      )}
    </section>
  );
}
