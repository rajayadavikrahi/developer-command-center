export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface Health {
  status: "ok" | "degraded";
  version: string;
  database: {
    kind: string;
    connected: boolean;
    latencyMs?: number;
    error?: string;
  };
  users: number | null;
  sessions: number | null;
  uptimeSeconds: number;
  serverTime: string;
}

export interface Stats {
  version: string;
  uptimeSeconds: number;
  requestsServed: number;
  users: number;
  sessions: number;
  database: {
    kind: string;
    latencyMs: number;
  };
  serverTime: string;
}

export interface EndpointInfo {
  method: string;
  path: string;
  auth: boolean;
  description: string;
}

export interface ActivityEntry {
  id: string;
  ts: string;
  level: "info" | "warn" | "error";
  event: string;
  message: string;
  meta?: Record<string, unknown>;
}

export type ProjectStatus = "active" | "completed" | "archived";

export interface ProjectProgress {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  percent: number;
}

export interface ProjectBase {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project extends ProjectBase {
  progress: ProjectProgress;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  url: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface CodingSession {
  id: string;
  userId: string;
  projectId: string | null;
  note: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  isActive: boolean;
  durationMinutes: number;
}

export interface SessionSummary {
  totalMinutes: number;
  count: number;
  last7DaysMinutes: number;
  last7DaysCount: number;
}

export interface SessionStats extends SessionSummary {
  active: CodingSession | null;
}

export interface DeveloperStats {
  projects: { total: number; active: number; completed: number };
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    doneLast7Days: number;
    completionRate: number;
  };
  notes: number;
  bookmarks: number;
  focus: {
    totalMinutes: number;
    sessions: number;
    last7DaysMinutes: number;
    last7DaysSessions: number;
    activeNow: boolean;
  };
}

export interface SearchResults {
  term: string;
  projects: ProjectBase[];
  tasks: Task[];
  notes: Note[];
  bookmarks: Bookmark[];
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: "include",
  });

  const text = await res.text();
  let data: { error?: string } | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string };
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed with status ${res.status}`);
  }
  return data as T;
}
