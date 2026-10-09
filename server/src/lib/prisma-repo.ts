import type { TimestamptzString } from "@prisma/orm-postgres/target/codec-types";
import { db } from "../prisma/db";
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

/**
 * Prisma 8's timestamptz-string codec expects an ISO-8601 string branded with
 * the column precision. Plain ISO strings (what `Date#toISOString` produces)
 * are exactly what the codec parses at runtime, so this narrows the type only.
 */
type Tz = TimestamptzString<3>;
const tz = (value: string): Tz => value as Tz;

/**
 * Postgres renders timestamptz columns as `2026-10-09 16:20:53.174+00`, which
 * is not ISO-8601. Normalise every timestamp the repository hands back so the
 * service/transport layers always deal in `Date#toISOString()` values.
 */
function iso(value: string): string {
  if (value.includes("T")) return value;
  let normalized = value.replace(" ", "T");
  if (/[+-]\d{2}$/.test(normalized)) normalized = `${normalized}:00`;
  else if (!normalized.endsWith("Z")) normalized = `${normalized}Z`;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : value;
}

const orm = db.orm.dcc;

/* ------------------------------------------------------------------ */
/* Row mappers                                                         */
/* ------------------------------------------------------------------ */

function toUser(row: {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
}): UserRecord {
  return { id: row.id, email: row.email, name: row.name, passwordHash: row.passwordHash };
}

type ProjectRow = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
};

function toProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    status: row.status,
    color: row.color,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

type TaskRow = {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

function toTask(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueAt: row.dueAt === null ? null : iso(row.dueAt),
    completedAt: row.completedAt === null ? null : iso(row.completedAt),
    createdAt: iso(row.createdAt),
  };
}

type NoteRow = {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function toNote(row: NoteRow): NoteRecord {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    content: row.content,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

type BookmarkRow = {
  id: string;
  userId: string;
  url: string;
  title: string;
  description: string | null;
  createdAt: string;
};

function toBookmark(row: BookmarkRow): BookmarkRecord {
  return {
    id: row.id,
    userId: row.userId,
    url: row.url,
    title: row.title,
    description: row.description,
    createdAt: iso(row.createdAt),
  };
}

type CodingSessionRow = {
  id: string;
  userId: string;
  projectId: string | null;
  note: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
};

function toCodingSession(row: CodingSessionRow): CodingSessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    note: row.note,
    startedAt: iso(row.startedAt),
    endedAt: row.endedAt === null ? null : iso(row.endedAt),
    createdAt: iso(row.createdAt),
  };
}

/* ------------------------------------------------------------------ */
/* Repository                                                          */
/* ------------------------------------------------------------------ */

export const prismaRepo: Repo = {
  kind: "postgres",

  async countUsers() {
    return (await orm.User.aggregate((a) => ({ n: a.count() }))).n;
  },

  async countSessions() {
    return (await orm.Session.aggregate((a) => ({ n: a.count() }))).n;
  },

  async findUserByEmail(email: string) {
    const row = await orm.User.where({ email }).first();
    return row ? toUser(row) : null;
  },

  async createUser(input: CreateUserInput) {
    const row = await orm.User.create(input);
    return toUser(row);
  },

  async createSession(input: CreateSessionInput) {
    await orm.Session.create({
      id: input.id,
      userId: input.userId,
      expiresAt: tz(input.expiresAt),
    });
  },

  async findActiveSession(sessionId: string, nowIso: string) {
    const row = await orm.Session.where({ id: sessionId })
      .where((s) => s.expiresAt.gt(tz(nowIso)))
      .include("user")
      .first();
    if (!row) return null;
    return { sessionId: row.id, expiresAt: iso(row.expiresAt), user: toUser(row.user) };
  },

  async deleteSession(sessionId: string) {
    await orm.Session.where({ id: sessionId }).delete();
  },

  /* -------------------- Projects -------------------- */

  async listProjects(userId: string) {
    const rows = await orm.Project.where({ userId })
      .orderBy((p) => p.createdAt.desc())
      .all();
    return rows.map(toProject);
  },

  async getProject(id: string, userId: string) {
    const row = await orm.Project.where({ id, userId }).first();
    return row ? toProject(row) : null;
  },

  async createProject(input: CreateProjectInput) {
    const row = await orm.Project.create({
      id: input.id,
      userId: input.userId,
      name: input.name,
      description: input.description,
      status: input.status,
      color: input.color,
      createdAt: tz(input.now),
      updatedAt: tz(input.now),
    });
    return toProject(row);
  },

  async updateProject(id: string, userId: string, patch: ProjectPatch) {
    const row = await orm.Project.where({ id, userId }).update({
      updatedAt: tz(patch.updatedAt),
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
    });
    return row ? toProject(row) : null;
  },

  async deleteProject(id: string, userId: string) {
    const existing = await orm.Project.where({ id, userId }).first();
    if (!existing) return false;
    await orm.Project.where({ id, userId }).delete();
    return true;
  },

  /* -------------------- Tasks -------------------- */

  async listTasks(userId: string, filter: TaskFilter) {
    const rows = await orm.Task.where({
      userId,
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    })
      .orderBy((t) => t.createdAt.desc())
      .all();
    return rows.map(toTask);
  },

  async getTask(id: string, userId: string) {
    const row = await orm.Task.where({ id, userId }).first();
    return row ? toTask(row) : null;
  },

  async createTask(input: CreateTaskInput) {
    const row = await orm.Task.create({
      id: input.id,
      projectId: input.projectId,
      userId: input.userId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueAt: input.dueAt === null ? null : tz(input.dueAt),
      completedAt: input.completedAt === null ? null : tz(input.completedAt),
      createdAt: tz(input.now),
    });
    return toTask(row);
  },

  async updateTask(id: string, userId: string, patch: TaskPatch) {
    const row = await orm.Task.where({ id, userId }).update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt === null ? null : tz(patch.dueAt) } : {}),
      ...(patch.completedAt !== undefined
        ? { completedAt: patch.completedAt === null ? null : tz(patch.completedAt) }
        : {}),
    });
    return row ? toTask(row) : null;
  },

  async deleteTask(id: string, userId: string) {
    const existing = await orm.Task.where({ id, userId }).first();
    if (!existing) return false;
    await orm.Task.where({ id, userId }).delete();
    return true;
  },

  async taskCountsByProject(userId: string) {
    const rows = await orm.Task.select("projectId", "status").where({ userId }).all();
    const counts = new Map<string, TaskCountsByProject>();
    for (const row of rows) {
      const entry = counts.get(row.projectId) ?? {
        projectId: row.projectId,
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
      };
      entry.total += 1;
      if (row.status === "done") entry.done += 1;
      else if (row.status === "in_progress") entry.inProgress += 1;
      else entry.todo += 1;
      counts.set(row.projectId, entry);
    }
    return [...counts.values()];
  },

  /* -------------------- Notes -------------------- */

  async listNotes(userId: string) {
    const rows = await orm.Note.where({ userId }).orderBy((n) => n.updatedAt.desc()).all();
    return rows.map(toNote);
  },

  async createNote(input: CreateNoteInput) {
    const row = await orm.Note.create({
      id: input.id,
      userId: input.userId,
      title: input.title,
      content: input.content,
      createdAt: tz(input.now),
      updatedAt: tz(input.now),
    });
    return toNote(row);
  },

  async updateNote(id: string, userId: string, patch: NotePatch) {
    const row = await orm.Note.where({ id, userId }).update({
      updatedAt: tz(patch.updatedAt),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
    });
    return row ? toNote(row) : null;
  },

  async deleteNote(id: string, userId: string) {
    const existing = await orm.Note.where({ id, userId }).first();
    if (!existing) return false;
    await orm.Note.where({ id, userId }).delete();
    return true;
  },

  /* -------------------- Bookmarks -------------------- */

  async listBookmarks(userId: string) {
    const rows = await orm.Bookmark.where({ userId })
      .orderBy((b) => b.createdAt.desc())
      .all();
    return rows.map(toBookmark);
  },

  async createBookmark(input: CreateBookmarkInput) {
    const row = await orm.Bookmark.create({
      id: input.id,
      userId: input.userId,
      url: input.url,
      title: input.title,
      description: input.description,
      createdAt: tz(input.now),
    });
    return toBookmark(row);
  },

  async updateBookmark(id: string, userId: string, patch: BookmarkPatch) {
    const row = await orm.Bookmark.where({ id, userId }).update({
      ...(patch.url !== undefined ? { url: patch.url } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
    });
    return row ? toBookmark(row) : null;
  },

  async deleteBookmark(id: string, userId: string) {
    const existing = await orm.Bookmark.where({ id, userId }).first();
    if (!existing) return false;
    await orm.Bookmark.where({ id, userId }).delete();
    return true;
  },

  /* -------------------- Coding sessions -------------------- */

  async listCodingSessions(userId: string, limit: number) {
    const rows = await orm.CodingSession.where({ userId })
      .orderBy((s) => s.startedAt.desc())
      .limit(limit)
      .all();
    return rows.map(toCodingSession);
  },

  async getCodingSession(id: string, userId: string) {
    const row = await orm.CodingSession.where({ id, userId }).first();
    return row ? toCodingSession(row) : null;
  },

  async createCodingSession(input: CreateCodingSessionInput) {
    const row = await orm.CodingSession.create({
      id: input.id,
      userId: input.userId,
      projectId: input.projectId,
      note: input.note,
      startedAt: tz(input.startedAt),
      endedAt: null,
    });
    return toCodingSession(row);
  },

  async endCodingSession(id: string, userId: string, endedAt: string) {
    const row = await orm.CodingSession.where({ id, userId }).update({ endedAt: tz(endedAt) });
    return row ? toCodingSession(row) : null;
  },

  async activeCodingSession(userId: string) {
    const row = await orm.CodingSession.where({ userId })
      .where((s) => s.endedAt.isNull())
      .orderBy((s) => s.startedAt.desc())
      .first();
    return row ? toCodingSession(row) : null;
  },

  /* -------------------- Analytics -------------------- */

  async entityCounts(userId: string, weekAgoIso: string): Promise<EntityCounts> {
    const [projects, activeProjects, tasks, notes, bookmarks] = await Promise.all([
      orm.Project.where({ userId }).aggregate((a) => ({ n: a.count() })),
      orm.Project.where({ userId, status: "active" }).aggregate((a) => ({ n: a.count() })),
      orm.Task.select("status", "completedAt").where({ userId }).all(),
      orm.Note.where({ userId }).aggregate((a) => ({ n: a.count() })),
      orm.Bookmark.where({ userId }).aggregate((a) => ({ n: a.count() })),
    ]);

    let tasksTodo = 0;
    let tasksInProgress = 0;
    let tasksDone = 0;
    let tasksDoneLast7Days = 0;
    for (const task of tasks) {
      if (task.status === "done") {
        tasksDone += 1;
        if (task.completedAt && iso(task.completedAt) >= weekAgoIso) tasksDoneLast7Days += 1;
      } else if (task.status === "in_progress") tasksInProgress += 1;
      else tasksTodo += 1;
    }

    return {
      projects: projects.n,
      activeProjects: activeProjects.n,
      tasks: tasks.length,
      tasksTodo,
      tasksInProgress,
      tasksDone,
      tasksDoneLast7Days,
      notes: notes.n,
      bookmarks: bookmarks.n,
    };
  },

  async endedCodingSessions(userId: string) {
    const rows = await orm.CodingSession.select("startedAt", "endedAt")
      .where({ userId })
      .where((s) => s.endedAt.isNotNull())
      .all();
    return rows.map((row) => ({ startedAt: iso(row.startedAt), endedAt: iso(row.endedAt as string) }));
  },

  async search(userId: string, term: string, limit: number): Promise<SearchResults> {
    const pattern = `%${term}%`;
    const [projects, tasks, notes, bookmarks] = await Promise.all([
      orm.Project.where({ userId }).where((p) => p.name.ilike(pattern)).limit(limit).all(),
      orm.Task.where({ userId }).where((t) => t.title.ilike(pattern)).limit(limit).all(),
      orm.Note.where({ userId }).where((n) => n.title.ilike(pattern)).limit(limit).all(),
      orm.Bookmark.where({ userId }).where((b) => b.title.ilike(pattern)).limit(limit).all(),
    ]);
    return {
      projects: projects.map(toProject),
      tasks: tasks.map(toTask),
      notes: notes.map(toNote),
      bookmarks: bookmarks.map(toBookmark),
    };
  },
};
