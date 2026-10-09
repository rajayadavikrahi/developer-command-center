import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, type Note } from "@/lib/api";
import { errMessage, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotesView() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ notes: Note[] }>("/api/notes");
      setNotes(data.notes);
      setError(null);
      setSelectedId((current) => current ?? data.notes[0]?.id ?? null);
    } catch (err) {
      setError(errMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = notes?.find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    setTitle(selected?.title ?? "");
    setContent(selected?.content ?? "");
  }, [selected]);

  const createNote = async () => {
    setBusy(true);
    try {
      const data = await api<{ note: Note }>("/api/notes", {
        method: "POST",
        body: { title: "Untitled note", content: "" },
      });
      setSelectedId(data.note.id);
      await load();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api(`/api/notes/${selected.id}`, {
        method: "PATCH",
        body: { title: title.trim() || "Untitled note", content },
      });
      await load();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await api(`/api/notes/${id}`, { method: "DELETE" });
      if (id === selectedId) setSelectedId(null);
      await load();
    } catch (err) {
      setError(errMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Notes</h2>
          <p className="text-sm text-muted-foreground">Scratchpad for ideas, snippets and logs</p>
        </div>
        <Button onClick={() => void createNote()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          New note
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(220px,280px)_1fr]">
        <div className="flex flex-col gap-2">
          {notes === null ? (
            <p className="px-1 text-sm text-muted-foreground">Loading notes…</p>
          ) : notes.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setSelectedId(note.id)}
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  note.id === selectedId
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border hover:bg-accent/50",
                )}
              >
                <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{note.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatDateTime(note.updatedAt)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <Card>
          <CardContent className="flex h-full flex-col gap-3">
            {selected ? (
              <>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                  className="border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                />
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing…"
                  className="min-h-72 flex-1 resize-none border-0 px-0 shadow-none focus-visible:ring-0"
                />
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    Updated {formatDateTime(selected.updatedAt)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => void deleteNote(selected.id)}
                      aria-label="Delete note"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <Button onClick={() => void saveNote()} disabled={busy}>
                      Save
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground">
                {notes && notes.length > 0 ? "Select a note" : "Create your first note"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
