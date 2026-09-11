# TarkovHandbook

A Discord bot that serves **Escape from Tarkov** data from the community
[tarkov.dev](https://tarkov.dev) GraphQL API: item prices, ammunition stats and
quest objectives. Ships with an optional admin web panel.

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
- pnpm workspace: `packages/bot`, `packages/panel`, `packages/shared`
- [discord.js](https://discord.js.org) v14 (slash commands + autocomplete)
- [graphql-request](https://github.com/graffle-js/graffle) v7 for the tarkov.dev API
- [Fastify](https://fastify.dev) v5 (bot internal API + panel), React 19 + Vite (panel UI)
- [zod](https://zod.dev) for environment validation
- ESLint (flat config) + Prettier

## Repository layout

```
packages/
  bot/                    the Discord bot
    src/
      index.ts            client event wiring, login, startup
      bot.ts              the discord.js Client + getBotStatus()
      config.ts           .env loading + validation (zod)
      deploy.ts           registerCommands({scope}) - reused by the CLI and the panel
      deploy-commands.ts   CLI wrapper (pnpm deploy / deploy:global)
      runtime/flags.ts    fixtures / freeze-cache / gameMode, persisted to data/flags.json
      internal-api/       Fastify control API on 127.0.0.1 (off unless INTERNAL_API_ENABLED)
      commands/  embeds/  types/
      services/
        preferences.ts    per-user language store (data/preferences.json)
        tarkov/           client (timeout + retry), queries, items/ammo/tasks,
                          health probe, fixture snapshots
      lib/                cache (+ registry), logger (+ ring buffer), errors, format,
                          invocationLog
    fixtures/             bundled JSON snapshots for fixtures mode
  panel/                  the admin web panel (separate process)
    src/                  Fastify server: config, auth (OAuth2 + session),
                          botClient, routes/api (bridge + SSE relay), server
    client/               Vite + React SPA (dashboard, preferences, live logs)
  shared/                 @tarkov/shared - types + zod schemas for the internal API
```

The tarkov.dev API has **no name filter** on `ammo` or `tasks`, so the bot
fetches each full list once, caches it in memory (`CACHE_TTL_MS`, default 1h) and
filters locally. Item search does use the server-side `items(name:)` filter.

## Setup - bot

### 1. Create a Discord application

1. Go to <https://discord.com/developers/applications> and **New Application**.
2. **Bot** tab -> **Reset Token** -> copy the token.
3. **General Information** tab -> copy the **Application ID**.
4. **Installation** (or **OAuth2 -> URL Generator**): scope `applications.commands`
   (and `bot` if you want it to appear in the member list). Open the generated URL
   and add the bot to your test server.
   The bot needs no privileged intents (it only reads slash-command input).

### 2. Configure

```bash
pnpm install
cp packages/bot/.env.example packages/bot/.env
```

Fill `packages/bot/.env`:

| Variable | Required | Notes |
| --- | --- | --- |
| `DISCORD_TOKEN` | yes | Bot token from step 1 |
| `DISCORD_CLIENT_ID` | yes | Application ID from step 1 |
| `DISCORD_GUILD_ID` | dev | Test server ID (enable Developer Mode, right-click the server -> Copy Server ID). Guild commands appear instantly. |
| `TARKOV_API_URL` | no | Defaults to `https://api.tarkov.dev/graphql` |
| `TARKOV_HTTP_TIMEOUT_MS` | no | Per-request timeout, default `10000` |
| `CACHE_TTL_MS` | no | Ammo/task list cache lifetime, default `3600000` |
| `LOG_LEVEL` | no | `debug` \| `info` \| `warn` \| `error`, default `info` |
| `GAME_MODE` | no | `regular` \| `pve` seed for the runtime flag, default `regular` |
| `FIXTURES_MODE` | no | Start in fixtures mode, default `false` |
| `FREEZE_CACHE` | no | Start with caches frozen, default `false` |
| `INTERNAL_API_ENABLED` | no | Expose the control API for the panel, default `false` |
| `INTERNAL_API_PORT` | no | Localhost port for the control API, default `4785` |
| `INTERNAL_API_TOKEN` | if enabled | Shared bearer token (>= 16 chars). `openssl rand -hex 32` |

### 3. Register the slash commands

```bash
pnpm deploy          # registers on DISCORD_GUILD_ID, instant (use during dev)
pnpm deploy:global   # registers globally, can take up to ~1h to show up
```

Re-run this whenever you add or change a command's definition (or use the panel).

### 4. Run

```bash
pnpm dev     # bot only, watch mode
# or
pnpm build && pnpm start
```

## Admin web panel

`packages/panel` is a **separate process** with a read/write dashboard for the
bot. It talks to the bot over a small HTTP API the bot exposes on `127.0.0.1`
(never publicly), authenticated with a shared bearer token. The panel itself is
gated by Discord OAuth2 and an explicit allow-list of Discord user IDs.

What it shows and does:

- **Dashboard**: gateway state, guild count, uptime, ws ping; tarkov.dev
  reachability and the timestamp of the last successful fetch (degrades cleanly
  when the API is down); cache state (present / age / size) with clear buttons;
  the last 200 command invocations.
- **Actions**: clear caches, redeploy slash commands (guild or global), toggle
  runtime flags (fixtures mode, freeze cache, `gameMode`). A banner flags when
  the runtime flags are not at their configured defaults.
- **Preferences**: list / add / edit / delete per-user language overrides.
- **Logs**: live tail of the bot's log over SSE.

### 1. Discord OAuth2

Same application as the bot. **OAuth2** tab:

- copy the **Client ID** (same as `DISCORD_CLIENT_ID`) and **Client Secret**.
- under **Redirects**, add the panel's callback URL exactly:
  - dev: `http://localhost:5173/auth/callback`
  - prod: `https://<your-panel-host>/auth/callback`

### 2. Configure

```bash
cp packages/panel/.env.example packages/panel/.env
```

Fill `packages/panel/.env`:

| Variable | Required | Notes |
| --- | --- | --- |
| `WEB_PANEL_ENABLED` | yes | Must be `true` or the panel refuses to serve |
| `WEB_PANEL_PORT` | no | Listen port, default `4786` |
| `WEB_PANEL_PUBLIC_URL` | yes | Public origin the browser uses. Dev: `http://localhost:5173`. Prod: `https://<your-panel-host>`. The redirect URI is `<this>/auth/callback`. |
| `BOT_INTERNAL_API_URL` | no | Default `http://127.0.0.1:4785` - must match the bot |
| `INTERNAL_API_TOKEN` | yes | Same value as the bot's |
| `DISCORD_CLIENT_ID` | yes | Application ID |
| `DISCORD_OAUTH_CLIENT_SECRET` | yes | OAuth2 client secret |
| `SESSION_SECRET` | yes | >= 32 chars, hashed to the session-cookie key. `openssl rand -hex 32` |
| `BOT_ADMIN_IDS` | yes | Comma-separated Discord user IDs allowed in. **Empty = nobody** (fail closed). |
| `RATE_LIMIT_MAX` | no | Requests per minute per IP, default `100` |
| `LOG_LEVEL` | no | default `info` |

Also set `INTERNAL_API_ENABLED=true` and a matching `INTERNAL_API_TOKEN` in
`packages/bot/.env`.

### 3. Run

```bash
pnpm dev:all   # bot (with control API) + panel server + Vite dev server
```

Open the Vite dev server (`http://localhost:5173`); it proxies `/api` and
`/auth` to the panel. In production:

```bash
pnpm build
pnpm --filter @tarkov/bot start     # process 1 (needs INTERNAL_API_ENABLED=true)
pnpm --filter @tarkov/panel start   # process 2, serves the built client
```

### Production notes

- Put the panel behind a TLS-terminating reverse proxy (nginx, Caddy). The panel
  trusts `X-Forwarded-*`; the proxy must set `X-Forwarded-Proto` so the session
  cookie gets the `Secure` flag.
- The bot's internal API binds `127.0.0.1` only. Keep it that way - never proxy
  it publicly. If the panel runs on another host, tunnel it over a private
  network and set `BOT_INTERNAL_API_URL` accordingly.
- Rotating `SESSION_SECRET` or `INTERNAL_API_TOKEN` invalidates existing sessions
  / breaks the bridge until both sides match again.

## Scripts

| Script | Action |
| --- | --- |
| `pnpm dev` | Run the bot in watch mode (bot only) |
| `pnpm dev:all` | Bot + panel server + Vite dev server, in parallel |
| `pnpm build` | Build every package (`shared` first) |
| `pnpm start` | Run the compiled bot |
| `pnpm deploy` / `pnpm deploy:global` | Register slash commands |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm lint` | ESLint across the workspace |
| `pnpm format` | Prettier write |

## Notes and limits

- `gameMode` is a runtime flag (global, `regular` / `pve`), lifted to the
  `$gameMode` GraphQL variable. Ammo/task caches are keyed by `(locale, gameMode)`.
- Fixtures mode serves small English-only snapshots from `packages/bot/fixtures/`
  so the bot and panel stay usable while tarkov.dev is down. Regenerate them from
  a live capture when the API is up.
- The preference and flags stores are single JSON files, fine for one bot
  instance. Swap for SQLite or Redis before sharding.
- No API key is required for tarkov.dev. The in-memory cache keeps request volume
  low and the client backs off on `429`/`5xx`.
