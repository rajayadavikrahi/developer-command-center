import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Bookmark,
  CheckSquare,
  FolderKanban,
  StickyNote,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type DeveloperStats } from "@/lib/api";
import { errMessage, formatDuration } from "@/lib/format";

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {value}
          <span className="text-muted-foreground"> ({percent}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function StatsView() {
  const [stats, setStats] = useState<DeveloperStats | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api<{ stats: DeveloperStats; serverTime: string }>("/api/dev-stats")
        .then((data) => {
          if (!cancelled) {
            setStats(data.stats);
            setServerTime(data.serverTime);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(errMessage(err));
        });
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!stats) {
    return <p className="text-sm text-muted-foreground">Loading developer stats…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Developer Stats</h2>
        <p className="text-sm text-muted-foreground">
          Your output at a glance{serverTime ? ` · updated ${new Date(serverTime).toLocaleTimeString()}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          icon={<FolderKanban className="size-5" />}
          label="Projects"
          value={String(stats.projects.total)}
          hint={`${stats.projects.active} active · ${stats.projects.completed} completed`}
        />
        <Metric
          icon={<CheckSquare className="size-5" />}
          label="Tasks done"
          value={String(stats.tasks.done)}
          hint={`${stats.tasks.doneLast7Days} completed in the last 7 days`}
        />
        <Metric
          icon={<BarChart3 className="size-5" />}
          label="Completion rate"
          value={`${stats.tasks.completionRate}%`}
          hint={`${stats.tasks.total} tasks total`}
        />
        <Metric
          icon={<Timer className="size-5" />}
          label="Focus time"
          value={formatDuration(stats.focus.totalMinutes)}
          hint={`${stats.focus.sessions} sessions · ${formatDuration(stats.focus.last7DaysMinutes)} this week`}
        />
        <Metric
          icon={<StickyNote className="size-5" />}
          label="Notes"
          value={String(stats.notes)}
          hint="Captured ideas and docs"
        />
        <Metric
          icon={<Bookmark className="size-5" />}
          label="Bookmarks"
          value={String(stats.bookmarks)}
          hint="Saved links"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-lg">Task breakdown</CardTitle>
            <CardDescription>Where your tasks sit right now</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Bar label="To do" value={stats.tasks.todo} total={stats.tasks.total} />
            <Bar label="In progress" value={stats.tasks.inProgress} total={stats.tasks.total} />
            <Bar label="Done" value={stats.tasks.done} total={stats.tasks.total} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-lg">Focus trend</CardTitle>
            <CardDescription>
              {stats.focus.activeNow ? "A session is running now" : "Total vs. this week"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Bar
              label="This week"
              value={stats.focus.last7DaysMinutes}
              total={Math.max(stats.focus.totalMinutes, 1)}
            />
            <Bar
              label="All time"
              value={stats.focus.totalMinutes}
              total={Math.max(stats.focus.totalMinutes, 1)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
