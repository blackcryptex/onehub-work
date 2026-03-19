import { BudgetSnapshot, VendorCategory, EventItem } from './types.event';

type Suggestion = { id: string; title: string; body: string; apply?: { category: VendorCategory; delta: number }[] };

export function aiBudgetSuggestions(event: EventItem, budget: BudgetSnapshot): Suggestion[] {
  const s: Suggestion[] = [];
  const total = budget.total ?? 0;
  const remaining = budget.remaining ?? 0;

  // Heuristics by event type: weddings prioritize venue/catering/photo/florist/music/decor
  const priority: VendorCategory[] =
    event.type === 'wedding'
      ? ['venue','catering','photo','florist','music','decor']
      : ['venue','catering','photo','music','decor','other'];

  const overspend = total - (budget.spent ?? 0) - remaining; // inferred projected overage if any
  const needTrim = overspend > 0;

  // Reallocation ideas:
  // 1) Trim low-priority categories by 5–15%
  // 2) Shift savings to top-3 priority cats (venue/catering/photo for weddings)
  // 3) Identify categories where projected > planned and propose alignment
  const allocs = budget.allocations ?? [];

  // find top-3 priorities for potential upgrades
  const top3 = priority.slice(0,3);

  if (needTrim) {
    // propose trims from the last 3 categories by 10%
    const tail = priority.slice(-3);
    const trims = tail.flatMap(cat => {
      const a = allocs.find(x => x.category === cat);
      const base = a?.planned ?? a?.projected ?? 0;
      const cut = Math.round(base * 0.1);
      return cut > 0 ? [{ category: cat, delta: -cut }] : [];
    });
    if (trims.length) {
      s.push({
        id: 'trim-low-priority',
        title: 'Trim lower-priority categories by ~10%',
        body: 'Reduce spend on lower-priority items (lighting extras, premium decor accents, novelty add-ons) to protect the core vision.',
        apply: trims
      });
    }
  } else {
    // room to upgrade: add 5% to one of the top categories
    const upgrades = top3.slice(0,1).flatMap(cat => [{ category: cat, delta: Math.round((budget.total ?? 0) * 0.05) }]);
    if (upgrades.length) {
      s.push({
        id: 'upgrade-core-vision',
        title: 'Upgrade core vision by ~5%',
        body: 'Allocate a small portion to a priority category (e.g., venue ambiance, floral impact, or photography coverage) without breaking the budget.',
        apply: upgrades
      });
    }
  }

  // Align projected > planned
  for (const a of allocs) {
    if ((a.projected ?? 0) > (a.planned ?? 0)) {
      const delta = Math.round((a.projected! - (a.planned ?? 0)) * 0.5);
      if (delta > 0) {
        s.push({
          id: `align-${a.category}`,
          title: `Align plan for ${a.category}`,
          body: `Projected spend for ${a.category} exceeds plan; consider raising planned amount or negotiating scope.`,
          apply: [{ category: a.category, delta }]
        });
      }
    }
  }

  // Always include a negotiation tip
  s.push({
    id: 'negotiate-scope',
    title: 'Negotiate scope/alternatives',
    body: 'Ask vendors for tiered options (good/better/best). Keep must-haves, swap nice-to-haves (e.g., smaller arrangements, simpler menu variants).'
  });

  return s;
}

