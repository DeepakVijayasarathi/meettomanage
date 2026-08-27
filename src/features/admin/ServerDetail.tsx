import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  FileText,
  Gauge,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Server,
  TrendingUp,
  Users,
  Video,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Legend, ReferenceLine, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { EmptyState } from "@/components/EmptyState";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { getMonitoringSummary, getServerLogs, toFrontendMonitoringSummary, type ApiServerLogs } from "@/api/monitoring";
import { MONITORING_SUMMARY } from "@/data/monitoring";
import { MonitoringHubClient } from "@/lib/monitoringHub";
import type { CallQuality, MonitoringSummary, TimeSeriesPoint } from "@/types";
import {
  CapacityForecastLine,
  formatAgeShort,
  formatSparklineTime,
  formatUptime,
  num,
  serviceDisplayName,
  StatTile,
  usageTone,
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

/** "Aug 25, 2:14 PM" — the timeline's fixed anchor point, alongside the relative "active for" duration. */
function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

interface MergedHistoryPoint {
  timestamp: string;
  cpu?: number;
  memory?: number;
}

/** Zips the two independently-sampled history series by timestamp so one chart can plot both. */
function mergeHistories(cpu: TimeSeriesPoint[], memory: TimeSeriesPoint[]): MergedHistoryPoint[] {
  const byTimestamp = new Map<string, MergedHistoryPoint>();
  for (const p of cpu) byTimestamp.set(p.timestamp, { timestamp: p.timestamp, cpu: p.value });
  for (const p of memory) {
    const existing = byTimestamp.get(p.timestamp);
    byTimestamp.set(p.timestamp, { timestamp: p.timestamp, cpu: existing?.cpu, memory: p.value });
  }
  return Array.from(byTimestamp.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/** Min/avg/max over a trend series — the same legend a Zabbix graph shows beneath its plot, computed client-side from the hour of history the API already sends. */
function summarize(data: TimeSeriesPoint[]): { min: number; avg: number; max: number } | null {
  if (data.length === 0) return null;
  const values = data.map((p) => p.value);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
  };
}

/** One verdict from the raw RTT/loss/stress numbers — the numbers alone don't say whether a call is actually fine. */
function callQualityScore(cq: CallQuality): { label: string; tone: "success" | "warning" | "destructive" } {
  const loss = Math.max(cq.incomingLossPercent, cq.outgoingLossPercent);
  if (!cq.jvbHealthy || cq.averageRttMs > 250 || loss > 5 || cq.jvbStressPercent > 85) {
    return { label: "Poor", tone: "destructive" };
  }
  if (cq.averageRttMs > 100 || loss > 1 || cq.jvbStressPercent > 60) {
    return { label: "Fair", tone: "warning" };
  }
  return { label: "Excellent", tone: "success" };
}

/** Item descriptions for the Latest Data table — a Zabbix "item description" tooltip, since the raw metric names alone don't say what they measure. */
const METRIC_DESCRIPTIONS: Record<string, string> = {
  "CPU Usage": "Percentage of all cores currently in use, averaged over the last collection interval.",
  "CPU Cores": "Number of logical CPU cores available to this server.",
  "Load Average (1m)": "Unix load average over the last 1 minute — runnable processes per core; above 1.0 per core means work is queuing.",
  "Memory Used": "Percentage of physical RAM currently in use.",
  "Memory Total": "Total physical RAM installed on this server.",
  "Disk Used": "Percentage of the primary disk volume currently in use.",
  "Disk Total": "Total capacity of the primary disk volume.",
  "Network In": "Inbound network throughput, averaged over the last collection interval.",
  "Network Out": "Outbound network throughput, averaged over the last collection interval.",
  "Disk Read": "Disk read throughput, averaged over the last collection interval.",
  "Disk Write": "Disk write throughput, averaged over the last collection interval.",
  Uptime: "Time since this server's OS was last booted.",
  "Agent Data Age": "How long ago the monitoring agent on this server last wrote its status file.",
};

const STATUS_DOT_CLASS: Record<"success" | "warning" | "destructive" | "neutral", string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground/40",
};

const STATUS_LABEL: Record<"success" | "warning" | "destructive" | "neutral", string> = {
  success: "Normal",
  warning: "Warning",
  destructive: "Critical",
  neutral: "—",
};

function LatestDataRow({ metric, value, tone = "neutral" }: { metric: string; value: string; tone?: "success" | "warning" | "destructive" | "neutral" }) {
  return (
    <TableRow>
      <TableCell className="cursor-help font-medium text-foreground" title={METRIC_DESCRIPTIONS[metric]}>
        {metric}
      </TableCell>
      <TableCell className="font-mono text-sm tabular-nums">{value}</TableCell>
      <TableCell>
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_CLASS[tone])} />
          {STATUS_LABEL[tone]}
        </span>
      </TableCell>
    </TableRow>
  );
}

/** On-demand, not auto-refreshed like the rest of the page — each fetch opens a live SSH connection to run `docker logs`, so it's deliberately not polled every 20s. */
function ContainerLogsPanel({ serverName, services }: { serverName: string; services: string[] }) {
  const [container, setContainer] = useState(services[0] ?? "");
  const [logs, setLogs] = useState<ApiServerLogs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (services.length === 0) return null;

  const fetchLogs = async () => {
    if (!container) return;
    setLoading(true);
    setError(null);
    try {
      setLogs(await getServerLogs(serverName, container));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't fetch logs.");
      setLogs(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-base">Container Logs</CardTitle>
        <CardDescription>Error-filtered docker logs tail, fetched live over SSH on request.</CardDescription>
      </CardHeader>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={container} onValueChange={setContainer}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s} value={s}>
                {serviceDisplayName(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <FileText className={cn("h-3.5 w-3.5", loading && "animate-pulse")} />
          {loading ? "Fetching…" : "Fetch logs"}
        </Button>
        {logs && (
          <span className="text-xs text-muted-foreground">
            {logs.lines.length} line{logs.lines.length === 1 ? "" : "s"} · {new Date(logs.fetchedAtUtc).toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {logs && !error && (
        <div className="mt-3 max-h-96 overflow-auto rounded-lg bg-muted/40 p-3">
          {logs.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No error-looking lines in the last window — clean.</p>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground">{logs.lines.join("\n")}</pre>
          )}
        </div>
      )}
    </Card>
  );
}

export default function AdminServerDetail() {
  const { serverName } = useParams<{ serverName: string }>();
  const navigate = useNavigate();
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

  // Fallback poll — only while the live push isn't connected.
  useEffect(() => {
    if (!usingApi || hubConnected) return;
    const interval = setInterval(reload, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [usingApi, hubConnected, reload]);

  const server = useMemo(
    () => summary.servers.find((s) => s.name === decodeURIComponent(serverName ?? "")),
    [summary.servers, serverName]
  );

  const scopedAlerts = useMemo(() => {
    if (!server) return [];
    return (summary.activeAlerts ?? [])
      .filter((a) => a.instance && (a.instance.includes(server.hostname) || a.instance.includes(server.name)))
      .sort((a, b) => new Date(b.activeSince).getTime() - new Date(a.activeSince).getTime());
  }, [summary.activeAlerts, server]);

  const historyData = useMemo(() => mergeHistories(server?.cpuHistory ?? [], server?.memoryHistory ?? []), [server]);
  const cpuSummary = useMemo(() => summarize(server?.cpuHistory ?? []), [server]);
  const memorySummary = useMemo(() => summarize(server?.memoryHistory ?? []), [server]);

  const backLink = (
    <Breadcrumb
      className="mb-4"
      items={[
        { label: "Server Monitoring", to: "/admin/monitoring" },
        { label: server?.name ?? decodeURIComponent(serverName ?? "Server") },
      ]}
    />
  );

  if (loading && summary.servers.length === 0) {
    return (
      <div>
        {backLink}
        <Skeleton className="mb-6 h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div>
        {backLink}
        <EmptyState
          icon={Server}
          title="Server not found"
          description={`No server named "${decodeURIComponent(serverName ?? "")}" is currently reported by the monitoring API.`}
          action={<Button onClick={() => navigate("/admin/monitoring")}>Back to Server Monitoring</Button>}
        />
      </div>
    );
  }

  const dataStale = num(server.agentDataAgeSeconds) > 180;

  return (
    <div>
      {backLink}
      <PageHeader
        eyebrow="Infrastructure"
        title={server.name}
        description={server.reachable ? `${server.hostname} · up ${formatUptime(num(server.uptimeSeconds))}` : server.hostname || "Unknown host"}
        actions={
          <>
            {server.reachable ? (
              <>
                {dataStale && (
                  <Badge variant="warning" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> Stale data ({formatAgeShort(num(server.agentDataAgeSeconds))})
                  </Badge>
                )}
                <Badge variant="success" className="gap-1">
                  <Wifi className="h-3 w-3" /> Online
                </Badge>
              </>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="h-3 w-3" /> Unreachable
              </Badge>
            )}
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

      {!server.reachable ? (
        <EmptyState
          icon={AlertTriangle}
          title="Agent unreachable"
          description={server.error ?? "Couldn't reach this server's status agent. It may be down or the network path is blocked."}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="CPU Usage" value={`${Math.round(num(server.cpuUsagePercent))}%`} detail={`${num(server.cpuCores)} cores · load ${num(server.loadAverage1m).toFixed(2)}`} icon={Cpu} tone={usageTone(num(server.cpuUsagePercent))} />
            <KpiCard
              label="Memory Usage"
              value={`${Math.round(num(server.memoryUsedPercent))}%`}
              detail={`${Math.round((num(server.memoryTotalMb) * num(server.memoryUsedPercent)) / 100 / 1024)} / ${Math.round(num(server.memoryTotalMb) / 1024)} GB`}
              icon={MemoryStick}
              tone={usageTone(num(server.memoryUsedPercent))}
            />
            <KpiCard
              label="Disk Usage"
              value={`${Math.round(num(server.diskUsedPercent))}%`}
              detail={`${Math.round((num(server.diskTotalGb) * num(server.diskUsedPercent)) / 100)} / ${Math.round(num(server.diskTotalGb))} GB`}
              icon={HardDrive}
              tone={usageTone(num(server.diskUsedPercent))}
            />
            <KpiCard label="Uptime" value={formatUptime(num(server.uptimeSeconds))} detail={`Agent data ${formatAgeShort(num(server.agentDataAgeSeconds))}`} icon={Clock} tone={dataStale ? "warning" : "neutral"} />
          </div>

          {server.diskForecast && (
            <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3">
              <CapacityForecastLine forecast={server.diskForecast} />
            </div>
          )}

          <div className="mt-5">
            <ChartCard
              title="Resource Trends"
              description={`CPU and memory utilization, last hour${historyData.length >= 2 ? ` · ${historyData.length} samples` : ""}`}
              height={320}
            >
              {historyData.length < 2 ? (
                <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
                  <Gauge className="h-5 w-5" />
                  <span>Not enough history yet — check back in a few minutes.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="detail-cpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_PALETTE[0]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={CHART_PALETTE[0]} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="detail-mem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_PALETTE[1]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={CHART_PALETTE[1]} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="timestamp" tickFormatter={formatSparklineTime} tickLine={false} axisLine={false} fontSize={12} minTickGap={40} />
                    <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={false} fontSize={12} width={44} />
                    <RTooltip
                      labelFormatter={(value: string) => formatSparklineTime(value)}
                      formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === "cpu" ? "CPU" : "Memory"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    />
                    <Legend
                      formatter={(value: string) => <span className="text-xs font-medium text-foreground">{value === "cpu" ? "CPU" : "Memory"}</span>}
                    />
                    <ReferenceLine
                      y={60}
                      stroke="hsl(var(--warning))"
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                      label={{ value: "Warning (60%)", position: "insideBottomRight", fontSize: 10, fill: "hsl(var(--warning-foreground))" }}
                    />
                    <ReferenceLine
                      y={85}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                      label={{ value: "Critical (85%)", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--destructive))" }}
                    />
                    <Area type="monotone" dataKey="cpu" name="cpu" stroke={CHART_PALETTE[0]} strokeWidth={2} fill="url(#detail-cpu)" connectNulls isAnimationActive={false} />
                    <Area type="monotone" dataKey="memory" name="memory" stroke={CHART_PALETTE[1]} strokeWidth={2} fill="url(#detail-mem)" connectNulls isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {(cpuSummary || memorySummary) && (
            <div className="mt-5">
              <Card className="p-5">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base">Last Hour Summary</CardTitle>
                  <CardDescription>Min / average / max over the plotted window.</CardDescription>
                </CardHeader>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {cpuSummary && (
                    <>
                      <StatTile icon={Cpu} label="CPU Min" value={`${Math.round(cpuSummary.min)}%`} />
                      <StatTile icon={Cpu} label="CPU Avg" value={`${Math.round(cpuSummary.avg)}%`} tone={usageTone(cpuSummary.avg)} />
                      <StatTile icon={Cpu} label="CPU Max" value={`${Math.round(cpuSummary.max)}%`} tone={usageTone(cpuSummary.max)} />
                    </>
                  )}
                  {memorySummary && (
                    <>
                      <StatTile icon={MemoryStick} label="Memory Min" value={`${Math.round(memorySummary.min)}%`} />
                      <StatTile icon={MemoryStick} label="Memory Avg" value={`${Math.round(memorySummary.avg)}%`} tone={usageTone(memorySummary.avg)} />
                      <StatTile icon={MemoryStick} label="Memory Max" value={`${Math.round(memorySummary.max)}%`} tone={usageTone(memorySummary.max)} />
                    </>
                  )}
                </div>
              </Card>
            </div>
          )}

          <div className="mt-5">
            <Card className="p-5">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base">Latest Data</CardTitle>
                <CardDescription>Every raw metric this server's agent last reported.</CardDescription>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <LatestDataRow metric="CPU Usage" value={`${num(server.cpuUsagePercent).toFixed(1)}%`} tone={usageTone(num(server.cpuUsagePercent))} />
                  <LatestDataRow metric="CPU Cores" value={`${num(server.cpuCores)}`} />
                  <LatestDataRow metric="Load Average (1m)" value={num(server.loadAverage1m).toFixed(2)} />
                  <LatestDataRow metric="Memory Used" value={`${num(server.memoryUsedPercent).toFixed(1)}%`} tone={usageTone(num(server.memoryUsedPercent))} />
                  <LatestDataRow metric="Memory Total" value={`${(num(server.memoryTotalMb) / 1024).toFixed(1)} GB`} />
                  <LatestDataRow metric="Disk Used" value={`${num(server.diskUsedPercent).toFixed(1)}%`} tone={usageTone(num(server.diskUsedPercent))} />
                  <LatestDataRow metric="Disk Total" value={`${num(server.diskTotalGb).toFixed(0)} GB`} />
                  <LatestDataRow metric="Network In" value={`${num(server.networkRxMbps).toFixed(2)} Mbps`} />
                  <LatestDataRow metric="Network Out" value={`${num(server.networkTxMbps).toFixed(2)} Mbps`} />
                  <LatestDataRow metric="Disk Read" value={`${num(server.diskReadMbps).toFixed(2)} MB/s`} />
                  <LatestDataRow metric="Disk Write" value={`${num(server.diskWriteMbps).toFixed(2)} MB/s`} />
                  <LatestDataRow metric="Uptime" value={formatUptime(num(server.uptimeSeconds))} />
                  <LatestDataRow metric="Agent Data Age" value={formatAgeShort(num(server.agentDataAgeSeconds))} tone={dataStale ? "warning" : "success"} />
                </TableBody>
              </Table>
            </Card>
          </div>

          {server.liveCalls && (
            <div className="mt-5 flex items-center gap-4 rounded-lg bg-primary/5 px-4 py-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Video className="h-4 w-4" /> {num(server.liveCalls.activeConferences)} live {num(server.liveCalls.activeConferences) === 1 ? "class" : "classes"}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" /> {num(server.liveCalls.totalParticipants)} participant{num(server.liveCalls.totalParticipants) === 1 ? "" : "s"}
              </span>
            </div>
          )}

          {server.callQuality && (
            <div className="mt-5">
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Call Quality</CardTitle>
                    <CardDescription>Live from JVB's own Prometheus endpoint.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={callQualityScore(server.callQuality).tone}>{callQualityScore(server.callQuality).label} quality</Badge>
                    <Badge variant={server.callQuality.jvbHealthy ? "success" : "destructive"}>
                      {server.callQuality.jvbHealthy ? "Bridge healthy" : "Bridge unhealthy"}
                    </Badge>
                  </div>
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
                  <StatTile icon={Zap} label="Bridge Stress" value={`${Math.round(num(server.callQuality.jvbStressPercent))}%`} tone={usageTone(num(server.callQuality.jvbStressPercent))} />
                  <StatTile icon={TrendingUp} label="Bitrate In/Out" value={`${Math.round(num(server.callQuality.incomingBitrateKbps))} / ${Math.round(num(server.callQuality.outgoingBitrateKbps))} kbps`} />
                  <StatTile icon={Video} label="Sending Video" value={`${num(server.callQuality.endpointsSendingVideo)}`} />
                  <StatTile icon={Users} label="Sending Audio" value={`${num(server.callQuality.endpointsSendingAudio)}`} />
                </div>
              </Card>
            </div>
          )}

          <div className="mt-5">
            <Card className="p-5">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base">Services</CardTitle>
                <CardDescription>Processes and containers this agent watches on {server.hostname}.</CardDescription>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {server.services.map((service) => (
                    <TableRow key={service.name}>
                      <TableCell className="font-mono text-sm" title={service.name}>
                        {serviceDisplayName(service.name)}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span className={cn("h-1.5 w-1.5 rounded-full", service.active ? "bg-success" : "bg-destructive")} />
                          {service.active ? "Running" : "Down"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {usingApi && (
            <div className="mt-5">
              <ContainerLogsPanel serverName={server.name} services={server.services.map((s) => s.name)} />
            </div>
          )}

          <div className="mt-5">
            <Card className="p-5">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base">Alert Timeline</CardTitle>
                <CardDescription>Active Prometheus alerts scoped to this server, most recent first.</CardDescription>
              </CardHeader>
              {scopedAlerts.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Gauge className="h-4 w-4 text-success" /> No active alerts scoped to this server.
                </p>
              ) : (
                <div className="relative">
                  <div className="absolute bottom-1 left-[7px] top-1 w-px bg-border" aria-hidden="true" />
                  <div className="space-y-5">
                    {scopedAlerts.map((alert, i) => (
                      <div key={`${alert.name}-${i}`} className="relative pl-6">
                        <span
                          className={cn(
                            "absolute left-0 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-card",
                            alert.severity === "critical" ? "bg-destructive" : "bg-warning"
                          )}
                        />
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
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
                          <time className="shrink-0 text-[11px] font-medium text-muted-foreground" dateTime={alert.activeSince}>
                            {formatAbsoluteTime(alert.activeSince)}
                          </time>
                        </div>
                        {alert.description && <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>}
                        <p className="mt-1 text-[11px] text-muted-foreground">active for {formatActiveSince(alert.activeSince)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {error && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" /> Couldn&apos;t refresh: {error}
        </p>
      )}
      {summary.generatedAtUtc && !error && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Last updated {new Date(summary.generatedAtUtc).toLocaleTimeString()}
          {hubConnected ? " · live-updating" : ` · auto-refreshes every ${REFRESH_INTERVAL_MS / 1000}s`}
        </p>
      )}
    </div>
  );
}
