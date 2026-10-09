import { useEffect, useState, type ReactNode } from "react";
import { Activity, Clock, Gauge, Server, Users, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type Health, type Stats } from "@/lib/api";

interface DashboardViewProps {
  health: Health | null;
  healthError: string | null;
}

function formatUptime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted ${
            accent ? "text-emerald-500" : "text-foreground"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardView({ health, healthError }: DashboardViewProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api<Stats>("/api/stats")
        .then((data) => {
          if (!cancelled) setStats(data);
        })
        .catch(() => {
          if (!cancelled) setStats(null);
        });
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const online = health?.status === "ok";
  const degraded = health?.status === "degraded";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Live status of the Developer Command Center stack
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
            online
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
              : degraded
                ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              online ? "bg-emerald-500" : degraded ? "bg-amber-500" : "bg-destructive"
            }`}
          />
          {online ? "All systems operational" : degraded ? "Degraded — database unreachable" : "API offline"}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<Activity className="size-5" />}
          label="API status"
          value={health ? health.status.toUpperCase() : "—"}
          hint={healthError ?? `Server time ${new Date(health?.serverTime ?? "").toLocaleTimeString()}`}
          accent={online}
        />
        <StatCard
          icon={<Server className="size-5" />}
          label="Database"
          value={health?.database.connected ? health.database.kind : "disconnected"}
          hint={
            health?.database.connected
              ? `Query latency ${health.database.latencyMs} ms`
              : (health?.database.error ?? healthError ?? "not reachable")
          }
          accent={health?.database.connected}
        />
        <StatCard
          icon={<Clock className="size-5" />}
          label="Uptime"
          value={health ? formatUptime(health.uptimeSeconds) : "—"}
          hint={`Since last process start`}
        />
        <StatCard
          icon={<Users className="size-5" />}
          label="Registered users"
          value={String(health?.users ?? stats?.users ?? "—")}
          hint="Accounts in the database"
        />
        <StatCard
          icon={<Gauge className="size-5" />}
          label="Active sessions"
          value={String(health?.sessions ?? stats?.sessions ?? "—")}
          hint="Signed-in session rows"
        />
        <StatCard
          icon={<Zap className="size-5" />}
          label="Requests served"
          value={stats ? stats.requestsServed.toLocaleString() : "—"}
          hint={stats ? `v${stats.version} · db ${stats.database.latencyMs} ms` : "waiting for stats…"}
        />
      </div>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-lg">About this deployment</CardTitle>
          <CardDescription>
            Local development runs Hono + Prisma against Postgres; the Cloudflare deployment runs the
            same API on Workers backed by D1, with the frontend served as Worker assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Use the sidebar to test endpoints, browse the API catalogue and watch the live activity
            log. All auth uses an httpOnly session cookie.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
