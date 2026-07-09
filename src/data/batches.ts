import type { Batch } from "@/types";

export const BATCHES: Batch[] = [
  { id: "b-1", name: "Phonics-A1 (Mon/Wed/Fri)", courseId: "co-1", teacherId: "t-1", type: "group", duration: 30, capacity: 12, enrolled: 11, status: "active", schedule: "Mon, Wed, Fri · 4:30 PM", startDate: "2025-01-06" },
  { id: "b-2", name: "Phonics-A2 (Tue/Thu)", courseId: "co-1", teacherId: "t-3", type: "group", duration: 30, capacity: 12, enrolled: 9, status: "active", schedule: "Tue, Thu · 5:00 PM", startDate: "2025-02-03" },
  { id: "b-3", name: "MathJr-B1 (Mon/Wed)", courseId: "co-3", teacherId: "t-2", type: "group", duration: 45, capacity: 10, enrolled: 10, status: "active", schedule: "Mon, Wed · 6:00 PM", startDate: "2025-01-13" },
  { id: "b-4", name: "MathChamp-1:1 Zara", courseId: "co-4", teacherId: "t-4", type: "1:1", duration: 45, capacity: 1, enrolled: 1, status: "dormant", schedule: "Completed", startDate: "2024-09-01" },
  { id: "b-5", name: "Reading-R1 (Sat)", courseId: "co-5", teacherId: "t-3", type: "group", duration: 30, capacity: 12, enrolled: 8, status: "active", schedule: "Saturday · 11:00 AM", startDate: "2025-03-01" },
  { id: "b-6", name: "MathJr-B2 (Waitlist)", courseId: "co-3", teacherId: "t-6", type: "group", duration: 45, capacity: 10, enrolled: 3, status: "upcoming", schedule: "Starts soon · TBD", startDate: "2026-08-01" },
  { id: "b-7", name: "Writing-W1 (Tue/Thu)", courseId: "co-6", teacherId: "t-2", type: "group", duration: 45, capacity: 10, enrolled: 9, status: "active", schedule: "Tue, Thu · 5:30 PM", startDate: "2025-04-10" },
  { id: "b-8", name: "Phonics-A3 1:1 Myra", courseId: "co-2", teacherId: "t-1", type: "1:1", duration: 30, capacity: 1, enrolled: 1, status: "active", schedule: "Mon, Fri · 4:00 PM", startDate: "2025-05-01" },
];

export function getBatchById(id: string) {
  return BATCHES.find((b) => b.id === id);
}
