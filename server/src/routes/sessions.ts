import { Hono } from "hono";
import z from "zod";
import type { AppEnv, Repo } from "../lib/repo";
import { endSession, listSessions, startSession } from "../services/sessions";
import { handleError } from "./http";

const startSchema = z.object({
  projectId: z.union([z.uuid(), z.null()]).optional(),
  note: z.string().max(500).nullish(),
});

export function sessionsRouter(repo: Repo): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const data = await listSessions(repo, c.get("user").id);
    return c.json(data);
  });

  router.post("/", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = startSchema.safeParse(body && typeof body === "object" ? body : {});
    if (!parsed.success) {
      return c.json({ error: "Invalid request: check projectId and note" }, 400);
    }
    try {
      const session = await startSession(repo, c.get("user").id, {
        projectId: parsed.data.projectId ?? null,
        note: parsed.data.note ?? null,
      });
      return c.json({ session }, 201);
    } catch (error) {
      return handleError(c, error);
    }
  });

  router.post("/:id/end", async (c) => {
    try {
      const session = await endSession(repo, c.get("user").id, c.req.param("id"));
      if (!session) return c.json({ error: "Session not found" }, 404);
      return c.json({ session });
    } catch (error) {
      return handleError(c, error);
    }
  });

  return router;
}
