import { Events, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { client } from "./bot.js";
import { config } from "./config.js";
import { commandMap } from "./commands/index.js";
import { logger } from "./lib/logger.js";
import { recordInvocation } from "./lib/invocationLog.js";
import { loadFlags } from "./runtime/flags.js";
import { startInternalApi } from "./internal-api/server.js";

function subcommandName(interaction: ChatInputCommandInteraction): string | null {
  return interaction.options.getSubcommand(false);
}

client.once(Events.ClientReady, (readyClient) => {
  logger.info(`Ready. Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commandMap.get(interaction.commandName);
    if (!command) {
      logger.warn(`Received unknown command /${interaction.commandName}`);
      return;
    }
    const startedAt = Date.now();
    try {
      await command.execute(interaction);
      recordInvocation({
        command: interaction.commandName,
        sub: subcommandName(interaction),
        userId: interaction.user.id,
        guildId: interaction.guildId,
        ok: true,
        durationMs: Date.now() - startedAt,
        error: null,
      });
    } catch (err) {
      // Commands handle their own expected errors; this is the last-resort net.
      recordInvocation({
        command: interaction.commandName,
        sub: subcommandName(interaction),
        userId: interaction.user.id,
        guildId: interaction.guildId,
        ok: false,
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      });
      logger.error(`Unhandled error in /${interaction.commandName}:`, err);
      const content = "Something went wrong. Please try again.";
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content });
        } else {
          await interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
      } catch {
        /* interaction already expired */
      }
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = commandMap.get(interaction.commandName);
    if (!command?.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (err) {
      logger.warn(`Autocomplete error in /${interaction.commandName}:`, err);
    }
  }
});

process.on("unhandledRejection", (reason) => logger.error("Unhandled promise rejection:", reason));
process.on("SIGINT", () => {
  logger.info("Shutting down.");
  void client.destroy().then(() => process.exit(0));
});

// Load persisted runtime flags before connecting so the first interaction
// already sees the right gameMode / fixtures / freeze settings.
loadFlags()
  .then(async () => {
    if (config.INTERNAL_API_ENABLED) {
      await startInternalApi().catch((err) =>
        logger.error("Internal control API failed to start:", err),
      );
    }
    return client.login(config.DISCORD_TOKEN);
  })
  .catch((err) => {
    logger.error("Startup failed:", err);
    process.exit(1);
  });
