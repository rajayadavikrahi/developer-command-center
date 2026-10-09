import { recordActivity } from "../lib/activity";
import { minutesBetween, summarizeSessions } from "../lib/analytics";
import type { CodingSessionRecord, Repo, SessionSummary } from "../lib/repo";
import { ConflictError, NotFoundError } from "./errors";

export interface SessionInput {
  projectId: string | null;
  note: string | null;
}

export interface SessionDto extends CodingSessionRecord {
  isActive: boolean;
  durationMinutes: number;
}

export interface SessionStats extends SessionSummary {
  active: SessionDto | null;
}

function toDurationMinutes(record: CodingSessionRecord, nowIso: string): number {
  return minutesBetween(record.startedAt, record.endedAt ?? nowIso);
}

export function toSessionDto(record: CodingSessionRecord, nowIso: string): SessionDto {
  return {
    ...record,
    isActive: record.endedAt === null,
    durationMinutes: toDurationMinutes(record, nowIso),
  };
}

export async function listSessions(
  repo: Repo,
  userId: string,
  limit = 50,
): Promise<{ sessions: SessionDto[]; summary: SessionStats }> {
  const nowIso = new Date().toISOString();
  const [records, ended, active] = await Promise.all([
    repo.listCodingSessions(userId, limit),
    repo.endedCodingSessions(userId),
    repo.activeCodingSession(userId),
  ]);

  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const summary = summarizeSessions(ended, weekAgoIso);

  return {
    sessions: records.map((record) => toSessionDto(record, nowIso)),
    summary: {
      ...summary,
      active: active ? toSessionDto(active, nowIso) : null,
    },
  };
}

export async function startSession(
  repo: Repo,
  userId: string,
  input: SessionInput,
): Promise<SessionDto> {
  const running = await repo.activeCodingSession(userId);
  if (running) {
    throw new ConflictError("A focus session is already running");
  }

  if (input.projectId) {
    const project = await repo.getProject(input.projectId, userId);
    if (!project) throw new NotFoundError("Project not found");
  }

  const nowIso = new Date().toISOString();
  const session = await repo.createCodingSession({
    id: crypto.randomUUID(),
    userId,
    projectId: input.projectId,
    note: input.note,
    startedAt: nowIso,
  });

  recordActivity("session.started", "Focus session started", "info");
  return toSessionDto(session, nowIso);
}

export async function endSession(
  repo: Repo,
  userId: string,
  id: string,
): Promise<SessionDto | null> {
  const session = await repo.getCodingSession(id, userId);
  if (!session) return null;
  if (session.endedAt) {
    throw new ConflictError("Session already ended");
  }

  const endedAt = new Date().toISOString();
  const updated = await repo.endCodingSession(id, userId, endedAt);
  if (!updated) return null;

  const dto = toSessionDto(updated, endedAt);
  recordActivity("session.ended", `Focus session ended (${dto.durationMinutes} min)`, "info");
  return dto;
}
