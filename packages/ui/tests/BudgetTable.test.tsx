import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetTable } from "../src/components/BudgetTable";

describe("BudgetTable component", () => {
  it("renders budget lines and totals", () => {
    const lines = [
      { id: "1", category: "VENUE", label: "Hall", plannedCents: 100000, actualCents: 95000 },
      { id: "2", category: "CATERING", label: "Dinner", plannedCents: 50000, actualCents: 55000 },
    ];
    render(<BudgetTable lines={lines} />);
    expect(screen.getByText("Hall")).toBeInTheDocument();
    expect(screen.getByText("$1,500.00")).toBeInTheDocument(); // total planned
  });
});

