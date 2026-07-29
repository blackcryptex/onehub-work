import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../../..");

function readRepoFile(path: string) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("sensitive log hygiene", () => {
  it("does not log emails, invite tokens, session IDs, or impersonation IDs in auth and invite paths", () => {
    const sensitiveFiles = [
      "apps/web/src/lib/auth.ts",
      "apps/web/src/server/routers/invite.ts",
      "apps/web/src/server/routers/guest.ts",
    ];

    for (const file of sensitiveFiles) {
      const content = readRepoFile(file);
      expect(content, `${file} should not use raw console logging in sensitive paths`).not.toMatch(/console\.(log|warn|error)/);
    }
  });
});
