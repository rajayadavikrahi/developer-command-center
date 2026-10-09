import { recordActivity } from "../lib/activity";
import type { ProjectRecord, Repo, TaskCountsByProject } from "../lib/repo";

export interface ProjectProgress {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  percent: number;
}

export interface ProjectDto extends ProjectRecord {
  progress: ProjectProgress;
}

export interface ProjectInput {
  name: string;
  description: string | null;
  status?: string;
  color: string | null;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  status?: string;
  color?: string | null;
}

const EMPTY_COUNTS: TaskCountsByProject = {
  projectId: "",
  total: 0,
  todo: 0,
  inProgress: 0,
  done: 0,
};

export function progressFromCounts(counts: TaskCountsByProject | undefined): ProjectProgress {
  const c = counts ?? EMPTY_COUNTS;
  return {
    total: c.total,
    todo: c.todo,
    inProgress: c.inProgress,
    done: c.done,
    percent: c.total === 0 ? 0 : Math.round((c.done / c.total) * 100),
  };
}

function toDto(project: ProjectRecord, counts: TaskCountsByProject | undefined): ProjectDto {
  return { ...project, progress: progressFromCounts(counts) };
}

async function countsByProject(repo: Repo, userId: string): Promise<Map<string, TaskCountsByProject>> {
  const rows = await repo.taskCountsByProject(userId);
  return new Map(rows.map((row) => [row.projectId, row]));
}

export async function listProjects(repo: Repo, userId: string): Promise<ProjectDto[]> {
  const [projects, counts] = await Promise.all([
    repo.listProjects(userId),
    countsByProject(repo, userId),
  ]);
  return projects.map((project) => toDto(project, counts.get(project.id)));
}

export async function getProject(
  repo: Repo,
  userId: string,
  id: string,
): Promise<ProjectDto | null> {
  const project = await repo.getProject(id, userId);
  if (!project) return null;
  const counts = await repo.taskCountsByProject(userId);
  return toDto(project, counts.find((row) => row.projectId === id));
}

export async function createProject(
  repo: Repo,
  userId: string,
  input: ProjectInput,
): Promise<ProjectDto> {
  const project = await repo.createProject({
    id: crypto.randomUUID(),
    userId,
    name: input.name,
    description: input.description,
    status: input.status ?? "active",
    color: input.color,
    now: new Date().toISOString(),
  });
  recordActivity("project.created", `Project created: ${project.name}`, "info");
  return toDto(project, undefined);
}

export async function updateProject(
  repo: Repo,
  userId: string,
  id: string,
  patch: ProjectUpdate,
): Promise<ProjectDto | null> {
  const project = await repo.updateProject(id, userId, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  if (!project) return null;
  const counts = await repo.taskCountsByProject(userId);
  recordActivity("project.updated", `Project updated: ${project.name}`, "info");
  return toDto(project, counts.find((row) => row.projectId === id));
}

export async function deleteProject(
  repo: Repo,
  userId: string,
  id: string,
): Promise<boolean> {
  const project = await repo.getProject(id, userId);
  const deleted = await repo.deleteProject(id, userId);
  if (deleted && project) {
    recordActivity("project.deleted", `Project deleted: ${project.name}`, "warn");
  }
  return deleted;
}
