import pino from "pino";

// Structured JSON logging (replaces plain console output for anything beyond
// simple request tracing) — makes the API log stream parseable by real log
// aggregators (CloudWatch, Loki, etc.) in a production deployment.
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } } : undefined,
});
