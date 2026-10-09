import type { Hono } from "hono";
import { createApp } from "./app";
import { recordActivity } from "./lib/activity";
import type { D1Like } from "./lib/d1-repo";
import { d1Repo } from "./lib/d1-repo";
import type { AppEnv } from "./lib/repo";
import { APP_NAME, APP_VERSION } from "./lib/version";

export interface Env {
  DB: D1Like;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const apps = new WeakMap<object, Hono<AppEnv>>();

function appFor(env: Env): Hono<AppEnv> {
  const key = env.DB as unknown as object;
  let app = apps.get(key);
  if (!app) {
    // First request for this isolate — logging must happen inside a handler
    // (workerd forbids crypto/random in global scope).
    recordActivity(
      "server.started",
      `${APP_NAME} Worker isolate started (Hono + Cloudflare D1)`,
      "info",
      { version: APP_VERSION },
    );
    app = createApp(d1Repo(env.DB), { secureCookies: true });
    apps.set(key, app);
  }
  return app;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return appFor(env).fetch(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
