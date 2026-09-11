import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { config } from "../config.js";
import { setCacheFrozen } from "../lib/cacheRegistry.js";
import { logger } from "../lib/logger.js";

/**
 * Runtime flags an admin can toggle from the web panel without redeploying:
 *   - fixturesMode: serve bundled JSON snapshots instead of calling tarkov.dev
 *   - freezeCache:  never refresh caches, serve whatever is loaded
 *   - gameMode:     regular / pve, passed to every tarkov.dev query
 *
 * Persisted to `data/flags.json` (same approach as the preferences store).
 * The config values are the seed; once the file exists it wins until deleted.
 * A visible "flags not at defaults" banner in the panel guards against a
 * forgotten toggle.
 */

export const GAME_MODES = ["regular", "pve"] as const;
export type GameMode = (typeof GAME_MODES)[number];

export interface RuntimeFlags {
  fixturesMode: boolean;
  freezeCache: boolean;
  gameMode: GameMode;
}

const STORE_PATH = fileURLToPath(new URL("../../data/flags.json", import.meta.url));

const flagsSchema = z.object({
  fixturesMode: z.boolean(),
  freezeCache: z.boolean(),
  gameMode: z.enum(GAME_MODES),
});

function defaults(): RuntimeFlags {
  return {
    fixturesMode: config.FIXTURES_MODE,
    freezeCache: config.FREEZE_CACHE,
    gameMode: config.GAME_MODE,
  };
}

let current: RuntimeFlags = defaults();
let loaded = false;
let writeChain: Promise<void> = Promise.resolve();

function apply(next: RuntimeFlags): void {
  current = next;
  setCacheFrozen(next.freezeCache);
}

/** Current flags. Reflects defaults until `loadFlags()` has run at startup. */
export function getFlags(): RuntimeFlags {
  return { ...current };
}

export function flagDefaults(): RuntimeFlags {
  return defaults();
}

export function flagsAtDefaults(): boolean {
  const d = defaults();
  return (
    current.fixturesMode === d.fixturesMode &&
    current.freezeCache === d.freezeCache &&
    current.gameMode === d.gameMode
  );
}

export async function loadFlags(): Promise<RuntimeFlags> {
  if (loaded) return getFlags();
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = flagsSchema.partial().parse(JSON.parse(raw));
    apply({ ...defaults(), ...parsed });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn("Could not read runtime flags store, using defaults:", err);
    }
    apply(defaults());
  }
  loaded = true;
  return getFlags();
}

export async function setFlags(patch: Partial<RuntimeFlags>): Promise<RuntimeFlags> {
  await loadFlags();
  apply({ ...current, ...patch });
  await persist();
  logger.info("Runtime flags updated:", JSON.stringify(current));
  return getFlags();
}

async function persist(): Promise<void> {
  const snapshot = JSON.stringify(current, null, 2);
  // Serialize writes so concurrent panel actions cannot interleave.
  writeChain = writeChain.then(async () => {
    await mkdir(dirname(STORE_PATH), { recursive: true });
    await writeFile(STORE_PATH, `${snapshot}\n`, "utf8");
  });
  return writeChain;
}
