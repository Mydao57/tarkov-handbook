# Tarkov Discord Bot

A Discord bot that serves **Escape from Tarkov** data from the community
[tarkov.dev](https://tarkov.dev) GraphQL API: item prices, ammunition stats and
quest objectives.

## Commands (v1)

| Command | What it does |
| --- | --- |
| `/item <name>` | Flea market price (avg 24h, last low, 48h change) plus buy/sell prices at each trader, with the item icon. Autocomplete on the name. |
| `/ammo <caliber>` | Every round of a caliber in a table: effective damage, penetration power, armor damage, fragmentation chance. Sorted by penetration. Autocomplete on the caliber. |
| `/quest <name>` | A quest's objectives, prerequisite quests and completion rewards/unlocks. Autocomplete on the name. |
| `/lang set\|show\|reset` | Per-user language for the bot's replies (English / French). Persisted. Defaults to your Discord client language. |

If a search returns nothing, the bot replies with a clear message. It never
crashes on an empty result, and it retries the API with exponential backoff when
tarkov.dev is rate-limiting or temporarily down.

## Stack

- Node.js >= 20, TypeScript (ESM, `nodenext`)
- [discord.js](https://discord.js.org) v14 (slash commands + autocomplete)
- [graphql-request](https://github.com/graffle-js/graffle) v7 for the tarkov.dev API
- [zod](https://zod.dev) for environment validation
- pnpm, ESLint (flat config) + Prettier

## Project layout

```
src/
  index.ts              Discord client, event wiring, login
  config.ts             .env loading + validation (zod)
  deploy-commands.ts    register slash commands (guild in dev, --global in prod)
  commands/             one file per slash command + a registry (index.ts)
  services/
    preferences.ts      per-user language store (data/preferences.json)
    tarkov/
      client.ts         GraphQLClient + timeout + retry/backoff
      queries.ts        GraphQL query documents
      items.ts          item search + best-match picker
      ammo.ts           full ammo list (cached) + caliber grouping/search
      tasks.ts          full task list (cached) + task search + detail fetch
  embeds/               EmbedBuilder factories for each command
  types/                hand-written types for the queried schema subset
  lib/                  cache, logger, errors, formatting helpers
```

The tarkov.dev API has **no name filter** on `ammo` or `tasks`, so the bot
fetches each full list once, caches it in memory (`CACHE_TTL_MS`, default 1h) and
filters locally. Item search does use the server-side `items(name:)` filter.

## Setup

### 1. Create a Discord application

1. Go to <https://discord.com/developers/applications> and **New Application**.
2. **Bot** tab -> **Reset Token** -> copy the token.
3. **General Information** tab -> copy the **Application ID**.
4. **Installation** (or **OAuth2 -> URL Generator**): scope `applications.commands`
   (and `bot` if you want it to appear in the member list). Open the generated URL
   and add the bot to your test server.
   The bot needs no privileged intents (it only reads slash-command input).

### 2. Configure the project

```bash
pnpm install
cp .env.example .env
```

Fill `.env`:

| Variable | Required | Notes |
| --- | --- | --- |
| `DISCORD_TOKEN` | yes | Bot token from step 1 |
| `DISCORD_CLIENT_ID` | yes | Application ID from step 1 |
| `DISCORD_GUILD_ID` | dev | Your test server ID (enable Developer Mode in Discord, right-click the server -> Copy Server ID). Guild commands appear instantly. |
| `TARKOV_API_URL` | no | Defaults to `https://api.tarkov.dev/graphql` |
| `TARKOV_HTTP_TIMEOUT_MS` | no | Per-request timeout, default `10000` |
| `CACHE_TTL_MS` | no | Ammo/task list cache lifetime, default `3600000` |
| `LOG_LEVEL` | no | `debug` \| `info` \| `warn` \| `error`, default `info` |

### 3. Register the slash commands

```bash
pnpm deploy          # registers on DISCORD_GUILD_ID, instant (use during dev)
pnpm deploy:global   # registers globally, can take up to ~1h to show up
```

Re-run this whenever you add or change a command's definition.

### 4. Run

```bash
pnpm dev     # watch mode (tsx)
# or
pnpm build && pnpm start
```

## Scripts

| Script | Action |
| --- | --- |
| `pnpm dev` | Run in watch mode |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run the compiled bot |
| `pnpm deploy` / `pnpm deploy:global` | Register slash commands |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier write |

## Notes and limits

- `gameMode` is pinned to `regular` in v1. Lift it to a query variable in
  `services/tarkov/queries.ts` to add a PvE toggle.
- The preference store is a single JSON file, fine for one bot instance. Swap it
  for SQLite or Redis before sharding.
- No API key is required for tarkov.dev. Be a good citizen: the in-memory cache
  keeps request volume low and the client backs off on `429`/`5xx`.
