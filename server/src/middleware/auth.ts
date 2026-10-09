import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv, Repo } from "../lib/repo";

export const SESSION_COOKIE = "sessionId";

export function requireAuth(repo: Repo) {
  return async (c: Context<AppEnv>, next: Next) => {
    const sessionId = getCookie(c, SESSION_COOKIE);
    if (!sessionId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const active = await repo.findActiveSession(sessionId, new Date().toISOString());
    if (!active) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", active.user);
    await next();
  };
}
