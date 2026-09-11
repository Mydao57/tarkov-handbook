# Deploying to a VPS

Target: `tarkov-handbook.example.com` on a Debian/Ubuntu box, behind a
reverse proxy, two systemd services (`tarkov-bot`, `tarkov-panel`), secrets in
`/etc/tarkov-handbook/`.

> All examples use `tarkov-handbook.example.com`. Replace it everywhere with
> a subdomain you actually control (in the configs you copy onto the box and
> in `WEB_PANEL_PUBLIC_URL`). Nothing here needs a specific domain.

```
Internet
  -> Caddy / nginx  (443, TLS)  ->  127.0.0.1:4786  tarkov-panel
                                            |  (localhost only, bearer token)
                                            v
                                    127.0.0.1:4785  tarkov-bot internal API
```

The panel port and the bot internal API port are **never** exposed publicly.

---

## 1. System prerequisites

```bash
sudo apt update
# Node 22 LTS from NodeSource (gives /usr/bin/node, which the systemd units use)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
sudo corepack enable            # provides pnpm, pinned by package.json "packageManager"

# Reverse proxy: pick one
sudo apt install -y caddy       # option A (recommended: automatic HTTPS)
# -- or --
sudo apt install -y nginx certbot python3-certbot-nginx   # option B
```

## 2. Dedicated user + directories

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin tarkov
sudo mkdir -p /opt/tarkov-handbook /etc/tarkov-handbook
sudo chown -R tarkov:tarkov /opt/tarkov-handbook

sudo -u tarkov git clone https://github.com/Mydao57/tarkov-handbook.git /opt/tarkov-handbook
```

## 3. First build

```bash
cd /opt/tarkov-handbook
sudo -u tarkov pnpm install --frozen-lockfile   # postinstall builds @tarkov/shared
sudo -u tarkov pnpm build                       # shared + bot (tsc) + panel (tsc + vite)
```

`pnpm build` produces `packages/bot/dist/`, `packages/panel/dist/` and the
client bundle at `packages/panel/dist/client/`.

## 4. Secrets

```bash
sudo install -m 600 -o tarkov -g tarkov deploy/env/bot.env.example   /etc/tarkov-handbook/bot.env
sudo install -m 600 -o tarkov -g tarkov deploy/env/panel.env.example /etc/tarkov-handbook/panel.env
sudoedit /etc/tarkov-handbook/bot.env
sudoedit /etc/tarkov-handbook/panel.env
```

Fill in:

- `bot.env`: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` (optional),
  `INTERNAL_API_TOKEN` (`openssl rand -hex 32`).
- `panel.env`: same `INTERNAL_API_TOKEN`, `DISCORD_CLIENT_ID`,
  `DISCORD_OAUTH_CLIENT_SECRET`, `SESSION_SECRET` (`openssl rand -hex 32`),
  `BOT_ADMIN_IDS` (your Discord user ID; empty = nobody can sign in).

`WEB_PANEL_PUBLIC_URL` is already set to `https://tarkov-handbook.example.com`
and `WEB_PANEL_HOST` to `127.0.0.1`.

## 5. Discord application

- **OAuth2 -> Redirects** -> add exactly:
  `https://tarkov-handbook.example.com/auth/callback`
- Copy the **Client Secret** into `panel.env`.

## 6. systemd services

```bash
sudo cp deploy/systemd/tarkov-bot.service   /etc/systemd/system/
sudo cp deploy/systemd/tarkov-panel.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tarkov-bot.service tarkov-panel.service

systemctl status tarkov-bot tarkov-panel
journalctl -u tarkov-bot -u tarkov-panel -f
```

Expected log lines:
- bot: `Internal control API on http://127.0.0.1:4785`
- panel: `Admin panel listening on :4786 (public: https://tarkov-handbook.example.com)`

Quick local check on the box:

```bash
curl -s http://127.0.0.1:4785/health          # {"ok":true}
curl -sI http://127.0.0.1:4786/ | head -1     # HTTP/1.1 200
```

## 7. Reverse proxy + DNS

Point an `A`/`AAAA` record for `tarkov-handbook.example.com` at the VPS.

**Caddy (option A):** append `deploy/caddy/Caddyfile` to `/etc/caddy/Caddyfile`
(edit the domain if needed), then `sudo systemctl reload caddy`. TLS is
automatic.

**nginx (option B):**

```bash
sudo cp deploy/nginx/tarkov-handbook.example.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/tarkov-handbook.example.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tarkov-handbook.example.com
```

Both proxy configs disable buffering so the live-logs SSE stream works, and
forward `X-Forwarded-Proto` so the session cookie gets the `Secure` flag
(the panel runs Fastify with `trustProxy: true`).

## 8. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
# 4785 and 4786 stay closed -- they only listen on 127.0.0.1 anyway.
```

## 9. Slash commands

Once the bot is connected, register the commands (guild is instant, global
takes up to ~1h) either from the panel dashboard, or:

```bash
cd /opt/tarkov-handbook
sudo -u tarkov --preserve-env sh -c 'set -a; . /etc/tarkov-handbook/bot.env; set +a; pnpm --filter @tarkov/bot deploy'
# add --global via: ... pnpm --filter @tarkov/bot deploy:global
```

---

## Updating

`deploy/deploy.sh` does pull -> install -> build -> restart:

```bash
sudo -u tarkov APP_DIR=/opt/tarkov-handbook DEPLOY_REF=main /opt/tarkov-handbook/deploy/deploy.sh
```

For the `sudo systemctl restart` inside it to work as the `tarkov` user, add a
sudoers rule:

```
# /etc/sudoers.d/tarkov-handbook   (visudo -f)
tarkov ALL=(root) NOPASSWD: /bin/systemctl restart tarkov-bot.service tarkov-panel.service, \
                            /bin/systemctl status tarkov-bot.service tarkov-panel.service
```

Otherwise just run the script with `sudo`.

## Notes

- `WEB_PANEL_ENABLED=false` (or stopping `tarkov-panel`) takes the panel offline
  without touching the bot.
- `INTERNAL_API_ENABLED=false` in `bot.env` disables the control API; the panel
  will then show "bot not reachable".
- Runtime flags toggled from the panel persist to
  `/opt/tarkov-handbook/packages/bot/data/flags.json` and survive restarts.
- Rotating `SESSION_SECRET` logs everyone out; rotating `INTERNAL_API_TOKEN`
  requires updating both env files.
