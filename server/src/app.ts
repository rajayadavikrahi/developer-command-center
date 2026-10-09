import { Hono } from "hono";
import { recordActivity } from "./lib/activity";
import type { AppEnv, Repo } from "./lib/repo";
import { requireAuth } from "./middleware/auth";
import { authRouter } from "./routes/auth";
import { bookmarksRouter } from "./routes/bookmarks";
import { dashboardRouter } from "./routes/dashboard";
import { devStatsRouter } from "./routes/dev-stats";
import { healthRouter } from "./routes/health";
import { notesRouter } from "./routes/notes";
import { projectsRouter } from "./routes/projects";
import { searchRouter } from "./routes/search";
import { sessionsRouter } from "./routes/sessions";
import { tasksRouter } from "./routes/tasks";

export interface CreateAppOptions {
  secureCookies: boolean;
}

export function createApp(repo: Repo, options: CreateAppOptions): Hono<AppEnv> {
  const startedAt = Date.now();
  let requestsServed = 0;

  const app = new Hono<AppEnv>();

  app.use("/api/*", async (c, next) => {
    const t0 = performance.now();
    await next();
    requestsServed += 1;
    if (c.req.path === "/api/logs") return;
    const status = c.res.status;
    recordActivity(
      "http.request",
      `${c.req.method} ${c.req.path} → ${status}`,
      status >= 500 ? "error" : status >= 400 ? "warn" : "info",
      { durationMs: Math.round(performance.now() - t0) },
    );
  });

  app.route("/api/health", healthRouter(repo, startedAt));
  app.route("/api/auth", authRouter(repo, options.secureCookies));
  app.route(
    "/api",
    dashboardRouter(repo, { startedAt, requestCount: () => requestsServed }),
  );

  // Authenticated workspace API (projects, tasks, notes, bookmarks, sessions…).
  const workspace = new Hono<AppEnv>();
  workspace.use("*", requireAuth(repo));
  workspace.route("/projects", projectsRouter(repo));
  workspace.route("/tasks", tasksRouter(repo));
  workspace.route("/notes", notesRouter(repo));
  workspace.route("/bookmarks", bookmarksRouter(repo));
  workspace.route("/sessions", sessionsRouter(repo));
  workspace.route("/search", searchRouter(repo));
  workspace.route("/dev-stats", devStatsRouter(repo));
  app.route("/api", workspace);

  app.notFound((c) => c.json({ error: `Not found: ${c.req.method} ${c.req.path}` }, 404));

  return app;
}
