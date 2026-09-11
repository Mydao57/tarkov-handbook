import { config } from "./config.js";
import { registerCommands } from "./deploy.js";
import { logger } from "./lib/logger.js";

/**
 * CLI wrapper around registerCommands().
 *   pnpm deploy          -> instant, scoped to DISCORD_GUILD_ID (dev)
 *   pnpm deploy:global   -> every server, can take up to ~1h to appear
 */
async function main(): Promise<void> {
  const scope = process.argv.includes("--global") ? "global" : "guild";
  const result = await registerCommands(scope);
  const list = result.commands.map((name) => `/${name}`).join(", ");
  if (result.scope === "global") {
    logger.info(`Registered ${result.registered} global command(s): ${list}. Propagation can take up to 1h.`);
  } else {
    logger.info(
      `Registered ${result.registered} command(s) on guild ${config.DISCORD_GUILD_ID}: ${list}`,
    );
  }
}

main().catch((err) => {
  logger.error("Command deployment failed:", err);
  process.exit(1);
});
