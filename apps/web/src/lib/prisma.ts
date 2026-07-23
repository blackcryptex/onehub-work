import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const PGBOUNCER_HOST_PATTERNS = ["pooler.supabase.com", "pgbouncer"];
const PGBOUNCER_PORTS = new Set(["6432", "6543"]);

export function getRuntimeDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) return undefined;

  try {
    const parsed = new URL(databaseUrl);
    const hostname = parsed.hostname.toLowerCase();
    const usesPoolingEndpoint =
      PGBOUNCER_HOST_PATTERNS.some((pattern) => hostname.includes(pattern)) ||
      PGBOUNCER_PORTS.has(parsed.port);

    if (!usesPoolingEndpoint) return databaseUrl;

    if (!parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
    }
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }

    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

const runtimeDatabaseUrl = getRuntimeDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(runtimeDatabaseUrl ? { datasourceUrl: runtimeDatabaseUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
