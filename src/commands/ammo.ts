import { SlashCommandBuilder } from "discord.js";
import { t } from "../i18n/index.js";
import { resolveLocale } from "../i18n/resolve.js";
import { handleCommandError } from "../lib/handleCommandError.js";
import { logger } from "../lib/logger.js";
import { buildAmmoEmbed } from "../embeds/ammoEmbed.js";
import { caliberChoices, findCaliberGroup } from "../services/tarkov/ammo.js";
import type { Command } from "../types/command.js";

export const ammoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ammo")
    .setDescription("List the rounds of a caliber with their damage and penetration")
    .setDescriptionLocalizations({
      fr: "Lister les munitions d'un calibre avec dégâts et pénétration",
    })
    .addStringOption((option) =>
      option
        .setName("caliber")
        .setDescription("Caliber, e.g. 7.62x39 (start typing for suggestions)")
        .setDescriptionLocalizations({ fr: "Calibre, p.ex. 7.62x39 (tape pour des suggestions)" })
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async execute(interaction) {
    const locale = await resolveLocale(interaction);
    const query = interaction.options.getString("caliber", true);
    await interaction.deferReply();

    try {
      const group = await findCaliberGroup(query, locale);
      if (!group || group.rounds.length === 0) {
        await interaction.editReply(t(locale, "ammo.notFound", { query }));
        return;
      }
      await interaction.editReply({ embeds: [buildAmmoEmbed(group, locale)] });
    } catch (err) {
      await handleCommandError(interaction, err, locale);
    }
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().trim();
    try {
      const locale = await resolveLocale(interaction);
      await interaction.respond(await caliberChoices(locale, focused));
    } catch (err) {
      logger.warn("ammo autocomplete failed:", err);
      await interaction.respond([]);
    }
  },
};
