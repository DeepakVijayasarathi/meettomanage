import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileText, Loader2, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getScheduledTaskLog, type ApiServerLogs } from "@/api/monitoring";
import type { ScheduledTask } from "@/types";

/** Plain-language names for the rn-job task ids used in each server's crontab. Unknown ids fall back to the id itself. */
const TASK_LABELS: Record<string, string> = {
  "service-check": "Service status check",
  "container-stats": "Container CPU / memory stats",
  "network-quality-check": "Poor-connection check",
  "db-backup": "Database backup (nightly)",
  "db-backup-hourly": "Database backup (hourly)",
  "docker-cleanup": "Docker clean-up",
  "turn-refresh": "TURN pass refresh",
  "recorder-overflow": "Backup recorders (when all busy)",
  "capacity-alert": "Recorder capacity alert",
  "recording-retry": "Retry saving recordings",
  "recording-reconcile": "Recording reconcile",
  "config-backup": "Config backup",
  "recordings-cleanup": "Delete recordings older than 16 days",
  "recorder-scaling": "Keep 8 recorders running",
  "recordings-backup-copy": "Nightly recordings backup copy",
};

function every(seconds: number): string {
  if (seconds >= 86400) return seconds === 86400 ? "daily" : `every ${Math.round(seconds / 86400)} days`;
  if (seconds >= 3600) return seconds === 3600 ? "hourly" : `every ${Math.round(seconds / 3600)} h`;
  return seconds === 60 ? "every minute" : `every ${Math.round(seconds / 60)} min`;
}

function ago(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function duration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

function StatusBadge({ task }: { task: ScheduledTask }) {
  if (task.status === "ok") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> OK
      </Badge>
    );
  }
  if (task.status === "late") {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" /> Not running
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> Failed (exit {task.lastExitCode})
    </Badge>
  );
}

/** Every cron task on every server: did it run, did it work, how long, and its log on demand. */
export function ScheduledTasksPanel({ tasks }: { tasks: ScheduledTask[] }) {
  const [open, setOpen] = useState<ScheduledTask | null>(null);
  const [log, setLog] = useState<ApiServerLogs | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);

  const showLog = async (task: ScheduledTask) => {
    setOpen(task);
    setLog(null);
    setLogError(null);
    setLoadingLog(true);
    try {
      setLog(await getScheduledTaskLog(task.server, task.task));
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Could not load the log.");
    } finally {
      setLoadingLog(false);
    }
  };

  const problems = tasks.filter((t) => t.status !== "ok").length;
  const servers = [...new Set(tasks.map((t) => t.server))];

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Scheduled tasks
            </CardTitle>
            <CardDescription>Automatic jobs on each server: whether each one ran, whether it worked, and its log.</CardDescription>
          </div>
          {tasks.length > 0 &&
            (problems > 0 ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {problems} need{problems === 1 ? "s" : ""} attention
              </Badge>
            ) : (
              <Badge variant="success">All {tasks.length} OK</Badge>
            ))}
        </div>
      </CardHeader>

      {tasks.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">No scheduled task data yet (or monitoring is unreachable).</p>
      ) : (
        <div className="space-y-4 px-2 pb-4">
          {servers.map((server) => (
            <div key={server}>
              <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{server}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last run</TableHead>
                    <TableHead className="hidden sm:table-cell">Took</TableHead>
                    <TableHead className="hidden md:table-cell">Runs</TableHead>
                    <TableHead className="text-right">Log</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks
                    .filter((t) => t.server === server)
                    .sort((a, b) => Number(a.status === "ok") - Number(b.status === "ok"))
                    .map((t) => (
                      <TableRow key={`${t.server}-${t.task}`}>
                        <TableCell>
                          <p className="font-medium">{TASK_LABELS[t.task] ?? t.task}</p>
                          <p className="text-[11px] text-muted-foreground">{t.task}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge task={t} />
                          {t.status !== "ok" && (
                            <p className="mt-1 text-[11px] text-muted-foreground">Last success: {ago(t.lastSuccessUtc)}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{ago(t.lastRunUtc)}</TableCell>
                        <TableCell className="hidden text-sm sm:table-cell">{duration(t.durationSeconds)}</TableCell>
                        <TableCell className="hidden text-sm md:table-cell">{every(t.expectedIntervalSeconds)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => showLog(t)}>
                            <FileText className="h-3.5 w-3.5" /> View log
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{open ? TASK_LABELS[open.task] ?? open.task : ""}</DialogTitle>
            <DialogDescription>
              {open?.server} · last 300 lines, newest at the bottom. Each run starts with a "===" line showing its time, exit code and duration.
            </DialogDescription>
          </DialogHeader>
          {loadingLog ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading log…
            </div>
          ) : logError ? (
            <p className="py-4 text-sm text-destructive">{logError}</p>
          ) : (
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
              {log?.lines.length ? log.lines.join("\n") : "Log is empty."}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
