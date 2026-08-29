import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "apps/web/src/app/(app)/disputes/page.tsx"), "utf8");

describe("W5 disputes contextual review entry", () => {
  it("accepts contract/payment context in query params so users do not copy raw IDs manually", () => {
    expect(source).toContain("searchParams");
    expect(source).toContain("resolvedSearchParams.proposalId");
    expect(source).toContain("defaultValue={resolvedSearchParams.milestoneId}");
    expect(source).toContain("Request context");
    expect(source).toContain("Open a dispute review");
  });
});
