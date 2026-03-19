/** Compute totals and variance in cents. */
export function computeBudgetVariance(lines: { plannedCents: number; actualCents: number }[]) {
  const totals = lines.reduce((acc, l) => { acc.planned += l.plannedCents; acc.actual += l.actualCents; return acc; }, { planned: 0, actual: 0 });
  return { totals, variance: totals.actual - totals.planned };
}
