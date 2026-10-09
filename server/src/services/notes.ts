import { recordActivity } from "../lib/activity";
import type { NoteRecord, Repo } from "../lib/repo";

export interface NoteInput {
  title: string;
  content: string;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
}

export async function listNotes(repo: Repo, userId: string): Promise<NoteRecord[]> {
  return repo.listNotes(userId);
}

export async function createNote(
  repo: Repo,
  userId: string,
  input: NoteInput,
): Promise<NoteRecord> {
  const note = await repo.createNote({
    id: crypto.randomUUID(),
    userId,
    title: input.title,
    content: input.content,
    now: new Date().toISOString(),
  });
  recordActivity("note.created", `Note created: ${note.title}`, "info");
  return note;
}

export async function updateNote(
  repo: Repo,
  userId: string,
  id: string,
  patch: NoteUpdate,
): Promise<NoteRecord | null> {
  const note = await repo.updateNote(id, userId, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  if (note) recordActivity("note.updated", `Note updated: ${note.title}`, "info");
  return note;
}

export async function deleteNote(repo: Repo, userId: string, id: string): Promise<boolean> {
  const deleted = await repo.deleteNote(id, userId);
  if (deleted) recordActivity("note.deleted", "Note deleted", "warn");
  return deleted;
}
