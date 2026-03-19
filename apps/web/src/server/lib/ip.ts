import type { NextRequest } from "next/server";

/** Extract best-effort client IP from headers. */
export function getClientIp(req: NextRequest | { headers: Headers }): string | undefined {
  const h = req.headers as unknown as Headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    undefined
  );
}
