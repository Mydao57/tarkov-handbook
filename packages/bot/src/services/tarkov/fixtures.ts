import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Ammo, Item, ItemSummary, TaskDetail, TaskSummary } from "../../types/tarkov.js";

/**
 * Bundled JSON snapshots served instead of tarkov.dev when the `fixturesMode`
 * runtime flag is on, so the bot (and the panel) stay demonstrable while the
 * API is unreachable. Snapshots are English-only; the `lang` argument is
 * ignored in fixtures mode. Regenerate from a live capture when the API is up.
 */

// fixtures/ sits next to src/ and dist/, so the depth is the same either way.
const FIXTURE_DIR = new URL("../../../fixtures/", import.meta.url);

async function load<T>(file: string): Promise<T> {
  const path = fileURLToPath(new URL(file, FIXTURE_DIR));
  return JSON.parse(await readFile(path, "utf8")) as T;
}

let ammo: Ammo[] | undefined;
let tasks: TaskSummary[] | undefined;
let items: Item[] | undefined;
let taskDetails: Record<string, TaskDetail> | undefined;

export async function fixtureAmmo(): Promise<Ammo[]> {
  return (ammo ??= await load<Ammo[]>("ammo.json"));
}

export async function fixtureTasks(): Promise<TaskSummary[]> {
  return (tasks ??= await load<TaskSummary[]>("tasks.json"));
}

export async function fixtureTaskDetail(id: string): Promise<TaskDetail | null> {
  taskDetails ??= await load<Record<string, TaskDetail>>("task-details.json");
  return taskDetails[id] ?? null;
}

async function allItems(): Promise<Item[]> {
  return (items ??= await load<Item[]>("items.json"));
}

/** Mirror the server-side `items(name:)` filter: case-insensitive substring. */
export async function fixtureItems(name: string): Promise<Item[]> {
  const q = name.trim().toLowerCase();
  const all = await allItems();
  if (!q) return all;
  return all.filter(
    (item) =>
      (item.name ?? "").toLowerCase().includes(q) ||
      (item.shortName ?? "").toLowerCase().includes(q),
  );
}

export async function fixtureItemSummaries(name: string): Promise<ItemSummary[]> {
  return (await fixtureItems(name)).map(({ id, name: n, shortName }) => ({
    id,
    name: n,
    shortName,
  }));
}
