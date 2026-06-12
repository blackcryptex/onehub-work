const SENSITIVE_METADATA_KEY = /(secret|token|password|credential|authorization|api[-_]?key|signature|providerpayload|rawpayload|stripepayload|webhooksecret|clientsecret)/i;

export function redactAdminMetadata(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redactAdminMetadata(item));
  if (typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, childValue]) => [
      key,
      SENSITIVE_METADATA_KEY.test(key) ? "[REDACTED]" : redactAdminMetadata(childValue),
    ])
  );
}

export function isManualAdminOnlyWebhook(meta: unknown): boolean {
  if (!meta || typeof meta !== "object") return false;
  const record = meta as Record<string, unknown>;
  return record.manualAdminOnly === true || record.kind === "manual-admin-only";
}

export function formatCents(cents: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);
}
