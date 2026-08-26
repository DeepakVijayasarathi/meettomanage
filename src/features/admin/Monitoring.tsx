import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
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
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { getMonitoringSummary, toFrontendMonitoringSummary } from "@/api/monitoring";
import { MONITORING_SUMMARY } from "@/data/monitoring";
import { MonitoringHubClient } from "@/lib/monitoringHub";
import type { DatabaseInsights, MonitoringAlert, MonitoringSummary, ServerStatus } from "@/types";
import {
  CapacityForecastLine,
  num,
  ResourceGauge,
  serviceDisplayName,
  StatTile,
  TrendSparkline,
  usageTone,
  formatAgeShort,
  formatUptime,
} from "./monitoringShared";

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
      <CapacityForecastLine forecast={server.diskForecast ?? null} />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrendSparkline gradientId={`cpu-${server.name}`} data={server.cpuHistory ?? []} label="CPU" color={CHART_PALETTE[0]} />
        <TrendSparkline gradientId={`mem-${server.name}`} data={server.memoryHistory ?? []} label="Memory" color={CHART_PALETTE[1]} />
      </div>

      <div className="mt-4 rounded-lg border border-border p-3.5">
        <p className="mb-3 text-xs font-semibold text-foreground">Network &amp; Disk I/O</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={TrendingUp} label="Network In" value={`${num(server.networkRxMbps).toFixed(1)} Mbps`} />
          <StatTile icon={TrendingUp} label="Network Out" value={`${num(server.networkTxMbps).toFixed(1)} Mbps`} />
          <StatTile icon={HardDrive} label="Disk Read" value={`${num(server.diskReadMbps).toFixed(1)} MB/s`} />
          <StatTile icon={HardDrive} label="Disk Write" value={`${num(server.diskWriteMbps).toFixed(1)} MB/s`} />
        </div>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            <Badge key={service.name} variant={service.active ? "success" : "destructive"} className="gap-1.5 font-mono text-[11px]" title={service.name}>
              <span className={cn("h-1.5 w-1.5 rounded-full", service.active ? "bg-success" : "bg-destructive")} />
              {serviceDisplayName(service.name)}
            </Badge>
          ))}
        </div>
      </div>
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
  const { data: restSummary, loading, error, reload } = useApiData(
    () => getMonitoringSummary().then(toFrontendMonitoringSummary),
    MONITORING_SUMMARY,
    EMPTY_SUMMARY
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
          <>
            {hubConnected && (
              <Badge variant="success" className="gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Live
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </>
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
          Last updated {new Date(summary.generatedAtUtc).toLocaleTimeString()}
          {hubConnected ? " · live-updating" : ` · auto-refreshes every ${REFRESH_INTERVAL_MS / 1000}s`}
        </p>
      )}
    </div>
  );
}
