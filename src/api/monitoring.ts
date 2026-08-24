import { apiFetch } from "@/lib/api";
import type { MonitoringSummary } from "@/types";

export interface ApiMonitoredService {
  name: string;
  active: boolean;
}

export interface ApiTimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface ApiLiveCallSummary {
  activeConferences: number;
  totalParticipants: number;
}

export interface ApiCapacityForecast {
  isFilling: boolean;
  daysUntilFull: number | null;
  trendGbPerDay: number;
}

export interface ApiCallQuality {
  averageRttMs: number;
  incomingLossPercent: number;
  outgoingLossPercent: number;
  incomingBitrateKbps: number;
  outgoingBitrateKbps: number;
  endpointsSendingAudio: number;
  endpointsSendingVideo: number;
  jvbStressPercent: number;
  jvbHealthy: boolean;
}

export interface ApiServerStatus {
  name: string;
  hostname: string;
  reachable: boolean;
  error: string | null;
  uptimeSeconds: number;
  loadAverage1m: number;
  cpuCores: number;
  cpuUsagePercent: number;
  memoryUsedPercent: number;
  memoryTotalMb: number;
  diskUsedPercent: number;
  diskTotalGb: number;
  networkRxMbps: number;
  networkTxMbps: number;
  diskReadMbps: number;
  diskWriteMbps: number;
  services: ApiMonitoredService[];
  agentDataAgeSeconds: number;
  liveCalls: ApiLiveCallSummary | null;
  cpuHistory: ApiTimeSeriesPoint[];
  memoryHistory: ApiTimeSeriesPoint[];
  callQuality: ApiCallQuality | null;
  diskForecast: ApiCapacityForecast | null;
}

export interface ApiDatabaseInsights {
  activeConnections: number;
  maxConnections: number;
  commitsPerSecond: number;
  rollbacksPerSecond: number;
  cacheHitRatioPercent: number;
  databaseSizeMb: number;
  deadlocksTotal: number;
  locksHeld: number;
}

export interface ApiMonitoringAlert {
  name: string;
  severity: string;
  summary: string;
  description: string;
  state: string;
  activeSince: string;
  instance: string | null;
}

export interface ApiMonitoringSummary {
  servers: ApiServerStatus[];
  apiHealthy: boolean;
  databaseHealthy: boolean;
  databaseLatencyMs: number;
  databaseInsights: ApiDatabaseInsights | null;
  concurrentClassroomUsers: number;
  activeClassCount: number;
  activeAlerts: ApiMonitoringAlert[];
  generatedAtUtc: string;
}

export async function getMonitoringSummary(): Promise<ApiMonitoringSummary> {
  return apiFetch<ApiMonitoringSummary>("/api/monitoring/summary");
}

export function toFrontendMonitoringSummary(api: ApiMonitoringSummary): MonitoringSummary {
  return {
    apiHealthy: api.apiHealthy,
    databaseHealthy: api.databaseHealthy,
    databaseLatencyMs: api.databaseLatencyMs,
    databaseInsights: api.databaseInsights,
    concurrentClassroomUsers: api.concurrentClassroomUsers,
    activeClassCount: api.activeClassCount,
    activeAlerts: api.activeAlerts,
    generatedAtUtc: api.generatedAtUtc,
    servers: api.servers.map((s) => ({
      name: s.name,
      hostname: s.hostname,
      reachable: s.reachable,
      error: s.error,
      uptimeSeconds: s.uptimeSeconds,
      loadAverage1m: s.loadAverage1m,
      cpuCores: s.cpuCores,
      cpuUsagePercent: s.cpuUsagePercent,
      memoryUsedPercent: s.memoryUsedPercent,
      memoryTotalMb: s.memoryTotalMb,
      diskUsedPercent: s.diskUsedPercent,
      diskTotalGb: s.diskTotalGb,
      networkRxMbps: s.networkRxMbps,
      networkTxMbps: s.networkTxMbps,
      diskReadMbps: s.diskReadMbps,
      diskWriteMbps: s.diskWriteMbps,
      services: s.services,
      agentDataAgeSeconds: s.agentDataAgeSeconds,
      liveCalls: s.liveCalls,
      cpuHistory: s.cpuHistory,
      memoryHistory: s.memoryHistory,
      callQuality: s.callQuality,
      diskForecast: s.diskForecast,
    })),
  };
}
