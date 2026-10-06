import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertOctagon, ArrowLeft, CheckCircle2, RefreshCw, Users, WifiOff } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, setVisibleInterval } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { getMonitoringSummary, toFrontendMonitoringSummary } from "@/api/monitoring";
import { MONITORING_SUMMARY } from "@/data/monitoring";
import { MonitoringHubClient } from "@/lib/monitoringHub";
import { splitNetworkAlerts } from "@/lib/networkAlerts";
import type { MonitoringSummary } from "@/types";

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
  scheduledTasks: [],
  recordingPipeline: null,
  callQualityIncidents: [],
  callQualityIncidentsLookSystemic: false,
  generatedAtUtc: "",
};

function minutesSince(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** "Frederique lost bandwidth 7 times in the last 10 minutes ..." -> 7. */
function dropCount(description: string): string {
  return description.match(/lost bandwidth (\d+) times/)?.[1] ?? "—";
}

export default function NetworkAlerts() {
  const usingApi = apiEnabled();
  const { data: restSummary, loading, reload } = useApiData(
    () => getMonitoringSummary().then(toFrontendMonitoringSummary),
    MONITORING_SUMMARY,
    EMPTY_SUMMARY
  );
  const [liveSummary, setLiveSummary] = useState<MonitoringSummary | null>(null);
  const [hubConnected, setHubConnected] = useState(false);
  const summary = liveSummary ?? restSummary;

  // Same live push + fallback poll as Server Monitoring (the alerts ride on the same summary).
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

  useEffect(() => {
    if (!usingApi || hubConnected) return;
    const interval = setVisibleInterval(reload, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [usingApi, hubConnected, reload]);

  const { people, systemWide } = splitNetworkAlerts(summary.activeAlerts ?? []);
  const firstLoad = loading && summary.generatedAtUtc === "";

  return (
    <div>
      <PageHeader
        eyebrow="Live classes"
        title="Network Alerts"
        description="People in a live class right now whose internet keeps dropping, and any problem affecting everyone. Updates on its own."
        actions={
          <>
            {hubConnected && (
              <Badge variant="success" className="gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Live
              </Badge>
            )}
            <Button variant="outline" size="sm" asChild>
              {/* relative="path": ".." must land on .../monitoring, not the role's layout route. */}
              <Link to=".." relative="path">
                <ArrowLeft className="h-3.5 w-3.5" />
                Server Monitoring
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="People with poor connection"
          value={`${people.length}`}
          detail="dropped 3+ times in the last 10 minutes"
          icon={Users}
          tone={people.length > 0 ? "warning" : "success"}
          loading={firstLoad}
        />
        <KpiCard
          label="Problems affecting everyone"
          value={`${systemWide.length}`}
          detail={systemWide.length > 0 ? "check the video server" : "video service is healthy"}
          icon={AlertOctagon}
          tone={systemWide.length > 0 ? "destructive" : "success"}
          loading={firstLoad}
        />
      </div>

      {systemWide.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-destructive/30">
          {systemWide.map((alert, i) => (
            <div key={`${alert.name}-${i}`} className="flex items-start gap-3 bg-destructive/5 px-4 py-3">
              <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{alert.summary || alert.name}</p>
                {alert.description && <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">active for {minutesSince(alert.activeSince)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            Poor connection right now
          </CardTitle>
          <CardDescription>
            Usually the person's own internet. Ask them to move closer to Wi-Fi, turn off their camera, or rejoin. A row
            clears on its own about 10 minutes after their connection recovers.
          </CardDescription>
        </CardHeader>
        {firstLoad ? (
          <div className="space-y-2 p-6 pt-0">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : people.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Everyone's connection looks fine" description="No one in a live class has a weak connection right now." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Drops (10 min)</TableHead>
                <TableHead className="text-right">Going on for</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((alert, i) => (
                <TableRow key={`${alert.person}-${alert.className}-${i}`}>
                  <TableCell className="font-medium">{alert.person ?? alert.summary}</TableCell>
                  <TableCell className="text-muted-foreground">{alert.className ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{dropCount(alert.description)}</TableCell>
                  <TableCell className="text-right tabular-nums">{minutesSince(alert.activeSince)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
