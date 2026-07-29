export type SeedSafetyInput = {
  databaseUrl: string | undefined;
  allowNonLocalSeed?: boolean;
  nodeEnv?: string;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function isLocalDatabaseUrl(databaseUrl: string): boolean {
  if (databaseUrl.startsWith("file:")) return true;

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return false;
  }

  if (parsed.protocol === "sqlite:") return true;
  return LOCAL_HOSTS.has(parsed.hostname.toLowerCase());
}

export function assertSafeSeedEnvironment(input: SeedSafetyInput): void {
  const databaseUrl = input.databaseUrl?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before running the seed script.");
  }

  if (input.nodeEnv === "production") {
    throw new Error("Refusing to run seed script in production NODE_ENV.");
  }

  if (isLocalDatabaseUrl(databaseUrl)) return;

  if (input.allowNonLocalSeed) {
    return;
  }

  throw new Error(
    "Refusing to run seed script against a non-local database. Set ALLOW_NON_LOCAL_SEED=true only for an explicitly approved non-production seed target.",
  );
}
