import { useCallback, useEffect, useState } from "react";
import {
  Circle,
  CheckCircle2,
  FolderKanban,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  api,
  type Project,
  type ProjectStatus,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/api";
import { errMessage, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const PROJECT_STATUSES: ProjectStatus[] = ["active", "completed", "archived"];
const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

const taskStatusLabel: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const priorityStyles: Record<TaskPriority, string> = {
  low: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  high: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function ProjectsView() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTask, setNewTask] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      const data = await api<{ projects: Project[] }>("/api/projects");
      setProjects(data.projects);
      setError(null);
      setSelectedId((current) => current ?? data.projects[0]?.id ?? null);
    } catch (err) {
      setError(errMessage(err));
    }
  }, []);

  const loadTasks = useCallback(async (projectId: string) => {
    try {
      const data = await api<{ tasks: Task[] }>(`/api/tasks?projectId=${projectId}`);
      setTasks(data.tasks);
    } catch (err) {
      setError(errMessage(err));
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!selectedId) {
      setTasks([]);
      return;
    }
    void loadTasks(selectedId);
  }, [selectedId, loadTasks]);

  const selected = projects?.find((p) => p.id === selectedId) ?? null;

  const createProject = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const data = await api<{ project: Project }>("/api/projects", {
        method: "POST",
        body: { name: newName.trim(), description: newDescription.trim() || null },
      });
      setNewName("");
      setNewDescription("");
      await loadProjects();
      setSelectedId(data.project.id);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const updateProjectStatus = async (status: ProjectStatus) => {
    if (!selected) return;
    try {
      await api(`/api/projects/${selected.id}`, { method: "PATCH", body: { status } });
      await loadProjects();
    } catch (err) {
      setError(errMessage(err));
    }
  };

  const deleteProject = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api(`/api/projects/${selected.id}`, { method: "DELETE" });
      setSelectedId(null);
      await loadProjects();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addTask = async () => {
    if (!selected || !newTask.trim()) return;
    setBusy(true);
    try {
      await api("/api/tasks", {
        method: "POST",
        body: { projectId: selected.id, title: newTask.trim() },
      });
      setNewTask("");
      await Promise.all([loadTasks(selected.id), loadProjects()]);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleTask = async (task: Task) => {
    const status: TaskStatus = task.status === "done" ? "todo" : "done";
    await patchTask(task.id, { status });
  };

  const patchTask = async (id: string, body: Record<string, unknown>) => {
    if (!selected) return;
    try {
      await api(`/api/tasks/${id}`, { method: "PATCH", body });
      await Promise.all([loadTasks(selected.id), loadProjects()]);
    } catch (err) {
      setError(errMessage(err));
    }
  };

  const deleteTask = async (id: string) => {
    if (!selected) return;
    try {
      await api(`/api/tasks/${id}`, { method: "DELETE" });
      await Promise.all([loadTasks(selected.id), loadProjects()]);
    } catch (err) {
      setError(errMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
        <p className="text-sm text-muted-foreground">
          Track projects and their tasks with automatic progress
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="gap-4">
            <CardHeader className="gap-1">
              <CardTitle className="text-base">New project</CardTitle>
              <CardDescription>Give it a name to get started</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Input
                placeholder="Project name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void createProject()}
              />
              <Textarea
                placeholder="Short description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="min-h-16"
              />
              <Button onClick={() => void createProject()} disabled={busy || !newName.trim()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create project
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {projects === null ? (
              <p className="px-1 text-sm text-muted-foreground">Loading projects…</p>
            ) : projects.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              projects.map((project) => {
                const active = project.id === selectedId;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedId(project.id)}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-left transition-colors",
                      active
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border hover:bg-accent/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">{project.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {project.progress.percent}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${project.progress.percent}%` }}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {selected ? (
          <Card className="gap-5">
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-xl">{selected.name}</CardTitle>
                  <CardDescription>
                    {selected.description || "No description"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selected.status}
                    onValueChange={(value) => void updateProjectStatus(value as ProjectStatus)}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => void deleteProject()}
                    disabled={busy}
                    aria-label="Delete project"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {selected.progress.done}/{selected.progress.total} tasks done
                </span>
                <span>·</span>
                <span>{selected.progress.percent}% complete</span>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a task…"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void addTask()}
                />
                <Button onClick={() => void addTask()} disabled={busy || !newTask.trim()}>
                  <Plus className="size-4" />
                  Add
                </Button>
              </div>

              <div className="flex flex-col divide-y divide-border rounded-md border">
                {tasks.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    No tasks yet — add the first one above.
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => void toggleTask(task)}
                        className="shrink-0 text-muted-foreground hover:text-emerald-500"
                        aria-label="Toggle task"
                      >
                        {task.status === "done" ? (
                          <CheckCircle2 className="size-5 text-emerald-500" />
                        ) : (
                          <Circle className="size-5" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm",
                            task.status === "done" && "text-muted-foreground line-through",
                          )}
                        >
                          {task.title}
                        </p>
                        {task.dueAt && (
                          <p className="text-xs text-muted-foreground">Due {formatDate(task.dueAt)}</p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "rounded border px-2 py-0.5 text-xs font-medium capitalize",
                          priorityStyles[task.priority],
                        )}
                      >
                        {task.priority}
                      </span>
                      <Select
                        value={task.status}
                        onValueChange={(value) => void patchTask(task.id, { status: value })}
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {taskStatusLabel[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void deleteTask(task.id)}
                        aria-label="Delete task"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground">
              {projects && projects.length > 0
                ? "Select a project to view its tasks"
                : "Create a project to get started"}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
