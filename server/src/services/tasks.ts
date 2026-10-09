import { recordActivity } from "../lib/activity";
import type { Repo, TaskFilter, TaskRecord } from "../lib/repo";
import { NotFoundError } from "./errors";

export interface TaskInput {
  projectId: string;
  title: string;
  description: string | null;
  status?: string;
  priority?: string;
  dueAt: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueAt?: string | null;
  completedAt?: string | null;
}

export async function listTasks(
  repo: Repo,
  userId: string,
  filter: TaskFilter,
): Promise<TaskRecord[]> {
  return repo.listTasks(userId, filter);
}

export async function createTask(
  repo: Repo,
  userId: string,
  input: TaskInput,
): Promise<TaskRecord> {
  const project = await repo.getProject(input.projectId, userId);
  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const now = new Date().toISOString();
  const status = input.status ?? "todo";
  const task = await repo.createTask({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    userId,
    title: input.title,
    description: input.description,
    status,
    priority: input.priority ?? "medium",
    dueAt: input.dueAt,
    completedAt: status === "done" ? now : null,
    now,
  });

  recordActivity("task.created", `Task created: ${task.title}`, "info", {
    projectId: task.projectId,
  });
  return task;
}

export async function updateTask(
  repo: Repo,
  userId: string,
  id: string,
  patch: TaskUpdate,
): Promise<TaskRecord | null> {
  const existing = await repo.getTask(id, userId);
  if (!existing) return null;

  const next: TaskUpdate = { ...patch };

  // Transitioning to done stamps completedAt; leaving done clears it.
  if (patch.status !== undefined && patch.status !== existing.status) {
    next.completedAt = patch.status === "done" ? new Date().toISOString() : null;
  }

  const task = await repo.updateTask(id, userId, next);
  if (task) {
    recordActivity("task.updated", `Task updated: ${task.title}`, "info");
  }
  return task;
}

export async function deleteTask(repo: Repo, userId: string, id: string): Promise<boolean> {
  const existing = await repo.getTask(id, userId);
  const deleted = await repo.deleteTask(id, userId);
  if (deleted && existing) {
    recordActivity("task.deleted", `Task deleted: ${existing.title}`, "warn");
  }
  return deleted;
}
