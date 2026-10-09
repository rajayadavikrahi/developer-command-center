import { Hono } from "hono";
import type { Repo } from "../lib/repo";
import { APP_VERSION } from "../lib/version";

export function healthRouter(repo: Repo, startedAt: number): Hono {
  const router = new Hono();
  const uptimeSeconds = () => Math.floor((Date.now() - startedAt) / 1000);

  router.get("/", async (c) => {
    const t0 = performance.now();
    try {
      const [users, sessions] = await Promise.all([repo.countUsers(), repo.countSessions()]);
      return c.json({
        status: "ok",
        version: APP_VERSION,
        database: {
          kind: repo.kind,
          connected: true,
          latencyMs: Math.round(performance.now() - t0),
        },
        users,
        sessions,
        uptimeSeconds: uptimeSeconds(),
        serverTime: new Date().toISOString(),
      });
    } catch (error) {
      return c.json(
        {
          status: "degraded",
          version: APP_VERSION,
          database: {
            kind: repo.kind,
            connected: false,
            error: error instanceof Error ? error.message : String(error),
          },
          users: null,
          sessions: null,
          uptimeSeconds: uptimeSeconds(),
          serverTime: new Date().toISOString(),
        },
        503,
      );
    }
  });

  return router;
}
