import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Loader2, Play, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  api,
  type CodingSession,
  type Project,
  type SessionStats,
} from "@/lib/api";
import { errMessage, formatClock, formatDateTime, formatDuration } from "@/lib/format";

const NO_PROJECT = "__none__";

export function SessionsView() {
  const [data, setData] = useState<{ sessions: CodingSession[]; summary: SessionStats } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const active = data?.summary.active ?? null;

  const load = useCallback(async () => {
    try {
      const [sessionData, projectData] = await Promise.all([
        api<{ sessions: CodingSession[]; summary: SessionStats }>("/api/sessions"),
        api<{ projects: Project[] }>("/api/projects"),
      ]);
      setData(sessionData);
      setProjects(projectData.projects);
      setError(null);
    } catch (err) {
      setError(errMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const elapsedSeconds = useMemo(() => {
    if (!active) return 0;
    const start = new Date(active.startedAt).getTime();
    return Math.max(0, Math.floor((now - start) / 1000));
  }, [active, now]);

  const projectName = useCallback(
    (id: string | null) => projects.find((p) => p.id === id)?.name ?? null,
    [projects],
  );

  const start = async () => {
    setBusy(true);
    try {
      await api("/api/sessions", {
        method: "POST",
        body: { projectId: projectId === NO_PROJECT ? null : projectId, note: note.trim() || null },
      });
      setNote("");
      await load();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await api(`/api/sessions/${active.id}/end`, { method: "POST" });
      await load();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Focus Sessions</h2>
        <p className="text-sm text-muted-foreground">
          Timebox your work and track how long you actually code
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
              <Timer className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total focus</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatDuration(data?.summary.totalMinutes ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sessions</p>
              <p className="text-2xl font-semibold tabular-nums">{data?.summary.count ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardHeader className="gap-1">
            <CardTitle className="text-base">Last 7 days</CardTitle>
            <CardDescription>
              {formatDuration(data?.summary.last7DaysMinutes ?? 0)} across{" "}
              {data?.summary.last7DaysCount ?? 0} sessions
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-lg">{active ? "Session running" : "Start a session"}</CardTitle>
          <CardDescription>
            {active ? "Timer keeps running server-side until you stop it" : "Pick a project and focus"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {active ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-4xl font-semibold tabular-nums text-emerald-500">
                  {formatClock(elapsedSeconds)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {projectName(active.projectId) ?? "No project"} · started{" "}
                  {formatDateTime(active.startedAt)}
                  {active.note ? ` · ${active.note}` : ""}
                </p>
              </div>
              <Button variant="destructive" onClick={() => void end()} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
                End session
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT}>No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="What are you working on? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void start()}
              />
              <Button onClick={() => void start()} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                Start
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-lg">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data === null ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Loading sessions…</p>
          ) : data.sessions.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No sessions recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-4 px-6 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {projectName(session.projectId) ?? "No project"}
                      {session.note ? ` · ${session.note}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(session.startedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {session.isActive ? "active" : formatDuration(session.durationMinutes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
