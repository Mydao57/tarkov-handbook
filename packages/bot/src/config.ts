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

  // Seed values for the runtime flags (see runtime/flags.ts). Once the panel
  // writes data/flags.json, that file wins until it is deleted.
  GAME_MODE: z.enum(["regular", "pve"]).default("regular"),
  FIXTURES_MODE: z.stringbool().default(false),
  FREEZE_CACHE: z.stringbool().default(false),

  // --- Internal control API (consumed by the admin web panel) ---
  INTERNAL_API_ENABLED: z.stringbool().default(false),
  INTERNAL_API_PORT: z.coerce.number().int().positive().default(4785),
  INTERNAL_API_TOKEN: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().min(16).optional(),
  ),
})
  .refine((c) => !c.INTERNAL_API_ENABLED || !!c.INTERNAL_API_TOKEN, {
    path: ["INTERNAL_API_TOKEN"],
    message: "INTERNAL_API_TOKEN (min 16 chars) is required when INTERNAL_API_ENABLED is true",
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
