import { apiFetch, getAccessToken } from "@/lib/api";

export interface ApiDashboardSummary {
  totalStudents: number;
  activeStudents: number;
  revenueCollected: number;
  revenuePending: number;
  totalEnrollments: number;
  activeBatches: number;
  dormantBatches: number;
  conversionRatePercent: number;
  refundRatePercent: number;
  batchOccupancyPercent: number;
  teacherUtilizationSessionsPerTeacher: number;
  revenueByDepartment: { name: string; revenue: number }[];
}

export async function getDashboardSummary(): Promise<ApiDashboardSummary> {
  return apiFetch<ApiDashboardSummary>("/api/reports/dashboard-summary");
}

export async function sendBulkEmail(input: {
  subject: string;
  body: string;
  batchId?: string;
}): Promise<{ recipientCount: number }> {
  return apiFetch<{ recipientCount: number }>("/api/communications/bulk-email", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Downloads a CSV export (attendance | revenue | payouts | conversion) with the auth token. */
export async function downloadReportCsv(report: "attendance" | "revenue" | "payouts" | "conversion"): Promise<void> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const token = getAccessToken();
  const response = await fetch(`${baseUrl}/api/reports/export/${report}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(`Export failed (${response.status})`);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
