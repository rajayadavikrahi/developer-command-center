import { Hono } from "hono";
import z from "zod";
import type { AppEnv, Repo } from "../lib/repo";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "../services/projects";
import { handleError } from "./http";

const STATUSES = ["active", "completed", "archived"] as const;

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).nullish(),
  status: z.enum(STATUSES).optional(),
  color: z.string().max(20).nullish(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).nullish(),
  status: z.enum(STATUSES).optional(),
  color: z.string().max(20).nullish(),
});

export function projectsRouter(repo: Repo): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const projects = await listProjects(repo, c.get("user").id);
    return c.json({ projects, total: projects.length });
  });

  router.post("/", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request: a project name (1-120 chars) is required" }, 400);
    }
    try {
      const project = await createProject(repo, c.get("user").id, {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        color: parsed.data.color ?? null,
      });
      return c.json({ project }, 201);
    } catch (error) {
      return handleError(c, error);
    }
  });

  router.get("/:id", async (c) => {
    const project = await getProject(repo, c.get("user").id, c.req.param("id"));
    if (!project) return c.json({ error: "Project not found" }, 404);
    return c.json({ project });
  });

  router.patch("/:id", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request: check the submitted fields" }, 400);
    }
    try {
      const project = await updateProject(repo, c.get("user").id, c.req.param("id"), parsed.data);
      if (!project) return c.json({ error: "Project not found" }, 404);
      return c.json({ project });
    } catch (error) {
      return handleError(c, error);
    }
  });

  router.delete("/:id", async (c) => {
    const deleted = await deleteProject(repo, c.get("user").id, c.req.param("id"));
    if (!deleted) return c.json({ error: "Project not found" }, 404);
    return c.json({ ok: true });
  });

  return router;
}
