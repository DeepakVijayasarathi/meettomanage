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
  renewalRatePercent: number;
  batchOccupancyPercent: number;
  teacherUtilizationSessionsPerTeacher: number;
  revenueByDepartment: { name: string; revenue: number }[];
  /** Collected revenue by course; invoices with no resolved course roll up into "Unassigned". */
  revenueByCourse: { name: string; revenue: number }[];
  revenueTrend: { month: string; revenue: number }[];
  enrollmentFunnel: { stage: string; value: number }[];
  /** Student attendance % per week, last 6 weeks (oldest first). */
  weeklyAttendanceTrend: { week: string; attendance: number }[];
  /** Active-batch fill rate per course (highest first). */
  batchOccupancyByCourse: { course: string; occupancy: number }[];
  /** Demo→enrolled conversion % per booking-month, last 6 months (oldest first). */
  conversionRateTrend: { month: string; rate: number }[];
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

/** Live recipient count for the compose screen — same rule the send itself uses. */
export async function getBulkEmailRecipientCount(batchId?: string): Promise<number> {
  const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : "";
  const result = await apiFetch<{ recipientCount: number }>(`/api/communications/bulk-email/recipients${query}`);
  return result.recipientCount;
}

export interface ApiTeacherPerformance {
  teacherProfileId: string;
  teacherName: string;
  department: string | null;
  sessionsCompleted: number;
  teacherNoShows: number;
  upcomingSessions: number;
  studentAttendancePercent: number;
  summariesWritten: number;
}

export interface ApiStudentAnalytics {
  childId: string;
  childName: string;
  attendancePercent: number;
  sessionsAttended: number;
  quizAttempts: number;
  quizCorrect: number;
  activityInteractions: number;
  whiteboardInteractions: number;
  averageEngagementScore: number;
  insights: string[];
}

export async function getTeacherPerformance(): Promise<ApiTeacherPerformance[]> {
  return apiFetch<ApiTeacherPerformance[]>("/api/reports/teacher-performance");
}

export async function getStudentAnalytics(childId: string): Promise<ApiStudentAnalytics> {
  return apiFetch<ApiStudentAnalytics>(`/api/reports/student-analytics/${childId}`);
}

/** Downloads a CSV export (attendance | revenue | payouts | conversion | performance) with the auth token. */
export async function downloadReportCsv(
  report: "attendance" | "revenue" | "payouts" | "conversion" | "performance"
): Promise<void> {
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
