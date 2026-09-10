import { config } from "../../config.js";
import type { Locale } from "../../i18n/index.js";
import { TtlCache } from "../../lib/cache.js";
import type { TaskDetail, TaskDetailResponse, TasksLightResponse, TaskSummary } from "../../types/tarkov.js";
import { tarkovRequest } from "./client.js";
import { ALL_TASKS_LIGHT_QUERY, TASK_DETAIL_QUERY } from "./queries.js";

const listCaches = new Map<Locale, TtlCache<TaskSummary[]>>();

function listCacheFor(lang: Locale): TtlCache<TaskSummary[]> {
  let cache = listCaches.get(lang);
  if (!cache) {
    cache = new TtlCache<TaskSummary[]>(
      async () => {
        const data = await tarkovRequest<TasksLightResponse>(ALL_TASKS_LIGHT_QUERY, { lang });
        return data.tasks ?? [];
      },
      { ttlMs: config.CACHE_TTL_MS },
    );
    listCaches.set(lang, cache);
  }
  return cache;
}

export async function getAllTasks(lang: Locale): Promise<TaskSummary[]> {
  return listCacheFor(lang).get();
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Rank cached tasks against a free-typed query. Empty query -> first `limit` tasks. */
export async function searchTasks(query: string, lang: Locale, limit = 25): Promise<TaskSummary[]> {
  const all = await getAllTasks(lang);
  const q = normalize(query);
  if (!q) return all.slice(0, limit);

  return all
    .map((task) => {
      const name = normalize(task.name);
      let score = 0;
      if (name === q) score = 3;
      else if (name.startsWith(q)) score = 2;
      else if (name.includes(q)) score = 1;
      return { task, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.task.name.length - b.task.name.length)
    .slice(0, limit)
    .map((entry) => entry.task);
}

const TASK_ID_RE = /^[a-f0-9]{24}$/i;

export function looksLikeTaskId(value: string): boolean {
  return TASK_ID_RE.test(value.trim());
}

export async function getTaskById(id: string, lang: Locale): Promise<TaskDetail | null> {
  const data = await tarkovRequest<TaskDetailResponse>(TASK_DETAIL_QUERY, { id, lang });
  return data.task ?? null;
}

/** Resolve a `/quest` option value (autocomplete id or free text) to a full task. */
export async function resolveTask(input: string, lang: Locale): Promise<TaskDetail | null> {
  if (looksLikeTaskId(input)) {
    const byId = await getTaskById(input, lang);
    if (byId) return byId;
  }
  const [best] = await searchTasks(input, lang, 1);
  if (!best) return null;
  return getTaskById(best.id, lang);
}
