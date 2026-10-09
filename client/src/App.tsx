import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Bookmark,
  FlaskConical,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Route,
  ScrollText,
  Search,
  StickyNote,
  Terminal,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type Health, type User } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ApiTesterView, type TesterPrefill } from "./views/ApiTesterView";
import { AuthView } from "./views/AuthView";
import { BookmarksView } from "./views/BookmarksView";
import { DashboardView } from "./views/DashboardView";
import { EndpointsView } from "./views/EndpointsView";
import { LogsView } from "./views/LogsView";
import { NotesView } from "./views/NotesView";
import { ProjectsView } from "./views/ProjectsView";
import { SearchView } from "./views/SearchView";
import { SessionsView } from "./views/SessionsView";
import { StatsView } from "./views/StatsView";
import "./index.css";

type TabId =
  | "dashboard"
  | "projects"
  | "notes"
  | "bookmarks"
  | "sessions"
  | "stats"
  | "search"
  | "tester"
  | "endpoints"
  | "logs";

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof Terminal;
  group: "workspace" | "lab";
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "workspace" },
  { id: "projects", label: "Projects", icon: FolderKanban, group: "workspace" },
  { id: "notes", label: "Notes", icon: StickyNote, group: "workspace" },
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark, group: "workspace" },
  { id: "sessions", label: "Focus", icon: Timer, group: "workspace" },
  { id: "stats", label: "Stats", icon: BarChart3, group: "workspace" },
  { id: "search", label: "Search", icon: Search, group: "workspace" },
  { id: "tester", label: "API Tester", icon: FlaskConical, group: "lab" },
  { id: "endpoints", label: "Endpoints", icon: Route, group: "lab" },
  { id: "logs", label: "Activity Logs", icon: ScrollText, group: "lab" },
];

function BootScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex size-12 animate-pulse items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
        <Terminal className="size-6" />
      </div>
      <p className="text-sm text-muted-foreground">Booting Developer Command Center…</p>
    </div>
  );
}

function NavButton({
  item,
  active,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <item.icon className="size-4" />
      {item.label}
    </button>
  );
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<TabId>("dashboard");
  const [prefill, setPrefill] = useState<TesterPrefill | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () => {
      api<Health>("/api/health")
        .then((data) => {
          if (!cancelled) {
            setHealth(data);
            setHealthError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setHealthError(err instanceof Error ? err.message : String(err));
        });
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setTab("dashboard");
      setHealth(null);
    }
  }, []);

  const handleTry = useCallback((method: string, path: string) => {
    setPrefill({ method, path, bump: Date.now() });
    setTab("tester");
  }, []);

  const clearPrefill = useCallback(() => setPrefill(null), []);

  const submitSearch = useCallback(() => {
    setTab("search");
  }, []);

  if (booting) return <BootScreen />;
  if (!user) return <AuthView onAuthenticated={setUser} />;

  const online = health?.status === "ok";
  const activeLabel = NAV.find((item) => item.id === tab)?.label ?? "Dashboard";
  const workspaceNav = NAV.filter((item) => item.group === "workspace");
  const labNav = NAV.filter((item) => item.group === "lab");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
            <Terminal className="size-4" />
          </div>
          <p className="text-sm font-semibold leading-tight tracking-tight">
            Developer Command
            <br />
            Center
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {workspaceNav.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={tab === item.id}
              onSelect={() => setTab(item.id)}
            />
          ))}
        </nav>

        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Lab
          </p>
          <nav className="flex flex-col gap-1">
            {labNav.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={tab === item.id}
                onSelect={() => setTab(item.id)}
              />
            ))}
          </nav>
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-sidebar-border pt-4">
          <div className="min-w-0 px-1">
            <p className="truncate text-sm font-medium">{user.name ?? "Operator"}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-6">
          <div className="flex min-w-0 shrink-0 items-center gap-2 font-mono text-sm text-muted-foreground">
            <span className="hidden sm:inline">command-center</span>
            <span className="hidden sm:inline">/</span>
            <span className="truncate text-foreground">{activeLabel.toLowerCase()}</span>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workspace…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              onFocus={() => {
                if (searchQuery.trim()) setTab("search");
              }}
              className="pl-9"
            />
          </div>
          <div
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs",
              online
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                : healthError
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                online ? "bg-emerald-500" : healthError ? "bg-destructive" : "bg-muted-foreground",
              )}
            />
            {online ? "API online" : healthError ? "API offline" : "checking…"}
          </div>
        </header>

        <main className="flex-1 p-6">
          {tab === "dashboard" && <DashboardView health={health} healthError={healthError} />}
          {tab === "projects" && <ProjectsView />}
          {tab === "notes" && <NotesView />}
          {tab === "bookmarks" && <BookmarksView />}
          {tab === "sessions" && <SessionsView />}
          {tab === "stats" && <StatsView />}
          {tab === "search" && <SearchView query={searchQuery} onQueryChange={setSearchQuery} />}
          {tab === "tester" && <ApiTesterView prefill={prefill} onPrefillConsumed={clearPrefill} />}
          {tab === "endpoints" && <EndpointsView onTry={handleTry} />}
          {tab === "logs" && <LogsView />}
        </main>
      </div>
    </div>
  );
}

export default App;
