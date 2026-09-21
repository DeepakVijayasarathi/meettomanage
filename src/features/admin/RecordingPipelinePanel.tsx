import { AlertTriangle, CheckCircle2, Clock, Disc, HardDrive, Layers, Link2Off } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RecordingPipeline, ServerStatus } from "@/types";
import { StatTile } from "./monitoringShared";

function ago(iso: string | null): string {
  if (!iso) return "none yet";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ${minutes % 60}m ago` : `${Math.floor(hours / 24)}d ago`;
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/**
 * "Did the class recording reach the portal?" -- registered vs. not attached to any class vs. stuck,
 * plus recordings-disk headroom. Unattached recordings (personal/demo/ad-hoc rooms) exist on disk but
 * can never show under a class, which is the usual reason a recorded session "isn't in the portal".
 */
export function RecordingPipelinePanel({ pipeline }: { pipeline: RecordingPipeline | null }) {
  if (!pipeline) {
    return (
      <Card className="mt-6 p-5">
        <CardHeader className="p-0">
          <CardTitle className="text-base">Recording Pipeline</CardTitle>
          <CardDescription>Could not reach the video server to read recording status.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stuck = pipeline.pendingRegistration + pipeline.failedToday;
  const diskTone = pipeline.diskFreePercent < 10 || (pipeline.daysOfDiskLeft !== null && pipeline.daysOfDiskLeft < 5)
    ? "destructive"
    : pipeline.diskFreePercent < 25 || (pipeline.daysOfDiskLeft !== null && pipeline.daysOfDiskLeft < 10)
      ? "warning"
      : "success";

  return (
    <Card className="mt-6 p-5">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Disc className="h-4 w-4 text-primary" />
              Recording Pipeline
            </CardTitle>
            <CardDescription>Are finished recordings reaching the portal? Counts are for today (IST).</CardDescription>
          </div>
          {stuck > 0 ? (
            <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{stuck} need attention</Badge>
          ) : (
            <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />Nothing stuck</Badge>
          )}
        </div>
      </CardHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={CheckCircle2} label="Attached to a class" value={`${pipeline.registeredToday}`} detail="Visible in the portal" tone="success" />
        <StatTile
          icon={Link2Off}
          label="Not attached to any class"
          value={`${pipeline.unattachedToday}`}
          detail={pipeline.unattachedToday > 0 ? "Personal / demo / test rooms" : "None today"}
          tone={pipeline.unattachedToday > 0 ? "warning" : "neutral"}
        />
        <StatTile
          icon={Clock}
          label="Stuck or failed"
          value={`${stuck}`}
          detail={stuck > 0 ? `${pipeline.pendingRegistration} retrying · ${pipeline.failedToday} failed` : "All registered"}
          tone={stuck > 0 ? "destructive" : "success"}
        />
        <StatTile icon={Disc} label="Newest recording" value={ago(pipeline.newestRecordingUtc)} tone="neutral" />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile
          icon={HardDrive}
          label="Recordings disk free"
          value={`${pipeline.diskFreeGb.toFixed(0)} GB (${pipeline.diskFreePercent.toFixed(0)}%)`}
          detail={`of ${pipeline.diskTotalGb.toFixed(0)} GB`}
          tone={diskTone}
        />
        <StatTile
          icon={HardDrive}
          label="Disk runway at today's pace"
          value={pipeline.daysOfDiskLeft === null ? "—" : `${pipeline.daysOfDiskLeft.toFixed(0)} days`}
          detail={`${pipeline.growthLast24hGb.toFixed(1)} GB recorded in the last 24h`}
          tone={diskTone}
        />
      </div>

      {pipeline.unattached.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Recordings not attached to a class — the files are safe on the server, but no class session uses these rooms.
          </p>
          <div className="divide-y divide-border rounded-lg border border-border text-sm">
            {pipeline.unattached.slice(0, 8).map((u) => (
              <div key={u.room + u.atUtc} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate font-mono text-xs text-foreground">{u.room}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{clock(u.atUtc)} · {mmss(u.durationSeconds)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Recorder slots across every recording server, side by side, so load balance is visible at a glance:
 * how many recordings are running on each box and how much headroom is left before a class is missed.
 */
export function RecorderCapacityStrip({ servers }: { servers: ServerStatus[] }) {
  const fleets = servers.filter((s) => s.recorderStatus && s.recorderStatus.totalInstances > 0 && s.reachable);
  const standby = servers.filter((s) => s.isOnDemand && s.recorderStatus === null && s.name.toLowerCase().includes("recording"));
  if (fleets.length === 0) return null;

  const busy = fleets.reduce((n, s) => n + (s.recorderStatus?.busyInstances ?? 0), 0);
  const total = fleets.reduce((n, s) => n + (s.recorderStatus?.totalInstances ?? 0), 0);
  const free = Math.max(0, total - busy);

  return (
    <Card className="mt-6 p-5">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-primary" />
              Recorder Capacity
            </CardTitle>
            <CardDescription>Recordings running right now on each recording server.</CardDescription>
          </div>
          <Badge variant={free === 0 ? "destructive" : free <= 2 ? "warning" : "success"}>
            {busy} of {total} recorders busy · {free} free
          </Badge>
        </div>
      </CardHeader>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fleets.map((s) => {
          const r = s.recorderStatus!;
          const pct = r.totalInstances > 0 ? Math.min(100, (r.busyInstances / r.totalInstances) * 100) : 0;
          return (
            <div key={s.name} className="rounded-lg border border-border p-3.5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="text-muted-foreground">{r.busyInstances} / {r.totalInstances}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-destructive" : pct >= 60 ? "bg-warning" : "bg-success")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {standby.map((s) => (
          <div key={s.name} className="flex items-center justify-between rounded-lg border border-dashed border-border p-3.5 text-sm">
            <span className="font-medium text-foreground">{s.name}</span>
            <Badge variant="secondary">Standby — starts automatically under load</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
