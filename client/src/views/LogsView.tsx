import { useEffect, useState } from "react";
import { RefreshCw, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, type ActivityEntry } from "@/lib/api";

function levelColor(level: ActivityEntry["level"]): string {
  switch (level) {
    case "error":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "warn":
      return "border-amber-500/40 bg-amber-500/10 text-amber-500";
    default:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-500";
  }
}

export function LogsView() {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api<{ entries: ActivityEntry[] }>("/api/logs");
        if (!cancelled) {
          setEntries(data.entries);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const data = await api<{ entries: ActivityEntry[] }>("/api/logs");
      setEntries(data.entries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Activity Log</h2>
          <p className="text-sm text-muted-foreground">
            Live feed of API requests and auth events · auto-refreshes every 5s
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {entries === null && !error ? (
            <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <ScrollText className="size-4" /> Loading log…
            </div>
          ) : entries && entries.length === 0 ? (
            <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <ScrollText className="size-4" /> No activity yet — hit a few endpoints first.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {entries?.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {new Date(entry.ts).toLocaleTimeString()}
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-medium ${levelColor(entry.level)}`}
                  >
                    {entry.level}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    {entry.event}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">{entry.message}</span>
                  {typeof entry.meta?.durationMs === "number" && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {entry.meta.durationMs} ms
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
