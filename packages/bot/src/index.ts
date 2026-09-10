import { Events, MessageFlags } from "discord.js";
import { client } from "./bot.js";
import { config } from "./config.js";
import { commandMap } from "./commands/index.js";
import { logger } from "./lib/logger.js";

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
    try {
      await command.execute(interaction);
    } catch (err) {
      // Commands handle their own expected errors; this is the last-resort net.
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

void client.login(config.DISCORD_TOKEN);
