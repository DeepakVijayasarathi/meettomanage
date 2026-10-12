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

export interface ApiMonthlyFinanceSummary {
  year: number;
  month: number;
  demosConducted: number;
  /** Of this month's demos, how many have enrolled. */
  demosConverted: number;
  conversionRatePercent: number;
  counselorCollected: number;
  /** Later installments and any other collection that isn't a counselor's own. */
  othersCollected: number;
  totalCollected: number;
  counselors: {
    userId: string;
    name: string;
    demosConducted: number;
    demosConverted: number;
    conversionRatePercent: number;
    amountCollected: number;
  }[];
}

/** One IST calendar month's demos, conversions and collections, per counselor plus "Others". */
export async function getMonthlyFinanceSummary(year: number, month: number): Promise<ApiMonthlyFinanceSummary> {
  return apiFetch<ApiMonthlyFinanceSummary>(`/api/reports/monthly-finance?year=${year}&month=${month}`);
}

export async function getDashboardSummary(): Promise<ApiDashboardSummary> {
  return apiFetch<ApiDashboardSummary>("/api/reports/dashboard-summary");
}

/** The signed-in staff member's own collections (her demo leads' payments + invoices she raised), IST months. */
export interface ApiMyCollections {
  thisMonth: number;
  thisMonthPayments: number;
  lastMonth: number;
  payments: { paidAtUtc: string; amount: number; invoiceNumber: string; parentName: string; childName?: string | null; method?: string | null }[];
}

export async function getMyCollections(): Promise<ApiMyCollections> {
  return apiFetch<ApiMyCollections>("/api/reports/my-collections");
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

/**
 * The server answers a Bulk Email send at once and delivers in the background, so the compose
 * screen keeps its "Sending…" spinner up by polling history until this blast has attempted
 * every recipient. Resolves with the final counts; gives up quietly after ~10 minutes (the
 * send itself keeps going server-side) and returns null.
 */
export async function waitForBulkEmailDelivery(
  subject: string,
  startedAtMs: number,
  onProgress?: (done: number, total: number) => void
): Promise<{ success: number; failed: number } | null> {
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      const history = await getBulkEmailHistory();
      // History is newest first; allow a little clock skew between browser and server.
      const blast = history.find((h) => h.subject === subject && new Date(h.sentAtUtc).getTime() >= startedAtMs - 60_000);
      if (!blast) continue;
      const done = blast.successCount + blast.failureCount;
      onProgress?.(done, blast.totalRecipients);
      if (done >= blast.totalRecipients) return { success: blast.successCount, failed: blast.failureCount };
    } catch {
      /* transient poll failure: keep waiting */
    }
  }
  return null;
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
