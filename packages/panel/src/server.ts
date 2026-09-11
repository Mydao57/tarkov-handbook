import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAuth } from "./auth.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { registerApi } from "./routes/api.js";

const CLIENT_DIR = fileURLToPath(new URL("./client/", import.meta.url));

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, trustProxy: true, bodyLimit: 64 * 1024 });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https://cdn.discordapp.com", "https://assets.tarkov.dev"],
        "connect-src": ["'self'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'", "https://discord.com"],
        "frame-ancestors": ["'none'"],
      },
    },
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
    allowList: [],
  });

  await registerAuth(app);
  await registerApi(app);

  // Production: serve the built React app and fall back to index.html for
  // client-side routes. In dev the Vite server does this on its own port.
  if (existsSync(CLIENT_DIR)) {
    await app.register(fastifyStatic, { root: CLIENT_DIR, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.method !== "GET" || req.url.startsWith("/api") || req.url.startsWith("/auth")) {
        return reply.code(404).send({ error: "not found" });
      }
      return reply.sendFile("index.html");
    });
  } else {
    logger.warn(`No client build at ${CLIENT_DIR}; serving API only. Run \`pnpm build\`.`);
  }

  return app;
}

export async function startWebPanel(): Promise<void> {
  if (!config.WEB_PANEL_ENABLED) {
    logger.info("WEB_PANEL_ENABLED is not true; the admin panel will not start.");
    return;
  }
  if (config.BOT_ADMIN_IDS.length === 0) {
    logger.warn("BOT_ADMIN_IDS is empty: the panel starts but nobody can sign in (fail closed).");
  }

  const app = await buildServer();
  await app.listen({ host: config.WEB_PANEL_HOST, port: config.WEB_PANEL_PORT });
  logger.info(
    `Admin panel listening on :${config.WEB_PANEL_PORT} (public: ${config.WEB_PANEL_PUBLIC_URL})`,
  );

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      logger.info(`${signal} received, shutting down.`);
      void app.close().then(() => process.exit(0));
    });
  }
}
