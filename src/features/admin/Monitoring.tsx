import { useEffect } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  HardDrive,
  Lock,
  MemoryStick,
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
import { AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { getMonitoringSummary, toFrontendMonitoringSummary } from "@/api/monitoring";
import { MONITORING_SUMMARY } from "@/data/monitoring";
import type { DatabaseInsights, MonitoringAlert, MonitoringSummary, ServerStatus, TimeSeriesPoint } from "@/types";

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

function formatUptime(seconds: number): string {
  if (seconds <= 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Guards every numeric field the API might not send yet on a backend that's a step behind this frontend's deploy. */
function num(value: number | undefined | null): number {
  return typeof value === "number" ? value : 0;
}

function formatAgeShort(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

/** Green under 60%, amber to 85%, red beyond — same read for every resource gauge on the page. */
function usageTone(percent: number): "success" | "warning" | "destructive" {
  if (percent >= 85) return "destructive";
  if (percent >= 60) return "warning";
  return "success";
}

const TONE_BAR_CLASS: Record<ReturnType<typeof usageTone>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

function ResourceGauge({ icon: Icon, label, percent, detail }: { icon: typeof Cpu; label: string; percent: number; detail: string }) {
  const tone = usageTone(percent);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="font-semibold text-foreground">{Math.round(percent)}%</span>
      </div>
      <Progress value={Math.min(100, percent)} indicatorClassName={TONE_BAR_CLASS[tone]} />
      <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function formatSparklineTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Compact last-hour trend, not a full ChartCard — this sits inside an already-dense server
 * card, so axes/grid are dropped entirely (values are 0-100%, self-evident from the fill
 * height) while keeping the one thing a trend line earns its space with: a real hover
 * tooltip, not a static sparkline image.
 */
function TrendSparkline({ gradientId, data, label, color }: { gradientId: string; data: TimeSeriesPoint[]; label: string; color: string }) {
  if (data.length < 2) {
    return (
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label} · last hour</p>
        <div className="flex h-[70px] items-center justify-center rounded-lg bg-muted/30 text-[11px] text-muted-foreground">Not enough data yet</div>
      </div>
    );
  }

  const latest = data[data.length - 1].value;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label} · last hour</p>
        <p className="text-xs font-semibold text-foreground">{Math.round(latest)}%</p>
      </div>
      <div className="h-[70px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timestamp" hide />
            <YAxis domain={[0, 100]} hide />
            <RTooltip
              formatter={(value: number) => [`${value.toFixed(1)}%`, label]}
              labelFormatter={(value: string) => formatSparklineTime(value)}
              contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "6px 10px" }}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ServerCard({ server }: { server: ServerStatus }) {
  if (!server.reachable) {
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
          <Badge variant="destructive">Unreachable</Badge>
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrendSparkline gradientId={`cpu-${server.name}`} data={server.cpuHistory ?? []} label="CPU" color={CHART_PALETTE[0]} />
        <TrendSparkline gradientId={`mem-${server.name}`} data={server.memoryHistory ?? []} label="Memory" color={CHART_PALETTE[1]} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={TrendingUp} label="Network In" value={`${num(server.networkRxMbps).toFixed(1)} Mbps`} />
        <StatTile icon={TrendingUp} label="Network Out" value={`${num(server.networkTxMbps).toFixed(1)} Mbps`} />
        <StatTile icon={HardDrive} label="Disk Read" value={`${num(server.diskReadMbps).toFixed(1)} MB/s`} />
        <StatTile icon={HardDrive} label="Disk Write" value={`${num(server.diskWriteMbps).toFixed(1)} MB/s`} />
      </div>

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

      {server.callQuality && (
        <div className="mt-4 rounded-lg border border-border p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Call Quality</p>
            <Badge variant={server.callQuality.jvbHealthy ? "success" : "destructive"} className="text-[10px]">
              {server.callQuality.jvbHealthy ? "Bridge healthy" : "Bridge unhealthy"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              icon={TrendingUp}
              label="Bitrate In/Out"
              value={`${Math.round(num(server.callQuality.incomingBitrateKbps))} / ${Math.round(num(server.callQuality.outgoingBitrateKbps))} kbps`}
            />
            <StatTile
              icon={Zap}
              label="Bridge Stress"
              value={`${Math.round(num(server.callQuality.jvbStressPercent))}%`}
              tone={usageTone(num(server.callQuality.jvbStressPercent))}
            />
            <StatTile icon={Video} label="Sending Video" value={`${num(server.callQuality.endpointsSendingVideo)}`} />
            <StatTile icon={Users} label="Sending Audio" value={`${num(server.callQuality.endpointsSendingAudio)}`} />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {server.services.map((service) => (
          <Badge key={service.name} variant={service.active ? "success" : "destructive"} className="font-mono text-[11px]">
            <span className={cn("h-1.5 w-1.5 rounded-full", service.active ? "bg-success" : "bg-destructive")} />
            {service.name}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "success" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning-foreground" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border border-border p-3.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <p className={cn("mt-1.5 text-lg font-bold tracking-tight", toneClass)}>{value}</p>
      {detail && <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>}
    </div>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={Users}
          label="Connections"
          value={`${activeConnections} / ${maxConnections}`}
          detail={`${Math.round(connectionsPercent)}% of pool`}
          tone={usageTone(connectionsPercent)}
        />
        <StatTile icon={Zap} label="Cache Hit Ratio" value={`${cacheHitRatioPercent.toFixed(1)}%`} tone={cacheHitRatioPercent >= 95 ? "success" : "warning"} />
        <StatTile icon={TrendingUp} label="Commits/sec" value={commitsPerSecond.toFixed(2)} />
        <StatTile
          icon={RotateCcw}
          label="Rollbacks/sec"
          value={rollbacksPerSecond.toFixed(2)}
          tone={rollbacksPerSecond > 0.5 ? "warning" : "neutral"}
        />
        <StatTile icon={HardDrive} label="Database Size" value={databaseSizeMb >= 1024 ? `${(databaseSizeMb / 1024).toFixed(2)} GB` : `${Math.round(databaseSizeMb)} MB`} />
        <StatTile icon={Lock} label="Locks Held" value={`${locksHeld}`} />
        <StatTile
          icon={AlertTriangle}
          label="Deadlocks (total)"
          value={`${deadlocksTotal}`}
          tone={deadlocksTotal > 0 ? "destructive" : "success"}
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
  const { data: summary, loading, error, reload } = useApiData(
    () => getMonitoringSummary().then(toFrontendMonitoringSummary),
    MONITORING_SUMMARY,
    EMPTY_SUMMARY
  );

  // Auto-refresh: this page is meant to be left open on a screen, not re-polled by hand.
  useEffect(() => {
    if (!usingApi) return;
    const interval = setInterval(reload, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [usingApi, reload]);

  const totalConferences = summary.servers.reduce((sum, s) => sum + (s.liveCalls?.activeConferences ?? 0), 0);
  const totalParticipants = summary.servers.reduce((sum, s) => sum + (s.liveCalls?.totalParticipants ?? 0), 0);
  const unreachableCount = summary.servers.filter((s) => !s.reachable).length;

  return (
    <div>
      <PageHeader
        eyebrow="Infrastructure"
        title="Server Monitoring"
        description="Live health for every production server the platform runs on — resources, services, and active classes."
        actions={
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <AlertsBanner alerts={summary.activeAlerts ?? []} loading={loading && summary.servers.length === 0} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
      </div>

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
          Last updated {new Date(summary.generatedAtUtc).toLocaleTimeString()} · auto-refreshes every {REFRESH_INTERVAL_MS / 1000}s
        </p>
      )}
    </div>
  );
}
