import { GraphQLClient } from "graphql-request";
import { config } from "../../config.js";
import { ApiUnavailableError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";

const client = new GraphQLClient(config.TARKOV_API_URL, {
  headers: {
    // A plain, non-browser UA: browser-like UAs get challenged by Cloudflare.
    "user-agent": "tarkov-discord-bot/0.1 (+https://github.com/the-hideout/tarkov-api)",
  },
});

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_MESSAGE = /unavailable|rate.?limit|too many requests|timeout|ECONNRESET|ETIMEDOUT/i;

function isRetryable(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (typeof status === "number" && RETRYABLE_STATUS.has(status)) return true;
  const message = error instanceof Error ? error.message : String(error);
  return RETRYABLE_MESSAGE.test(message);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run a GraphQL query against tarkov.dev with a per-request timeout and
 * exponential backoff + jitter on transient failures. Any unrecovered failure is
 * surfaced as `ApiUnavailableError` (a `UserFacingError`).
 */
export async function tarkovRequest<T>(
  document: string,
  variables: Record<string, unknown> = {},
  { retries = 3, baseDelayMs = 500 }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 250;
      logger.warn(
        `tarkov.dev request failed, retry ${attempt}/${retries} in ${Math.round(delay)}ms`,
      );
      await sleep(delay);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.TARKOV_HTTP_TIMEOUT_MS);
    try {
      return await client.request<T>({ document, variables, signal: controller.signal });
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === retries) break;
    } finally {
      clearTimeout(timer);
    }
  }

  logger.error("tarkov.dev request exhausted retries:", lastError);
  throw new ApiUnavailableError();
}
