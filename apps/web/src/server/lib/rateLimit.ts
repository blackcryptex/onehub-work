/**
 * Simple in-memory rate limiting middleware for Wave 6.
 * TODO: Replace with Redis-based rate limiter in production.
 */

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const store: RateLimitStore = {};

function getKey(identifier: string, windowMs: number): string {
  const window = Math.floor(Date.now() / windowMs);
  return `${identifier}:${window}`;
}

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  identifier?: string; // Optional custom identifier (defaults to IP)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate limited.
 * @param identifier Unique identifier (e.g., IP address, user ID)
 * @param options Rate limit options
 * @returns Rate limit result
 */
export function checkRateLimit(identifier: string, options: RateLimitOptions): RateLimitResult {
  const { windowMs, maxRequests } = options;
  const key = getKey(identifier, windowMs);
  const now = Date.now();
  const resetAt = Math.floor(now / windowMs) * windowMs + windowMs;

  // Clean up expired entries (simple cleanup every 1000 checks)
  if (Math.random() < 0.001) {
    const cutoff = now - windowMs;
    for (const k in store) {
      if (store[k]!.resetAt < cutoff) {
        delete store[k];
      }
    }
  }

  const entry = store[key];
  if (!entry || entry.resetAt < now) {
    store[key] = { count: 1, resetAt };
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  entry.count++;
  const allowed = entry.count <= maxRequests;
  return {
    allowed,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Middleware helper for Next.js API routes.
 * Returns a 429 response if rate limit is exceeded.
 */
export function withRateLimit(
  options: RateLimitOptions,
  getIdentifier: (req: Request) => string = (req) => {
    // Default: use IP address from headers
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0]?.trim() || undefined : req.headers.get("x-real-ip") || undefined;
    return ip || "unknown";
  }
) {
  return async (req: Request, handler: (req: Request) => Promise<Response>): Promise<Response> => {
    // Check if rate limiting is enabled
    if (process.env.RATE_LIMIT_ENABLED !== "true") {
      return handler(req);
    }

    const identifier = getIdentifier(req);
    const result = checkRateLimit(identifier, options);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests", retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": options.maxRequests.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.resetAt.toString(),
            "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const response = await handler(req);
    response.headers.set("X-RateLimit-Limit", options.maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", result.resetAt.toString());
    return response;
  };
}
