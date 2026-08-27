import type { ClassSession } from "@/types";

export const SESSIONS: ClassSession[] = [
  { id: "s-1", title: "Phonics-A1 · Session 19", batchId: "b-1", courseId: "co-1", teacherId: "t-1", teacherName: "Karan Mehta", childIds: ["c-1", "c-10"], date: "2026-07-09", startTime: "16:30", duration: 30, status: "scheduled", type: "group" },
  { id: "s-2", title: "MathJr-B1 · Session 12", batchId: "b-3", courseId: "co-3", teacherId: "t-2", teacherName: "Isha Sharma", childIds: ["c-4", "c-9"], date: "2026-07-09", startTime: "18:00", duration: 45, status: "scheduled", type: "group" },
  { id: "s-3", title: "Phonics 1:1 · Myra", batchId: "b-8", courseId: "co-2", teacherId: "t-1", teacherName: "Karan Mehta", childIds: ["c-8"], date: "2026-07-09", startTime: "16:00", duration: 30, status: "scheduled", type: "1:1" },
  { id: "s-4", title: "Reading-R1 · Session 8", batchId: "b-5", courseId: "co-5", teacherId: "t-3", teacherName: "Rohan Verma", childIds: ["c-2"], date: "2026-07-10", startTime: "11:00", duration: 30, status: "scheduled", type: "group" },
  { id: "s-5", title: "Writing-W1 · Session 5", batchId: "b-7", courseId: "co-6", teacherId: "t-2", teacherName: "Isha Sharma", childIds: ["c-7"], date: "2026-07-10", startTime: "17:30", duration: 45, status: "scheduled", type: "group" },
  { id: "s-6", title: "Phonics-A2 · Session 9", batchId: "b-2", courseId: "co-1", teacherId: "t-3", teacherName: "Rohan Verma", childIds: ["c-5"], date: "2026-07-08", startTime: "17:00", duration: 30, status: "completed", type: "group", recordingAvailable: true, recordingExpiresOn: "2026-07-23" },
  { id: "s-7", title: "MathJr-B1 · Session 11", batchId: "b-3", courseId: "co-3", teacherId: "t-2", teacherName: "Isha Sharma", childIds: ["c-4", "c-9"], date: "2026-07-07", startTime: "18:00", duration: 45, status: "completed", type: "group", recordingAvailable: true, recordingExpiresOn: "2026-07-22" },
  { id: "s-8", title: "Phonics-A1 · Session 18", batchId: "b-1", courseId: "co-1", teacherId: "t-1", teacherName: "Karan Mehta", childIds: ["c-1", "c-10"], date: "2026-07-06", startTime: "16:30", duration: 30, status: "completed", type: "group", recordingAvailable: true, recordingExpiresOn: "2026-07-21" },
  { id: "s-9", title: "Math Champions 1:1 · Zara", batchId: "b-4", courseId: "co-4", teacherId: "t-4", teacherName: "Meera Iyer", childIds: ["c-6"], date: "2026-07-05", startTime: "17:00", duration: 45, status: "noshow", type: "1:1" },
  { id: "s-10", title: "Phonics-A1 · Session 17", batchId: "b-1", courseId: "co-1", teacherId: "t-1", teacherName: "Karan Mehta", childIds: ["c-1", "c-10"], date: "2026-07-04", startTime: "16:30", duration: 30, status: "cancelled", type: "group" },
  { id: "s-11", title: "Demo · Ishaan Singh", teacherId: "t-6", teacherName: "Sneha Kulkarni", childIds: ["c-4"], date: "2026-07-11", startTime: "15:00", duration: 30, status: "demo", type: "demo" },
  { id: "s-12", title: "Demo · Kabir Kapoor", teacherId: "t-1", teacherName: "Karan Mehta", childIds: ["c-3"], date: "2026-07-12", startTime: "16:00", duration: 30, status: "demo", type: "demo" },
  { id: "s-13", title: "Reading-R1 · Session 7", batchId: "b-5", courseId: "co-5", teacherId: "t-3", teacherName: "Rohan Verma", childIds: ["c-2"], date: "2026-07-03", startTime: "11:00", duration: 30, status: "rescheduled", type: "group" },
  { id: "s-14", title: "Writing-W1 · Session 4", batchId: "b-7", courseId: "co-6", teacherId: "t-2", teacherName: "Isha Sharma", childIds: ["c-7"], date: "2026-07-13", startTime: "17:30", duration: 45, status: "scheduled", type: "group" },
  { id: "s-15", title: "Public Holiday — Independence Day Prep", teacherId: "t-1", teacherName: "All Staff", childIds: [], date: "2026-07-14", startTime: "00:00", duration: 30, status: "holiday", type: "group" },
  { id: "s-16", title: "Karan Mehta — Approved Leave", teacherId: "t-1", teacherName: "Karan Mehta", childIds: [], date: "2026-07-15", startTime: "16:30", duration: 30, status: "leave", type: "group" },
  { id: "s-17", title: "MathJr-B1 · Session 13", batchId: "b-3", courseId: "co-3", teacherId: "t-2", teacherName: "Isha Sharma", childIds: ["c-4", "c-9"], date: "2026-07-16", startTime: "18:00", duration: 45, status: "scheduled", type: "group" },
  { id: "s-18", title: "Phonics 1:1 · Myra", batchId: "b-8", courseId: "co-2", teacherId: "t-1", teacherName: "Karan Mehta", childIds: ["c-8"], date: "2026-07-17", startTime: "16:00", duration: 30, status: "scheduled", type: "1:1" },
  { id: "s-19", title: "Phonics-A2 · Session 10", batchId: "b-2", courseId: "co-1", teacherId: "t-3", teacherName: "Rohan Verma", childIds: ["c-5"], date: "2026-07-18", startTime: "17:00", duration: 30, status: "scheduled", type: "group" },
  { id: "s-20", title: "Reading-R1 · Session 9", batchId: "b-5", courseId: "co-5", teacherId: "t-3", teacherName: "Rohan Verma", childIds: ["c-2"], date: "2026-07-19", startTime: "11:00", duration: 30, status: "scheduled", type: "group" },
  { id: "s-21", title: "Math Champions 1:1 · Zara", batchId: "b-4", courseId: "co-4", teacherId: "t-4", teacherName: "Meera Iyer", childIds: ["c-6"], date: "2026-07-01", startTime: "17:00", duration: 45, status: "completed", type: "1:1", recordingAvailable: false },
  { id: "s-22", title: "Phonics-A1 · Session 16", batchId: "b-1", courseId: "co-1", teacherId: "t-1", teacherName: "Karan Mehta", childIds: ["c-1", "c-10"], date: "2026-06-30", startTime: "16:30", duration: 30, status: "completed", type: "group", recordingAvailable: false },
  { id: "s-23", title: "MathJr-B2 · Orientation", batchId: "b-6", courseId: "co-3", teacherId: "t-6", teacherName: "Sneha Kulkarni", childIds: [], date: "2026-07-22", startTime: "18:00", duration: 45, status: "scheduled", type: "group" },
  { id: "s-24", title: "Writing-W1 · Session 6", batchId: "b-7", courseId: "co-6", teacherId: "t-2", teacherName: "Isha Sharma", childIds: ["c-7"], date: "2026-07-20", startTime: "17:30", duration: 45, status: "scheduled", type: "group" },
  { id: "s-25", title: "Demo · New Enquiry — Reddy Family", teacherId: "t-3", teacherName: "Rohan Verma", childIds: [], date: "2026-07-21", startTime: "15:30", duration: 30, status: "demo", type: "demo" },
];

export function getSessionsForChild(childId: string) {
  return SESSIONS.filter((s) => s.childIds.includes(childId));
}

export function getSessionsForTeacher(teacherId: string) {
  return SESSIONS.filter((s) => s.teacherId === teacherId);
}

