export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
}

export interface ActiveSession {
  sessionId: string;
  expiresAt: string;
  user: UserRecord;
}

export interface CreateUserInput {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
}

export interface CreateSessionInput {
  id: string;
  userId: string;
  expiresAt: string;
}

/* ------------------------------------------------------------------ */
/* Workspace records                                                   */
/* ------------------------------------------------------------------ */

export interface ProjectRecord {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
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
}

export interface NoteRecord {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkRecord {
  id: string;
  userId: string;
  url: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface CodingSessionRecord {
  id: string;
  userId: string;
  projectId: string | null;
  note: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Inputs / patches                                                    */
/* ------------------------------------------------------------------ */

export interface CreateProjectInput {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  now: string;
}

export interface ProjectPatch {
  name?: string;
  description?: string | null;
  status?: string;
  color?: string | null;
  updatedAt: string;
}

export interface CreateTaskInput {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  completedAt: string | null;
  now: string;
}

export interface TaskPatch {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueAt?: string | null;
  completedAt?: string | null;
}

export interface CreateNoteInput {
  id: string;
  userId: string;
  title: string;
  content: string;
  now: string;
}

export interface NotePatch {
  title?: string;
  content?: string;
  updatedAt: string;
}

export interface CreateBookmarkInput {
  id: string;
  userId: string;
  url: string;
  title: string;
  description: string | null;
  now: string;
}

export interface BookmarkPatch {
  url?: string;
  title?: string;
  description?: string | null;
}

export interface CreateCodingSessionInput {
  id: string;
  userId: string;
  projectId: string | null;
  note: string | null;
  startedAt: string;
}

/* ------------------------------------------------------------------ */
/* Aggregates                                                          */
/* ------------------------------------------------------------------ */

export interface TaskCountsByProject {
  projectId: string;
  total: number;
  todo: number;
  inProgress: number;
  done: number;
}

export interface EntityCounts {
  projects: number;
  activeProjects: number;
  tasks: number;
  tasksTodo: number;
  tasksInProgress: number;
  tasksDone: number;
  tasksDoneLast7Days: number;
  notes: number;
  bookmarks: number;
}

export interface SessionSummary {
  count: number;
  totalMinutes: number;
  last7DaysCount: number;
  last7DaysMinutes: number;
}

export interface TaskFilter {
  projectId?: string;
  status?: string;
}

export interface SearchResults {
  projects: ProjectRecord[];
  tasks: TaskRecord[];
  notes: NoteRecord[];
  bookmarks: BookmarkRecord[];
}

/* ------------------------------------------------------------------ */
/* Repository                                                          */
/* ------------------------------------------------------------------ */

export interface Repo {
  kind: "postgres" | "d1";

  // Auth
  countUsers(): Promise<number>;
  countSessions(): Promise<number>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  createSession(input: CreateSessionInput): Promise<void>;
  findActiveSession(sessionId: string, nowIso: string): Promise<ActiveSession | null>;
  deleteSession(sessionId: string): Promise<void>;

  // Projects
  listProjects(userId: string): Promise<ProjectRecord[]>;
  getProject(id: string, userId: string): Promise<ProjectRecord | null>;
  createProject(input: CreateProjectInput): Promise<ProjectRecord>;
  updateProject(id: string, userId: string, patch: ProjectPatch): Promise<ProjectRecord | null>;
  deleteProject(id: string, userId: string): Promise<boolean>;

  // Tasks
  listTasks(userId: string, filter: TaskFilter): Promise<TaskRecord[]>;
  getTask(id: string, userId: string): Promise<TaskRecord | null>;
  createTask(input: CreateTaskInput): Promise<TaskRecord>;
  updateTask(id: string, userId: string, patch: TaskPatch): Promise<TaskRecord | null>;
  deleteTask(id: string, userId: string): Promise<boolean>;
  taskCountsByProject(userId: string): Promise<TaskCountsByProject[]>;

  // Notes
  listNotes(userId: string): Promise<NoteRecord[]>;
  createNote(input: CreateNoteInput): Promise<NoteRecord>;
  updateNote(id: string, userId: string, patch: NotePatch): Promise<NoteRecord | null>;
  deleteNote(id: string, userId: string): Promise<boolean>;

  // Bookmarks
  listBookmarks(userId: string): Promise<BookmarkRecord[]>;
  createBookmark(input: CreateBookmarkInput): Promise<BookmarkRecord>;
  updateBookmark(id: string, userId: string, patch: BookmarkPatch): Promise<BookmarkRecord | null>;
  deleteBookmark(id: string, userId: string): Promise<boolean>;

  // Coding sessions
  listCodingSessions(userId: string, limit: number): Promise<CodingSessionRecord[]>;
  getCodingSession(id: string, userId: string): Promise<CodingSessionRecord | null>;
  createCodingSession(input: CreateCodingSessionInput): Promise<CodingSessionRecord>;
  endCodingSession(id: string, userId: string, endedAt: string): Promise<CodingSessionRecord | null>;
  activeCodingSession(userId: string): Promise<CodingSessionRecord | null>;

  // Analytics & search
  entityCounts(userId: string, weekAgoIso: string): Promise<EntityCounts>;
  endedCodingSessions(userId: string): Promise<{ startedAt: string; endedAt: string }[]>;
  search(userId: string, term: string, limit: number): Promise<SearchResults>;
}

export type AppEnv = { Variables: { user: UserRecord } };
