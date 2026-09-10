export interface TtlCacheOptions {
  /** Time to keep a loaded value before it is considered stale, in milliseconds. */
  ttlMs: number;
}

/**
 * Caches the result of an async loader for `ttlMs`.
 *
 * - Concurrent `get()` calls while the value is missing or stale share a single
 *   in-flight load (no thundering herd against the API).
 * - If a refresh fails but a previously loaded (now stale) value exists, that
 *   stale value is served instead of throwing.
 */
export class TtlCache<T> {
  private value: T | undefined;
  private expiresAt = 0;
  private inFlight: Promise<T> | undefined;

  constructor(
    private readonly loader: () => Promise<T>,
    private readonly options: TtlCacheOptions,
  ) {}

  async get(): Promise<T> {
    if (this.value !== undefined && Date.now() < this.expiresAt) {
      return this.value;
    }
    if (!this.inFlight) {
      this.inFlight = this.loader()
        .then((value) => {
          this.value = value;
          this.expiresAt = Date.now() + this.options.ttlMs;
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
    this.expiresAt = 0;
  }
}
