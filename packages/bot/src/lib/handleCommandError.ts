import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { t, type Locale } from "../i18n/index.js";
import { UserFacingError } from "./errors.js";
import { logger } from "./logger.js";

/**
 * Turn any thrown value into a clean user reply. `UserFacingError` messages are
 * shown as-is; anything else is logged with its stack and replaced by a generic
 * message so internals never leak into a channel.
 */
export async function handleCommandError(
  interaction: ChatInputCommandInteraction,
  err: unknown,
  locale: Locale,
): Promise<void> {
  const message = err instanceof UserFacingError ? err.message : t(locale, "error.generic");
  if (!(err instanceof UserFacingError)) {
    logger.error(`/${interaction.commandName} failed:`, err);
  }

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message, embeds: [] });
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
  } catch (replyErr) {
    logger.error("Could not deliver error message to the user:", replyErr);
  }
}
