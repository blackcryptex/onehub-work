const DEFAULT_LOCAL_REDIRECT = "/app";
const LOCAL_REDIRECT_BASE = "http://onehub.local";

export function sanitizeLocalRedirect(input: unknown, fallback = DEFAULT_LOCAL_REDIRECT) {
  if (typeof input !== "string") return fallback;

  const value = input.trim();
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }

  try {
    const url = new URL(value, LOCAL_REDIRECT_BASE);
    if (url.origin !== LOCAL_REDIRECT_BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
