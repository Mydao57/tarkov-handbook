import { ApiUnavailableError } from "./errors.js";
import {
  isCacheFrozen,
  registerCache,
  type CacheStats,
  type RegistrableCache,
} from "./cacheRegistry.js";

export interface TtlCacheOptions {
  /** Time to keep a loaded value before it is considered stale, in milliseconds. */
  ttlMs: number;
  /**
   * Stable identifier. When set, the cache registers itself with the cache
   * registry so the admin panel can inspect / clear / freeze it.
   */
  key?: string;
}

/**
 * Caches the result of an async loader for `ttlMs`.
 *
 * - Concurrent `get()` calls while the value is missing or stale share a single
 *   in-flight load (no thundering herd against the API).
 * - If a refresh fails but a previously loaded (now stale) value exists, that
 *   stale value is served instead of throwing.
 * - While the cache registry is frozen, a loaded value is served regardless of
 *   age and the loader is never called; an empty frozen cache throws
 *   `ApiUnavailableError`.
 */
export class TtlCache<T> implements RegistrableCache {
  readonly key: string;
  private value: T | undefined;
  private loadedAt = 0;
  private expiresAt = 0;
  private inFlight: Promise<T> | undefined;

  constructor(
    private readonly loader: () => Promise<T>,
    private readonly options: TtlCacheOptions,
  ) {
    this.key = options.key ?? `cache-${++TtlCache.anon}`;
    if (options.key !== undefined) registerCache(this);
  }

  private static anon = 0;

  async get(): Promise<T> {
    if (isCacheFrozen()) {
      if (this.value !== undefined) return this.value;
      throw new ApiUnavailableError();
    }

    if (this.value !== undefined && Date.now() < this.expiresAt) {
      return this.value;
    }
    if (!this.inFlight) {
      this.inFlight = this.loader()
        .then((value) => {
          this.value = value;
          this.loadedAt = Date.now();
          this.expiresAt = this.loadedAt + this.options.ttlMs;
          return value;
        })
        .finally(() => {
          this.inFlight = undefined;
        });
    }

    try {
      return await this.inFlight;
    } catch (err) {
      if (this.value !== undefined) return this.value;
      throw err;
    }
  }

  clear(): void {
    this.value = undefined;
    this.loadedAt = 0;
    this.expiresAt = 0;
  }

  stats(): CacheStats {
    const present = this.value !== undefined;
    return {
      key: this.key,
      present,
      ageMs: present ? Date.now() - this.loadedAt : null,
      ttlMs: this.options.ttlMs,
      expired: present && Date.now() >= this.expiresAt,
      entryCount: countEntries(this.value),
      approxSizeBytes: present ? approxSize(this.value) : null,
    };
  }
}

function countEntries(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  if (value !== null && typeof value === "object") return Object.keys(value).length;
  return null;
}

function approxSize(value: unknown): number | null {
  try {
    return Buffer.byteLength(JSON.stringify(value) ?? "");
  } catch {
    return null;
  }
}
