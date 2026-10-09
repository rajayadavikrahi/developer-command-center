import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface TesterPrefill {
  method: string;
  path: string;
  bump: number;
}

const METHODS = ["GET", "POST", "PUT", "DELETE"];

interface TesterResult {
  status: number;
  durationMs: number;
  body: string;
}

interface ApiTesterViewProps {
  prefill: TesterPrefill | null;
  onPrefillConsumed: () => void;
}

export function ApiTesterView({ prefill, onPrefillConsumed }: ApiTesterViewProps) {
  const [method, setMethod] = useState("GET");
  const [endpoint, setEndpoint] = useState("/api/health");
  const [body, setBody] = useState('{\n  "email": "you@dev.io",\n  "password": "correcthorse1"\n}');
  const [result, setResult] = useState<TesterResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resultRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!prefill) return;
    setMethod(prefill.method);
    setEndpoint(prefill.path);
    setResult(null);
    setError(null);
    onPrefillConsumed();
  }, [prefill, onPrefillConsumed]);

  const send = async () => {
    setBusy(true);
    setError(null);
    const started = performance.now();
    try {
      const res = await fetch(endpoint, {
        method,
        headers: method === "GET" || method === "DELETE" ? undefined : { "content-type": "application/json" },
        body: method === "GET" || method === "DELETE" ? undefined : body,
        credentials: "include",
      });
      const text = await res.text();
      const durationMs = Math.round(performance.now() - started);
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* keep raw */
      }
      setResult({ status: res.status, durationMs, body: pretty });
      if (resultRef.current) resultRef.current.value = pretty;
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const statusColor =
    result === null
      ? "text-muted-foreground"
      : result.status < 300
        ? "text-emerald-500"
        : result.status < 500
          ? "text-amber-500"
          : "text-destructive";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">API Tester</h2>
        <p className="text-sm text-muted-foreground">
          Fire requests at the live API — sessions and cookies are attached automatically
        </p>
      </div>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-lg">Request</CardTitle>
          <CardDescription>Pick a method, an endpoint and optionally a JSON body</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Label htmlFor="method" className="sr-only">
              Method
            </Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full sm:w-[120px]" id="method">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label htmlFor="endpoint" className="sr-only">
              Endpoint
            </Label>
            <Input
              id="endpoint"
              className="font-mono"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/api/health"
            />

            <Button type="submit" disabled={busy}>
              <Send className="size-4" />
              {busy ? "Sending…" : "Send"}
            </Button>
          </form>

          {method !== "GET" && method !== "DELETE" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="body">JSON body</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[120px] font-mono"
                spellCheck={false}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg">Response</CardTitle>
            <CardDescription>
              {result
                ? `HTTP ${result.status} · ${result.durationMs} ms`
                : error
                  ? "Request failed"
                  : "Send a request to see its response"}
            </CardDescription>
          </div>
          {result && <span className={`text-lg font-semibold tabular-nums ${statusColor}`}>{result.status}</span>}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Textarea
            ref={resultRef}
            readOnly
            placeholder="Response JSON will appear here…"
            className="min-h-[240px] resize-y font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
