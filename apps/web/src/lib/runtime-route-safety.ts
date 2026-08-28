export async function safePrismaResult<T>(
  label: string,
  read: Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await read;
  } catch (error) {
    console.error(
      `[runtime-route-safety] ${label} failed; rendering fallback`,
      error instanceof Error ? error.message : "unknown error",
    );
    return fallback;
  }
}

export function safeArray<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return [];
}

export function safeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function safeDateLabel(value: Date | string | null | undefined, fallback = "Date pending") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString();
}
