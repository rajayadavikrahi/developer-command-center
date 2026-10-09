import { useState, type FormEvent } from "react";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api, type User } from "@/lib/api";

interface AuthViewProps {
  onAuthenticated: (user: User) => void;
}

export function AuthView({ onAuthenticated }: AuthViewProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = isRegister ? { name, email, password } : { email, password };
      const res = await api<{ user: User }>(`/api/auth/${mode}`, { method: "POST", body });
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — is the API running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card text-emerald-500">
            <Terminal className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Developer Command Center</h1>
            <p className="text-sm text-muted-foreground">Sign in to reach mission control</p>
          </div>
        </div>

        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-lg">{isRegister ? "Create account" : "Welcome back"}</CardTitle>
            <CardDescription>
              {isRegister
                ? "Register a new operator account"
                : "Enter your credentials to open the console"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-4">
              {isRegister && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                    required
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@dev.io"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "At least 8 characters" : "••••••••"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
              </div>

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Working…" : isRegister ? "Create account" : "Sign in"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setMode(isRegister ? "login" : "register");
                  setError(null);
                }}
                className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {isRegister
                  ? "Already have an account? Sign in"
                  : "No account yet? Register a new operator"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
