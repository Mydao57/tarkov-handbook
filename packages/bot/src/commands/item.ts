import { SlashCommandBuilder } from "discord.js";
import { t } from "../i18n/index.js";
import { resolveLocale } from "../i18n/resolve.js";
import { handleCommandError } from "../lib/handleCommandError.js";
import { logger } from "../lib/logger.js";
import { truncate } from "../lib/format.js";
import { buildItemEmbed } from "../embeds/itemEmbed.js";
import { autocompleteItems, pickBestItem, searchItems } from "../services/tarkov/items.js";
import type { Command } from "../types/command.js";

export const itemCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("item")
    .setDescription("Look up a Tarkov item: flea market and trader prices")
    .setDescriptionLocalizations({
      fr: "Rechercher un objet Tarkov : prix marché aux puces et marchands",
    })
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Item name (start typing for suggestions)")
        .setDescriptionLocalizations({ fr: "Nom de l'objet (tape pour des suggestions)" })
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async execute(interaction) {
    const locale = await resolveLocale(interaction);
    const query = interaction.options.getString("name", true);
    await interaction.deferReply();

    try {
      const items = await searchItems(query, locale);
      const item = pickBestItem(items, query);
      if (!item) {
        await interaction.editReply(t(locale, "item.notFound", { query }));
        return;
      }

      const others = items
        .filter((candidate) => candidate.id !== item.id)
        .slice(0, 5)
        .map((candidate) => candidate.name ?? candidate.shortName ?? "?");

      await interaction.editReply({
        content: others.length > 0 ? t(locale, "item.otherMatches", { list: others.join(", ") }) : undefined,
        embeds: [buildItemEmbed(item, locale)],
      });
    } catch (err) {
      await handleCommandError(interaction, err, locale);
    }
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().trim();
    if (focused.length < 2) {
      await interaction.respond([]);
      return;
    }

    try {
      const locale = await resolveLocale(interaction);
      const items = await autocompleteItems(focused, locale);
      await interaction.respond(
        items.slice(0, 25).map((item) => {
          const label =
            item.shortName && item.shortName !== item.name
              ? `${item.name ?? "?"} (${item.shortName})`
              : (item.name ?? "?");
          return { name: truncate(label, 100), value: truncate(item.name ?? item.id, 100) };
        }),
      );
    } catch (err) {
      logger.warn("item autocomplete failed:", err);
      await interaction.respond([]);
    }
  },
};
