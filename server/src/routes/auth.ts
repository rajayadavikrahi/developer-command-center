import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import z from "zod";
import { recordActivity } from "../lib/activity";
import { hashPassword, verifyPassword } from "../lib/password";
import type { AppEnv, Repo, UserRecord } from "../lib/repo";
import { requireAuth, SESSION_COOKIE } from "../middleware/auth";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.email(),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});

function publicUser(user: UserRecord) {
  return { id: user.id, email: user.email, name: user.name };
}

export function authRouter(repo: Repo, secureCookies: boolean): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.post("/register", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request: name, email and a password of 8+ characters are required" }, 400);
    }

    const { name, email, password } = parsed.data;
    const existing = await repo.findUserByEmail(email);
    if (existing) {
      return c.json({ error: "An account with this email already exists" }, 409);
    }

    const user = await repo.createUser({
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash: await hashPassword(password),
    });

    recordActivity("auth.register", `New account created: ${email}`, "info");
    return c.json({ user: publicUser(user) }, 201);
  });

  router.post("/login", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request: a valid email and password are required" }, 400);
    }

    const { email, password } = parsed.data;
    const user = await repo.findUserByEmail(email);
    const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !passwordOk) {
      recordActivity("auth.login_failed", `Failed sign-in attempt for ${email}`, "warn");
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await repo.createSession({ id: sessionId, userId: user.id, expiresAt: expiresAt.toISOString() });

    setCookie(c, SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "Lax",
      path: "/",
      expires: expiresAt,
    });

    recordActivity("auth.login", `Signed in: ${email}`, "info");
    return c.json({ user: publicUser(user) });
  });

  router.get("/me", requireAuth(repo), (c) => {
    return c.json({ user: publicUser(c.get("user")) });
  });

  router.post("/logout", requireAuth(repo), async (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE);
    if (sessionId) await repo.deleteSession(sessionId);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    recordActivity("auth.logout", `Signed out: ${c.get("user").email}`, "info");
    return c.json({ ok: true });
  });

  return router;
}
