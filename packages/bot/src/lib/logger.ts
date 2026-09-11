import { inspect } from "node:util";
import { config } from "../config.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const threshold = LEVELS[config.LOG_LEVEL];

export interface LogLine {
  at: string;
  level: Level;
  message: string;
}

const BUFFER_MAX = 500;
const buffer: LogLine[] = [];
type Listener = (line: LogLine) => void;
const listeners = new Set<Listener>();
let notifying = false;

function render(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`;
  return inspect(arg, { depth: 2, breakLength: 120 });
}

function capture(level: Level, args: unknown[]): void {
  const line: LogLine = {
    at: new Date().toISOString(),
    level,
    message: args.map(render).join(" "),
  };
  buffer.push(line);
  if (buffer.length > BUFFER_MAX) buffer.splice(0, buffer.length - BUFFER_MAX);

  // A listener that logs synchronously would recurse; guard the fan-out.
  if (notifying) return;
  notifying = true;
  try {
    for (const listener of listeners) {
      try {
        listener(line);
      } catch {
        /* a broken listener must not break logging */
      }
    }
  } finally {
    notifying = false;
  }
}

function emit(level: Level, args: unknown[]): void {
  if (LEVELS[level] < threshold) return;
  const prefix = `[${new Date().toISOString()}] ${level.toUpperCase()}`;
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  sink(prefix, ...args);
  capture(level, args);
}

export const logger = {
  debug: (...args: unknown[]): void => emit("debug", args),
  info: (...args: unknown[]): void => emit("info", args),
  warn: (...args: unknown[]): void => emit("warn", args),
  error: (...args: unknown[]): void => emit("error", args),
};

/** Buffered recent log lines (at/above LOG_LEVEL), oldest first, capped at `limit`. */
export function recentLogs(limit = BUFFER_MAX): LogLine[] {
  const n = Math.max(0, Math.min(Math.trunc(limit) || 0, buffer.length));
  return buffer.slice(buffer.length - n);
}

/** Subscribe to new log lines. Returns an unsubscribe function. */
export function subscribeLogs(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
