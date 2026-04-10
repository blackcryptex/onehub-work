import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { BudgetTable } from "../src/components/BudgetTable";

describe("BudgetTable component", () => {
  it("renders budget lines and totals", () => {
    const lines = [
      { id: "1", category: "VENUE", label: "Hall", plannedCents: 100000, actualCents: 95000 },
      { id: "2", category: "CATERING", label: "Dinner", plannedCents: 50000, actualCents: 55000 },
    ];
    render(<BudgetTable lines={lines} />);
    expect(screen.getByText("Hall")).toBeInTheDocument();
    const totalsRow = screen.getByText("Totals").closest("tr");
    expect(totalsRow).not.toBeNull();
    const totalsCells = within(totalsRow as HTMLTableRowElement).getAllByRole("cell");
    expect(totalsCells[1]).toHaveTextContent("$1500.00"); // total planned
  });
});

