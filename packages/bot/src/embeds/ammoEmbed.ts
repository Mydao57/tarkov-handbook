import { EmbedBuilder } from "discord.js";
import { t, type Locale } from "../i18n/index.js";
import { clampField, ratioPercent } from "../lib/format.js";
import type { CaliberGroup } from "../services/tarkov/ammo.js";
import type { Ammo } from "../types/tarkov.js";

const AMMO_COLOR = 0xb03a2e;
const MAX_ROWS = 20;
/** Zero-width space: a valid non-empty embed field name that renders as nothing. */
const BLANK_FIELD_NAME = "\u200b";

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

function padStart(value: string, width: number): string {
  return value.length >= width ? value : " ".repeat(width - value.length) + value;
}

function effectiveDamage(round: Ammo): number {
  const pellets = round.projectileCount && round.projectileCount > 1 ? round.projectileCount : 1;
  return round.damage * pellets;
}

export function buildAmmoEmbed(group: CaliberGroup, locale: Locale): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(AMMO_COLOR)
    .setTitle(`${t(locale, "ammo.title")} — ${group.label}`)
    .setDescription(t(locale, "ammo.count", { n: group.rounds.length }));

  const shown = group.rounds.slice(0, MAX_ROWS);
  const header =
    pad("Round", 16) +
    padStart("Dmg", 5) +
    padStart("Pen", 5) +
    padStart("Armor", 7) +
    padStart("Frag", 6);

  const rows = shown.map((round) => {
    const name = (round.item.shortName ?? round.item.name ?? "?").slice(0, 15);
    return (
      pad(name, 16) +
      padStart(String(effectiveDamage(round)), 5) +
      padStart(String(round.penetrationPower), 5) +
      padStart(ratioPercent(round.armorDamage / 100), 7) +
      padStart(ratioPercent(round.fragmentationChance), 6)
    );
  });

  const table = ["```", header, ...rows, "```"].join("\n");
  embed.addFields({ name: BLANK_FIELD_NAME, value: clampField(table) });

  if (group.rounds.length > MAX_ROWS) {
    embed.addFields({
      name: BLANK_FIELD_NAME,
      value: `… +${group.rounds.length - MAX_ROWS} more`,
    });
  }

  embed.setFooter({ text: t(locale, "ammo.legend") });
  return embed;
}
