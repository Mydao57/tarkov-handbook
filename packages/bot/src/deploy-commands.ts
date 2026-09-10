import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import { commands } from "./commands/index.js";
import { logger } from "./lib/logger.js";

/**
 * Registers the slash commands.
 *   pnpm deploy          -> instant, scoped to DISCORD_GUILD_ID (dev)
 *   pnpm deploy:global   -> every server, can take up to ~1h to appear
 */
async function main(): Promise<void> {
  const body = commands.map((command) => command.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);
  const global = process.argv.includes("--global");

  if (global) {
    await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), { body });
    logger.info(`Registered ${body.length} global command(s). Propagation can take up to 1h.`);
    return;
  }

  if (!config.DISCORD_GUILD_ID) {
    logger.error("DISCORD_GUILD_ID is not set. Set it in .env, or run with --global.");
    process.exit(1);
  }

  await rest.put(
    Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID),
    { body },
  );
  logger.info(
    `Registered ${body.length} command(s) on guild ${config.DISCORD_GUILD_ID}: ${commands
      .map((c) => `/${c.data.name}`)
      .join(", ")}`,
  );
}

main().catch((err) => {
  logger.error("Command deployment failed:", err);
  process.exit(1);
});
