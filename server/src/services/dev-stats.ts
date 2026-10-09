import type { Repo } from "../lib/repo";
import { listSessions } from "./sessions";

export interface DeveloperStats {
  projects: { total: number; active: number; completed: number };
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    doneLast7Days: number;
    completionRate: number;
  };
  notes: number;
  bookmarks: number;
  focus: {
    totalMinutes: number;
    sessions: number;
    last7DaysMinutes: number;
    last7DaysSessions: number;
    activeNow: boolean;
  };
}

export async function developerStats(repo: Repo, userId: string): Promise<DeveloperStats> {
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [counts, sessionData, projects] = await Promise.all([
    repo.entityCounts(userId, weekAgoIso),
    listSessions(repo, userId, 1),
    repo.listProjects(userId),
  ]);

  const completedProjects = projects.filter((p) => p.status === "completed").length;

  return {
    projects: {
      total: counts.projects,
      active: counts.activeProjects,
      completed: completedProjects,
    },
    tasks: {
      total: counts.tasks,
      todo: counts.tasksTodo,
      inProgress: counts.tasksInProgress,
      done: counts.tasksDone,
      doneLast7Days: counts.tasksDoneLast7Days,
      completionRate:
        counts.tasks === 0 ? 0 : Math.round((counts.tasksDone / counts.tasks) * 100),
    },
    notes: counts.notes,
    bookmarks: counts.bookmarks,
    focus: {
      totalMinutes: sessionData.summary.totalMinutes,
      sessions: sessionData.summary.count,
      last7DaysMinutes: sessionData.summary.last7DaysMinutes,
      last7DaysSessions: sessionData.summary.last7DaysCount,
      activeNow: sessionData.summary.active !== null,
    },
  };
}
