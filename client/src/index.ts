import { serve } from "bun";
import index from "./index.html";

const API_TARGET = process.env.API_TARGET ?? "http://localhost:3000";

const server = serve({
  port: Number(process.env.PORT ?? 5173),
  routes: {
    // Proxy API calls to the backend during local development so the
    // browser stays same-origin (cookies, no CORS).
    "/api/*": async req => {
      const url = new URL(req.url);
      try {
        const headers = new Headers(req.headers);
        headers.delete("host");
        headers.delete("content-length");
        headers.delete("accept-encoding");

        const upstream = await fetch(API_TARGET + url.pathname + url.search, {
          method: req.method,
          headers,
          body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
          redirect: "manual",
        });

        return new Response(upstream.body, {
          status: upstream.status,
          headers: upstream.headers,
        });
      } catch (error) {
        return Response.json(
          { error: `API proxy error — is the backend running on ${API_TARGET}? (${String(error)})` },
          { status: 502 },
        );
      }
    },

    // Serve index.html for all unmatched routes.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Developer Command Center (frontend) running at ${server.url}`);
console.log(`   → proxying /api/* to ${API_TARGET}`);
