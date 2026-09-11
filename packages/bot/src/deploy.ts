import { REST, Routes } from "discord.js";
import type { DeployResult, DeployScope } from "@tarkov/shared";
import { config } from "./config.js";
import { commands } from "./commands/index.js";

/** Raised when a guild deploy is requested but DISCORD_GUILD_ID is unset. */
export class DeployError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeployError";
  }
}

/**
 * Register the slash commands with Discord.
 *   scope "guild"  -> instant, scoped to DISCORD_GUILD_ID (dev)
 *   scope "global" -> every server, can take up to ~1h to appear
 *
 * Extracted from the deploy-commands CLI so the internal control API can
 * trigger a redeploy too.
 */
export async function registerCommands(scope: DeployScope): Promise<DeployResult> {
  const body = commands.map((command) => command.data.toJSON());
  const names = commands.map((command) => command.data.name);
  const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

  if (scope === "global") {
    await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), { body });
    return { scope, registered: body.length, commands: names };
  }

  if (!config.DISCORD_GUILD_ID) {
    throw new DeployError("DISCORD_GUILD_ID is not set; cannot deploy to a guild.");
  }
  await rest.put(
    Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID),
    { body },
  );
  return { scope, registered: body.length, commands: names };
}
