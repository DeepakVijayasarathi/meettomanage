import { apiFetch } from "@/lib/api";

export type ApiProgressReportStatus = "Draft" | "Sent";

export interface ApiProgressReport {
  id: string;
  childId: string;
  childName: string;
  parentUserId: string;
  parentName: string;
  parentEmail: string;
  periodYear: number;
  periodMonth: number;
  status: ApiProgressReportStatus;
  content: string;
  sentAtUtc: string | null;
  updatedAtUtc: string | null;
}

export async function listProgressReports(filter?: {
  year?: number;
  month?: number;
  childId?: string;
}): Promise<ApiProgressReport[]> {
  const params = new URLSearchParams();
  if (filter?.year) params.set("year", String(filter.year));
  if (filter?.month) params.set("month", String(filter.month));
  if (filter?.childId) params.set("childId", filter.childId);
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<ApiProgressReport[]>(`/api/progress-reports${query}`);
}

/** The signed-in parent's own children's sent reports. */
export async function listMyProgressReports(): Promise<ApiProgressReport[]> {
  return apiFetch<ApiProgressReport[]>("/api/progress-reports/mine");
}

export async function saveProgressReportContent(id: string, content: string): Promise<ApiProgressReport> {
  return apiFetch<ApiProgressReport>(`/api/progress-reports/${id}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export async function sendProgressReport(id: string): Promise<ApiProgressReport> {
  return apiFetch<ApiProgressReport>(`/api/progress-reports/${id}/send`, { method: "POST" });
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function progressReportPeriodLabel(report: Pick<ApiProgressReport, "periodYear" | "periodMonth">): string {
  return `${MONTH_NAMES[report.periodMonth - 1]} ${report.periodYear}`;
}
