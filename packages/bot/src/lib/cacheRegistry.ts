/**
 * Central registry of the in-memory TTL caches so the internal control API can
 * enumerate them (presence / age / size), clear them, and globally freeze
 * refreshes ("serve stale, never refetch"). Each `TtlCache` created with a
 * `key` registers itself here on construction.
 */

export interface CacheStats {
  key: string;
  /** A value has been loaded at least once and not cleared since. */
  present: boolean;
  /** Milliseconds since the current value was loaded, or null if absent. */
  ageMs: number | null;
  /** Configured time-to-live in milliseconds. */
  ttlMs: number;
  /** Present and past its TTL (still served while a refresh is attempted). */
  expired: boolean;
  /** Number of entries when the value is an array or plain object, else null. */
  entryCount: number | null;
  /** Rough JSON byte size of the value, or null if absent / not serialisable. */
  approxSizeBytes: number | null;
}

export interface RegistrableCache {
  readonly key: string;
  stats(): CacheStats;
  clear(): void;
}

const registry = new Map<string, RegistrableCache>();
let frozen = false;

export function registerCache(cache: RegistrableCache): void {
  registry.set(cache.key, cache);
}

export function unregisterCache(key: string): void {
  registry.delete(key);
}

export function listCacheStats(): CacheStats[] {
  return [...registry.values()]
    .map((cache) => cache.stats())
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Clear a single cache by key, or every cache when `key` is omitted.
 * Returns the keys that were actually cleared.
 */
export function clearCaches(key?: string): string[] {
  if (key !== undefined) {
    const cache = registry.get(key);
    if (!cache) return [];
    cache.clear();
    return [key];
  }
  const keys = [...registry.keys()];
  for (const cache of registry.values()) cache.clear();
  return keys;
}

/** When frozen, caches serve any loaded value forever and never call their loader. */
export function isCacheFrozen(): boolean {
  return frozen;
}

export function setCacheFrozen(value: boolean): void {
  frozen = value;
}
