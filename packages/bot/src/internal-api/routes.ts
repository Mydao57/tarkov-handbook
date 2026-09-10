import type { FastifyInstance } from "fastify";
import {
  clearCacheBodySchema,
  deployBodySchema,
  setFlagsBodySchema,
  setPreferenceBodySchema,
  type DashboardSnapshot,
  type FlagsView,
} from "@tarkov/shared";
import { getBotStatus } from "../bot.js";
import { registerCommands, DeployError } from "../deploy.js";
import { listCacheStats, clearCaches } from "../lib/cacheRegistry.js";
import { recentInvocations } from "../lib/invocationLog.js";
import { recentLogs, subscribeLogs } from "../lib/logger.js";
import { flagDefaults, flagsAtDefaults, getFlags, setFlags } from "../runtime/flags.js";
import { getTarkovHealth } from "../services/tarkov/health.js";
import {
  clearUserLocale,
  listUserLocales,
  setUserLocale,
} from "../services/preferences.js";

function flagsView(): FlagsView {
  return { current: getFlags(), defaults: flagDefaults(), atDefaults: flagsAtDefaults() };
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/status", () => getBotStatus());

  app.get<{ Querystring: { force?: string } }>("/tarkov-health", (req) =>
    getTarkovHealth(req.query.force === "1" || req.query.force === "true"),
  );

  app.get("/caches", () => listCacheStats());

  app.post("/caches/clear", (req, reply) => {
    const parsed = clearCacheBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return { cleared: clearCaches(parsed.data.key) };
  });

  app.get<{ Querystring: { limit?: string } }>("/invocations", (req) => {
    const limit = Number(req.query.limit);
    return recentInvocations(Number.isFinite(limit) ? limit : undefined);
  });

  app.get("/flags", () => flagsView());

  app.post("/flags", async (req, reply) => {
    const parsed = setFlagsBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    await setFlags(parsed.data);
    return flagsView();
  });

  app.post("/deploy", async (req, reply) => {
    const parsed = deployBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    try {
      return await registerCommands(parsed.data.scope);
    } catch (err) {
      if (err instanceof DeployError) return reply.code(400).send({ error: err.message });
      throw err;
    }
  });

  app.get("/preferences", () => listUserLocales());

  app.put<{ Params: { userId: string } }>("/preferences/:userId", async (req, reply) => {
    const parsed = setPreferenceBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    await setUserLocale(req.params.userId, parsed.data.locale);
    return { ok: true };
  });

  app.delete<{ Params: { userId: string } }>("/preferences/:userId", async (req) => {
    await clearUserLocale(req.params.userId);
    return { ok: true };
  });

  app.get<{ Querystring: { limit?: string } }>("/logs", (req) => {
    const limit = Number(req.query.limit);
    return recentLogs(Number.isFinite(limit) ? limit : undefined);
  });

  app.get("/logs/stream", (req, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    });
    reply.raw.write("retry: 3000\n\n");
    for (const line of recentLogs(100)) {
      reply.raw.write(`data: ${JSON.stringify(line)}\n\n`);
    }
    const unsubscribe = subscribeLogs((line) => {
      reply.raw.write(`data: ${JSON.stringify(line)}\n\n`);
    });
    const keepAlive = setInterval(() => reply.raw.write(": ping\n\n"), 25_000);
    req.raw.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  });

  app.get("/dashboard", async (): Promise<DashboardSnapshot> => {
    const [tarkov] = await Promise.all([getTarkovHealth()]);
    return {
      bot: getBotStatus(),
      tarkov,
      caches: listCacheStats(),
      flags: flagsView(),
      invocations: recentInvocations(50),
    };
  });
}
