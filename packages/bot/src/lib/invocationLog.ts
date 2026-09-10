/**
 * In-memory ring buffer of the most recent slash-command invocations, read by
 * the admin panel. Not persisted: it is a "what is happening right now" view,
 * lost on restart.
 */

export interface Invocation {
  /** ISO timestamp of when the handler finished. */
  at: string;
  command: string;
  /** Subcommand name if the command has one, else null. */
  sub: string | null;
  userId: string;
  guildId: string | null;
  /** The execute() handler returned without throwing. */
  ok: boolean;
  durationMs: number;
  /** Error message when ok is false, else null. */
  error: string | null;
}

const MAX = 200;
const buffer: Invocation[] = [];

export function recordInvocation(entry: Omit<Invocation, "at">): void {
  buffer.push({ ...entry, at: new Date().toISOString() });
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
}

/** Most recent first, capped at `limit` (default: the whole buffer). */
export function recentInvocations(limit = MAX): Invocation[] {
  const n = Math.max(0, Math.min(Math.trunc(limit) || 0, buffer.length));
  return buffer.slice(buffer.length - n).reverse();
}
