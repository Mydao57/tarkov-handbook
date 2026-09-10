import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isLocale, type Locale } from "../i18n/index.js";
import { logger } from "../lib/logger.js";

/**
 * Minimal per-user preference store backed by a single JSON file
 * (`data/preferences.json`). Fine for a single-instance bot; swap for SQLite or
 * Redis if you ever shard or run multiple instances.
 */

const STORE_PATH = fileURLToPath(new URL("../../data/preferences.json", import.meta.url));

interface PreferencesFile {
  locales: Record<string, Locale>;
}

let cache: PreferencesFile | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function load(): Promise<PreferencesFile> {
  if (cache) return cache;
  const fresh: PreferencesFile = { locales: {} };
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<PreferencesFile>;
    for (const [userId, locale] of Object.entries(parsed.locales ?? {})) {
      if (typeof locale === "string" && isLocale(locale)) fresh.locales[userId] = locale;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn("Could not read preferences store, starting from empty:", err);
    }
  }
  cache = fresh;
  return cache;
}

async function persist(): Promise<void> {
  const snapshot = JSON.stringify(cache ?? { locales: {} }, null, 2);
  // Serialize writes so concurrent commands cannot interleave file writes.
  writeChain = writeChain.then(async () => {
    await mkdir(dirname(STORE_PATH), { recursive: true });
    await writeFile(STORE_PATH, `${snapshot}\n`, "utf8");
  });
  return writeChain;
}

export async function getUserLocale(userId: string): Promise<Locale | undefined> {
  return (await load()).locales[userId];
}

export async function setUserLocale(userId: string, locale: Locale): Promise<void> {
  const store = await load();
  store.locales[userId] = locale;
  await persist();
}

export async function clearUserLocale(userId: string): Promise<void> {
  const store = await load();
  delete store.locales[userId];
  await persist();
}
