/**
 * AI service logging utilities.
 */
export function logAI(message: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") {
    console.log("[AI]", message, ...args);
  }
}
