import type {
  BookmarkPatch,
  BookmarkRecord,
  CodingSessionRecord,
  CreateBookmarkInput,
  CreateCodingSessionInput,
  CreateNoteInput,
  CreateProjectInput,
  CreateSessionInput,
  CreateTaskInput,
  CreateUserInput,
  EntityCounts,
  NotePatch,
  NoteRecord,
  ProjectPatch,
  ProjectRecord,
  Repo,
  SearchResults,
  TaskCountsByProject,
  TaskFilter,
  TaskPatch,
  TaskRecord,
  UserRecord,
} from "./repo";

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1Like {
  prepare(sql: string): D1Statement;
}

function toUser(row: {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
}): UserRecord {
  return { id: row.id, email: row.email, name: row.name, passwordHash: row.passwordHash };
}

type PatchValues = Record<string, string | null>;

async function updateById(
  db: D1Like,
  table: string,
  id: string,
  userId: string,
  patch: PatchValues,
): Promise<void> {
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  const sets = keys.map((key) => `"${key}" = ?`).join(", ");
  const values = keys.map((key) => patch[key]);
  await db
    .prepare(`UPDATE "${table}" SET ${sets} WHERE id = ? AND "userId" = ?`)
    .bind(...values, id, userId)
    .run();
}

export function d1Repo(db: D1Like): Repo {
  return {
    kind: "d1",

    /* -------------------- Auth -------------------- */

    async countUsers() {
      const row = await db.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
      return row?.n ?? 0;
    },

    async countSessions() {
      const row = await db.prepare("SELECT COUNT(*) AS n FROM sessions").first<{ n: number }>();
      return row?.n ?? 0;
    },

    async findUserByEmail(email: string) {
      const row = await db
        .prepare('SELECT id, email, name, "passwordHash" FROM users WHERE email = ?')
        .bind(email)
        .first<UserRecord>();
      return row ? toUser(row) : null;
    },

    async createUser(input: CreateUserInput) {
      await db
        .prepare('INSERT INTO users (id, email, name, "passwordHash") VALUES (?, ?, ?, ?)')
        .bind(input.id, input.email, input.name, input.passwordHash)
        .run();
      return toUser(input);
    },

    async createSession(input: CreateSessionInput) {
      await db
        .prepare('INSERT INTO sessions (id, "userId", "expiresAt") VALUES (?, ?, ?)')
        .bind(input.id, input.userId, input.expiresAt)
        .run();
    },

    async findActiveSession(sessionId: string, nowIso: string) {
      const row = await db
        .prepare(
          `SELECT s.id AS sessionId, s."expiresAt" AS expiresAt,
                  u.id AS id, u.email AS email, u.name AS name, u."passwordHash" AS "passwordHash"
           FROM sessions s
           JOIN users u ON u.id = s."userId"
           WHERE s.id = ? AND s."expiresAt" > ?`,
        )
        .bind(sessionId, nowIso)
        .first<{
          sessionId: string;
          expiresAt: string;
          id: string;
          email: string;
          name: string | null;
          passwordHash: string;
        }>();
      if (!row) return null;
      return {
        sessionId: row.sessionId,
        expiresAt: row.expiresAt,
        user: { id: row.id, email: row.email, name: row.name, passwordHash: row.passwordHash },
      };
    },

    async deleteSession(sessionId: string) {
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    },

    /* -------------------- Projects -------------------- */

    async listProjects(userId: string) {
      const { results } = await db
        .prepare('SELECT * FROM projects WHERE "userId" = ? ORDER BY "createdAt" DESC')
        .bind(userId)
        .all<ProjectRecord>();
      return results;
    },

    async getProject(id: string, userId: string) {
      return db
        .prepare('SELECT * FROM projects WHERE id = ? AND "userId" = ?')
        .bind(id, userId)
        .first<ProjectRecord>();
    },

    async createProject(input: CreateProjectInput) {
      await db
        .prepare(
          `INSERT INTO projects (id, "userId", name, description, status, color, "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          input.id,
          input.userId,
          input.name,
          input.description,
          input.status,
          input.color,
          input.now,
          input.now,
        )
        .run();
      return {
        id: input.id,
        userId: input.userId,
        name: input.name,
        description: input.description,
        status: input.status,
        color: input.color,
        createdAt: input.now,
        updatedAt: input.now,
      };
    },

    async updateProject(id: string, userId: string, patch: ProjectPatch) {
      const existing = await this.getProject(id, userId);
      if (!existing) return null;
      const values: PatchValues = { updatedAt: patch.updatedAt };
      if (patch.name !== undefined) values.name = patch.name;
      if (patch.description !== undefined) values.description = patch.description;
      if (patch.status !== undefined) values.status = patch.status;
      if (patch.color !== undefined) values.color = patch.color;
      await updateById(db, "projects", id, userId, values);
      return { ...existing, ...values } as ProjectRecord;
    },

    async deleteProject(id: string, userId: string) {
      const existing = await this.getProject(id, userId);
      if (!existing) return false;
      await db
        .prepare('DELETE FROM projects WHERE id = ? AND "userId" = ?')
        .bind(id, userId)
        .run();
      return true;
    },

    /* -------------------- Tasks -------------------- */

    async listTasks(userId: string, filter: TaskFilter) {
      const clauses = ['"userId" = ?'];
      const params: unknown[] = [userId];
      if (filter.projectId) {
        clauses.push('"projectId" = ?');
        params.push(filter.projectId);
      }
      if (filter.status) {
        clauses.push("status = ?");
        params.push(filter.status);
      }
      const { results } = await db
        .prepare(`SELECT * FROM tasks WHERE ${clauses.join(" AND ")} ORDER BY "createdAt" DESC`)
        .bind(...params)
        .all<TaskRecord>();
      return results;
    },

    async getTask(id: string, userId: string) {
      return db
        .prepare('SELECT * FROM tasks WHERE id = ? AND "userId" = ?')
        .bind(id, userId)
        .first<TaskRecord>();
    },

    async createTask(input: CreateTaskInput) {
      await db
        .prepare(
          `INSERT INTO tasks (id, "projectId", "userId", title, description, status, priority, "dueAt", "completedAt", "createdAt")
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          input.id,
          input.projectId,
          input.userId,
          input.title,
          input.description,
          input.status,
          input.priority,
          input.dueAt,
          input.completedAt,
          input.now,
        )
        .run();
      return {
        id: input.id,
        projectId: input.projectId,
        userId: input.userId,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        dueAt: input.dueAt,
        completedAt: input.completedAt,
        createdAt: input.now,
      };
    },

    async updateTask(id: string, userId: string, patch: TaskPatch) {
      const existing = await db
        .prepare('SELECT * FROM tasks WHERE id = ? AND "userId" = ?')
        .bind(id, userId)
        .first<TaskRecord>();
      if (!existing) return null;
      const values: PatchValues = {};
      if (patch.title !== undefined) values.title = patch.title;
      if (patch.description !== undefined) values.description = patch.description;
      if (patch.status !== undefined) values.status = patch.status;
      if (patch.priority !== undefined) values.priority = patch.priority;
      if (patch.dueAt !== undefined) values.dueAt = patch.dueAt;
      if (patch.completedAt !== undefined) values.completedAt = patch.completedAt;
      await updateById(db, "tasks", id, userId, values);
      return { ...existing, ...values } as TaskRecord;
    },

    async deleteTask(id: string, userId: string) {
      const existing = await db
        .prepare('SELECT id FROM tasks WHERE id = ? AND "userId" = ?')
        .bind(id, userId)
        .first<{ id: string }>();
      if (!existing) return false;
      await db.prepare('DELETE FROM tasks WHERE id = ? AND "userId" = ?').bind(id, userId).run();
      return true;
    },

    async taskCountsByProject(userId: string) {
      const { results } = await db
        .prepare(
          `SELECT "projectId" AS projectId, status, COUNT(*) AS n
           FROM tasks WHERE "userId" = ?
           GROUP BY "projectId", status`,
        )
        .bind(userId)
        .all<{ projectId: string; status: string; n: number }>();
      const counts = new Map<string, TaskCountsByProject>();
      for (const row of results) {
        const entry = counts.get(row.projectId) ?? {
          projectId: row.projectId,
          total: 0,
          todo: 0,
          inProgress: 0,
          done: 0,
        };
        entry.total += row.n;
        if (row.status === "done") entry.done += row.n;
        else if (row.status === "in_progress") entry.inProgress += row.n;
        else entry.todo += row.n;
        counts.set(row.projectId, entry);
      }
      return [...counts.values()];
    },

    /* -------------------- Notes -------------------- */

    async listNotes(userId: string) {
      const { results } = await db
        .prepare('SELECT * FROM notes WHERE "userId" = ? ORDER BY "updatedAt" DESC')
        .bind(userId)
        .all<NoteRecord>();
      return results;
    },

    async createNote(input: CreateNoteInput) {
      await db
        .prepare(
          `INSERT INTO notes (id, "userId", title, content, "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(input.id, input.userId, input.title, input.content, input.now, input.now)
        .run();
      return {
        id: input.id,
        userId: input.userId,
        title: input.title,
        content: input.content,
        createdAt: input.now,
        updatedAt: input.now,
      };
    },

    async updateNote(id: string, userId: string, patch: NotePatch) {
      const existing = await db
        .prepare('SELECT * FROM notes WHERE id = ? AND "userId" = ?')
        .bind(id, userId)
        .first<NoteRecord>();
      if (!existing) return null;
      const values: PatchValues = { updatedAt: patch.updatedAt };
      if (patch.title !== undefined) values.title = patch.title;
      if (patch.content !== undefined) values.content = patch.content;
      await updateById(db, "notes", id, userId, values);
      return { ...existing, ...values } as NoteRecord;
    },

    async deleteNote(id: string, userId: string) {
      const existing = await db
        .prepare('SELECT id FROM notes WHERE id = ? AND "userId" = ?')
        .bind(id, userId)
        .first<{ id: string }>();
      if (!existing) return false;
      await db.prepare('DELETE FROM notes WHERE id = ? AND "userId" = ?').bind(id, userId).run();
      return true;
    },

    /* -------------------- Bookmarks -------------------- */

    async listBookmarks(userId: string) {
      const { results } = await db
        .prepare('SELECT * FROM bookmarks WHERE "userId" = ? ORDER BY "createdAt" DESC')
        .bind(userId)
        .all<BookmarkRecord>();
      return results;
    },

    async createBookmark(input: CreateBookmarkInput) {
      await db
        .prepare(
          `INSERT INTO bookmarks (id, "userId", url, title, description, "createdAt")
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(input.id, input.userId, input.url, input.title, input.description, input.now)
        .run();
      return {
        id: input.id,
        userId: input.userId,
        url: input.url,
        title: input.title,
        description: input.description,
        createdAt: input.now,
      };
    },

    async updateBookmark(id: string, userId: string, patch: BookmarkPatch) {
      const existing = await db
        .prepare('SELECT * FROM bookmarks WHERE id = ? AND "userId" = ?')
        .bind(id, userId)
        .first<BookmarkRecord>();
      if (!existing) return null;
      const values: PatchValues = {};
      if (patch.url !== undefined) values.url = patch.url;
      if (patch.title !== undefined) values.title = patch.title;
      if (patch.description !== undefined) values.description = patch.description;
      await updateById(db, "bookmarks", id, userId, values);
      return { ...existing, ...values } as BookmarkRecord;
    },

    async deleteBookmark(id: string, userId: string) {
      const existing = await db
        .prepare('SELECT id FROM bookmarks WHERE id = ? AND "userId" = ?')
        .bind(id, userId)
        .first<{ id: string }>();
      if (!existing) return false;
      await db
        .prepare('DELETE FROM bookmarks WHERE id = ? AND "userId" = ?')
        .bind(id, userId)
        .run();
      return true;
    },

    /* -------------------- Coding sessions -------------------- */

    async listCodingSessions(userId: string, limit: number) {
      const { results } = await db
        .prepare(
          'SELECT * FROM coding_sessions WHERE "userId" = ? ORDER BY "startedAt" DESC LIMIT ?',
        )
        .bind(userId, limit)
        .all<CodingSessionRecord>();
      return results;
    },

    async getCodingSession(id: string, userId: string) {
      return db
        .prepare('SELECT * FROM coding_sessions WHERE id = ? AND "userId" = ?')
        .bind(id, userId)
        .first<CodingSessionRecord>();
    },

    async createCodingSession(input: CreateCodingSessionInput) {
      await db
        .prepare(
          `INSERT INTO coding_sessions (id, "userId", "projectId", note, "startedAt", "endedAt", "createdAt")
           VALUES (?, ?, ?, ?, ?, NULL, ?)`,
        )
        .bind(input.id, input.userId, input.projectId, input.note, input.startedAt, input.startedAt)
        .run();
      return {
        id: input.id,
        userId: input.userId,
        projectId: input.projectId,
        note: input.note,
        startedAt: input.startedAt,
        endedAt: null,
        createdAt: input.startedAt,
      };
    },

    async endCodingSession(id: string, userId: string, endedAt: string) {
      const existing = await this.getCodingSession(id, userId);
      if (!existing) return null;
      await updateById(db, "coding_sessions", id, userId, { endedAt });
      return { ...existing, endedAt };
    },

    async activeCodingSession(userId: string) {
      return db
        .prepare(
          `SELECT * FROM coding_sessions
           WHERE "userId" = ? AND "endedAt" IS NULL
           ORDER BY "startedAt" DESC LIMIT 1`,
        )
        .bind(userId)
        .first<CodingSessionRecord>();
    },

    /* -------------------- Analytics -------------------- */

    async entityCounts(userId: string, weekAgoIso: string): Promise<EntityCounts> {
      const [projects, activeProjects, notes, bookmarks, tasks] = await Promise.all([
        db.prepare('SELECT COUNT(*) AS n FROM projects WHERE "userId" = ?').bind(userId).first<{ n: number }>(),
        db
          .prepare('SELECT COUNT(*) AS n FROM projects WHERE "userId" = ? AND status = \'active\'')
          .bind(userId)
          .first<{ n: number }>(),
        db.prepare('SELECT COUNT(*) AS n FROM notes WHERE "userId" = ?').bind(userId).first<{ n: number }>(),
        db.prepare('SELECT COUNT(*) AS n FROM bookmarks WHERE "userId" = ?').bind(userId).first<{ n: number }>(),
        db
          .prepare('SELECT status, "completedAt" AS completedAt FROM tasks WHERE "userId" = ?')
          .bind(userId)
          .all<{ status: string; completedAt: string | null }>(),
      ]);

      let tasksTodo = 0;
      let tasksInProgress = 0;
      let tasksDone = 0;
      let tasksDoneLast7Days = 0;
      for (const task of tasks.results) {
        if (task.status === "done") {
          tasksDone += 1;
          if (task.completedAt && task.completedAt >= weekAgoIso) tasksDoneLast7Days += 1;
        } else if (task.status === "in_progress") tasksInProgress += 1;
        else tasksTodo += 1;
      }

      return {
        projects: projects?.n ?? 0,
        activeProjects: activeProjects?.n ?? 0,
        tasks: tasks.results.length,
        tasksTodo,
        tasksInProgress,
        tasksDone,
        tasksDoneLast7Days,
        notes: notes?.n ?? 0,
        bookmarks: bookmarks?.n ?? 0,
      };
    },

    async endedCodingSessions(userId: string) {
      const { results } = await db
        .prepare(
          'SELECT "startedAt" AS startedAt, "endedAt" AS endedAt FROM coding_sessions WHERE "userId" = ? AND "endedAt" IS NOT NULL',
        )
        .bind(userId)
        .all<{ startedAt: string; endedAt: string }>();
      return results;
    },

    async search(userId: string, term: string, limit: number): Promise<SearchResults> {
      const pattern = `%${term.toLowerCase()}%`;
      const [projects, tasks, notes, bookmarks] = await Promise.all([
        db
          .prepare('SELECT * FROM projects WHERE "userId" = ? AND lower(name) LIKE ? ORDER BY "createdAt" DESC LIMIT ?')
          .bind(userId, pattern, limit)
          .all<ProjectRecord>(),
        db
          .prepare('SELECT * FROM tasks WHERE "userId" = ? AND lower(title) LIKE ? ORDER BY "createdAt" DESC LIMIT ?')
          .bind(userId, pattern, limit)
          .all<TaskRecord>(),
        db
          .prepare('SELECT * FROM notes WHERE "userId" = ? AND lower(title) LIKE ? ORDER BY "updatedAt" DESC LIMIT ?')
          .bind(userId, pattern, limit)
          .all<NoteRecord>(),
        db
          .prepare('SELECT * FROM bookmarks WHERE "userId" = ? AND lower(title) LIKE ? ORDER BY "createdAt" DESC LIMIT ?')
          .bind(userId, pattern, limit)
          .all<BookmarkRecord>(),
      ]);
      return {
        projects: projects.results,
        tasks: tasks.results,
        notes: notes.results,
        bookmarks: bookmarks.results,
      };
    },
  };
}
