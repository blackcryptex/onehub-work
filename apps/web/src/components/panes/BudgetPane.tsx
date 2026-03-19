'use client';

import { useEffect, useMemo, useState } from 'react';

import { EventItem, BudgetSnapshot, VendorCategory } from '@/lib/types.event';
import { computeBudget } from '@/lib/budget.util';
import { aiBudgetSuggestions } from '@/lib/ai.budget';

export default function BudgetPane({ event, onUpdate }:{ event: EventItem; onUpdate:(patch: Partial<EventItem>)=>void }) {
  const computed = useMemo(() => computeBudget(event), [event]);
  const [budget, setBudget] = useState<BudgetSnapshot>(computed);
  const [suggestions, setSuggestions] = useState(() => aiBudgetSuggestions(event, computed));

  // refresh when event changes (e.g., new proposals/contracts)
  useEffect(() => {
    const next = computeBudget(event);
    setBudget(next);
    setSuggestions(aiBudgetSuggestions(event, next));
  }, [event]);

  function setTotal(v:number){
    const next = { ...budget, total: v, remaining: Math.max(0, v - (budget.spent ?? 0)) };
    setBudget(next);
    persist(next);
  }
  function setPlanned(cat: VendorCategory, planned:number){
    const allocations = (budget.allocations ?? []).map(a => a.category===cat ? { ...a, planned } : a);
    const next = { ...budget, allocations };
    setBudget(next);
    persist(next);
  }
  function applySuggestion(idx:number){
    const s = suggestions[idx];
    if (!s?.apply?.length) return;
    const allocs = (budget.allocations ?? []).map(a => {
      const hit = s.apply!.find(x => x.category === a.category);
      if (!hit) return a;
      const planned = Math.max(0, (a.planned ?? 0) + hit.delta);
      return { ...a, planned };
    });
    const next = { ...budget, allocations: allocs };
    setBudget(next);
    persist(next);
    // refresh suggestions after applying
    setSuggestions(aiBudgetSuggestions(event, next));
  }

  function persist(next: BudgetSnapshot){
    onUpdate({ budget: next });
  }

  const totalPlanned = (budget.allocations ?? []).reduce((acc,a)=> acc + (a.planned ?? 0), 0);
  const totalProjected = (budget.allocations ?? []).reduce((acc,a)=> acc + (a.projected ?? 0), 0);
  const totalActual = (budget.allocations ?? []).reduce((acc,a)=> acc + (a.actual ?? 0), 0);
  const remaining = (budget.total ?? 0) - (totalActual || totalProjected || 0);

  return (
    <section className="space-y-6">
      {/* Summary */}
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <h3 className="font-semibold">Budget Overview</h3>
        <div className="mt-3 grid sm:grid-cols-4 gap-3 text-sm">
          <label className="rounded border p-3">
            <div className="text-slate-500">Total Budget</div>
            <input type="number" className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              defaultValue={budget.total ?? 0}
              onChange={e=>setTotal(Number(e.target.value)||0)} />
          </label>
          <div className="rounded border p-3">
            <div className="text-slate-500">Planned (sum)</div>
            <div className="mt-1 font-semibold">${totalPlanned.toLocaleString()}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-slate-500">Projected (proposals)</div>
            <div className="mt-1 font-semibold">${totalProjected.toLocaleString()}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-slate-500">Remaining</div>
            <div className={`mt-1 font-semibold ${remaining < 0 ? 'text-red-600' : ''}`}>
              ${remaining.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Allocations */}
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <h3 className="font-semibold">Allocations by Category</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Planned</th>
                <th className="py-2 pr-4">Projected</th>
                <th className="py-2 pr-4">Actual</th>
                <th className="py-2 pr-4">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {(budget.allocations ?? []).map(a=>(
                <tr key={a.category} className="border-t">
                  <td className="py-2 pr-4 capitalize">{a.category}</td>
                  <td className="py-2 pr-4">
                    <input type="number" className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      defaultValue={a.planned ?? 0}
                      onChange={e=>setPlanned(a.category, Number(e.target.value)||0)} />
                  </td>
                  <td className="py-2 pr-4">${(a.projected ?? 0).toLocaleString()}</td>
                  <td className="py-2 pr-4">${(a.actual ?? 0).toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    {/* simple what-if: 5% up/down */}
                    <div className="inline-flex gap-1">
                      <button className="rounded border px-2 py-1" onClick={()=>setPlanned(a.category, Math.max(0,(a.planned ?? 0) - Math.round((a.planned ?? 0)*0.05)))}>-5%</button>
                      <button className="rounded border px-2 py-1" onClick={()=>setPlanned(a.category, (a.planned ?? 0) + Math.round((a.planned ?? 0)*0.05))}>+5%</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(budget.allocations ?? []).length===0 && (
                <tr><td className="py-2 text-slate-500" colSpan={5}>No allocations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Assistant Suggestions</h3>
          <button className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50"
            onClick={()=>setSuggestions(aiBudgetSuggestions(event, budget))}>
            Refresh
          </button>
        </div>
        <ul className="mt-3 space-y-3">
          {suggestions.map((sg, idx)=>(
            <li key={sg.id} className="rounded-xl border p-3">
              <div className="font-medium">{sg.title}</div>
              <div className="text-slate-600 text-sm mt-1">{sg.body}</div>
              {sg.apply && sg.apply.length>0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {sg.apply.map(a=>(
                    <span key={a.category} className="rounded-full border px-2 py-0.5 capitalize">
                      {a.category}: {a.delta>0?'+':''}${a.delta.toLocaleString()}
                    </span>
                  ))}
                  <button className="ml-auto rounded-lg px-3 py-1 text-xs border hover:bg-slate-50"
                    onClick={()=>applySuggestion(idx)}>
                    Apply
                  </button>
                </div>
              )}
            </li>
          ))}
          {suggestions.length===0 && <li className="text-sm text-slate-500">No suggestions right now.</li>}
        </ul>
      </div>
    </section>
  );
}
