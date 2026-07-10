import { apiFetch } from "@/lib/api";
import type { Batch } from "@/types";

export interface ApiBatch {
  id: string;
  courseId: string;
  courseName: string;
  teacherProfileId: string;
  teacherName: string;
  name: string;
  capacity: number;
  enrolledCount: number;
  status: "Active" | "Dormant" | "Archived";
  startDate: string | null;
  endDate: string | null;
}

export interface TeacherOption {
  teacherProfileId: string;
  userId: string;
  fullName: string;
  department: "Phonics" | "Maths" | null;
}

export type DisplayBatch = Batch & { teacherName?: string; courseName?: string };

export function toFrontendBatch(batch: ApiBatch): DisplayBatch {
  const upcoming = batch.status === "Active" && !!batch.startDate && batch.startDate > new Date().toISOString().slice(0, 10);
  return {
    id: batch.id,
    name: batch.name,
    courseId: batch.courseId,
    courseName: batch.courseName,
    teacherId: batch.teacherProfileId,
    teacherName: batch.teacherName,
    type: batch.capacity <= 1 ? "1:1" : "group",
    duration: 45,
    capacity: batch.capacity,
    enrolled: batch.enrolledCount,
    status: batch.status === "Dormant" || batch.status === "Archived" ? "dormant" : upcoming ? "upcoming" : "active",
    schedule: batch.startDate ? `From ${batch.startDate}` : "Schedule pending",
    startDate: batch.startDate ?? "",
  };
}

export async function listBatches(): Promise<ApiBatch[]> {
  return apiFetch<ApiBatch[]>("/api/batches");
}

export async function listTeacherOptions(): Promise<TeacherOption[]> {
  return apiFetch<TeacherOption[]>("/api/users/teachers");
}

export async function updateBatch(batch: ApiBatch, teacherProfileId: string): Promise<ApiBatch> {
  return apiFetch<ApiBatch>(`/api/batches/${batch.id}`, {
    method: "PUT",
    body: JSON.stringify({
      courseId: batch.courseId,
      teacherProfileId,
      name: batch.name,
      capacity: batch.capacity,
      startDate: batch.startDate,
      endDate: batch.endDate,
    }),
  });
}
