import type { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import { getUserLocale } from "../services/preferences.js";
import { DEFAULT_LOCALE, localeFromDiscord, type Locale } from "./index.js";

type AnyInteraction = ChatInputCommandInteraction | AutocompleteInteraction;

/**
 * Effective locale for an interaction:
 *   1. the user's stored override (`/lang set`), else
 *   2. their Discord client language, if we support it, else
 *   3. the default locale.
 */
export async function resolveLocale(interaction: AnyInteraction): Promise<Locale> {
  const stored = await getUserLocale(interaction.user.id);
  if (stored) return stored;
  return localeFromDiscord(interaction.locale) ?? DEFAULT_LOCALE;
}
