/**
 * Demo Mode utilities for investor demos
 * Ensures deterministic, repeatable behavior even when external services fail
 */

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return process.env.ONEHUB_DEMO_MODE === "true";
}

/**
 * Log with demo mode prefix
 */
export function logDemoMode(message: string, ...args: any[]): void {
  console.log("[DEMO_MODE]", message, ...args);
}

/**
 * Log with AI prefix
 */
export function logAI(message: string, ...args: any[]): void {
  console.log("[AI]", message, ...args);
}

