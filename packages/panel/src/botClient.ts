import type {
  BotStatus,
  CacheStat,
  DashboardSnapshot,
  DeployResult,
  DeployScope,
  FlagsView,
  InvocationEntry,
  Locale,
  PreferenceEntry,
  SetFlagsBody,
  TarkovHealth,
} from "@tarkov/shared";
import { config } from "./config.js";

const BASE = config.BOT_INTERNAL_API_URL.replace(/\/+$/, "");

/** The bot's internal API answered with a non-2xx status. */
export class BotApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BotApiError";
  }
}

/** The bot's internal API could not be reached at all. */
export class BotUnreachableError extends Error {
  constructor(cause: unknown) {
    super(`bot internal API unreachable at ${BASE}`);
    this.name = "BotUnreachableError";
    this.cause = cause;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${config.INTERNAL_API_TOKEN}`,
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (err) {
    throw new BotUnreachableError(err);
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : res.statusText;
    throw new BotApiError(res.status, message);
  }
  return data as T;
}

export const botApi = {
  ping: () => call<{ ok: boolean }>("/health"),
  dashboard: () => call<DashboardSnapshot>("/dashboard"),
  status: () => call<BotStatus>("/status"),
  tarkovHealth: (force?: boolean) =>
    call<TarkovHealth>(`/tarkov-health${force ? "?force=1" : ""}`),
  caches: () => call<CacheStat[]>("/caches"),
  clearCaches: (key?: string) =>
    call<{ cleared: string[] }>("/caches/clear", {
      method: "POST",
      body: JSON.stringify(key ? { key } : {}),
    }),
  invocations: (limit?: number) =>
    call<InvocationEntry[]>(`/invocations${limit ? `?limit=${limit}` : ""}`),
  flags: () => call<FlagsView>("/flags"),
  setFlags: (patch: SetFlagsBody) =>
    call<FlagsView>("/flags", { method: "POST", body: JSON.stringify(patch) }),
  deploy: (scope: DeployScope) =>
    call<DeployResult>("/deploy", { method: "POST", body: JSON.stringify({ scope }) }),
  preferences: () => call<PreferenceEntry[]>("/preferences"),
  setPreference: (userId: string, locale: Locale) =>
    call<{ ok: true }>(`/preferences/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: JSON.stringify({ locale }),
    }),
  deletePreference: (userId: string) =>
    call<{ ok: true }>(`/preferences/${encodeURIComponent(userId)}`, { method: "DELETE" }),
  logsStreamUrl: () => `${BASE}/logs/stream`,
};
