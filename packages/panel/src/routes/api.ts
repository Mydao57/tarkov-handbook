import type { FastifyError, FastifyInstance } from "fastify";
import {
  clearCacheBodySchema,
  deployBodySchema,
  setFlagsBodySchema,
  setPreferenceBodySchema,
} from "@tarkov/shared";
import { currentUser, requireAdmin } from "../auth.js";
import { botApi, BotApiError, BotUnreachableError } from "../botClient.js";
import { config } from "../config.js";
import { logger } from "../logger.js";

export async function registerApi(app: FastifyInstance): Promise<void> {
  await app.register(
    async (api) => {
      api.addHook("preHandler", requireAdmin);

      api.setErrorHandler((err: FastifyError, _req, reply) => {
        if (err instanceof BotApiError) {
          return reply.code(err.status === 401 ? 502 : err.status).send({ error: err.message });
        }
        if (err instanceof BotUnreachableError) {
          return reply.code(502).send({ error: "The bot is not reachable." });
        }
        if (err.validation) {
          return reply.code(400).send({ error: err.message });
        }
        logger.error("Panel API error:", err);
        return reply.code(500).send({ error: "Internal error" });
      });

      api.get("/me", (req) => currentUser(req) ?? null);

      api.get("/dashboard", () => botApi.dashboard());
      api.get<{ Querystring: { force?: string } }>("/tarkov-health", (req) =>
        botApi.tarkovHealth(req.query.force === "1"),
      );
      api.get("/caches", () => botApi.caches());
      api.post("/caches/clear", (req) => {
        const body = clearCacheBodySchema.parse(req.body ?? {});
        return botApi.clearCaches(body.key);
      });
      api.get<{ Querystring: { limit?: string } }>("/invocations", (req) =>
        botApi.invocations(Number(req.query.limit) || undefined),
      );
      api.get("/flags", () => botApi.flags());
      api.post("/flags", (req) => botApi.setFlags(setFlagsBodySchema.parse(req.body ?? {})));
      api.post("/deploy", (req) => botApi.deploy(deployBodySchema.parse(req.body ?? {}).scope));

      api.get("/preferences", () => botApi.preferences());
      api.put<{ Params: { userId: string } }>("/preferences/:userId", (req) => {
        const { locale } = setPreferenceBodySchema.parse(req.body ?? {});
        return botApi.setPreference(req.params.userId, locale);
      });
      api.delete<{ Params: { userId: string } }>("/preferences/:userId", (req) =>
        botApi.deletePreference(req.params.userId),
      );

      // Relay the bot's log SSE stream through to the browser (same origin, so
      // the session cookie is enough; the bearer token is added server-side).
      api.get("/logs/stream", async (req, reply) => {
        let upstream: Response;
        try {
          upstream = await fetch(botApi.logsStreamUrl(), {
            headers: { authorization: `Bearer ${config.INTERNAL_API_TOKEN}` },
          });
        } catch {
          return reply.code(502).send({ error: "The bot is not reachable." });
        }
        if (!upstream.ok || !upstream.body) {
          return reply.code(502).send({ error: `bot log stream returned ${upstream.status}` });
        }

        reply.hijack();
        reply.raw.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
        });

        const reader = upstream.body.getReader();
        const pump = async (): Promise<void> => {
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              reply.raw.write(Buffer.from(value));
            }
          } catch {
            /* client disconnected or upstream ended */
          }
          reply.raw.end();
        };
        void pump();
        req.raw.on("close", () => {
          void reader.cancel().catch(() => {});
        });
      });
    },
    { prefix: "/api" },
  );
}
