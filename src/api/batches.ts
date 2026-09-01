import { apiFetch } from "@/lib/api";
import type { Batch } from "@/types";

export interface ApiBatch {
  id: string;
  courseId: string;
  courseName: string;
  courseDurationMinutes: number;
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
  departmentId: string | null;
  departmentName: string | null;
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
    duration: batch.courseDurationMinutes,
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

/** Archiving is the closest thing to "delete" the API offers — batches carry enrollment/session history, so they're never hard-deleted. */
export async function setBatchStatus(batchId: string, status: ApiBatch["status"]): Promise<ApiBatch> {
  return apiFetch<ApiBatch>(`/api/batches/${batchId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/** Update a batch's own fields (course stays fixed after creation — only teacher, name, capacity and dates can change). */
export async function updateBatchFields(
  batch: ApiBatch,
  fields: { name?: string; teacherProfileId?: string; capacity?: number; startDate?: string | null; endDate?: string | null }
): Promise<ApiBatch> {
  return apiFetch<ApiBatch>(`/api/batches/${batch.id}`, {
    method: "PUT",
    body: JSON.stringify({
      courseId: batch.courseId,
      teacherProfileId: fields.teacherProfileId ?? batch.teacherProfileId,
      name: fields.name ?? batch.name,
      capacity: fields.capacity ?? batch.capacity,
      startDate: fields.startDate !== undefined ? fields.startDate : batch.startDate,
      endDate: fields.endDate !== undefined ? fields.endDate : batch.endDate,
    }),
  });
}

export async function createBatch(input: {
  courseId: string;
  teacherProfileId: string;
  name: string;
  capacity: number;
  startDate?: string;
  endDate?: string;
}): Promise<ApiBatch> {
  return apiFetch<ApiBatch>("/api/batches", { method: "POST", body: JSON.stringify(input) });
}

/**
 * Bulk-creates the batch's full session plan (all course sessions on the chosen
 * weekdays from the start date, skipping holidays). Returns the created sessions.
 */
export async function generateSchedule(
  batchId: string,
  input: { startDate: string; daysOfWeek: number[]; startTimeUtc: string }
): Promise<unknown[]> {
  return apiFetch<unknown[]>(`/api/batches/${batchId}/generate-schedule`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface ApiBatchStudent {
  enrollmentId: string;
  childId: string;
  childName: string;
  academicLevel: string | null;
  status: "Active" | "Completed" | "Withdrawn";
  enrolledAtUtc: string;
}

export interface ApiUnassignedChild {
  childId: string;
  childName: string;
  parentName: string;
  academicLevel: string | null;
}

/** The batch's current student roster (WBS "Assign Students"). */
export async function listBatchEnrollments(batchId: string): Promise<ApiBatchStudent[]> {
  return apiFetch<ApiBatchStudent[]>(`/api/batches/${batchId}/enrollments`);
}

/** Active, approved children not yet placed in this batch — candidates for the assign picker. */
export async function listUnassignedStudents(batchId: string): Promise<ApiUnassignedChild[]> {
  return apiFetch<ApiUnassignedChild[]>(`/api/batches/${batchId}/unassigned-students`);
}

/** Places a child in the batch; rejected (400) once the batch is at capacity. */
export async function assignStudentToBatch(batchId: string, childId: string): Promise<ApiBatchStudent> {
  return apiFetch<ApiBatchStudent>(`/api/batches/${batchId}/enrollments`, {
    method: "POST",
    body: JSON.stringify({ childId }),
  });
}

/** Withdraws a child from the batch, freeing a seat. */
export async function removeStudentFromBatch(batchId: string, childId: string): Promise<void> {
  await apiFetch<void>(`/api/batches/${batchId}/enrollments/${childId}`, { method: "DELETE" });
}
