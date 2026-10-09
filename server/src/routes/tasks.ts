import { Hono } from "hono";
import z from "zod";
import type { AppEnv, Repo } from "../lib/repo";
import { createTask, deleteTask, listTasks, updateTask } from "../services/tasks";
import { handleError } from "./http";

const STATUSES = ["todo", "in_progress", "done"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

const createSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).nullish(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z.union([z.iso.datetime(), z.null()]).optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(4000).nullish(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z.union([z.iso.datetime(), z.null()]).optional(),
});

export function tasksRouter(repo: Repo): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const projectId = c.req.query("projectId");
    const status = c.req.query("status");
    const tasks = await listTasks(repo, c.get("user").id, {
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
    });
    return c.json({ tasks, total: tasks.length });
  });

  router.post("/", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request: projectId and a title (1-200 chars) are required" }, 400);
    }
    try {
      const task = await createTask(repo, c.get("user").id, {
        projectId: parsed.data.projectId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        priority: parsed.data.priority,
        dueAt: parsed.data.dueAt ?? null,
      });
      return c.json({ task }, 201);
    } catch (error) {
      return handleError(c, error);
    }
  });

  router.patch("/:id", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request: check the submitted fields" }, 400);
    }
    try {
      const task = await updateTask(repo, c.get("user").id, c.req.param("id"), parsed.data);
      if (!task) return c.json({ error: "Task not found" }, 404);
      return c.json({ task });
    } catch (error) {
      return handleError(c, error);
    }
  });

  router.delete("/:id", async (c) => {
    const deleted = await deleteTask(repo, c.get("user").id, c.req.param("id"));
    if (!deleted) return c.json({ error: "Task not found" }, 404);
    return c.json({ ok: true });
  });

  return router;
}
