import { useCallback, useEffect, useState } from "react";
import { Bookmark as BookmarkIcon, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, type Bookmark } from "@/lib/api";
import { errMessage } from "@/lib/format";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function BookmarksView() {
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ bookmarks: Bookmark[] }>("/api/bookmarks");
      setBookmarks(data.bookmarks);
      setError(null);
    } catch (err) {
      setError(errMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!url.trim() || !title.trim()) return;
    setBusy(true);
    try {
      await api("/api/bookmarks", {
        method: "POST",
        body: { url: url.trim(), title: title.trim() },
      });
      setUrl("");
      setTitle("");
      await load();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/api/bookmarks/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(errMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Bookmarks</h2>
        <p className="text-sm text-muted-foreground">Keep useful links one click away</p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card className="gap-4">
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void create()}
          />
          <Button onClick={() => void create()} disabled={busy || !url.trim() || !title.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </CardContent>
      </Card>

      {bookmarks === null ? (
        <p className="text-sm text-muted-foreground">Loading bookmarks…</p>
      ) : bookmarks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookmarks yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark) => (
            <Card key={bookmark.id} className="gap-2">
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <BookmarkIcon className="size-4 shrink-0 text-emerald-500" />
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {bookmark.title}
                    </a>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void remove(bookmark.id)}
                    aria-label="Delete bookmark"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {bookmark.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{bookmark.description}</p>
                )}
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3" />
                  <span className="truncate">{hostOf(bookmark.url)}</span>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
