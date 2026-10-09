import { recordActivity } from "../lib/activity";
import type { BookmarkRecord, Repo } from "../lib/repo";

export interface BookmarkInput {
  url: string;
  title: string;
  description: string | null;
}

export interface BookmarkUpdate {
  url?: string;
  title?: string;
  description?: string | null;
}

export async function listBookmarks(repo: Repo, userId: string): Promise<BookmarkRecord[]> {
  return repo.listBookmarks(userId);
}

export async function createBookmark(
  repo: Repo,
  userId: string,
  input: BookmarkInput,
): Promise<BookmarkRecord> {
  const bookmark = await repo.createBookmark({
    id: crypto.randomUUID(),
    userId,
    url: input.url,
    title: input.title,
    description: input.description,
    now: new Date().toISOString(),
  });
  recordActivity("bookmark.created", `Bookmark added: ${bookmark.title}`, "info");
  return bookmark;
}

export async function updateBookmark(
  repo: Repo,
  userId: string,
  id: string,
  patch: BookmarkUpdate,
): Promise<BookmarkRecord | null> {
  const bookmark = await repo.updateBookmark(id, userId, patch);
  if (bookmark) recordActivity("bookmark.updated", `Bookmark updated: ${bookmark.title}`, "info");
  return bookmark;
}

export async function deleteBookmark(repo: Repo, userId: string, id: string): Promise<boolean> {
  const deleted = await repo.deleteBookmark(id, userId);
  if (deleted) recordActivity("bookmark.deleted", "Bookmark deleted", "warn");
  return deleted;
}
