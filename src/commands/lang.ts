import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { isLocale, LOCALE_LABEL, t } from "../i18n/index.js";
import { resolveLocale } from "../i18n/resolve.js";
import { clearUserLocale, getUserLocale, setUserLocale } from "../services/preferences.js";
import type { Command } from "../types/command.js";

export const langCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("lang")
    .setDescription("Choose the language the bot answers you in")
    .setDescriptionLocalizations({ fr: "Choisir la langue dans laquelle le bot te répond" })
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set your preferred language")
        .setDescriptionLocalizations({ fr: "Définir ta langue préférée" })
        .addStringOption((option) =>
          option
            .setName("locale")
            .setDescription("Language")
            .setDescriptionLocalizations({ fr: "Langue" })
            .setRequired(true)
            .addChoices({ name: "English", value: "en" }, { name: "Français", value: "fr" }),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("show")
        .setDescription("Show your current language setting")
        .setDescriptionLocalizations({ fr: "Afficher ton réglage de langue actuel" }),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setDescription("Follow your Discord client language again")
        .setDescriptionLocalizations({ fr: "Suivre à nouveau la langue de ton client Discord" }),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const current = await resolveLocale(interaction);

    if (sub === "set") {
      const value = interaction.options.getString("locale", true);
      if (!isLocale(value)) {
        await interaction.reply({ content: t(current, "lang.invalid"), flags: MessageFlags.Ephemeral });
        return;
      }
      await setUserLocale(interaction.user.id, value);
      await interaction.reply({
        content: t(value, "lang.set", { locale: LOCALE_LABEL[value] }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === "reset") {
      await clearUserLocale(interaction.user.id);
      const next = await resolveLocale(interaction);
      await interaction.reply({
        content: t(next, "lang.reset", { locale: LOCALE_LABEL[next] }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // show
    const stored = await getUserLocale(interaction.user.id);
    await interaction.reply({
      content: stored
        ? t(current, "lang.showSet", { locale: LOCALE_LABEL[current] })
        : t(current, "lang.showAuto", { locale: LOCALE_LABEL[current] }),
      flags: MessageFlags.Ephemeral,
    });
  },
};
