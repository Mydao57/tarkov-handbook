import { config } from "../../config.js";
import type { Locale } from "../../i18n/index.js";
import { TtlCache } from "../../lib/cache.js";
import type { Ammo, AmmoResponse } from "../../types/tarkov.js";
import { tarkovRequest } from "./client.js";
import { ALL_AMMO_QUERY } from "./queries.js";

const caches = new Map<Locale, TtlCache<Ammo[]>>();

function cacheFor(lang: Locale): TtlCache<Ammo[]> {
  let cache = caches.get(lang);
  if (!cache) {
    cache = new TtlCache<Ammo[]>(
      async () => {
        const data = await tarkovRequest<AmmoResponse>(ALL_AMMO_QUERY, { lang });
        return data.ammo ?? [];
      },
      { ttlMs: config.CACHE_TTL_MS },
    );
    caches.set(lang, cache);
  }
  return cache;
}

export async function getAllAmmo(lang: Locale): Promise<Ammo[]> {
  return cacheFor(lang).get();
}

/** Known `caliber` enum-ish values -> human labels. Unknown values fall back to a stripped form. */
const CALIBER_LABELS: Record<string, string> = {
  Caliber9x18PM: "9x18mm PM",
  Caliber9x19PARA: "9x19mm Parabellum",
  Caliber9x21: "9x21mm Gyurza",
  Caliber9x39: "9x39mm",
  Caliber1143x23ACP: ".45 ACP",
  Caliber762x25TT: "7.62x25mm TT",
  Caliber556x45NATO: "5.56x45mm NATO",
  Caliber545x39: "5.45x39mm",
  Caliber762x39: "7.62x39mm",
  Caliber762x51: "7.62x51mm NATO",
  Caliber762x54R: "7.62x54mmR",
  Caliber762x35: ".300 Blackout",
  Caliber86x70: ".338 Lapua Magnum",
  Caliber366TKM: ".366 TKM",
  Caliber57x28: "5.7x28mm FN",
  Caliber46x30: "4.6x30mm HK",
  Caliber68x51: "6.8x51mm",
  Caliber127x55: "12.7x55mm STs-130",
  Caliber12g: "12 Gauge",
  Caliber20g: "20 Gauge",
  Caliber23x75: "23x75mm",
  Caliber26x75: "26x75mm (flare)",
  Caliber30x29: "30x29mm",
  Caliber40x46: "40x46mm",
  Caliber40mmRU: "40mm VOG",
  Caliber127x108: "12.7x108mm",
};

export function caliberLabel(raw: string): string {
  return CALIBER_LABELS[raw] ?? raw.replace(/^Caliber/, "");
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface CaliberGroup {
  caliber: string;
  label: string;
  rounds: Ammo[];
}

function groupByCaliber(all: Ammo[]): CaliberGroup[] {
  const map = new Map<string, Ammo[]>();
  for (const round of all) {
    const key = round.caliber ?? "Unknown";
    let bucket = map.get(key);
    if (!bucket) {
      bucket = [];
      map.set(key, bucket);
    }
    bucket.push(round);
  }
  return [...map.entries()]
    .map(([caliber, rounds]) => ({
      caliber,
      label: caliberLabel(caliber),
      rounds: [...rounds].sort((a, b) => b.penetrationPower - a.penetrationPower),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Autocomplete choices for the `caliber` option. */
export async function caliberChoices(
  lang: Locale,
  query: string,
): Promise<Array<{ name: string; value: string }>> {
  const groups = groupByCaliber(await getAllAmmo(lang));
  const q = normalize(query);

  const matches = groups.filter((g) => {
    if (!q) return true;
    const haystack = [g.caliber, g.label, ...g.rounds.map((r) => r.item.name ?? "")]
      .map(normalize)
      .join(" ");
    return haystack.includes(q);
  });

  return matches
    .slice(0, 25)
    .map((g) => ({ name: `${g.label} · ${g.rounds.length} round(s)`, value: g.caliber }));
}

/**
 * Resolve a caliber from an autocomplete value (exact `caliber` string) or a
 * free-typed query (`7.62x39`, `.338`, `12 gauge`, ...).
 */
export async function findCaliberGroup(
  query: string,
  lang: Locale,
): Promise<CaliberGroup | undefined> {
  const groups = groupByCaliber(await getAllAmmo(lang));
  const q = normalize(query);
  if (!q) return undefined;

  const exact = groups.find((g) => g.caliber === query || normalize(g.label) === q);
  if (exact) return exact;

  let best: { group: CaliberGroup; score: number } | undefined;
  for (const group of groups) {
    const fields = [
      normalize(group.caliber),
      normalize(group.label),
      ...group.rounds.map((r) => normalize(r.item.name ?? "")),
      ...group.rounds.map((r) => normalize(r.item.shortName ?? "")),
    ];
    let score = 0;
    if (fields.some((f) => f === q)) score = 3;
    else if (q.length >= 2 && fields.some((f) => f.includes(q))) score = 2;
    if (score > 0 && score > (best?.score ?? 0)) best = { group, score };
  }
  return best?.group;
}
