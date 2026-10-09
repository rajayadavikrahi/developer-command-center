import { Hono } from "hono";
import z from "zod";
import type { AppEnv, Repo } from "../lib/repo";
import { createNote, deleteNote, listNotes, updateNote } from "../services/notes";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(50_000).optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().max(50_000).optional(),
});

export function notesRouter(repo: Repo): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const notes = await listNotes(repo, c.get("user").id);
    return c.json({ notes, total: notes.length });
  });

  router.post("/", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request: a note title (1-200 chars) is required" }, 400);
    }
    const note = await createNote(repo, c.get("user").id, {
      title: parsed.data.title,
      content: parsed.data.content ?? "",
    });
    return c.json({ note }, 201);
  });

  router.patch("/:id", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request: check the submitted fields" }, 400);
    }
    const note = await updateNote(repo, c.get("user").id, c.req.param("id"), parsed.data);
    if (!note) return c.json({ error: "Note not found" }, 404);
    return c.json({ note });
  });

  router.delete("/:id", async (c) => {
    const deleted = await deleteNote(repo, c.get("user").id, c.req.param("id"));
    if (!deleted) return c.json({ error: "Note not found" }, 404);
    return c.json({ ok: true });
  });

  return router;
}
