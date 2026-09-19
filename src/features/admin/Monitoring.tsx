import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Database,
  Disc,
  HardDrive,
  Lock,
  LogIn,
  MemoryStick,
  Moon,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Server,
  TrendingUp,
  Users,
  Video,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  getMonitoringSummary,
  getLiveUsers,
  getTodaySessions,
  toFrontendLiveUsers,
  toFrontendMonitoringSummary,
  toFrontendSessionHistory,
  restartService,
} from "@/api/monitoring";
import { LIVE_USERS, MONITORING_SUMMARY, SESSION_HISTORY } from "@/data/monitoring";
import { MonitoringHubClient } from "@/lib/monitoringHub";
import { useSession } from "@/state/session";
import type { CallQuality, DatabaseInsights, LiveClassSession, MonitoringAlert, MonitoringSummary, ServerStatus, SessionHistoryEntry } from "@/types";
import {
  BroadcastReloadButton,
  CapacityForecastLine,
  num,
  RecorderControls,
  ResourceGauge,
  serviceDisplayName,
  StatTile,
  TrendSparkline,
  usageTone,
  formatAgeShort,
  formatUptime,
} from "./monitoringShared";
import { BurstWorkerPanel } from "./BurstWorkerPanel";

const REFRESH_INTERVAL_MS = 20_000;

const EMPTY_SUMMARY: MonitoringSummary = {
  servers: [],
  apiHealthy: false,
  databaseHealthy: false,
  databaseLatencyMs: 0,
  databaseInsights: null,
  concurrentClassroomUsers: 0,
  activeClassCount: 0,
  activeAlerts: [],
  todayRecordings: { started: 0, succeeded: 0, failed: 0, stillProcessing: 0 },
  burstWorkerUsage: null,
  generatedAtUtc: "",
};

/** "45m ago" / "2h ago" — how long an alert has been active. */
function formatActiveSince(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function AlertsBanner({ alerts, loading }: { alerts: MonitoringAlert[]; loading: boolean }) {
  if (loading) {
    return <Skeleton className="mb-6 h-14 w-full rounded-xl" />;
  }

  if (alerts.length === 0) {
    return (
      <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        <p className="text-sm font-medium text-success">All clear — no active alerts across any monitored server.</p>
      </div>
    );
  }

  const critical = alerts.filter((a) => a.severity === "critical");
  const warning = alerts.filter((a) => a.severity !== "critical");

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-destructive/30">
      <div className="flex items-center gap-2 bg-destructive/10 px-4 py-2.5">
        <AlertOctagon className="h-4 w-4 text-destructive" />
        <p className="text-sm font-semibold text-destructive">
          {alerts.length} active {alerts.length === 1 ? "alert" : "alerts"}
          {critical.length > 0 ? ` · ${critical.length} critical` : ""}
          {warning.length > 0 ? ` · ${warning.length} warning` : ""}
        </p>
      </div>
      <div className="divide-y divide-border bg-card">
        {alerts.map((alert, i) => (
          <div key={`${alert.name}-${alert.instance}-${i}`} className="flex items-start gap-3 px-4 py-3">
            {alert.severity === "critical" ? (
              <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{alert.summary || alert.name}</p>
                <Badge variant={alert.severity === "critical" ? "destructive" : "warning"} className="text-[10px]">
                  {alert.severity}
                </Badge>
                {alert.state === "pending" && (
                  <Badge variant="muted" className="text-[10px]">
                    pending
                  </Badge>
                )}
              </div>
              {alert.description && <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {alert.instance ? `${alert.instance} · ` : ""}active for {formatActiveSince(alert.activeSince)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServerCard({ server }: { server: ServerStatus }) {
  const { hasPermission } = useSession();
  const canManage = hasPermission("SystemMonitoring", "Edit");
  const [restartTarget, setRestartTarget] = useState<string | null>(null);

  if (!server.reachable) {
    // On-demand servers (e.g. a Hetzner burst worker) are torn down between peaks by design --
    // that's the normal, healthy state for this card most of the time, so it gets a neutral
    // "Standby" treatment instead of the red "Unreachable" alarm used for an always-on server
    // that's actually down.
    if (server.isOnDemand) {
      return (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Moon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">{server.name}</h3>
                <p className="text-xs text-muted-foreground">{server.hostname || "Unknown host"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Standby</Badge>
              <Link
                to={`/admin/monitoring/${encodeURIComponent(server.name)}`}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Details <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <EmptyState
            icon={Moon}
            title="Not currently running"
            description={server.error ?? "This is on-demand burst capacity, created automatically only during a scheduled peak."}
          />
        </Card>
      );
    }

    return (
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <WifiOff className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">{server.name}</h3>
              <p className="text-xs text-muted-foreground">{server.hostname || "Unknown host"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">Unreachable</Badge>
            <Link
              to={`/admin/monitoring/${encodeURIComponent(server.name)}`}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <EmptyState
          icon={AlertTriangle}
          title="Agent unreachable"
          description={server.error ?? "Couldn't reach this server's status agent. It may be down or the network path is blocked."}
        />
      </Card>
    );
  }

  const dataStale = num(server.agentDataAgeSeconds) > 180;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
            <Wifi className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-foreground">{server.name}</h3>
            <p className="text-xs text-muted-foreground">
              {server.hostname} · up {formatUptime(num(server.uptimeSeconds))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dataStale && (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Stale data ({formatAgeShort(num(server.agentDataAgeSeconds))})
            </Badge>
          )}
          <Badge variant="success">Online</Badge>
          <Link
            to={`/admin/monitoring/${encodeURIComponent(server.name)}`}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-3", num(server.swapTotalMb) > 0 && "lg:grid-cols-4")}>
        <ResourceGauge icon={Cpu} label="CPU" percent={num(server.cpuUsagePercent)} detail={`${num(server.cpuCores)} cores · load ${num(server.loadAverage1m).toFixed(2)}`} />
        <ResourceGauge
          icon={MemoryStick}
          label="Memory"
          percent={num(server.memoryUsedPercent)}
          detail={`${Math.round((num(server.memoryTotalMb) * num(server.memoryUsedPercent)) / 100 / 1024)} / ${Math.round(num(server.memoryTotalMb) / 1024)} GB`}
        />
        <ResourceGauge
          icon={HardDrive}
          label="Disk"
          percent={num(server.diskUsedPercent)}
          detail={`${Math.round((num(server.diskTotalGb) * num(server.diskUsedPercent)) / 100)} / ${Math.round(num(server.diskTotalGb))} GB`}
        />
        {num(server.swapTotalMb) > 0 && (
          <ResourceGauge
            icon={MemoryStick}
            label="Swap"
            percent={num(server.swapUsedPercent)}
            detail={`${Math.round((num(server.swapTotalMb) * num(server.swapUsedPercent)) / 100 / 1024)} / ${(num(server.swapTotalMb) / 1024).toFixed(1)} GB`}
          />
        )}
      </div>
      <CapacityForecastLine forecast={server.diskForecast ?? null} />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrendSparkline gradientId={`cpu-${server.name}`} data={server.cpuHistory ?? []} label="CPU" color={CHART_PALETTE[0]} />
        <TrendSparkline gradientId={`mem-${server.name}`} data={server.memoryHistory ?? []} label="Memory" color={CHART_PALETTE[1]} />
      </div>

      <div className="mt-4 rounded-lg border border-border p-3.5">
        <p className="mb-3 text-xs font-semibold text-foreground">Network &amp; Disk I/O</p>
        {/* Deliberately always 2-up, not sm:grid-cols-4 — this card sits inside the
            xl:grid-cols-2 server grid below, so its real width is roughly half the
            viewport, not the viewport itself. A viewport-based sm: breakpoint here
            fired well before there was ever four tiles' worth of room, wrapping
            "Network In" / "12.3 Mbps" across two or three lines each. */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile icon={TrendingUp} label="Network In" value={`${num(server.networkRxMbps).toFixed(1)} Mbps`} />
          <StatTile icon={TrendingUp} label="Network Out" value={`${num(server.networkTxMbps).toFixed(1)} Mbps`} />
          <StatTile icon={HardDrive} label="Disk Read" value={`${num(server.diskReadMbps).toFixed(1)} MB/s`} />
          <StatTile icon={HardDrive} label="Disk Write" value={`${num(server.diskWriteMbps).toFixed(1)} MB/s`} />
        </div>
      </div>

      {server.containerMetrics.length > 0 && (
        <div className="mt-4 rounded-lg border border-border p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Top Processes</p>
            <Link to={`/admin/monitoring/${encodeURIComponent(server.name)}`} className="text-[11px] font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-1.5">
            {server.containerMetrics.slice(0, 4).map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-mono text-muted-foreground" title={c.name}>
                  {serviceDisplayName(c.name)}
                </span>
                <span className="shrink-0 font-semibold text-foreground">
                  {c.cpuPercent.toFixed(1)}% CPU · {c.memoryMb >= 1024 ? `${(c.memoryMb / 1024).toFixed(1)} GB` : `${Math.round(c.memoryMb)} MB`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {server.liveCalls && (
        <div className="mt-4 flex items-center gap-4 rounded-lg bg-primary/5 px-3.5 py-2.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Video className="h-4 w-4" /> {num(server.liveCalls.activeConferences)} live {num(server.liveCalls.activeConferences) === 1 ? "class" : "classes"}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" /> {num(server.liveCalls.totalParticipants)} participant{num(server.liveCalls.totalParticipants) === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {server.recorderStatus && (
        <div
          className={cn(
            "mt-3 flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5",
            server.recorderStatus.idleInstances === 0 ? "bg-warning/10" : "bg-muted/40"
          )}
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Disc className="h-4 w-4" /> Recorder
          </span>
          <span className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {num(server.recorderStatus.totalInstances)} total · {num(server.recorderStatus.busyInstances)} recording · {num(server.recorderStatus.idleInstances)} free
            </span>
            <Badge variant={server.recorderStatus.idleInstances === 0 ? "warning" : "success"} className="text-[10px]">
              {server.recorderStatus.idleInstances === 0 ? "At capacity" : `${server.recorderStatus.idleInstances} free`}
            </Badge>
          </span>
        </div>
      )}
      {server.recorderStatus && canManage && <RecorderControls serverName={server.name} recorderStatus={server.recorderStatus} />}

      {server.callQuality && (
        <div className="mt-4 rounded-lg border border-border p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Call Quality</p>
            <Badge variant={server.callQuality.jvbHealthy ? "success" : "destructive"} className="text-[10px]">
              {server.callQuality.jvbHealthy ? "Bridge healthy" : "Bridge unhealthy"}
            </Badge>
          </div>
          {/* Same reasoning as Network & Disk I/O above — this card is at most ~half
              the viewport wide once the server grid goes 2-up, so a viewport sm:
              breakpoint wrapped "Bitrate In/Out" / "850 / 1240 kbps" mid-value. The
              full-width ServerDetail drill-down (ServerDetail.tsx) has real room for
              3-across and keeps its own sm:grid-cols-3 as-is. */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              icon={Activity}
              label="Avg RTT"
              value={`${Math.round(num(server.callQuality.averageRttMs))} ms`}
              tone={num(server.callQuality.averageRttMs) > 250 ? "destructive" : num(server.callQuality.averageRttMs) > 100 ? "warning" : "success"}
            />
            <StatTile
              icon={AlertTriangle}
              label="Packet Loss In/Out"
              value={`${num(server.callQuality.incomingLossPercent).toFixed(1)}% / ${num(server.callQuality.outgoingLossPercent).toFixed(1)}%`}
              tone={Math.max(num(server.callQuality.incomingLossPercent), num(server.callQuality.outgoingLossPercent)) > 5 ? "destructive" : Math.max(num(server.callQuality.incomingLossPercent), num(server.callQuality.outgoingLossPercent)) > 1 ? "warning" : "success"}
            />
            <StatTile
              icon={Zap}
              label="Bridge Stress"
              value={`${Math.round(num(server.callQuality.jvbStressPercent))}%`}
              tone={usageTone(num(server.callQuality.jvbStressPercent))}
            />
            <StatTile
              icon={TrendingUp}
              label="Bitrate In/Out"
              value={`${Math.round(num(server.callQuality.incomingBitrateKbps))} / ${Math.round(num(server.callQuality.outgoingBitrateKbps))} kbps`}
            />
            <StatTile icon={Video} label="Sending Video" value={`${num(server.callQuality.endpointsSendingVideo)}`} />
            <StatTile icon={Users} label="Sending Audio" value={`${num(server.callQuality.endpointsSendingAudio)}`} />
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border p-3.5">
        <p className="mb-3 text-xs font-semibold text-foreground">Services</p>
        <div className="flex flex-wrap gap-1.5">
          {server.services.map((service) => (
            <span key={service.name} className="inline-flex items-center overflow-hidden rounded-md border border-transparent">
              <Badge variant={service.active ? "success" : "destructive"} className="gap-1.5 rounded-r-none font-mono text-[11px]" title={service.name}>
                <span className={cn("h-1.5 w-1.5 rounded-full", service.active ? "bg-success" : "bg-destructive")} />
                {serviceDisplayName(service.name)}
              </Badge>
              {canManage && (
                <button
                  type="button"
                  title={`Restart ${serviceDisplayName(service.name)} — interrupts anything currently using it`}
                  className="flex h-full items-center border-l border-background/40 bg-muted px-1.5 py-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setRestartTarget(service.name)}
                >
                  <PowerOff className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={restartTarget !== null}
        onOpenChange={(open) => !open && setRestartTarget(null)}
        title={`Restart ${restartTarget ? serviceDisplayName(restartTarget) : ""}?`}
        description="This interrupts any active calls or recordings currently using this service on this server. Only do this during a quiet window."
        confirmLabel="Restart"
        destructive
        onConfirm={() => {
          if (restartTarget) return restartService(server.name, restartTarget);
        }}
      />
    </Card>
  );
}

const ROLE_BADGE_VARIANT: Record<string, "default" | "muted"> = { teacher: "default", student: "muted" };

/** "5m ago" / "1h 12m ago" — how long a participant has been connected. */
function formatJoinedAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

/** Admin-only "who's live right now" — real user identity in real-time classroom sessions, so this must never render for a role below Admin's SystemMonitoring:View grant. */
function LiveUsersCard({ sessions, loading, bridgeHealth }: { sessions: LiveClassSession[]; loading: boolean; bridgeHealth: CallQuality | null }) {
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Live Right Now</CardTitle>
            <CardDescription>Every user currently connected to a live class, by session.</CardDescription>
          </div>
          {/* Bridge-wide, not per-session or per-participant — JVB doesn't expose quality broken
              down that granularly, so this is honestly labeled as the whole bridge's health
              rather than implying it's specific to any one class below. */}
          {bridgeHealth && (
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-1.5 text-xs" title="Whole-bridge quality from JVB — not broken down per class or participant.">
              <span className="font-medium text-muted-foreground">Bridge health</span>
              <span className={cn("font-semibold", bridgeHealth.jvbHealthy ? "text-success" : "text-destructive")}>{bridgeHealth.jvbHealthy ? "Healthy" : "Unhealthy"}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-foreground">{Math.round(bridgeHealth.averageRttMs)}ms RTT</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-foreground">{Math.max(bridgeHealth.incomingLossPercent, bridgeHealth.outgoingLossPercent).toFixed(1)}% loss</span>
            </div>
          )}
        </div>
      </CardHeader>
      {sessions.length === 0 ? (
        <EmptyState icon={LogIn} title="No one is live" description="No class currently has a connected participant." />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const runningOver = session.scheduledEndAtUtc ? Date.now() > new Date(session.scheduledEndAtUtc).getTime() : false;
            return (
              <div key={session.sessionId} className="rounded-lg border border-border p-3.5">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {session.courseName}
                      {session.batchName ? ` · ${session.batchName}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.teacherName}
                      {session.startedAtUtc ? ` · started ${formatJoinedAgo(session.startedAtUtc)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {runningOver && (
                      <Badge variant="warning" className="gap-1" title={`Was scheduled to end at ${new Date(session.scheduledEndAtUtc!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}>
                        <AlertTriangle className="h-3 w-3" /> Running over
                      </Badge>
                    )}
                    <Badge variant="success" className="gap-1.5">
                      <Users className="h-3 w-3" /> {session.participants.length}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {session.participants.map((p) => (
                    <Badge
                      key={p.userId}
                      variant={ROLE_BADGE_VARIANT[p.role] ?? "muted"}
                      className="gap-1.5 text-[11px]"
                      title={`Joined ${formatJoinedAgo(p.joinedAtUtc)}${p.connectionCount > 1 ? ` · ${p.connectionCount} simultaneous connections` : ""}${!p.attendanceRecorded ? " · attendance not yet recorded" : ""}`}
                    >
                      {p.name} <span className="opacity-70">· {p.role}</span>
                      {p.connectionCount > 1 && <span className="opacity-70">· {p.connectionCount} devices</span>}
                      {!p.attendanceRecorded && <AlertTriangle className="h-3 w-3 text-warning-foreground" />}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

const SESSION_STATUS_VARIANT: Record<string, "success" | "default" | "warning" | "destructive" | "muted"> = {
  Completed: "success",
  InProgress: "default",
  Scheduled: "muted",
  Cancelled: "destructive",
  Rescheduled: "warning",
  TeacherNoShow: "destructive",
  StudentNoShow: "warning",
  CarriedForward: "warning",
};

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

// Sessions in one of these statuses are still relevant to a live-monitoring view (haven't
// happened yet, or are happening right now); every other status has already concluded for
// the day and is collapsed behind the "passed" toggle below so a busy day's finished/no-show/
// cancelled classes don't bury what actually still needs eyes on it.
const UNRESOLVED_SESSION_STATUSES = new Set(["Scheduled", "InProgress"]);

function SessionRow({ s }: { s: SessionHistoryEntry }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatClockTime(s.scheduledStartAtUtc)} – {formatClockTime(s.scheduledEndAtUtc)}
      </TableCell>
      <TableCell className="text-sm font-medium text-foreground">
        {s.courseName}
        {s.batchName ? ` · ${s.batchName}` : ""}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{s.teacherName}</TableCell>
      <TableCell>
        <Badge variant={SESSION_STATUS_VARIANT[s.status] ?? "muted"} className="text-[11px]">
          {s.status}
        </Badge>
      </TableCell>
      <TableCell
        className={cn(
          "text-right text-sm font-semibold",
          s.status === "Completed" && s.attendedCount < s.expectedCount ? "text-warning-foreground" : "text-foreground"
        )}
      >
        {s.attendedCount} / {s.expectedCount}
      </TableCell>
    </TableRow>
  );
}

/** Today's full session timeline (completed, live, and upcoming) — distinct from LiveUsersCard's live-only snapshot, and durable (backed by SessionAttendance) rather than in-memory presence. */
function TodaySessionsCard({ sessions, loading }: { sessions: SessionHistoryEntry[]; loading: boolean }) {
  const [showPassed, setShowPassed] = useState(false);

  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </Card>
    );
  }

  const unresolved = sessions.filter((s) => UNRESOLVED_SESSION_STATUSES.has(s.status));
  const passed = sessions.filter((s) => !UNRESOLVED_SESSION_STATUSES.has(s.status));

  return (
    <Card className="p-5">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-base">Today&apos;s Sessions</CardTitle>
        <CardDescription>Every class scheduled today, completed and upcoming — attendance from durable records, not live presence.</CardDescription>
      </CardHeader>
      {sessions.length === 0 ? (
        <EmptyState icon={Clock} title="No sessions today" description="Nothing scheduled for today." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Time</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unresolved.map((s) => (
                <SessionRow key={s.sessionId} s={s} />
              ))}
              {showPassed && passed.map((s) => <SessionRow key={s.sessionId} s={s} />)}
            </TableBody>
          </Table>
          {unresolved.length === 0 && passed.length > 0 && !showPassed && (
            <EmptyState icon={Clock} title="Nothing left today" description={`All ${passed.length} of today's sessions have already concluded.`} />
          )}
          {passed.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 gap-1.5 text-muted-foreground"
              onClick={() => setShowPassed((v) => !v)}
            >
              {showPassed ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Hide {passed.length} passed session{passed.length === 1 ? "" : "s"}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show {passed.length} passed session{passed.length === 1 ? "" : "s"}
                </>
              )}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

function DatabaseInsightsCard({ insights, loading }: { insights: DatabaseInsights | null; loading: boolean }) {
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-4 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base">Database Insights</CardTitle>
          <CardDescription>Postgres internals for the app database.</CardDescription>
        </CardHeader>
        <EmptyState icon={Database} title="No database metrics yet" description="postgres-exporter isn't reachable, or Monitoring:DatabaseName isn't configured." />
      </Card>
    );
  }

  const activeConnections = num(insights.activeConnections);
  const maxConnections = num(insights.maxConnections);
  const cacheHitRatioPercent = num(insights.cacheHitRatioPercent);
  const commitsPerSecond = num(insights.commitsPerSecond);
  const rollbacksPerSecond = num(insights.rollbacksPerSecond);
  const databaseSizeMb = num(insights.databaseSizeMb);
  const locksHeld = num(insights.locksHeld);
  const deadlocksTotal = num(insights.deadlocksTotal);
  const connectionsPercent = maxConnections > 0 ? (activeConnections / maxConnections) * 100 : 0;

  return (
    <Card className="p-5">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-base">Database Insights</CardTitle>
        <CardDescription>Live Postgres internals for the app database, from postgres-exporter.</CardDescription>
      </CardHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon={Users}
          label="Connections"
          value={`${activeConnections} / ${maxConnections}`}
          detail={`${Math.round(connectionsPercent)}% of pool`}
          tone={usageTone(connectionsPercent)}
        />
        <StatTile icon={Zap} label="Cache Hit Ratio" value={`${cacheHitRatioPercent.toFixed(1)}%`} tone={cacheHitRatioPercent >= 95 ? "success" : "warning"} />
        <StatTile icon={HardDrive} label="Database Size" value={databaseSizeMb >= 1024 ? `${(databaseSizeMb / 1024).toFixed(2)} GB` : `${Math.round(databaseSizeMb)} MB`} />
        <StatTile icon={TrendingUp} label="Commits/sec" value={commitsPerSecond.toFixed(2)} />
        <StatTile
          icon={RotateCcw}
          label="Rollbacks/sec"
          value={rollbacksPerSecond.toFixed(2)}
          tone={rollbacksPerSecond > 0.5 ? "warning" : "neutral"}
        />
        <StatTile
          icon={Lock}
          label="Locks / Deadlocks"
          value={`${locksHeld} / ${deadlocksTotal}`}
          tone={deadlocksTotal > 0 ? "destructive" : "neutral"}
        />
      </div>
    </Card>
  );
}

function ServerCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function AdminMonitoring() {
  const usingApi = apiEnabled();
  const { hasPermission } = useSession();
  const canViewLiveUsers = hasPermission("SystemMonitoring", "View");
  const canManage = hasPermission("SystemMonitoring", "Edit");
  const { data: restSummary, loading, error, reload } = useApiData(
    () => getMonitoringSummary().then(toFrontendMonitoringSummary),
    MONITORING_SUMMARY,
    EMPTY_SUMMARY
  );
  const { data: liveUsers, loading: liveUsersLoading, reload: reloadLiveUsers } = useApiData(
    () => getLiveUsers().then(toFrontendLiveUsers),
    LIVE_USERS,
    []
  );
  const { data: todaySessions, loading: todaySessionsLoading, reload: reloadTodaySessions } = useApiData(
    () => getTodaySessions().then(toFrontendSessionHistory),
    SESSION_HISTORY,
    []
  );
  const [liveSummary, setLiveSummary] = useState<MonitoringSummary | null>(null);
  const [hubConnected, setHubConnected] = useState(false);
  const summary = liveSummary ?? restSummary;

  // Live push: MonitoringHub broadcasts a fresh summary on its own cycle (see
  // MonitoringBroadcastService) instead of this page polling for one.
  useEffect(() => {
    if (!usingApi) return;
    const client = new MonitoringHubClient();
    client.connect(
      (payload) => setLiveSummary(toFrontendMonitoringSummary(payload)),
      (state) => setHubConnected(state === "connected")
    );
    return () => {
      client.disconnect();
    };
  }, [usingApi]);

  // Fallback poll — only while the live push isn't connected, so a blocked WebSocket or a
  // down hub doesn't leave the page silently stale.
  useEffect(() => {
    if (!usingApi || hubConnected) return;
    const interval = setInterval(reload, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [usingApi, hubConnected, reload]);

  // Live-users has no MonitoringHub push of its own — plain polling, only for a caller who
  // can actually see it, since it's other users' real-time presence.
  useEffect(() => {
    if (!usingApi || !canViewLiveUsers) return;
    const interval = setInterval(reloadLiveUsers, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [usingApi, canViewLiveUsers, reloadLiveUsers]);

  useEffect(() => {
    if (!usingApi || !canViewLiveUsers) return;
    const interval = setInterval(reloadTodaySessions, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [usingApi, canViewLiveUsers, reloadTodaySessions]);

  const totalConferences = summary.servers.reduce((sum, s) => sum + (s.liveCalls?.activeConferences ?? 0), 0);
  const totalParticipants = summary.servers.reduce((sum, s) => sum + (s.liveCalls?.totalParticipants ?? 0), 0);
  const unreachableCount = summary.servers.filter((s) => !s.reachable).length;

  // Same "started, not still live, no recording, real batch class" definition the backend's
  // TodayRecordings.Failed count uses (batchName is only ever set for a real batch class --
  // demo/personal-link sessions always come back null here, same as the backend's own
  // BatchId IS NOT NULL filter) -- lets the KPI card's failed count actually be clicked
  // through to which session(s), instead of an admin having to ask for a one-off query
  // every time (as happened twice tonight).
  const [failedRecordingsOpen, setFailedRecordingsOpen] = useState(false);
  const failedRecordingSessions = todaySessions.filter(
    (s) => s.batchName !== null && s.actualStartAtUtc !== null && s.status !== "InProgress" && !s.hasRecording
  );

  return (
    <div>
      <PageHeader
        eyebrow="Infrastructure"
        title="Server Monitoring"
        description="Live health for every production server the platform runs on — resources, services, and active classes."
        actions={
          <>
            {hubConnected && (
              <Badge variant="success" className="gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Live
              </Badge>
            )}
            {canManage && <BroadcastReloadButton />}
            <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </>
        }
      />

      <AlertsBanner alerts={summary.activeAlerts ?? []} loading={loading && summary.servers.length === 0} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Concurrent Users"
          value={`${num(summary.concurrentClassroomUsers)}`}
          detail={`${num(summary.activeClassCount)} active ${num(summary.activeClassCount) === 1 ? "class" : "classes"}`}
          icon={Users}
          tone="primary"
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Servers Online"
          value={`${summary.servers.length - unreachableCount} / ${summary.servers.length}`}
          icon={Server}
          tone={unreachableCount > 0 ? "destructive" : "success"}
          loading={loading}
          error={error}
        />
        <KpiCard
          label="API"
          value={summary.apiHealthy ? "Healthy" : "Down"}
          icon={Activity}
          tone={summary.apiHealthy ? "success" : "destructive"}
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Database"
          value={summary.databaseHealthy ? "Healthy" : "Down"}
          detail={summary.databaseHealthy ? `${num(summary.databaseLatencyMs).toFixed(1)} ms` : undefined}
          icon={Database}
          tone={summary.databaseHealthy ? "success" : "destructive"}
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Live Classes"
          value={`${totalConferences}`}
          detail={`${totalParticipants} participant${totalParticipants === 1 ? "" : "s"}`}
          icon={Video}
          tone="primary"
          loading={loading}
          error={error}
        />
        {/* "Started, not still live, no session_recordings row" -- same definition used all
            night to trace individual sync failures by hand, now on the dashboard instead of a
            one-off SQL query. stillProcessing (an in-progress class, recording not synced yet)
            is deliberately excluded from both the headline and the failed count -- it hasn't
            failed, it just isn't done. */}
        <KpiCard
          label="Today's Recordings"
          value={`${num(summary.todayRecordings?.succeeded)} / ${num(summary.todayRecordings?.started)}`}
          detail={
            num(summary.todayRecordings?.failed) > 0
              ? `${num(summary.todayRecordings?.failed)} not synced yet`
              : "All synced"
          }
          icon={Disc}
          tone={num(summary.todayRecordings?.failed) > 0 ? "destructive" : "success"}
          loading={loading}
          error={error}
          onClick={num(summary.todayRecordings?.failed) > 0 ? () => setFailedRecordingsOpen(true) : undefined}
        />
        {/* Null (not zeroed) means the usage log couldn't be fetched (e.g. main unreachable) --
            shown as "—", not a false "never used." */}
        <KpiCard
          label="Burst Capacity Cost"
          value={summary.burstWorkerUsage ? `$${summary.burstWorkerUsage.estimatedCostTodayUsd.toFixed(2)}` : "—"}
          detail={
            summary.burstWorkerUsage
              ? summary.burstWorkerUsage.currentlyActive
                ? `${summary.burstWorkerUsage.episodesToday} time${summary.burstWorkerUsage.episodesToday === 1 ? "" : "s"} today · running now`
                : `${summary.burstWorkerUsage.episodesToday} time${summary.burstWorkerUsage.episodesToday === 1 ? "" : "s"} today`
              : "Usage data unavailable"
          }
          icon={Zap}
          tone={summary.burstWorkerUsage?.currentlyActive ? "primary" : "neutral"}
          loading={loading}
          error={error}
        />
      </div>

      {/* Always rendered (even with no history yet, or if the usage lookup failed) so the emergency
          Start now button is there when it is actually needed. */}
      <BurstWorkerPanel usage={summary.burstWorkerUsage} canManage={canManage} onChanged={reload} />

      <Dialog open={failedRecordingsOpen} onOpenChange={setFailedRecordingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recordings not synced yet</DialogTitle>
            <DialogDescription>
              These classes ended but have no registered recording. Most catch up on their own within the hour — check back before assuming one is truly lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {failedRecordingSessions.length === 0 ? (
              <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                These just caught up — nothing unsynced right now. Refresh the page to update the count above.
              </p>
            ) : (
              failedRecordingSessions.map((s) => (
                <div key={s.sessionId} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium text-foreground">
                    {s.courseName}
                    {s.batchName ? ` · ${s.batchName}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.teacherName} · {formatClockTime(s.scheduledStartAtUtc)}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {canViewLiveUsers && (
        <div className="mt-6 space-y-5">
          <LiveUsersCard
            sessions={liveUsers}
            loading={liveUsersLoading && liveUsers.length === 0}
            bridgeHealth={summary.servers.find((s) => s.callQuality)?.callQuality ?? null}
          />
          <TodaySessionsCard sessions={todaySessions} loading={todaySessionsLoading && todaySessions.length === 0} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        {loading && summary.servers.length === 0 ? (
          <>
            <ServerCardSkeleton />
            <ServerCardSkeleton />
          </>
        ) : summary.servers.length === 0 ? (
          <div className="xl:col-span-2">
            <EmptyState icon={Server} title="No servers configured" description="Add servers under Monitoring:Servers in the API configuration." />
          </div>
        ) : (
          summary.servers.map((server) => <ServerCard key={server.name} server={server} />)
        )}
      </div>

      <div className="mt-5">
        <DatabaseInsightsCard insights={summary.databaseInsights} loading={loading && !summary.databaseInsights} />
      </div>

      {summary.generatedAtUtc && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Last updated {new Date(summary.generatedAtUtc).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
          {hubConnected ? " · live-updating" : ` · auto-refreshes every ${REFRESH_INTERVAL_MS / 1000}s`}
        </p>
      )}
    </div>
  );
}
