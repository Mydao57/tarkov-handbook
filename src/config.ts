import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  TARKOV_API_URL: z.url().default("https://api.tarkov.dev/graphql"),
  TARKOV_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  CACHE_TTL_MS: z.coerce.number().int().positive().default(3_600_000),
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
