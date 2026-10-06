import { AlertTriangle, CheckCircle2, Clock, Disc, HardDrive, HelpCircle, Layers, Link2Off, Mic, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CallQualityIncident, MonitoringSummary, RecordingPipeline, ServerStatus } from "@/types";
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

type CheckState = "ok" | "warn" | "fail" | "unknown";
interface ReadinessCheck {
  label: string;
  state: CheckState;
  detail: string;
}

const CHECK_ICON = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle, unknown: HelpCircle } as const;
const CHECK_TONE = { ok: "text-success", warn: "text-warning-foreground", fail: "text-destructive", unknown: "text-muted-foreground" } as const;

/** Every check is derived from live data already on the page -- nothing is hardcoded per server or per role. */
export function buildReadinessChecks(summary: MonitoringSummary): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [];
  const always = summary.servers.filter((s) => !s.isOnDemand);
  const down = always.filter((s) => !s.reachable);
  checks.push({
    label: "Servers online",
    state: always.length === 0 ? "unknown" : down.length === 0 ? "ok" : "fail",
    detail: down.length === 0 ? `${always.length} of ${always.length} always-on servers reachable` : `Unreachable: ${down.map((s) => s.name).join(", ")}`,
  });
  const coreHealthy = summary.apiHealthy && summary.databaseHealthy;
  checks.push({
    label: "API and database",
    state: coreHealthy ? "ok" : "fail",
    detail: coreHealthy ? `Healthy, database ${summary.databaseLatencyMs.toFixed(0)} ms` : "API or database not healthy",
  });

  const fleets = summary.servers.filter((s) => s.reachable && s.recorderStatus && s.recorderStatus.totalInstances > 0);
  const total = fleets.reduce((n, s) => n + (s.recorderStatus?.totalInstances ?? 0), 0);
  const busy = fleets.reduce((n, s) => n + (s.recorderStatus?.busyInstances ?? 0), 0);
  checks.push({
    label: "Recorders ready",
    state: total === 0 || total - busy === 0 ? "fail" : total - busy <= 2 ? "warn" : "ok",
    detail: total === 0 ? "No recorders online" : `${total - busy} of ${total} free now`,
  });

  const p = summary.recordingPipeline;
  if (!p) {
    checks.push({ label: "Recordings reaching the portal", state: "unknown", detail: "Video server not readable" });
    checks.push({ label: "Recording disk runway", state: "unknown", detail: "Video server not readable" });
  } else {
    const stuck = p.pendingRegistration + p.failedToday;
    checks.push({
      label: "Recordings reaching the portal",
      state: stuck > 0 ? "fail" : "ok",
      detail: stuck > 0 ? `${stuck} stuck or failed` : `${p.registeredToday} attached today, none stuck`,
    });
    const days = p.daysOfDiskLeft;
    const critical = p.diskFreePercent < 10 || (days !== null && days < 5);
    const low = p.diskFreePercent < 25 || (days !== null && days < 10);
    checks.push({
      label: "Recording disk runway",
      state: critical ? "fail" : low ? "warn" : "ok",
      detail: days === null ? `${p.diskFreeGb.toFixed(0)} GB free` : `${p.diskFreeGb.toFixed(0)} GB free, about ${days.toFixed(0)} days at the current pace`,
    });
  }

  const alerts = summary.activeAlerts ?? [];
  checks.push({
    label: "Active alerts",
    state: alerts.some((a) => a.severity === "critical") ? "fail" : alerts.length > 0 ? "warn" : "ok",
    detail: alerts.length === 0 ? "None" : alerts.map((a) => a.name).join(", "),
  });
  return checks;
}

/** One-glance answer to "are we ready for classes?", with the reason behind every tick. */
export function ReadinessCard({ summary, loading }: { summary: MonitoringSummary; loading: boolean }) {
  if (loading && summary.servers.length === 0) return null;
  const checks = buildReadinessChecks(summary);
  const failed = checks.filter((c) => c.state === "fail").length;
  const warned = checks.filter((c) => c.state === "warn" || c.state === "unknown").length;
  const headline = failed > 0 ? "Needs attention" : warned > 0 ? "Mostly ready" : "Ready for classes";
  return (
    <Card className="mb-6 p-5">
      <CardHeader className="p-0 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Readiness
            </CardTitle>
            <CardDescription>Everything that has to be true for classes to run and be recorded.</CardDescription>
          </div>
          <Badge variant={failed > 0 ? "destructive" : warned > 0 ? "warning" : "success"}>{headline}</Badge>
        </div>
      </CardHeader>
      <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 md:grid-cols-2">
        {checks.map((c) => {
          const Icon = CHECK_ICON[c.state];
          return (
            <div key={c.label} className="flex items-start gap-2.5 py-1 text-sm">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", CHECK_TONE[c.state])} />
              <div className="min-w-0">
                <p className="font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function durationLabel(firstIso: string, lastIso: string): string {
  const seconds = Math.max(0, Math.round((new Date(lastIso).getTime() - new Date(firstIso).getTime()) / 1000));
  if (seconds < 60) return "a moment";
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

const clockIncident = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Per-participant audio/video trouble, straight from JVB's own bandwidth-estimation warnings --
 * "camera works, mic doesn't" (or the reverse) shows up here as a participant's bandwidth collapsing
 * to near zero. The distinction that matters: many different rooms in a short window points at
 * shared bridge contention (a server problem); a lone row is ordinary individual network variance
 * that no server change eliminates -- callQualityIncidentsLookSystemic tells them apart.
 */
export function CallQualityIncidentsPanel({ incidents, looksSystemic }: { incidents: CallQualityIncident[]; looksSystemic: boolean }) {
  return (
    <Card className="mt-6 p-5">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="h-4 w-4 text-primary" />
              Audio/Video Incidents
            </CardTitle>
            <CardDescription>
              Participants whose call quality collapsed, last 24 hours &mdash; from the video bridge&apos;s own reports.
            </CardDescription>
          </div>
          {incidents.length === 0 ? (
            <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />None in 24h</Badge>
          ) : looksSystemic ? (
            <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Spread across several classes</Badge>
          ) : (
            <Badge variant="secondary">Isolated ({incidents.length})</Badge>
          )}
        </div>
      </CardHeader>

      {incidents.length === 0 ? (
        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          No participant reported a bandwidth collapse in the last 24 hours.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {looksSystemic
              ? "Several different classes affected around the same time -- likely a shared server issue, not individual networks."
              : "Each row below is its own isolated case -- consistent with that participant's own network at the time, not a server problem."}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class room</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Lowest bandwidth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.slice(0, 10).map((i) => (
                <TableRow key={i.roomName + i.participantLabel + i.firstAtUtc}>
                  <TableCell className="max-w-[220px] truncate font-mono text-xs text-foreground">{i.roomName}</TableCell>
                  <TableCell className="text-sm text-foreground">{i.participantLabel}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{clockIncident(i.firstAtUtc)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{durationLabel(i.firstAtUtc, i.lastAtUtc)}</TableCell>
                  <TableCell className="text-right text-xs font-medium text-destructive">{i.lowestKbps.toFixed(0)} kbps</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </Card>
  );
}
