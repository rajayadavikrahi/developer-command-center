import { createApp } from "./src/app";
import { recordActivity } from "./src/lib/activity";
import { prismaRepo } from "./src/lib/prisma-repo";
import { APP_NAME, APP_VERSION } from "./src/lib/version";
import configs from "./src/config";

const app = createApp(prismaRepo, {
  secureCookies: configs.NODE_ENV === "production",
});

recordActivity(
  "server.started",
  `${APP_NAME} API running locally (Hono + Prisma + Postgres)`,
  "info",
  { port: Number(configs.port) || 3000, version: APP_VERSION },
);

export default {
  port: Number(configs.port) || 3000,
  fetch: (request: Request) => app.fetch(request),
};
