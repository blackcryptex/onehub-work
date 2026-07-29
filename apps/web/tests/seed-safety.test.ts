import { describe, expect, it } from "vitest";

import { assertSafeSeedEnvironment } from "../../../scripts/seed-safety";

describe("seed safety guard", () => {
  it("allows explicit local sqlite seed targets", () => {
    expect(() => assertSafeSeedEnvironment({ databaseUrl: "file:./dev.db", allowNonLocalSeed: false })).not.toThrow();
  });

  it("allows localhost postgres seed targets", () => {
    expect(() => assertSafeSeedEnvironment({ databaseUrl: "postgresql://user:pass@localhost:5432/onehub_dev", allowNonLocalSeed: false })).not.toThrow();
    expect(() => assertSafeSeedEnvironment({ databaseUrl: "postgresql://user:pass@127.0.0.1:5432/onehub_dev", allowNonLocalSeed: false })).not.toThrow();
  });

  it("rejects remote database URLs by default", () => {
    expect(() => assertSafeSeedEnvironment({ databaseUrl: "postgresql://user:pass@db.example.com:5432/onehub", allowNonLocalSeed: false })).toThrow(/refusing to run seed/i);
  });

  it("rejects production-like environments even with a remote override", () => {
    expect(() => assertSafeSeedEnvironment({ databaseUrl: "postgresql://user:pass@db.example.com:5432/onehub", allowNonLocalSeed: true, nodeEnv: "production" })).toThrow(/production/i);
  });

  it("rejects missing database URLs", () => {
    expect(() => assertSafeSeedEnvironment({ databaseUrl: undefined, allowNonLocalSeed: false })).toThrow(/DATABASE_URL/i);
  });
});
