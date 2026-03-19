import { describe, it, expect } from "vitest";

describe("Rating aggregation", () => {
  it("calculates average rating correctly", () => {
    const ratings = [5, 4, 5, 3, 4];
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    expect(avg).toBe(4.2);
  });

  it("handles single rating", () => {
    const ratings = [5];
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    expect(avg).toBe(5);
  });

  it("handles empty ratings", () => {
    const ratings: number[] = [];
    const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    expect(avg).toBe(0);
  });
});

