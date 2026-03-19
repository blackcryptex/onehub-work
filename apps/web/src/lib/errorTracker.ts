/**
 * Error tracking abstraction.
 * Currently logs to console, but can be swapped for Sentry or other services.
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

export function trackError(error: Error | unknown, context?: ErrorContext) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Log structured error
  console.error("[ErrorTracker]", {
    error: errorMessage,
    stack: errorStack,
    ...context,
    timestamp: new Date().toISOString(),
  });

  // TODO: When Sentry is configured, replace with:
  // import * as Sentry from "@sentry/nextjs";
  // Sentry.captureException(error, {
  //   tags: { route: context?.route },
  //   extra: context,
  // });
}

export function trackMessage(message: string, level: "info" | "warning" | "error" = "info", context?: ErrorContext) {
  console[level === "error" ? "error" : level === "warning" ? "warn" : "log"]("[ErrorTracker]", {
    message,
    level,
    ...context,
    timestamp: new Date().toISOString(),
  });

  // TODO: When Sentry is configured:
  // Sentry.captureMessage(message, level, { extra: context });
}

