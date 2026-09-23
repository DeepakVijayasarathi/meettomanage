import { apiFetch } from "@/lib/api";

export type StaffLeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

/** Leave for admin-team members (RM, Coordinator, Management, Admission) — whole days, no minimum notice. */
export interface ApiStaffLeave {
  id: string;
  userId: string;
  staffName: string;
  staffEmail: string;
  roleName: string | null;
  /** "YYYY-MM-DD" */
  startDate: string;
  /** "YYYY-MM-DD", inclusive */
  endDate: string;
  days: number;
  reason: string;
  status: StaffLeaveStatus;
  reviewedByName: string | null;
  reviewedAtUtc: string | null;
  reviewNote: string | null;
  createdAtUtc: string;
}

export async function listMyStaffLeave(): Promise<ApiStaffLeave[]> {
  return apiFetch<ApiStaffLeave[]>("/api/staff-leave/mine");
}

export async function applyStaffLeave(input: { startDate: string; endDate: string; reason: string }): Promise<ApiStaffLeave> {
  return apiFetch<ApiStaffLeave>("/api/staff-leave/mine", { method: "POST", body: JSON.stringify(input) });
}

export async function withdrawStaffLeave(id: string): Promise<ApiStaffLeave> {
  return apiFetch<ApiStaffLeave>(`/api/staff-leave/mine/${id}/cancel`, { method: "POST" });
}

export async function listStaffLeave(status?: StaffLeaveStatus): Promise<ApiStaffLeave[]> {
  return apiFetch<ApiStaffLeave[]>(`/api/staff-leave${status ? `?status=${status}` : ""}`);
}

export async function reviewStaffLeave(id: string, approve: boolean, note?: string): Promise<ApiStaffLeave> {
  return apiFetch<ApiStaffLeave>(`/api/staff-leave/${id}/review`, { method: "POST", body: JSON.stringify({ approve, note }) });
}

/** "Mon, 22 Sept" or "Mon, 22 Sept – Wed, 24 Sept 2026" — pure calendar dates, no timezone shift. */
export function formatLeaveDates(start: string, end: string): string {
  const fmt = (d: string, withYear: boolean) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    });
  return start === end ? fmt(start, true) : `${fmt(start, false)} – ${fmt(end, true)}`;
}
