import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleBadge } from "../src/components/layout/RoleBadge";

describe("RoleBadge", () => {
  it("renders role text", () => {
    render(<RoleBadge role="ADMIN" />);
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
  });
});
