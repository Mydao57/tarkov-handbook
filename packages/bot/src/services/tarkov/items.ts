import type { Locale } from "../../i18n/index.js";
import { getFlags } from "../../runtime/flags.js";
import type {
  Item,
  ItemsAutocompleteResponse,
  ItemsResponse,
  ItemSummary,
} from "../../types/tarkov.js";
import { tarkovRequest } from "./client.js";
import { ITEMS_AUTOCOMPLETE_QUERY, ITEMS_SEARCH_QUERY } from "./queries.js";

export async function searchItems(name: string, lang: Locale): Promise<Item[]> {
  const data = await tarkovRequest<ItemsResponse>(ITEMS_SEARCH_QUERY, {
    name,
    lang,
    gameMode: getFlags().gameMode,
  });
  return data.items ?? [];
}

export async function autocompleteItems(name: string, lang: Locale): Promise<ItemSummary[]> {
  const data = await tarkovRequest<ItemsAutocompleteResponse>(
    ITEMS_AUTOCOMPLETE_QUERY,
    { name, lang, gameMode: getFlags().gameMode },
    { retries: 1, baseDelayMs: 200 },
  );
  return data.items ?? [];
}

/**
 * Choose the most relevant hit for a free-typed query:
 *   1. exact (case-insensitive) match on name or shortName,
 *   2. otherwise the shortest name (closest to the bare query).
 */
export function pickBestItem(items: Item[], query: string): Item | undefined {
  if (items.length === 0) return undefined;
  const q = query.trim().toLowerCase();

  const exact = items.find(
    (i) => i.name?.toLowerCase() === q || i.shortName?.toLowerCase() === q,
  );
  if (exact) return exact;

  return [...items].sort(
    (a, b) => (a.name?.length ?? Number.MAX_SAFE_INTEGER) - (b.name?.length ?? Number.MAX_SAFE_INTEGER),
  )[0];
}
