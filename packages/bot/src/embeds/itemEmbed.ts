import { EmbedBuilder } from "discord.js";
import { t, type Locale } from "../i18n/index.js";
import { clampField, money, roubles, signedPercent } from "../lib/format.js";
import type { Item, ItemPrice } from "../types/tarkov.js";

const FLEA_MARKET = "flea-market";
const ITEM_COLOR = 0xc7a95b;

function traderPriceLines(prices: ItemPrice[] | null): string {
  const rows = (prices ?? [])
    .filter((p) => p.vendor.normalizedName !== FLEA_MARKET && (p.priceRUB ?? p.price) != null)
    .sort((a, b) => (b.priceRUB ?? 0) - (a.priceRUB ?? 0));

  if (rows.length === 0) return "—";

  return rows
    .map((p) => {
      const native = money(p.price, p.currency);
      const approxRub =
        p.priceRUB != null && p.currency !== "RUB" ? ` (≈ ${roubles(p.priceRUB)})` : "";
      return `**${p.vendor.name}** — ${native}${approxRub}`;
    })
    .join("\n");
}

export function buildItemEmbed(item: Item, locale: Locale): EmbedBuilder {
  const title = item.name ?? item.shortName ?? t(locale, "item.unknown");
  const embed = new EmbedBuilder().setColor(ITEM_COLOR).setTitle(title);

  const url = item.link ?? item.wikiLink;
  if (url) embed.setURL(url);

  if (item.shortName && item.shortName !== item.name) {
    embed.setDescription(`\`${item.shortName}\``);
  }

  const thumbnail = item.iconLink ?? item.inspectImageLink;
  if (thumbnail) embed.setThumbnail(thumbnail);

  const fleaLines: string[] = [];
  if (item.avg24hPrice) fleaLines.push(`${t(locale, "item.avg24h")}: **${roubles(item.avg24hPrice)}**`);
  if (item.lastLowPrice) fleaLines.push(`${t(locale, "item.lastLow")}: ${roubles(item.lastLowPrice)}`);
  if (item.low24hPrice || item.high24hPrice) {
    fleaLines.push(`24h: ${roubles(item.low24hPrice)} – ${roubles(item.high24hPrice)}`);
  }
  if (item.changeLast48hPercent != null) fleaLines.push(`48h: ${signedPercent(item.changeLast48hPercent)}`);

  embed.addFields({
    name: `🛒 ${t(locale, "item.flea")}`,
    value: fleaLines.length > 0 ? fleaLines.join("\n") : t(locale, "item.noFlea"),
  });

  embed.addFields(
    { name: `📥 ${t(locale, "item.buyFrom")}`, value: clampField(traderPriceLines(item.buyFor)), inline: true },
    { name: `📤 ${t(locale, "item.sellTo")}`, value: clampField(traderPriceLines(item.sellFor)), inline: true },
  );

  const footer = [`${t(locale, "item.base")}: ${roubles(item.basePrice)}`];
  if (item.updated) {
    const when = new Date(item.updated);
    if (!Number.isNaN(when.getTime())) {
      footer.push(`${t(locale, "item.updated")}: ${when.toISOString().slice(0, 16).replace("T", " ")} UTC`);
    }
  }
  embed.setFooter({ text: footer.join("  •  ") });

  return embed;
}
