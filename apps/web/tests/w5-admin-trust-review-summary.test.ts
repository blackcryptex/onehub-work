import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repo = process.cwd();

describe("W5 admin trust review summary", () => {
  it("surfaces human review requirements before JSON evidence", () => {
    const source = readFileSync(join(repo, "apps/web/src/app/(app)/admin/verification/page.tsx"), "utf8");

    expect(source).toContain("Human-first trust review summary");
    expect(source).toContain("current blocker, affected buyer/provider parties, requested vs approved amount, missing evidence, policy/legal version, named guarded-MVP authority, and irreversible side effects");
  });

  it("shows event workspace trust-review counts and admin verification link", () => {
    const source = readFileSync(join(repo, "apps/web/src/app/(app)/vault/[eventSlug]/page.tsx"), "utf8");

    expect(source).toContain("Trust review state");
    expect(source).toContain("open refund request(s)");
    expect(source).toContain("active holdback(s)");
    expect(source).toContain("Open admin verification");
  });
});
