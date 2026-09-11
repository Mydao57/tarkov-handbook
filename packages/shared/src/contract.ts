import { z } from "zod";

/**
 * The contract between the bot's internal control API and the admin panel.
 * The bot serves these shapes; the panel consumes them. Request bodies are
 * validated on the bot with the zod schemas below, and re-used by the panel
 * to validate before sending.
 */

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const GAME_MODES = ["regular", "pve"] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const DEPLOY_SCOPES = ["guild", "global"] as const;
export type DeployScope = (typeof DEPLOY_SCOPES)[number];

export type LogLevel = "debug" | "info" | "warn" | "error";

// --- Read models ---

export interface BotStatus {
  ready: boolean;
  tag: string | null;
  startedAt: string;
  processUptimeMs: number;
  readyUptimeMs: number | null;
  guildCount: number;
  wsPingMs: number | null;
}

export interface TarkovHealth {
  reachable: boolean;
  lastOkAt: string | null;
  checkedAt: string;
  error: string | null;
}

export interface CacheStat {
  key: string;
  present: boolean;
  ageMs: number | null;
  ttlMs: number;
  expired: boolean;
  entryCount: number | null;
  approxSizeBytes: number | null;
}

export interface InvocationEntry {
  at: string;
  command: string;
  sub: string | null;
  userId: string;
  guildId: string | null;
  ok: boolean;
  durationMs: number;
  error: string | null;
}

export interface RuntimeFlags {
  fixturesMode: boolean;
  freezeCache: boolean;
  gameMode: GameMode;
}

export interface FlagsView {
  current: RuntimeFlags;
  defaults: RuntimeFlags;
  atDefaults: boolean;
}

export interface PreferenceEntry {
  userId: string;
  locale: Locale;
}

export interface DeployResult {
  scope: DeployScope;
  registered: number;
  commands: string[];
}

export interface LogLine {
  at: string;
  level: LogLevel;
  message: string;
}

/** Everything the dashboard needs in one round-trip. */
export interface DashboardSnapshot {
  bot: BotStatus;
  tarkov: TarkovHealth;
  caches: CacheStat[];
  flags: FlagsView;
  invocations: InvocationEntry[];
}

// --- Request bodies ---

export const setFlagsBodySchema = z
  .object({
    fixturesMode: z.boolean().optional(),
    freezeCache: z.boolean().optional(),
    gameMode: z.enum(GAME_MODES).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one flag to change",
  });
export type SetFlagsBody = z.infer<typeof setFlagsBodySchema>;

export const clearCacheBodySchema = z.object({
  key: z.string().min(1).optional(),
});
export type ClearCacheBody = z.infer<typeof clearCacheBodySchema>;

export const deployBodySchema = z.object({
  scope: z.enum(DEPLOY_SCOPES),
});
export type DeployBody = z.infer<typeof deployBodySchema>;

export const setPreferenceBodySchema = z.object({
  locale: z.enum(LOCALES),
});
export type SetPreferenceBody = z.infer<typeof setPreferenceBodySchema>;
