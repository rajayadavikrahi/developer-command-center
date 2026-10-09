export type LogLevel = "info" | "warn" | "error";

export interface ActivityEntry {
  id: string;
  ts: string;
  level: LogLevel;
  event: string;
  message: string;
  meta?: Record<string, unknown>;
}

const MAX_ENTRIES = 200;
const entries: ActivityEntry[] = [];

export function recordActivity(
  event: string,
  message: string,
  level: LogLevel = "info",
  meta?: Record<string, unknown>,
): void {
  const entry: ActivityEntry = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    level,
    event,
    message,
  };
  if (meta) entry.meta = meta;
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
}

export function listActivity(limit = 100): ActivityEntry[] {
  return entries.slice(0, Math.min(limit, MAX_ENTRIES));
}
