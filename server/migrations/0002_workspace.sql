-- Developer Command Center — workspace tables (Cloudflare D1 / SQLite)

CREATE TABLE "projects" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "color" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "projects_userId_idx" ON "projects" ("userId");
CREATE INDEX "projects_userId_status_idx" ON "projects" ("userId", "status");

CREATE TABLE "tasks" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'todo',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "dueAt" TEXT,
  "completedAt" TEXT,
  "createdAt" TEXT NOT NULL,
  CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE,
  CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "tasks_projectId_idx" ON "tasks" ("projectId");
CREATE INDEX "tasks_userId_status_idx" ON "tasks" ("userId", "status");

CREATE TABLE "notes" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  CONSTRAINT "notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "notes_userId_idx" ON "notes" ("userId");

CREATE TABLE "bookmarks" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TEXT NOT NULL,
  CONSTRAINT "bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "bookmarks_userId_idx" ON "bookmarks" ("userId");

CREATE TABLE "coding_sessions" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "note" TEXT,
  "startedAt" TEXT NOT NULL,
  "endedAt" TEXT,
  "createdAt" TEXT NOT NULL,
  CONSTRAINT "coding_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "coding_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL
);

CREATE INDEX "coding_sessions_userId_idx" ON "coding_sessions" ("userId");
CREATE INDEX "coding_sessions_userId_startedAt_idx" ON "coding_sessions" ("userId", "startedAt");
