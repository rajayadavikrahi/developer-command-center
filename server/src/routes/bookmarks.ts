import { Hono } from "hono";
import z from "zod";
import type { AppEnv, Repo } from "../lib/repo";
import {
  createBookmark,
  deleteBookmark,
  listBookmarks,
  updateBookmark,
} from "../services/bookmarks";

const createSchema = z.object({
  url: z.url().max(2000),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).nullish(),
});

const updateSchema = z.object({
  url: z.url().max(2000).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullish(),
});

export function bookmarksRouter(repo: Repo): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const bookmarks = await listBookmarks(repo, c.get("user").id);
    return c.json({ bookmarks, total: bookmarks.length });
  });

  router.post("/", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request: a valid url and a title are required" }, 400);
    }
    const bookmark = await createBookmark(repo, c.get("user").id, {
      url: parsed.data.url,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    });
    return c.json({ bookmark }, 201);
  });

  router.patch("/:id", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request: check the submitted fields" }, 400);
    }
    const bookmark = await updateBookmark(repo, c.get("user").id, c.req.param("id"), parsed.data);
    if (!bookmark) return c.json({ error: "Bookmark not found" }, 404);
    return c.json({ bookmark });
  });

  router.delete("/:id", async (c) => {
    const deleted = await deleteBookmark(repo, c.get("user").id, c.req.param("id"));
    if (!deleted) return c.json({ error: "Bookmark not found" }, 404);
    return c.json({ ok: true });
  });

  return router;
}
