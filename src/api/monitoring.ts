import { apiFetch } from "@/lib/api";
import type { LiveClassSession, MonitoringSummary, SessionHistoryEntry } from "@/types";

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

export interface ApiRecorderStatus {
  totalInstances: number;
  busyInstances: number;
  idleInstances: number;
  minInstances: number;
  maxInstances: number;
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

export interface ApiContainerMetric {
  name: string;
  cpuPercent: number;
  memoryMb: number;
}

export interface ApiCapacityTrend {
  cpuAvg7dPercent: number;
  cpuPeak7dPercent: number;
  cpuWeekOverWeekChangePercent: number;
  recordingAtCapacityPercent7d: number | null;
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
  swapUsedPercent: number;
  swapTotalMb: number;
  diskUsedPercent: number;
  diskTotalGb: number;
  networkRxMbps: number;
  networkTxMbps: number;
  diskReadMbps: number;
  diskWriteMbps: number;
  services: ApiMonitoredService[];
  agentDataAgeSeconds: number;
  liveCalls: ApiLiveCallSummary | null;
  recorderStatus: ApiRecorderStatus | null;
  cpuHistory: ApiTimeSeriesPoint[];
  memoryHistory: ApiTimeSeriesPoint[];
  callQuality: ApiCallQuality | null;
  diskForecast: ApiCapacityForecast | null;
  containerMetrics: ApiContainerMetric[];
  capacityTrend: ApiCapacityTrend | null;
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

export interface ApiLiveParticipant {
  userId: string;
  name: string;
  role: string;
  joinedAtUtc: string;
  connectionCount: number;
  attendanceRecorded: boolean;
}

export interface ApiLiveClassSession {
  sessionId: string;
  courseName: string;
  batchName: string | null;
  teacherName: string;
  startedAtUtc: string | null;
  scheduledEndAtUtc: string | null;
  participants: ApiLiveParticipant[];
}

/** Every live class session with a connected participant right now, and who's in it — admin-only visibility into other users' real-time presence. */
export async function getLiveUsers(): Promise<ApiLiveClassSession[]> {
  return apiFetch<ApiLiveClassSession[]>("/api/monitoring/live-users");
}

export interface ApiSessionHistoryEntry {
  sessionId: string;
  courseName: string;
  batchName: string | null;
  teacherName: string;
  scheduledStartAtUtc: string;
  scheduledEndAtUtc: string;
  actualStartAtUtc: string | null;
  actualEndAtUtc: string | null;
  status: string;
  attendedCount: number;
  expectedCount: number;
}

/** Every session scheduled today (IST), live or not, with attendance counts. */
export async function getTodaySessions(): Promise<ApiSessionHistoryEntry[]> {
  return apiFetch<ApiSessionHistoryEntry[]>("/api/monitoring/today-sessions");
}

export function toFrontendLiveUsers(api: ApiLiveClassSession[]): LiveClassSession[] {
  return api.map((s) => ({
    sessionId: s.sessionId,
    courseName: s.courseName,
    batchName: s.batchName,
    teacherName: s.teacherName,
    startedAtUtc: s.startedAtUtc,
    scheduledEndAtUtc: s.scheduledEndAtUtc,
    participants: s.participants.map((p) => ({
      userId: p.userId,
      name: p.name,
      role: p.role,
      joinedAtUtc: p.joinedAtUtc,
      connectionCount: p.connectionCount,
      attendanceRecorded: p.attendanceRecorded,
    })),
  }));
}

export function toFrontendSessionHistory(api: ApiSessionHistoryEntry[]): SessionHistoryEntry[] {
  return api.map((s) => ({
    sessionId: s.sessionId,
    courseName: s.courseName,
    batchName: s.batchName,
    teacherName: s.teacherName,
    scheduledStartAtUtc: s.scheduledStartAtUtc,
    scheduledEndAtUtc: s.scheduledEndAtUtc,
    actualStartAtUtc: s.actualStartAtUtc,
    actualEndAtUtc: s.actualEndAtUtc,
    status: s.status,
    attendedCount: s.attendedCount,
    expectedCount: s.expectedCount,
  }));
}

export interface ApiServerLogs {
  server: string;
  container: string;
  lines: string[];
  fetchedAtUtc: string;
}

/** Error-filtered `docker logs` tail for one container on one server, fetched over SSH server-side — see IServerLogService. */
export async function getServerLogs(serverName: string, container: string, lines = 300): Promise<ApiServerLogs> {
  const params = new URLSearchParams({ container, lines: String(lines) });
  return apiFetch<ApiServerLogs>(`/api/monitoring/servers/${encodeURIComponent(serverName)}/logs?${params.toString()}`);
}

export interface ApiJibriControlResult {
  server: string;
  action: string;
  logTail: string[];
  performedAtUtc: string;
}

export interface ApiServiceRestartResult {
  server: string;
  container: string;
  performedAtUtc: string;
}

/** Runs the Jibri autoscaler immediately instead of waiting out its next cron minute — see IServerControlService. */
export async function rescaleJibriNow(serverName: string): Promise<ApiJibriControlResult> {
  return apiFetch<ApiJibriControlResult>(`/api/monitoring/servers/${encodeURIComponent(serverName)}/jibri/rescale`, { method: "POST" });
}

/** Sets how many Jibri instances stay warm even while idle (clamped server-side to 1-10, and further to the CPU/RAM-derived ceiling). */
export async function setJibriMinReplicas(serverName: string, minReplicas: number): Promise<ApiJibriControlResult> {
  return apiFetch<ApiJibriControlResult>(`/api/monitoring/servers/${encodeURIComponent(serverName)}/jibri/min-replicas`, {
    method: "PUT",
    body: JSON.stringify({ minReplicas }),
  });
}

/** Restarts one configured container on one server — interrupts anything currently using that service. */
export async function restartService(serverName: string, container: string): Promise<ApiServiceRestartResult> {
  return apiFetch<ApiServiceRestartResult>(`/api/monitoring/servers/${encodeURIComponent(serverName)}/services/${encodeURIComponent(container)}/restart`, {
    method: "POST",
  });
}

export type HistoryRange = "1h" | "24h" | "7d";

export interface ApiHistoryRange {
  cpuHistory: ApiTimeSeriesPoint[];
  memoryHistory: ApiTimeSeriesPoint[];
}

/** CPU/memory history for one server over an admin-selected window — a longer look than the 1h the main summary already carries. */
export async function getServerHistory(serverName: string, range: HistoryRange): Promise<ApiHistoryRange> {
  return apiFetch<ApiHistoryRange>(`/api/monitoring/servers/${encodeURIComponent(serverName)}/history?range=${range}`);
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
      swapUsedPercent: s.swapUsedPercent,
      swapTotalMb: s.swapTotalMb,
      diskUsedPercent: s.diskUsedPercent,
      diskTotalGb: s.diskTotalGb,
      networkRxMbps: s.networkRxMbps,
      networkTxMbps: s.networkTxMbps,
      diskReadMbps: s.diskReadMbps,
      diskWriteMbps: s.diskWriteMbps,
      services: s.services,
      agentDataAgeSeconds: s.agentDataAgeSeconds,
      liveCalls: s.liveCalls,
      recorderStatus: s.recorderStatus,
      cpuHistory: s.cpuHistory,
      memoryHistory: s.memoryHistory,
      callQuality: s.callQuality,
      diskForecast: s.diskForecast,
      containerMetrics: s.containerMetrics,
      capacityTrend: s.capacityTrend,
    })),
  };
}
