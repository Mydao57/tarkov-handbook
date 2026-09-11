import { lastSuccessfulFetchAt, probeTarkov } from "./client.js";

/**
 * Reachability of the tarkov.dev API for the admin dashboard. Degrades
 * gracefully: a probe failure is reported, never thrown, so the widget can
 * show "unavailable" plus the timestamp of the last successful fetch.
 */

export interface TarkovHealth {
  reachable: boolean;
  /** ISO timestamp of the last successful request of any kind, or null. */
  lastOkAt: string | null;
  /** ISO timestamp of this health check. */
  checkedAt: string;
  /** Probe error message when unreachable, else null. */
  error: string | null;
}

const MIN_INTERVAL_MS = 15_000;
let cached: TarkovHealth | null = null;
let inFlight: Promise<TarkovHealth> | undefined;

export async function getTarkovHealth(force = false): Promise<TarkovHealth> {
  if (!force && cached && Date.now() - Date.parse(cached.checkedAt) < MIN_INTERVAL_MS) {
    return cached;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const { reachable, error } = await probeTarkov();
    cached = {
      reachable,
      lastOkAt: lastSuccessfulFetchAt(),
      checkedAt: new Date().toISOString(),
      error,
    };
    return cached;
  })().finally(() => {
    inFlight = undefined;
  });

  return inFlight;
}
