import type {
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

export interface SessionUser {
  id: string;
  username: string;
  avatar: string | null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data ? String(data.error) : res.statusText;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  me: () => req<SessionUser | null>("/me"),
  dashboard: () => req<DashboardSnapshot>("/dashboard"),
  tarkovHealth: (force?: boolean) => req<TarkovHealth>(`/tarkov-health${force ? "?force=1" : ""}`),
  caches: () => req<CacheStat[]>("/caches"),
  clearCaches: (key?: string) =>
    req<{ cleared: string[] }>("/caches/clear", {
      method: "POST",
      body: JSON.stringify(key ? { key } : {}),
    }),
  invocations: (limit = 200) => req<InvocationEntry[]>(`/invocations?limit=${limit}`),
  flags: () => req<FlagsView>("/flags"),
  setFlags: (patch: SetFlagsBody) =>
    req<FlagsView>("/flags", { method: "POST", body: JSON.stringify(patch) }),
  deploy: (scope: DeployScope) =>
    req<DeployResult>("/deploy", { method: "POST", body: JSON.stringify({ scope }) }),
  preferences: () => req<PreferenceEntry[]>("/preferences"),
  setPreference: (userId: string, locale: Locale) =>
    req<{ ok: true }>(`/preferences/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: JSON.stringify({ locale }),
    }),
  deletePreference: (userId: string) =>
    req<{ ok: true }>(`/preferences/${encodeURIComponent(userId)}`, { method: "DELETE" }),
};
