import { apiFetch } from "@/lib/api";
import type { LeaveRequest } from "@/types";

export interface ApiHoliday {
  id: string;
  date: string;
  name: string;
  description: string | null;
}

export type ApiLeaveStatus = "Pending" | "Approved" | "Rejected";

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
    session: `${leave.affectedSessionCount} session(s) affected`,
    reason: leave.reason,
    hoursBeforeSession: Math.round(noticeHours * 10) / 10,
    status: leave.status.toLowerCase() as LeaveRequest["status"],
  };
}

export async function listHolidays(): Promise<ApiHoliday[]> {
  return apiFetch<ApiHoliday[]>("/api/holidays");
}

export async function createHoliday(input: { date: string; name: string; description?: string }): Promise<ApiHoliday> {
  return apiFetch<ApiHoliday>("/api/holidays", { method: "POST", body: JSON.stringify(input) });
}

export async function deleteHoliday(id: string): Promise<void> {
  await apiFetch<void>(`/api/holidays/${id}`, { method: "DELETE" });
}

/** Teacher applies for leave; backend enforces the 6-hour rule (auto-block). */
export async function submitLeave(input: { startAtUtc: string; endAtUtc: string; reason: string }): Promise<ApiLeaveRequest> {
  return apiFetch<ApiLeaveRequest>("/api/leave-requests", { method: "POST", body: JSON.stringify(input) });
}

export async function listMyLeave(): Promise<ApiLeaveRequest[]> {
  return apiFetch<ApiLeaveRequest[]>("/api/leave-requests/mine");
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

export async function captureAttendance(
  sessionId: string,
  entries: { childId?: string; teacherProfileId?: string; status: ApiAttendanceStatus }[]
): Promise<ApiSessionAttendance[]> {
  return apiFetch<ApiSessionAttendance[]>(`/api/sessions/${sessionId}/attendance`, {
    method: "POST",
    body: JSON.stringify({ entries }),
  });
}

export async function listAttendance(sessionId: string): Promise<ApiSessionAttendance[]> {
  return apiFetch<ApiSessionAttendance[]>(`/api/sessions/${sessionId}/attendance`);
}
