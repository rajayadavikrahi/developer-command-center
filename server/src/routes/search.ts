import { Hono } from "hono";
import type { AppEnv, Repo } from "../lib/repo";
import { search } from "../services/search";

export function searchRouter(repo: Repo): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const term = c.req.query("q") ?? "";
    const results = await search(repo, c.get("user").id, term);
    return c.json(results);
  });

  return router;
}
