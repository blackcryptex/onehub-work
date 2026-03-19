import { EventItem, VendorCategory, BudgetSnapshot, BudgetAllocation, Proposal, Contract } from './types.event';

const CAT_ORDER: VendorCategory[] = [
  'venue','catering','photo','video','music','florist','decor','officiant','transport','cake','planner','other'
];

export function sumProposalCategory(proposals: Proposal[]|undefined, cat: VendorCategory): number {
  if (!proposals) return 0;
  // include sent, pending, accepted as projection
  const keep = new Set(['sent','pending','accepted']);
  let sum = 0;
  for (const p of proposals) {
    if (!keep.has(p.status)) continue;
    for (const ln of (p.lines ?? [])) {
      if (ln.category === cat) sum += (ln.total ?? (ln.qty ?? 0) * (ln.unitPrice ?? 0));
    }
  }
  return sum;
}

export function sumContractActual(contracts: Contract[]|undefined, cat: VendorCategory, proposals: Proposal[]|undefined): number {
  if (!contracts) return 0;
  // naive: if a contract is signed/completed and we can find its proposal lines by fromProposalId
  const keep = new Set(['signed','completed']);
  let sum = 0;
  for (const c of contracts) {
    if (!keep.has(c.status)) continue;
    if (c.value) { sum += c.value; continue; }
    const prop = (proposals ?? []).find(p => p.id === c.fromProposalId);
    if (!prop) continue;
    for (const ln of (prop.lines ?? [])) {
      if (ln.category === cat) sum += (ln.total ?? (ln.qty ?? 0) * (ln.unitPrice ?? 0));
    }
  }
  return sum;
}

export function computeBudget(event: EventItem): BudgetSnapshot {
  const base: BudgetSnapshot = event.budget ?? { total: 30000, spent: 0, remaining: 30000, allocations: [] };
  const allocations: BudgetAllocation[] = (base.allocations && base.allocations.length)
    ? base.allocations.map(a => ({ ...a }))
    : CAT_ORDER.map(category => ({ category }));

  // fill projected & actual by category
  let totalActual = 0, totalProjected = 0;
  for (const a of allocations) {
    const proj = sumProposalCategory(event.proposals, a.category);
    const act = sumContractActual(event.contracts, a.category, event.proposals);
    a.projected = proj;
    a.actual = act || null; // Normalize undefined -> null
    totalProjected += proj;
    totalActual += act;
  }

  const total = base.total ?? 0;
  const spent = totalActual || base.spent || 0;
  const remaining = Math.max(0, total - (totalActual || totalProjected));

  return {
    total,
    spent,
    remaining,
    allocations
  };
}

