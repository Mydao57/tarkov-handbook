import { createHash } from "node:crypto";
import oauth2, { type ProviderConfiguration } from "@fastify/oauth2";
import secureSession from "@fastify/secure-session";
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from "fastify";
import { config } from "./config.js";
import { logger } from "./logger.js";

export interface SessionUser {
  id: string;
  username: string;
  avatar: string | null;
}

declare module "@fastify/secure-session" {
  interface SessionData {
    user: SessionUser;
  }
}

// `@fastify/oauth2` exports only the plugin function type; the provider presets
// live on the runtime value.
const DISCORD_CONFIGURATION = (oauth2 as unknown as { DISCORD_CONFIGURATION: ProviderConfiguration })
  .DISCORD_CONFIGURATION;

function sessionKey(): Buffer {
  // A stable 32-byte key derived from SESSION_SECRET for the encrypted cookie.
  return createHash("sha256").update(config.SESSION_SECRET).digest();
}

function isAdmin(id: string | undefined): boolean {
  // BOT_ADMIN_IDS empty => nobody is an admin (fail closed).
  return !!id && config.BOT_ADMIN_IDS.includes(id);
}

export function currentUser(req: FastifyRequest): SessionUser | undefined {
  return req.session.get("user") as SessionUser | undefined;
}

/** preHandler that rejects anyone who is not a signed-in allow-listed admin. */
export const requireAdmin: preHandlerHookHandler = (req, reply, done) => {
  const user = currentUser(req);
  if (!user || !isAdmin(user.id)) {
    reply.code(401).send({ error: "unauthenticated" });
    return;
  }
  done();
};

async function fetchDiscordUser(accessToken: string): Promise<SessionUser> {
  const res = await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord /users/@me returned ${res.status}`);
  const me = (await res.json()) as { id: string; username: string; avatar: string | null };
  return { id: me.id, username: me.username, avatar: me.avatar };
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(secureSession, {
    key: sessionKey(),
    cookieName: "tarkov_panel_session",
    cookie: {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: "auto",
      maxAge: 60 * 60 * 8,
    },
  });

  await app.register(oauth2, {
    name: "oauth2Discord",
    scope: ["identify"],
    credentials: {
      client: { id: config.DISCORD_CLIENT_ID, secret: config.DISCORD_OAUTH_CLIENT_SECRET },
      auth: DISCORD_CONFIGURATION,
    },
    startRedirectPath: "/auth/login",
    callbackUri: `${config.WEB_PANEL_PUBLIC_URL.replace(/\/+$/, "")}/auth/callback`,
  });

  app.get("/auth/callback", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } =
        await app.oauth2Discord!.getAccessTokenFromAuthorizationCodeFlow(req);
      const user = await fetchDiscordUser(token.access_token);
      if (!isAdmin(user.id)) {
        logger.warn(`Rejected non-allow-listed login: ${user.username} (${user.id})`);
        return reply
          .code(403)
          .type("text/html")
          .send(deniedPage(user.username));
      }
      req.session.set("user", user);
      logger.info(`Admin signed in: ${user.username} (${user.id})`);
      return reply.redirect("/");
    } catch (err) {
      logger.error("OAuth2 callback failed:", err);
      return reply.code(500).type("text/html").send(errorPage());
    }
  });

  app.post("/auth/logout", async (req: FastifyRequest, reply: FastifyReply) => {
    req.session.delete();
    return reply.redirect("/");
  });
}

function shell(title: string, body: string): string {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:system-ui;background:#0f1115;color:#e6e6e6;display:grid;place-items:center;height:100vh;margin:0"><main style="max-width:28rem;text-align:center;padding:2rem">${body}</main>`;
}

function deniedPage(username: string): string {
  return shell(
    "Access denied",
    `<h1>Access denied</h1><p><strong>${escapeHtml(username)}</strong> is not on this bot's admin allow-list.</p><p><a style="color:#7aa2f7" href="/auth/login">Try another account</a></p>`,
  );
}

function errorPage(): string {
  return shell(
    "Sign-in failed",
    `<h1>Sign-in failed</h1><p>Something went wrong completing the Discord sign-in.</p><p><a style="color:#7aa2f7" href="/auth/login">Try again</a></p>`,
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
