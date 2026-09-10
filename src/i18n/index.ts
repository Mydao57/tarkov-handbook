export const SUPPORTED_LOCALES = ["en", "fr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Map a Discord interaction locale (e.g. "fr", "en-US", "en-GB") onto a locale
 * we actually support. Returns `undefined` when there is no match.
 */
export function localeFromDiscord(discordLocale: string | undefined | null): Locale | undefined {
  if (!discordLocale) return undefined;
  const base = discordLocale.split("-")[0]?.toLowerCase() ?? "";
  return isLocale(base) ? base : undefined;
}

type Dict = Record<string, string>;

const en = {
  "error.generic": "Something went wrong while handling that command. Please try again.",
  "api.unavailable": "The tarkov.dev API is unavailable right now. Please try again in a minute.",

  "item.notFound": 'No item found matching **{query}**.',
  "item.otherMatches": "Other matches: {list}",
  "item.unknown": "Unknown item",
  "item.flea": "Flea Market",
  "item.avg24h": "Avg 24h",
  "item.lastLow": "Last lowest",
  "item.noFlea": "Not sold on the flea market.",
  "item.buyFrom": "Buy from",
  "item.sellTo": "Sell to",
  "item.base": "Base price",
  "item.updated": "Updated",

  "ammo.title": "Ammunition",
  "ammo.count": "{n} round(s) in this caliber, sorted by penetration power.",
  "ammo.notFound": 'No caliber found matching **{query}**. Try e.g. `7.62x39`, `5.56x45`, `9x19`, `12 Gauge`.',
  "ammo.legend": "Dmg = damage per hit (× pellets for buckshot) · Pen = penetration power · Armor = armor damage · Frag = fragmentation chance",

  "quest.notFound": 'No quest found matching **{query}**.',
  "quest.trader": "Trader",
  "quest.map": "Map",
  "quest.minLevel": "Min. level",
  "quest.faction": "Faction",
  "quest.requires": "Requires first",
  "quest.objectives": "Objectives",
  "quest.unlocks": "On completion",
  "quest.fir": "found in raid",
  "quest.unlockTrader": "Unlocks trader",
  "quest.kappa": "Required for Kappa",

  "lang.set": "Language set to **{locale}**. Bot replies will use it from now on.",
  "lang.reset": "Language override cleared. Now following your Discord client language (**{locale}**).",
  "lang.showSet": "Your language is set to **{locale}**.",
  "lang.showAuto": "You have no override. Following your Discord client language (**{locale}**).",
  "lang.invalid": "Unsupported language.",
} satisfies Dict;

const fr: Dict = {
  "error.generic": "Une erreur est survenue pendant le traitement de la commande. Réessaie.",
  "api.unavailable": "L'API tarkov.dev est indisponible pour le moment. Réessaie dans une minute.",

  "item.notFound": "Aucun objet trouvé pour **{query}**.",
  "item.otherMatches": "Autres résultats : {list}",
  "item.unknown": "Objet inconnu",
  "item.flea": "Marché aux puces",
  "item.avg24h": "Moy. 24h",
  "item.lastLow": "Dernier prix bas",
  "item.noFlea": "Non vendable au marché aux puces.",
  "item.buyFrom": "Acheter chez",
  "item.sellTo": "Revendre à",
  "item.base": "Prix de base",
  "item.updated": "Mis à jour",

  "ammo.title": "Munitions",
  "ammo.count": "{n} munition(s) dans ce calibre, triées par pénétration.",
  "ammo.notFound": "Aucun calibre trouvé pour **{query}**. Essaie p.ex. `7.62x39`, `5.56x45`, `9x19`, `12 Gauge`.",
  "ammo.legend": "Dmg = dégâts par impact (× billes pour la chevrotine) · Pen = pénétration · Armor = dégâts d'armure · Frag = chance de fragmentation",

  "quest.notFound": "Aucune quête trouvée pour **{query}**.",
  "quest.trader": "Marchand",
  "quest.map": "Carte",
  "quest.minLevel": "Niveau min.",
  "quest.faction": "Faction",
  "quest.requires": "Prérequis",
  "quest.objectives": "Objectifs",
  "quest.unlocks": "À la fin",
  "quest.fir": "trouvé en raid",
  "quest.unlockTrader": "Débloque le marchand",
  "quest.kappa": "Requis pour le Kappa",

  "lang.set": "Langue définie sur **{locale}**. Les réponses du bot l'utiliseront désormais.",
  "lang.reset": "Préférence de langue effacée. Suit maintenant la langue de ton client Discord (**{locale}**).",
  "lang.showSet": "Ta langue est définie sur **{locale}**.",
  "lang.showAuto": "Aucune préférence définie. Suit la langue de ton client Discord (**{locale}**).",
  "lang.invalid": "Langue non prise en charge.",
};

const STRINGS: Record<Locale, Dict> = { en, fr };
export type MessageKey = keyof typeof en;

export function t(
  locale: Locale,
  key: MessageKey,
  vars: Record<string, string | number> = {},
): string {
  const template = STRINGS[locale][key] ?? STRINGS[DEFAULT_LOCALE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
