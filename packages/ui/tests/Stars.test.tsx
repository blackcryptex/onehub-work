import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stars } from "../src/components/Stars";

describe("Stars component", () => {
  it("renders full stars for integer rating", () => {
    render(<Stars rating={4} />);
    const stars = screen.getAllByText("★");
    expect(stars.length).toBeGreaterThan(0);
  });

  it("displays rating value", () => {
    render(<Stars rating={4.5} />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });
});

