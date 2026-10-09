import { Hono } from "hono";
import type { AppEnv, Repo } from "../lib/repo";
import { developerStats } from "../services/dev-stats";

export function devStatsRouter(repo: Repo): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const stats = await developerStats(repo, c.get("user").id);
    return c.json({ stats, serverTime: new Date().toISOString() });
  });

  return router;
}
