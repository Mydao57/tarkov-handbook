import { SlashCommandBuilder } from "discord.js";
import { t } from "../i18n/index.js";
import { resolveLocale } from "../i18n/resolve.js";
import { handleCommandError } from "../lib/handleCommandError.js";
import { logger } from "../lib/logger.js";
import { truncate } from "../lib/format.js";
import { buildQuestEmbed } from "../embeds/questEmbed.js";
import { resolveTask, searchTasks } from "../services/tarkov/tasks.js";
import type { Command } from "../types/command.js";

export const questCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("quest")
    .setDescription("Show a quest's objectives, requirements and unlocks")
    .setDescriptionLocalizations({
      fr: "Afficher les objectifs, prérequis et déblocages d'une quête",
    })
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Quest name (start typing for suggestions)")
        .setDescriptionLocalizations({ fr: "Nom de la quête (tape pour des suggestions)" })
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async execute(interaction) {
    const locale = await resolveLocale(interaction);
    const query = interaction.options.getString("name", true);
    await interaction.deferReply();

    try {
      const task = await resolveTask(query, locale);
      if (!task) {
        await interaction.editReply(t(locale, "quest.notFound", { query }));
        return;
      }
      await interaction.editReply({ embeds: [buildQuestEmbed(task, locale)] });
    } catch (err) {
      await handleCommandError(interaction, err, locale);
    }
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().trim();
    try {
      const locale = await resolveLocale(interaction);
      const tasks = await searchTasks(focused, locale, 25);
      await interaction.respond(
        tasks.map((task) => ({
          name: truncate(`${task.name} — ${task.trader.name}`, 100),
          value: task.id,
        })),
      );
    } catch (err) {
      logger.warn("quest autocomplete failed:", err);
      await interaction.respond([]);
    }
  },
};
