import { timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { registerRoutes } from "./routes.js";

function tokenMatches(header: string | undefined, expected: string): boolean {
  if (!header || !header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

/**
 * Start the internal control API: a Fastify server bound to 127.0.0.1 that the
 * admin panel process reads for status/metrics and calls for actions. Every
 * route except `/health` requires `Authorization: Bearer <INTERNAL_API_TOKEN>`.
 * Never expose this port beyond localhost / a trusted private network.
 */
export async function startInternalApi(): Promise<FastifyInstance> {
  const token = config.INTERNAL_API_TOKEN;
  if (!token) {
    // config.refine already guarantees this, but keep the invariant explicit.
    throw new Error("INTERNAL_API_TOKEN is required to start the internal API");
  }

  const app = Fastify({ logger: false, bodyLimit: 64 * 1024 });

  app.get("/health", () => ({ ok: true }));

  app.addHook("onRequest", async (req, reply) => {
    if (req.method === "OPTIONS" || req.url === "/health") return;
    if (!tokenMatches(req.headers.authorization, token)) {
      await reply.code(401).send({ error: "unauthorized" });
    }
  });

  await registerRoutes(app);

  await app.listen({ host: "127.0.0.1", port: config.INTERNAL_API_PORT });
  logger.info(`Internal control API on http://127.0.0.1:${config.INTERNAL_API_PORT}`);
  return app;
}
