import { ApiError, apiFetch, getAccessToken, readProblemMessage } from "@/lib/api";

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

export type BulkEmailScope = "AllActiveParents" | "Batch";

export interface ApiBulkEmailHistoryItem {
  id: string;
  subject: string;
  sentByName: string;
  scope: BulkEmailScope;
  batchName: string | null;
  sentAtUtc: string;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
}

export interface ApiBulkEmailRecipient {
  id: string;
  recipientName: string;
  email: string;
  status: "Pending" | "Sent" | "Failed" | "Read";
  errorMessage: string | null;
  sentAtUtc: string | null;
  replyMessage: string | null;
  replyAtUtc: string | null;
}

export interface ApiBulkEmailBlastDetail {
  id: string;
  subject: string;
  body: string;
  sentByName: string;
  scope: BulkEmailScope;
  batchName: string | null;
  sentAtUtc: string;
  recipients: ApiBulkEmailRecipient[];
}

/** Past Bulk Email sends, newest first, for the admin History list. */
export async function getBulkEmailHistory(): Promise<ApiBulkEmailHistoryItem[]> {
  return apiFetch<ApiBulkEmailHistoryItem[]>("/api/communications/bulk-email/history");
}

/** One blast's full recipient list with delivery status and any reply. */
export async function getBulkEmailBlastDetail(id: string): Promise<ApiBulkEmailBlastDetail> {
  return apiFetch<ApiBulkEmailBlastDetail>(`/api/communications/bulk-email/history/${id}`);
}

/** Every NotificationType the backend can tag an individual email with — mirrors the .NET enum. */
export type EmailNotificationType =
  | "BookingConfirmation"
  | "SessionReminder"
  | "NoShowAlert"
  | "DelayedSessionAlert"
  | "PaymentReminder"
  | "PaymentReceived"
  | "FeeSuspension"
  | "LeaveStatusUpdate"
  | "AttendanceUpdate"
  | "PerformanceSummary"
  | "PayoutStatement"
  | "General";

export interface ApiEmailHistoryItem {
  id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string | null;
  type: EmailNotificationType;
  templateKey: string | null;
  status: "Pending" | "Sent" | "Failed" | "Read";
  sentAtUtc: string | null;
  createdAtUtc: string;
}

/** Every individual (non-Bulk-Email) email ever sent, newest first — "Bulk Email History"'s
 *  other view. Omit `type` for every type; the 500-row cap matches the backend's own default. */
export async function getEmailHistory(type?: EmailNotificationType): Promise<ApiEmailHistoryItem[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  return apiFetch<ApiEmailHistoryItem[]>(`/api/communications/email-history${query}`);
}

/** A parent's reply to one Bulk Email they received, addressed by their recipient row id. */
export async function replyToBulkEmail(recipientId: string, message: string): Promise<void> {
  await apiFetch<void>(`/api/communications/bulk-email/${recipientId}/reply`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export interface ApiTeacherPerformance {
  teacherProfileId: string;
  teacherName: string;
  department: string | null;
  sessionsCompleted: number;
  teacherNoShows: number;
  upcomingSessions: number;
  /** Null when this teacher has no completed, attendance-marked sessions yet — distinct
   *  from a real 0%. Render as "No data", not as a default percentage. */
  studentAttendancePercent: number | null;
  summariesWritten: number;
  /** Status + total only — see TeacherPayoutSummary's own doc comment on why this stays
   *  narrower than the full payout detail GET /api/payouts (Admin-only) returns. Null when
   *  this teacher has no payout on record at all. */
  latestPayoutPeriodYear: number | null;
  latestPayoutPeriodMonth: number | null;
  latestPayoutStatus: "Pending" | "Finalized" | "Paid" | null;
  latestPayoutAmount: number | null;
}

export interface ApiStudentAnalytics {
  childId: string;
  childName: string;
  /** Null when this child has no attendance-marked sessions yet — distinct from a real 0%. */
  attendancePercent: number | null;
  sessionsAttended: number;
  quizAttempts: number;
  quizCorrect: number;
  activityInteractions: number;
  whiteboardInteractions: number;
  averageEngagementScore: number;
  talkTimeSeconds: number;
  cameraOnSeconds: number;
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
  if (!response.ok) throw new ApiError(response.status, await readProblemMessage(response));

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
