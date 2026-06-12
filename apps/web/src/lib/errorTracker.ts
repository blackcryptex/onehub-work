/**
 * Provider-neutral error tracking abstraction.
 * Defaults to a local console adapter and redacts sensitive values before logging.
 * External providers must be added only after explicit approval and without
 * embedding provider credentials in code.
 *
 * Usage:
 *   import { trackError } from "@/lib/errorTracker";
 *   trackError(error, { route: "/api/events/create", userId, eventId });
 */
export interface ErrorContext {
  route?: string;
  userId?: string;
  orgId?: string;
  eventId?: string;
  proposalId?: string;
  paymentIntentId?: string;
  milestoneId?: string;
  [key: string]: unknown;
}

type TrackLevel = "info" | "warning" | "error";

type ErrorTrackerPayload = {
  error?: string;
  stack?: string;
  message?: string;
  level?: TrackLevel;
  timestamp: string;
  [key: string]: unknown;
};

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN = /(?:password|secret|token|authorization|api[-_]?key|access[-_]?token|refresh[-_]?token|session|cookie|dsn|webhook[-_]?secret)/i;
const SENSITIVE_VALUE_PATTERN = /\b(?:sk|pk|rk|whsec|tok|key|secret|bearer)[A-Za-z0-9_\-.]{3,}\b/gi;

function redactString(value: string): string {
  return value.replace(SENSITIVE_VALUE_PATTERN, REDACTED);
}

export function redactErrorContext(value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactErrorContext(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactErrorContext(entry),
      ]),
    );
  }

  return value;
}

function localConsoleAdapter(payload: ErrorTrackerPayload) {
  const level = payload.level ?? "error";
  console[level === "error" ? "error" : level === "warning" ? "warn" : "log"]("[ErrorTracker]", payload);
}

export function trackError(error: Error | unknown, context?: ErrorContext) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  localConsoleAdapter({
    error: redactString(errorMessage),
    stack: errorStack ? redactString(errorStack) : undefined,
    ...(redactErrorContext(context) as ErrorContext | undefined),
    timestamp: new Date().toISOString(),
  });
}

export function trackMessage(message: string, level: TrackLevel = "info", context?: ErrorContext) {
  localConsoleAdapter({
    message: redactString(message),
    level,
    ...(redactErrorContext(context) as ErrorContext | undefined),
    timestamp: new Date().toISOString(),
  });
}

