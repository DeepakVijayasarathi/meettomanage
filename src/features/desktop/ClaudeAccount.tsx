import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, LogIn, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NotFound from "@/features/auth/NotFound";
import { getDesktop, type ClaudeStatus, type ClaudeUsage } from "./desktopBridge";

const fmt = (n: number) => n.toLocaleString();
const LIMIT_LABELS: Record<string, string> = { five_hour: "5-hour limit", seven_day: "Weekly limit", seven_day_opus: "Weekly limit (Opus)" };

/** Desktop-app-only screen: Claude CLI sign-in, account details and usage from this app's chats. */
export default function ClaudeAccount() {
  const desktop = getDesktop();
  const [status, setStatus] = useState<ClaudeStatus | null>(null);
  const [usage, setUsage] = useState<ClaudeUsage | null>(null);
  const [busy, setBusy] = useState<"login" | "logout" | null>(null);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!desktop) return;
    const [s, u] = await Promise.all([desktop.claude.status(), desktop.claude.usage()]);
    setStatus(s);
    setUsage(u);
  }, [desktop]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totals = useMemo(() => {
    const entries = usage?.entries ?? [];
    const today = new Date().setHours(0, 0, 0, 0);
    const sum = (list: typeof entries) =>
      list.reduce(
        (a, e) => ({ cost: a.cost + e.costUsd, input: a.input + e.inputTokens, output: a.output + e.outputTokens, cache: a.cache + e.cacheReadTokens + e.cacheWriteTokens, n: a.n + 1 }),
        { cost: 0, input: 0, output: 0, cache: 0, n: 0 },
      );
    return { all: sum(entries), today: sum(entries.filter((e) => e.at >= today)) };
  }, [usage]);

  if (!desktop) return <NotFound />;

  async function run(kind: "login" | "logout") {
    setBusy(kind);
    setMessage(kind === "login" ? "Complete the sign-in in your browser…" : "");
    const r = await desktop!.claude[kind]();
    setMessage(r.ok ? "" : r.message || `${kind} failed`);
    setBusy(null);
    await refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claude account</h1>
          <p className="text-sm text-muted-foreground">Desktop app only. Powers the AI Assistant through the Claude CLI.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Sign-in
            {status && <Badge variant={status.loggedIn ? "default" : "secondary"}>{status.loggedIn ? "Logged in" : "Logged out"}</Badge>}
          </CardTitle>
          <CardDescription>{status?.cliPath ?? (status && !status.cliFound ? "Claude CLI not found" : "Checking…")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : !status.cliFound ? (
            <p className="text-sm text-destructive">{status.error ?? "Claude CLI not found. Install Claude Code or set CLAUDE_PATH, then restart the app."}</p>
          ) : (
            <>
              {status.loggedIn && (
                <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{status.email ?? "—"}</dd>
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="capitalize">{status.subscriptionType ?? status.authMethod ?? "—"}</dd>
                  <dt className="text-muted-foreground">Organization</dt>
                  <dd>{status.orgName ?? "—"}</dd>
                  <dt className="text-muted-foreground">Login method</dt>
                  <dd>{status.authMethod ?? "—"}</dd>
                </dl>
              )}
              {!status.loggedIn && status.error && <p className="text-sm text-muted-foreground">{status.error}</p>}
              <div className="flex gap-2">
                {status.loggedIn ? (
                  <Button variant="outline" disabled={busy !== null} onClick={() => void run("logout")}>
                    {busy === "logout" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />} Log out
                  </Button>
                ) : (
                  <Button disabled={busy !== null} onClick={() => void run("login")}>
                    {busy === "login" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />} Log in with Claude
                  </Button>
                )}
              </div>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan limits</CardTitle>
          <CardDescription>As last reported by Claude with a reply in this app.</CardDescription>
        </CardHeader>
        <CardContent>
          {usage && Object.keys(usage.limits).length ? (
            <ul className="space-y-2 text-sm">
              {Object.entries(usage.limits).map(([k, l]) => (
                <li key={k} className="flex items-center justify-between gap-3">
                  <span>{LIMIT_LABELS[k] ?? k}</span>
                  <span className="text-muted-foreground">
                    {l.status}
                    {typeof l.utilization === "number" ? ` · ${Math.round(l.utilization * 100)}% used` : ""}
                    {l.resetsAt ? ` · resets ${new Date(l.resetsAt * 1000).toLocaleString()}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing yet. Ask the AI Assistant something and this fills in.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage from this app</CardTitle>
          <CardDescription>Only chats run through this desktop app are counted, not your other Claude Code use.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Today", `$${totals.today.cost.toFixed(2)}`, `${totals.today.n} requests`],
              ["All time", `$${totals.all.cost.toFixed(2)}`, `${totals.all.n} requests`],
              ["Input tokens", fmt(totals.all.input), `${fmt(totals.all.cache)} cached`],
              ["Output tokens", fmt(totals.all.output), ""],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-lg font-semibold">{value}</div>
                <div className="text-xs text-muted-foreground">{sub}</div>
              </div>
            ))}
          </div>
          {usage && usage.entries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">When</th>
                    <th className="pr-3">Model</th>
                    <th className="pr-3 text-right">In</th>
                    <th className="pr-3 text-right">Out</th>
                    <th className="pr-3 text-right">Cost</th>
                    <th className="text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {[...usage.entries].reverse().slice(0, 25).map((e) => (
                    <tr key={e.at} className="border-t">
                      <td className="py-1 pr-3">{new Date(e.at).toLocaleString()}</td>
                      <td className="pr-3">{e.models.join(", ") || "—"}</td>
                      <td className="pr-3 text-right">{fmt(e.inputTokens)}</td>
                      <td className="pr-3 text-right">{fmt(e.outputTokens)}</td>
                      <td className="pr-3 text-right">${e.costUsd.toFixed(3)}</td>
                      <td className="text-right">{(e.durationMs / 1000).toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {usage && usage.entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => void desktop.claude.clearUsage().then(refresh)}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear history
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Cost is the API-equivalent estimate the CLI reports. On a Pro or Max plan you aren't billed per request.</p>
        </CardContent>
      </Card>
    </div>
  );
}
