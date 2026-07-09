import type { LeaveRequest } from "@/types";

export const LEAVE_REQUESTS: LeaveRequest[] = [
  { id: "lv-1", teacherId: "t-1", teacherName: "Karan Mehta", date: "2026-07-15", session: "Phonics-A1 · 4:30 PM", reason: "Family function", hoursBeforeSession: 96, status: "approved" },
  { id: "lv-2", teacherId: "t-2", teacherName: "Isha Sharma", date: "2026-07-16", session: "MathJr-B1 · 6:00 PM", reason: "Medical appointment", hoursBeforeSession: 48, status: "pending" },
  { id: "lv-3", teacherId: "t-3", teacherName: "Rohan Verma", date: "2026-07-09", session: "Reading-R1 · 11:00 AM", reason: "Personal", hoursBeforeSession: 3, status: "blocked" },
  { id: "lv-4", teacherId: "t-4", teacherName: "Meera Iyer", date: "2026-06-20", session: "Math Champions · 5:00 PM", reason: "Travel", hoursBeforeSession: 30, status: "rejected" },
  { id: "lv-5", teacherId: "t-6", teacherName: "Sneha Kulkarni", date: "2026-07-22", session: "MathJr-B2 · 6:00 PM", reason: "Wedding", hoursBeforeSession: 240, status: "approved" },
];

export function getLeavesForTeacher(teacherId: string) {
  return LEAVE_REQUESTS.filter((l) => l.teacherId === teacherId);
}
