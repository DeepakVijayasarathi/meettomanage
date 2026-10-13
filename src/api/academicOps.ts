import { apiFetch } from "@/lib/api";
import type { LeaveRequest, LeaveSessionSummary } from "@/types";

export interface ApiHoliday {
  id: string;
  date: string;
  name: string;
  description: string | null;
}

export type ApiLeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export interface ApiLeaveSessionSummary {
  sessionId: string;
  scheduledStartAtUtc: string;
  scheduledEndAtUtc: string;
  batchName: string | null;
}

export interface ApiLeaveRequest {
  id: string;
  teacherProfileId: string;
  teacherName: string;
  startAtUtc: string;
  endAtUtc: string;
  reason: string;
  status: ApiLeaveStatus;
  reviewNote: string | null;
  createdAtUtc: string;
  affectedSessionCount: number;
  /** True for a class-wise leave (specific classes picked, see `sessions`) rather than a
   *  whole day/date-range one. */
  isClassWise: boolean;
  sessions: ApiLeaveSessionSummary[];
}

export interface ApiLeaveAllowance {
  id: string;
  /** Null identifies the centre-wide default allowance. */
  teacherProfileId: string | null;
  teacherName: string;
  monthlyAllowance: number;
}

export interface ApiLeaveAllowanceStatus {
  monthlyAllowance: number;
  usedThisMonth: number;
  remaining: number;
}

export type ApiAttendanceStatus = "Present" | "Absent" | "Late";

export interface ApiSessionAttendance {
  id: string;
  classSessionId: string;
  participantType: "Teacher" | "Student";
  childId: string | null;
  childName: string | null;
  teacherProfileId: string | null;
  status: ApiAttendanceStatus;
  joinedAtUtc: string | null;
  leftAtUtc: string | null;
}

/** Maps an API leave request onto the frontend LeaveRequest shape (shared across teacher/coordinator screens). */
export function toFrontendLeave(leave: ApiLeaveRequest): LeaveRequest {
  const noticeHours = (new Date(leave.startAtUtc).getTime() - new Date(leave.createdAtUtc).getTime()) / 3_600_000;
  return {
    id: leave.id,
    teacherId: leave.teacherProfileId,
    teacherName: leave.teacherName,
    date: leave.startAtUtc.slice(0, 10),
    session: leave.isClassWise
      ? `${leave.affectedSessionCount} specific class(es)`
      : `${leave.affectedSessionCount} session(s) affected`,
    reason: leave.reason,
    hoursBeforeSession: Math.round(noticeHours * 10) / 10,
    status: leave.status.toLowerCase() as LeaveRequest["status"],
    // Kept alongside the display-friendly `date` above (not a replacement for it) so a
    // teacher applying for a new overlapping window can be warned before they even submit,
    // the same way the backend itself checks it — see teacher/Leave.tsx.
    startAtUtc: leave.startAtUtc,
    endAtUtc: leave.endAtUtc,
    isClassWise: leave.isClassWise,
    sessions: leave.sessions as LeaveSessionSummary[],
  };
}

export async function listHolidays(): Promise<ApiHoliday[]> {
  return apiFetch<ApiHoliday[]>("/api/holidays");
}

export async function createHoliday(input: { date: string; name: string; description?: string }): Promise<ApiHoliday> {
  return apiFetch<ApiHoliday>("/api/holidays", { method: "POST", body: JSON.stringify(input) });
}

/** Restores the recurring schedule (removes old shifted copies) and cancels any class still on a holiday. */
export async function reconcileHolidays(): Promise<{ cancelledSessions: number; removedShiftedSessions: number }> {
  return apiFetch<{ cancelledSessions: number; removedShiftedSessions: number }>("/api/holidays/reconcile", { method: "POST" });
}

export async function deleteHoliday(id: string): Promise<void> {
  await apiFetch<void>(`/api/holidays/${id}`, { method: "DELETE" });
}

/**
 * Teacher applies for leave; backend enforces the 6-hour rule (auto-block). Pass either a
 * whole day/date-range window (startAtUtc/endAtUtc) or specific classes to cancel
 * (sessionIds) — never both, never neither, the backend rejects either mix. A class-wise
 * request within the teacher's remaining monthly allowance (see getMyLeaveAllowanceStatus)
 * comes back already Approved; one that exceeds it comes back Pending, same as a whole-day
 * request always has.
 */
export async function submitLeave(input: {
  startAtUtc?: string;
  endAtUtc?: string;
  sessionIds?: string[];
  reason: string;
}): Promise<ApiLeaveRequest> {
  return apiFetch<ApiLeaveRequest>("/api/leave-requests", { method: "POST", body: JSON.stringify(input) });
}

export async function listMyLeave(): Promise<ApiLeaveRequest[]> {
  return apiFetch<ApiLeaveRequest[]>("/api/leave-requests/mine");
}

/** The signed-in teacher's own remaining class-wise-cancellation quota for the current
 *  calendar month — shown before she picks classes to cancel. */
export async function getMyLeaveAllowanceStatus(): Promise<ApiLeaveAllowanceStatus> {
  return apiFetch<ApiLeaveAllowanceStatus>("/api/leave-requests/mine/allowance");
}

/** Admin (or a role granted LeaveManagement) view of configured allowances — the default
 *  card plus any per-teacher overrides. */
export async function listLeaveAllowances(): Promise<ApiLeaveAllowance[]> {
  return apiFetch<ApiLeaveAllowance[]>("/api/leave-allowances");
}

/** Admin-only: sets the centre default (omit teacherProfileId) or one teacher's override. */
export async function saveLeaveAllowance(input: { teacherProfileId?: string; monthlyAllowance: number }): Promise<ApiLeaveAllowance> {
  return apiFetch<ApiLeaveAllowance>("/api/leave-allowances", { method: "POST", body: JSON.stringify(input) });
}

export async function listLeave(status?: ApiLeaveStatus): Promise<ApiLeaveRequest[]> {
  return apiFetch<ApiLeaveRequest[]>(`/api/leave-requests${status ? `?status=${status}` : ""}`);
}

export async function reviewLeave(id: string, approve: boolean, reviewNote?: string): Promise<ApiLeaveRequest> {
  return apiFetch<ApiLeaveRequest>(`/api/leave-requests/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ approve, reviewNote }),
  });
}

/** Teacher withdraws their own leave request — only while it's still Pending. */
export async function cancelLeave(id: string): Promise<void> {
  await apiFetch<void>(`/api/leave-requests/${id}`, { method: "DELETE" });
}

export async function listAttendance(sessionId: string): Promise<ApiSessionAttendance[]> {
  return apiFetch<ApiSessionAttendance[]>(`/api/sessions/${sessionId}/attendance`);
}

export interface ApiLeaveCancellationClass {
  batchName: string;
  /** "Group" or "Individual" (a dash for a class with no batch). */
  classType: string;
  startTime: string;
}

export interface ApiLeaveCancellationDay {
  /** IST calendar date, yyyy-MM-dd. */
  date: string;
  cancelledClasses: number;
  classes: ApiLeaveCancellationClass[];
}

export interface ApiLeaveCancellationTeacher {
  teacherProfileId: string;
  teacherName: string;
  totalCancelledClasses: number;
  days: ApiLeaveCancellationDay[];
}

export interface ApiLeaveCancellationReport {
  year: number;
  month: number;
  generatedAtUtc: string;
  /** True for the frozen month-end snapshot; false for a live preview of a month not yet generated. */
  isSnapshot: boolean;
  totalCancelledClasses: number;
  teachers: ApiLeaveCancellationTeacher[];
}

/** The month report: the stored month-end snapshot if it exists, else a live preview. */
export async function getLeaveCancellationReport(year: number, month: number): Promise<ApiLeaveCancellationReport> {
  return apiFetch<ApiLeaveCancellationReport>(`/api/leave-cancellation-reports/${year}/${month}`);
}

/** Recomputes the month and replaces its stored snapshot. */
export async function regenerateLeaveCancellationReport(year: number, month: number): Promise<ApiLeaveCancellationReport> {
  return apiFetch<ApiLeaveCancellationReport>(`/api/leave-cancellation-reports/${year}/${month}/generate`, { method: "POST" });
}
