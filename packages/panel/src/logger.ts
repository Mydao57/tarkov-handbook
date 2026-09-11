import { config } from "./config.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const threshold = LEVELS[config.LOG_LEVEL];

function emit(level: Level, args: unknown[]): void {
  if (LEVELS[level] < threshold) return;
  const prefix = `[${new Date().toISOString()}] ${level.toUpperCase()}`;
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  sink(prefix, ...args);
}

export const logger = {
  debug: (...args: unknown[]): void => emit("debug", args),
  info: (...args: unknown[]): void => emit("info", args),
  warn: (...args: unknown[]): void => emit("warn", args),
  error: (...args: unknown[]): void => emit("error", args),
};
