import { Client, GatewayIntentBits } from "discord.js";

/**
 * The single discord.js client for the process, in its own module so other
 * parts of the codebase (notably the internal control API) can read live
 * gateway state without importing `index.ts`, which also wires event handlers
 * and logs in.
 */
export const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const processStartedAt = Date.now();

export interface BotStatus {
  /** The gateway connection is open and the client is usable. */
  ready: boolean;
  /** `user#1234` once ready, else null. */
  tag: string | null;
  /** ISO timestamp of when this process started. */
  startedAt: string;
  /** Milliseconds since this process started. */
  processUptimeMs: number;
  /** Milliseconds since the gateway became ready, or null if not ready yet. */
  readyUptimeMs: number | null;
  /** Guilds the bot is currently in. */
  guildCount: number;
  /** Last measured websocket heartbeat round-trip, or null if not measured yet. */
  wsPingMs: number | null;
}

export function getBotStatus(): BotStatus {
  const ready = client.isReady();
  // `client.ws.ping` is -1 until the first heartbeat ack.
  const ping = client.ws.ping;
  return {
    ready,
    tag: client.user?.tag ?? null,
    startedAt: new Date(processStartedAt).toISOString(),
    processUptimeMs: Date.now() - processStartedAt,
    readyUptimeMs: client.uptime ?? null,
    guildCount: client.guilds.cache.size,
    wsPingMs: ready && ping >= 0 ? Math.round(ping) : null,
  };
}
