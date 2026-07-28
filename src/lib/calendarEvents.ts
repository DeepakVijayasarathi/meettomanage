import type { ApiHoliday, ApiLeaveRequest } from "@/api/academicOps";
import type { ClassSession } from "@/types";

/**
 * Holidays and approved leave aren't ClassSession rows in the backend — they're their
 * own entities (Holiday, LeaveRequest). The calendar components only render ClassSession-
 * shaped events, so these turn real holiday/leave records into the same synthetic
 * "holiday"/"leave" pseudo-session shape the demo mock data has always used, giving the
 * colour-coded calendar (Admin/Coordinator/Teacher views) the holiday and leave visibility
 * the API-backed calendars were missing.
 */

export function holidaysToCalendarEvents(holidays: ApiHoliday[]): ClassSession[] {
  return holidays.map((h) => ({
    id: `holiday-${h.id}`,
    title: h.name,
    teacherId: "",
    teacherName: "All Staff",
    childIds: [],
    date: h.date.slice(0, 10),
    startTime: "00:00",
    duration: 30,
    status: "holiday",
    type: "group",
  }));
}

export function approvedLeaveToCalendarEvents(leave: ApiLeaveRequest[]): ClassSession[] {
  return leave
    .filter((l) => l.status === "Approved")
    .map((l) => ({
      id: `leave-${l.id}`,
      title: `${l.teacherName} — Approved Leave`,
      teacherId: l.teacherProfileId,
      teacherName: l.teacherName,
      childIds: [],
      date: l.startAtUtc.slice(0, 10),
      startTime: l.startAtUtc.slice(11, 16),
      duration: 30,
      status: "leave",
      type: "group",
    }));
}
