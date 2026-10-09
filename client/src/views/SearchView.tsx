import { useEffect, useState, type ReactNode } from "react";
import { Search as SearchIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, type SearchResults } from "@/lib/api";
import { errMessage, formatDate } from "@/lib/format";

interface SearchViewProps {
  query: string;
  onQueryChange: (value: string) => void;
}

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <Card className="gap-0">
      <CardContent className="flex flex-col gap-1 p-0">
        <p className="px-4 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title} · {count}
        </p>
        <div className="flex flex-col divide-y divide-border">{children}</div>
      </CardContent>
    </Card>
  );
}

export function SearchView({ query, onQueryChange }: SearchViewProps) {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      api<SearchResults>(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((data) => {
          if (!cancelled) {
            setResults(data);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(errMessage(err));
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const total = results
    ? results.projects.length + results.tasks.length + results.notes.length + results.bookmarks.length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Search</h2>
        <p className="text-sm text-muted-foreground">Search across projects, tasks, notes and bookmarks</p>
      </div>

      <div className="relative max-w-xl">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Search your workspace…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {!query.trim() ? (
        <p className="text-sm text-muted-foreground">Type to start searching.</p>
      ) : results && total === 0 ? (
        <p className="text-sm text-muted-foreground">No matches for “{results.term}”.</p>
      ) : results ? (
        <div className="flex flex-col gap-4">
          <Group title="Projects" count={results.projects.length}>
            {results.projects.map((project) => (
              <div key={project.id} className="px-4 py-3">
                <p className="text-sm font-medium">{project.name}</p>
                {project.description && (
                  <p className="truncate text-xs text-muted-foreground">{project.description}</p>
                )}
              </div>
            ))}
          </Group>
          <Group title="Tasks" count={results.tasks.length}>
            {results.tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="min-w-0 truncate text-sm">{task.title}</p>
                <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  {task.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </Group>
          <Group title="Notes" count={results.notes.length}>
            {results.notes.map((note) => (
              <div key={note.id} className="px-4 py-3">
                <p className="text-sm font-medium">{note.title}</p>
                {note.content && (
                  <p className="truncate text-xs text-muted-foreground">{note.content}</p>
                )}
              </div>
            ))}
          </Group>
          <Group title="Bookmarks" count={results.bookmarks.length}>
            {results.bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{bookmark.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{bookmark.url}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(bookmark.createdAt)}
                </span>
              </div>
            ))}
          </Group>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Searching…</p>
      )}
    </div>
  );
}
