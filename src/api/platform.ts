export const PLATFORM_TOKEN_KEY = "mtm.platformToken";
export const PLATFORM_EMAIL_KEY = "mtm.platformEmail";
export const PLATFORM_SESSION_EVENT = "mtm-platform-session";
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type PlatformTenant = { id: string; code: string; name: string; customDomain?: string | null; customDomainVerifiedAtUtc?: string | null; status: "Provisioning" | "Active" | "Suspended" | "Failed"; appAccessGranted?: boolean; createdAtUtc?: string | null };

export function clearPlatformSession() {
  sessionStorage.removeItem(PLATFORM_TOKEN_KEY);
  sessionStorage.removeItem(PLATFORM_EMAIL_KEY);
  window.dispatchEvent(new Event(PLATFORM_SESSION_EVENT));
}

/** Separate operator credentials; never reads or overwrites a client's access token. */
export async function platformRequest<T>(path: string, token: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${base}/api/platform${path}`, {
    method, signal, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401 && token && sessionStorage.getItem(PLATFORM_TOKEN_KEY) === token) clearPlatformSession();
    const problem = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(problem.detail || (response.status === 404 ? "This tenant or administration page is unavailable." : "The request could not be completed."));
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}

export interface PlatformMonitoringServer {
  name: string; hostname: string; reachable: boolean; error: string | null; isOnDemand: boolean;
  uptimeSeconds: number; loadAverage1m: number; cpuCores: number; cpuUsagePercent: number;
  memoryUsedPercent: number; memoryTotalMb: number; swapUsedPercent: number; swapTotalMb: number;
  diskUsedPercent: number; diskTotalGb: number; networkRxMbps: number; networkTxMbps: number;
  diskReadMbps: number; diskWriteMbps: number; agentDataAgeSeconds: number;
  services: { name: string; active: boolean }[];
  containerMetrics: { name: string; cpuPercent: number; memoryMb: number }[];
}
export interface PlatformMonitoringSummary {
  infrastructure: { servers: PlatformMonitoringServer[]; activeAlerts: { name: string; severity: string; summary: string; description: string; activeSince: string; instance: string | null }[]; generatedAtUtc: string };
  monitoringPolicy: { refreshSeconds: number; servers: { name: string; maintenanceMode: boolean; cpuWarningPercent: number; memoryWarningPercent: number; diskWarningPercent: number }[] };
  saas: { totalTenants: number; activeTenants: number; provisioningTenants: number; suspendedTenants: number; failedTenants: number; subscriptionStatuses: Record<string, number>; usageDate: string | null; usage: null | { tenantSnapshots: number; activeStudents: number; staff: number; storageBytes: number; sessionMinutesMonth: number; sessionsMonth: number; recordingsMonth: number } };
  masterDatabase: { healthy: boolean; latencyMs: number };
  runtime: { framework: string; os: string; processorCount: number; processUptimeSeconds: number; workingSetMb: number; managedHeapMb: number; threadCount: number; gcGen0: number; gcGen1: number; gcGen2: number };
  generatedAtUtc: string;
}
export const getPlatformMonitoring = (token: string, signal?: AbortSignal) => platformRequest<PlatformMonitoringSummary>("/monitoring", token, "GET", undefined, signal);
export interface PlatformMonitoredServerSetting { id: string; name: string; hostname: string; instance: string; services: string[]; tracksLiveCalls: boolean; isOnDemand: boolean; maintenanceMode: boolean; sshHost: string; sshPort: number; sshUsername: string; hasSshPassword: boolean; sshPassword?: string | null; cpuWarningPercent: number; memoryWarningPercent: number; diskWarningPercent: number }
export interface PlatformMonitoringSettings { prometheusBaseUrl: string; refreshSeconds: number; servers: PlatformMonitoredServerSetting[] }
export const getPlatformMonitoringSettings = (token: string) => platformRequest<PlatformMonitoringSettings>("/monitoring/settings", token);
export const savePlatformMonitoringSettings = (token: string, value: PlatformMonitoringSettings) => platformRequest<PlatformMonitoringSettings>("/monitoring/settings", token, "PUT", value);
export const testPlatformMonitoringSsh = (token: string, id: string) => platformRequest<{ ok: boolean; message: string; latencyMs: number }>(`/monitoring/servers/${id}/test-ssh`, token, "POST");

export type ServiceStatus = "Operational" | "Degraded" | "Maintenance" | "MajorOutage";
export interface StatusPageComponentSetting { key: string; name: string; type: "Api" | "Database" | "Server" | "Service"; server?: string | null; service?: string | null; description?: string | null; manualStatus?: ServiceStatus | null }
export interface StatusPageSetting { enabled: boolean; title: string; description: string; supportUrl?: string | null; refreshSeconds: number; manualStatus?: ServiceStatus | null; incidentTitle?: string | null; incidentMessage?: string | null; incidentStartedAtUtc?: string | null; components: StatusPageComponentSetting[] }
export const getStatusPageSettings = (token: string) => platformRequest<StatusPageSetting>("/status-page-settings", token);
export const saveStatusPageSettings = (token: string, value: StatusPageSetting) => platformRequest<StatusPageSetting>("/status-page-settings", token, "PUT", value);
