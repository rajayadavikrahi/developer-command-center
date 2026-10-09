export function minutesBetween(startIso: string, endIso: string): number {
  const ms = Date.parse(endIso) - Date.parse(startIso);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round(ms / 60_000);
}

export function summarizeSessions(
  rows: { startedAt: string; endedAt: string }[],
  weekAgoIso: string,
): {
  count: number;
  totalMinutes: number;
  last7DaysCount: number;
  last7DaysMinutes: number;
} {
  let count = 0;
  let totalMinutes = 0;
  let last7DaysCount = 0;
  let last7DaysMinutes = 0;

  for (const row of rows) {
    const minutes = minutesBetween(row.startedAt, row.endedAt);
    count += 1;
    totalMinutes += minutes;
    if (row.startedAt >= weekAgoIso) {
      last7DaysCount += 1;
      last7DaysMinutes += minutes;
    }
  }

  return { count, totalMinutes, last7DaysCount, last7DaysMinutes };
}

export function stripLikeWildcards(term: string): string {
  return term.replace(/[%_\\]/g, " ").trim();
}
