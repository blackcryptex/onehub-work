import { describe, it, expect } from "vitest";
import { computeBudgetVariance } from "../src/budget";

describe("computeBudgetVariance", () => {
  it("computes totals and variance", () => {
    const { totals, variance } = computeBudgetVariance([
      { plannedCents: 100, actualCents: 150 },
      { plannedCents: 50, actualCents: 50 },
    ]);
    expect(totals).toEqual({ planned: 150, actual: 200 });
    expect(variance).toBe(50);
  });
});
