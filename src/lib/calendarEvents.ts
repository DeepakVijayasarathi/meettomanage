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
    .flatMap((l) => {
      // One pseudo-session per calendar day the leave actually covers, not just its start —
      // a week- or month-long leave used to render a single 30-minute block on day one only,
      // so the calendar showed the teacher as free for every other day they were actually
      // on leave. Inclusive of the end day, matching how "1 Sep – 30 Sep" reads to a person.
      const startDate = l.startAtUtc.slice(0, 10);
      const endDate = l.endAtUtc.slice(0, 10);
      const dates: string[] = [];
      for (let cursor = new Date(`${startDate}T00:00:00Z`), end = new Date(`${endDate}T00:00:00Z`); cursor <= end; cursor = new Date(cursor.getTime() + 86_400_000)) {
        dates.push(cursor.toISOString().slice(0, 10));
      }
      return dates.map((date) => ({
        id: `leave-${l.id}-${date}`,
        title: `${l.teacherName} — Approved Leave`,
        teacherId: l.teacherProfileId,
        teacherName: l.teacherName,
        childIds: [],
        date,
        startTime: date === startDate ? l.startAtUtc.slice(11, 16) : "00:00",
        duration: 30,
        status: "leave" as const,
        type: "group" as const,
      }));
    });
}
