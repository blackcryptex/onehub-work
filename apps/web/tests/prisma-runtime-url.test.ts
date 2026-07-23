import { describe, expect, it } from "vitest";
import { getRuntimeDatabaseUrl } from "@/lib/prisma";

describe("getRuntimeDatabaseUrl", () => {
  it("adds Prisma PgBouncer compatibility flags for Supabase pooler URLs", () => {
    const url = getRuntimeDatabaseUrl(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public",
    );

    expect(url).toContain("pgbouncer=true");
    expect(url).toContain("connection_limit=1");
    expect(url).toContain("schema=public");
  });

  it("does not rewrite direct database URLs", () => {
    const direct = "postgresql://user:pass@db.example.com:5432/postgres?schema=public";

    expect(getRuntimeDatabaseUrl(direct)).toBe(direct);
  });

  it("preserves existing PgBouncer settings", () => {
    const url = getRuntimeDatabaseUrl(
      "postgresql://user:pass@pgbouncer.internal:6432/postgres?pgbouncer=true&connection_limit=3",
    );

    expect(url).toContain("pgbouncer=true");
    expect(url).toContain("connection_limit=3");
  });
});
