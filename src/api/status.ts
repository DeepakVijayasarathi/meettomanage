const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
export type PublicStatus = "Operational" | "Degraded" | "Maintenance" | "MajorOutage";
export interface PublicStatusSummary {
  title: string; description: string; supportUrl: string | null; refreshSeconds: number; overallStatus: PublicStatus;
  components: { key: string; name: string; description: string | null; status: PublicStatus }[];
  incident: { title: string; message: string | null; startedAtUtc: string | null } | null;
  history: { title: string; message: string | null; status: PublicStatus; startedAtUtc: string; resolvedAtUtc: string }[];
  checkedAtUtc: string;
}
export async function getPublicStatus(signal?: AbortSignal): Promise<PublicStatusSummary> {
  const response = await fetch(`${base}/api/status`, { signal });
  if (!response.ok) throw new Error(response.status === 404 ? "The public status page is disabled." : "Status information is temporarily unavailable.");
  return response.json() as Promise<PublicStatusSummary>;
}
