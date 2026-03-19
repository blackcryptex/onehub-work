import pino from "pino";

const level = process.env.NODE_ENV === "production" ? "info" : "debug";

export const logger = pino({
  level,
  base: undefined,
  redact: {
    paths: ["req.headers.authorization", "password", "token", "access_token"],
    remove: true,
  },
  formatters: {
    level(label) {
      return { level: label } as Record<string, string>;
    },
  },
});

/**
 * Child logger with requestId binding.
 */
export function getRequestLogger(requestId?: string) {
  return requestId ? logger.child({ requestId }) : logger;
}
