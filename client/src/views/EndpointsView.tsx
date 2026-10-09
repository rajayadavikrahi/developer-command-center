import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, type EndpointInfo } from "@/lib/api";

interface EndpointsViewProps {
  onTry: (method: string, path: string) => void;
}

function methodColor(method: string): string {
  switch (method) {
    case "GET":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-500";
    case "POST":
      return "border-sky-500/40 bg-sky-500/10 text-sky-500";
    case "PUT":
      return "border-amber-500/40 bg-amber-500/10 text-amber-500";
    default:
      return "border-destructive/40 bg-destructive/10 text-destructive";
  }
}

export function EndpointsView({ onTry }: EndpointsViewProps) {
  const [endpoints, setEndpoints] = useState<EndpointInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ endpoints: EndpointInfo[] }>("/api/endpoints")
      .then((data) => {
        if (!cancelled) setEndpoints(data.endpoints);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Endpoint Explorer</h2>
        <p className="text-sm text-muted-foreground">
          Every route exposed by the Developer Command Center API
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {endpoints === null && !error
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-lg border border-border bg-muted/50" />
            ))
          : endpoints?.map((ep) => (
              <Card key={`${ep.method} ${ep.path}`}>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <span
                    className={`inline-flex w-16 justify-center rounded border px-2 py-1 font-mono text-xs font-semibold ${methodColor(
                      ep.method,
                    )}`}
                  >
                    {ep.method}
                  </span>
                  <code className="min-w-0 flex-1 truncate font-mono text-sm">{ep.path}</code>
                  <span className="text-sm text-muted-foreground">{ep.description}</span>
                  {ep.auth && (
                    <span className="rounded border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      auth required
                    </span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onTry(ep.method, ep.path)}>
                    <Play className="size-4" />
                    Try it
                  </Button>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
