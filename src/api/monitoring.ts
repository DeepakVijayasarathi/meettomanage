import { apiFetch } from "@/lib/api";
import type { MonitoringSummary } from "@/types";

export interface ApiMonitoredService {
  name: string;
  active: boolean;
}

export interface ApiLiveCallSummary {
  activeConferences: number;
  totalParticipants: number;
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
  services: ApiMonitoredService[];
  agentDataAgeSeconds: number;
  liveCalls: ApiLiveCallSummary | null;
}

export interface ApiMonitoringSummary {
  servers: ApiServerStatus[];
  apiHealthy: boolean;
  databaseHealthy: boolean;
  databaseLatencyMs: number;
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
      services: s.services,
      agentDataAgeSeconds: s.agentDataAgeSeconds,
      liveCalls: s.liveCalls,
    })),
  };
}
