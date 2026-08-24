import { useEffect } from "react";
import {
  Activity,
  AlertTriangle,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { getMonitoringSummary, toFrontendMonitoringSummary } from "@/api/monitoring";
import { MONITORING_SUMMARY } from "@/data/monitoring";
import type { DatabaseInsights, MonitoringSummary, ServerStatus } from "@/types";

const REFRESH_INTERVAL_MS = 20_000;

const EMPTY_SUMMARY: MonitoringSummary = {
  servers: [],
  apiHealthy: false,
  databaseHealthy: false,
  databaseLatencyMs: 0,
  databaseInsights: null,
  generatedAtUtc: "",
};

function formatUptime(seconds: number): string {
  if (seconds <= 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

  const dataStale = server.agentDataAgeSeconds > 180;

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
              {server.hostname} · up {formatUptime(server.uptimeSeconds)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dataStale && (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Stale data ({formatAgeShort(server.agentDataAgeSeconds)})
            </Badge>
          )}
          <Badge variant="success">Online</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResourceGauge icon={Cpu} label="CPU" percent={server.cpuUsagePercent} detail={`${server.cpuCores} cores · load ${server.loadAverage1m.toFixed(2)}`} />
        <ResourceGauge
          icon={MemoryStick}
          label="Memory"
          percent={server.memoryUsedPercent}
          detail={`${Math.round((server.memoryTotalMb * server.memoryUsedPercent) / 100 / 1024)} / ${Math.round(server.memoryTotalMb / 1024)} GB`}
        />
        <ResourceGauge
          icon={HardDrive}
          label="Disk"
          percent={server.diskUsedPercent}
          detail={`${Math.round((server.diskTotalGb * server.diskUsedPercent) / 100)} / ${Math.round(server.diskTotalGb)} GB`}
        />
      </div>

      {server.liveCalls && (
        <div className="mt-4 flex items-center gap-4 rounded-lg bg-primary/5 px-3.5 py-2.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Video className="h-4 w-4" /> {server.liveCalls.activeConferences} live {server.liveCalls.activeConferences === 1 ? "class" : "classes"}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" /> {server.liveCalls.totalParticipants} participant{server.liveCalls.totalParticipants === 1 ? "" : "s"}
          </span>
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

  const connectionsPercent = insights.maxConnections > 0 ? (insights.activeConnections / insights.maxConnections) * 100 : 0;

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
          value={`${insights.activeConnections} / ${insights.maxConnections}`}
          detail={`${Math.round(connectionsPercent)}% of pool`}
          tone={usageTone(connectionsPercent)}
        />
        <StatTile icon={Zap} label="Cache Hit Ratio" value={`${insights.cacheHitRatioPercent.toFixed(1)}%`} tone={insights.cacheHitRatioPercent >= 95 ? "success" : "warning"} />
        <StatTile icon={TrendingUp} label="Commits/sec" value={insights.commitsPerSecond.toFixed(2)} />
        <StatTile
          icon={RotateCcw}
          label="Rollbacks/sec"
          value={insights.rollbacksPerSecond.toFixed(2)}
          tone={insights.rollbacksPerSecond > 0.5 ? "warning" : "neutral"}
        />
        <StatTile icon={HardDrive} label="Database Size" value={insights.databaseSizeMb >= 1024 ? `${(insights.databaseSizeMb / 1024).toFixed(2)} GB` : `${Math.round(insights.databaseSizeMb)} MB`} />
        <StatTile icon={Lock} label="Locks Held" value={`${insights.locksHeld}`} />
        <StatTile
          icon={AlertTriangle}
          label="Deadlocks (total)"
          value={`${insights.deadlocksTotal}`}
          tone={insights.deadlocksTotal > 0 ? "destructive" : "success"}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          detail={summary.databaseHealthy ? `${summary.databaseLatencyMs.toFixed(1)} ms` : undefined}
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
