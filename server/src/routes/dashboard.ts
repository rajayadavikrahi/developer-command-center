import { Hono } from "hono";
import { listActivity } from "../lib/activity";
import type { Repo } from "../lib/repo";
import { APP_VERSION } from "../lib/version";

interface DashboardContext {
  startedAt: number;
  requestCount: () => number;
}

export function dashboardRouter(repo: Repo, ctx: DashboardContext): Hono {
  const router = new Hono();

  router.get("/stats", async (c) => {
    const t0 = performance.now();
    try {
      const [users, sessions] = await Promise.all([repo.countUsers(), repo.countSessions()]);
      return c.json({
        version: APP_VERSION,
        uptimeSeconds: Math.floor((Date.now() - ctx.startedAt) / 1000),
        requestsServed: ctx.requestCount(),
        users,
        sessions,
        database: {
          kind: repo.kind,
          latencyMs: Math.round(performance.now() - t0),
        },
        serverTime: new Date().toISOString(),
      });
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : String(error) },
        503,
      );
    }
  });

  router.get("/endpoints", (c) => {
    return c.json({
      endpoints: [
        { method: "GET", path: "/api/health", auth: false, description: "Service health, database status and uptime" },
        { method: "GET", path: "/api/stats", auth: false, description: "System statistics: users, sessions, traffic" },
        { method: "GET", path: "/api/endpoints", auth: false, description: "Catalogue of every API endpoint" },
        { method: "GET", path: "/api/logs", auth: false, description: "Recent activity log entries" },
        { method: "POST", path: "/api/auth/register", auth: false, description: "Create a new account" },
        { method: "POST", path: "/api/auth/login", auth: false, description: "Sign in and start a session cookie" },
        { method: "GET", path: "/api/auth/me", auth: true, description: "Current signed-in user" },
        { method: "POST", path: "/api/auth/logout", auth: true, description: "End the current session" },
        { method: "GET", path: "/api/projects", auth: true, description: "List projects with task progress" },
        { method: "POST", path: "/api/projects", auth: true, description: "Create a project" },
        { method: "GET", path: "/api/projects/:id", auth: true, description: "Get a single project with progress" },
        { method: "PATCH", path: "/api/projects/:id", auth: true, description: "Update a project" },
        { method: "DELETE", path: "/api/projects/:id", auth: true, description: "Delete a project and its tasks" },
        { method: "GET", path: "/api/tasks?projectId=&status=", auth: true, description: "List tasks, optionally filtered" },
        { method: "POST", path: "/api/tasks", auth: true, description: "Create a task in a project" },
        { method: "PATCH", path: "/api/tasks/:id", auth: true, description: "Update a task (status, priority, due date)" },
        { method: "DELETE", path: "/api/tasks/:id", auth: true, description: "Delete a task" },
        { method: "GET", path: "/api/notes", auth: true, description: "List notes" },
        { method: "POST", path: "/api/notes", auth: true, description: "Create a note" },
        { method: "PATCH", path: "/api/notes/:id", auth: true, description: "Update a note" },
        { method: "DELETE", path: "/api/notes/:id", auth: true, description: "Delete a note" },
        { method: "GET", path: "/api/bookmarks", auth: true, description: "List bookmarks" },
        { method: "POST", path: "/api/bookmarks", auth: true, description: "Add a bookmark" },
        { method: "PATCH", path: "/api/bookmarks/:id", auth: true, description: "Update a bookmark" },
        { method: "DELETE", path: "/api/bookmarks/:id", auth: true, description: "Delete a bookmark" },
        { method: "GET", path: "/api/sessions", auth: true, description: "Focus sessions + time summary" },
        { method: "POST", path: "/api/sessions", auth: true, description: "Start a focus session" },
        { method: "POST", path: "/api/sessions/:id/end", auth: true, description: "End a focus session" },
        { method: "GET", path: "/api/search?q=", auth: true, description: "Search projects, tasks, notes, bookmarks" },
        { method: "GET", path: "/api/dev-stats", auth: true, description: "Developer statistics for the workspace" },
      ],
    });
  });

  router.get("/logs", (c) => {
    const entries = listActivity(100);
    return c.json({ entries, total: entries.length });
  });

  return router;
}
