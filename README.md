# Developer Command Center

A private developer workspace — track **projects & tasks**, capture **notes**, save **bookmarks**, run **focus sessions**, and watch your **developer stats** — served by one Hono API from a React dashboard. Runs locally on PostgreSQL (Prisma 8) and deploys to Cloudflare Workers backed by D1.

**Live demo:** https://developer-command-center.biratnagar.workers.dev

![Developer Command Center demo](img/demo2.png)

## Features

- **Projects** with per-project task boards and automatic progress (todo / in-progress / done).
- **Tasks** with status, priority and due dates; completing a task stamps `completedAt`.
- **Notes** — a fast markdown-style scratchpad for ideas and snippets.
- **Bookmarks** — keep useful links one click away.
- **Focus sessions** — server-side timer that keeps running until you stop it, with time summaries.
- **Developer stats** — completion rate, focus time, 7-day trends.
- **Full-text search** across projects, tasks, notes and bookmarks.
- **Email + password auth** with an httpOnly session cookie (7-day TTL, Secure in production).
- **Live activity log** and an **API tester** for exploring the backend.

## Tech stack

| Layer     | Tech |
| --------- | ---- |
| Frontend  | React 19, Tailwind CSS v4, Radix/shadcn UI, lucide-react — built with Bun |
| Backend   | Hono, Zod, TypeScript — the same code runs on Bun and on Cloudflare Workers |
| Data (local) | PostgreSQL ≥ 15 via Prisma 8 (`@prisma/orm-postgres`) |
| Data (edge)  | Cloudflare D1 (SQLite) |
| Deploy    | Cloudflare Workers (static assets + API in one Worker) |

## Architecture

Every request flows through a strict, single-direction pipeline so transport, validation, business logic and data access stay independent:

```
Route → Validation (Zod) → Service → Repository
```

- **Routes** (`server/src/routes`) parse/validate input and map domain errors to HTTP status codes.
- **Services** (`server/src/services`) hold business logic and return DTOs.
- **Repositories** (`server/src/lib/*-repo.ts`) implement one `Repo` interface twice: `prisma-repo` (PostgreSQL) and `d1-repo` (D1/SQLite). Swapping backends needs no service changes.

```
notion/
├── client/                 # React frontend (Bun + Tailwind)
│   └── src/{views,components,lib}
├── server/                 # Hono API
│   ├── src/{routes,services,lib,middleware,prisma}
│   └── migrations/         # D1 (SQLite) migrations
├── img/                    # Demo screenshots
└── wrangler.jsonc          # Cloudflare Worker + D1 config
```

## Prerequisites

- **[Bun](https://bun.com)** ≥ 1.3 — runtime, package manager and bundler.
- **Node.js 22** — required only for the `wrangler` CLI (Cloudflare deploy).
- **PostgreSQL ≥ 15** — for local development.
- *(Optional)* a **Cloudflare account** for deploying to Workers + D1.

## Install dependencies

Install each package once:

```bash
# Backend
cd server
bun install

# Frontend (from the repo root)
cd ../client
bun install
```

## Configure the backend

```bash
cd server
cp .env.example .env
```

Set `DATABASE_URL` in `server/.env` to your Postgres connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

Then create the database schema (Prisma 8 emits a typed ORM client from the contract):

```bash
bun run contract:emit        # generate the typed ORM client
bunx prisma db update --dry-run   # preview changes
bunx prisma db update             # apply changes
```

## Run locally

Start the two processes in separate terminals:

```bash
# Terminal 1 — API on http://localhost:3000
cd server
bun run dev

# Terminal 2 — frontend on http://localhost:5173 (proxies /api/* to :3000)
cd client
bun run dev
```

Open http://localhost:5173 and register an account.

## Deploy to Cloudflare (Workers + D1)

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"   # Node 22 for wrangler (macOS/Homebrew)

bunx wrangler d1 migrations apply developer-command-center --remote   # apply schema
cd client && bun run build && cd ..                                    # build the SPA
bunx wrangler deploy                                                   # ship Worker + assets + API
```

The Worker serves the built frontend as assets and routes `/api/*` to the Hono app, which talks to D1 through `d1-repo`.

## API overview

All `/api/*` workspace routes require a session cookie; unauthenticated calls return `401`.

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/api/auth/register` · `/api/auth/login` · `/api/auth/logout` | Auth |
| `GET`  | `/api/auth/me` | Current user |
| `GET/POST` | `/api/projects` | List / create projects (with progress) |
| `GET/PATCH/DELETE` | `/api/projects/:id` | Project detail / update / delete |
| `GET/POST` | `/api/tasks` | List (filterable) / create tasks |
| `PATCH/DELETE` | `/api/tasks/:id` | Update / delete a task |
| `GET/POST` | `/api/notes` | Notes CRUD |
| `GET/POST` | `/api/bookmarks` | Bookmarks CRUD |
| `GET/POST` | `/api/sessions` · `POST /api/sessions/:id/end` | Focus sessions |
| `GET`  | `/api/search?q=` | Search the workspace |
| `GET`  | `/api/dev-stats` | Developer statistics |
| `GET`  | `/api/health` · `/api/stats` · `/api/endpoints` · `/api/logs` | Ops & discovery |

## Demo accounts

| Environment | Email | Password |
| ----------- | ----- | -------- |
| Cloudflare (D1) | `prod@dcc.dev` | `productionpw1` |

## License

MIT
