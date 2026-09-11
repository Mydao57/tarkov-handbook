import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  // Master on/off so infra can disable the panel without unscheduling it.
  WEB_PANEL_ENABLED: z.stringbool().default(false),
  WEB_PANEL_PORT: z.coerce.number().int().positive().default(4786),
  // Address to bind. Default 0.0.0.0; set 127.0.0.1 when a local reverse
  // proxy is the only thing that should reach the panel (VPS deploy).
  WEB_PANEL_HOST: z.string().min(1).default("0.0.0.0"),
  // Public origin the browser reaches the panel on. Used to build the OAuth2
  // redirect URI: <WEB_PANEL_PUBLIC_URL>/auth/callback (register that in the
  // Discord developer portal).
  WEB_PANEL_PUBLIC_URL: z.url(),

  // Where the bot's internal control API listens, and the shared bearer token.
  BOT_INTERNAL_API_URL: z.url().default("http://127.0.0.1:4785"),
  INTERNAL_API_TOKEN: z.string().min(16),

  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_OAUTH_CLIENT_SECRET: z.string().min(1),

  // >= 32 chars; hashed to a 32-byte key for the encrypted session cookie.
  SESSION_SECRET: z.string().min(32),

  // Comma-separated Discord user IDs allowed into the panel. Empty => nobody
  // (fail closed).
  BOT_ADMIN_IDS: z
    .string()
    .default("")
    .transform((raw) =>
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration. Check your .env file:\n");
  for (const issue of parsed.error.issues) {
    const path = issue.path.join(".") || "(root)";
    console.error(`  - ${path}: ${issue.message}`);
  }
  console.error("\nSee .env.example for the expected variables.");
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
