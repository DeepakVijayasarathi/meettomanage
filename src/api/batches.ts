import { apiFetch } from "@/lib/api";
import type { Batch } from "@/types";

export interface ApiBatch {
  id: string;
  courseId: string;
  courseName: string;
  /** The course's own configured class length — unaffected by this batch's own override, if any. */
  courseDurationMinutes: number;
  /** This batch's own class length if set (e.g. a shorter paired-batch session); null follows courseDurationMinutes. */
  durationMinutesOverride: number | null;
  /** What every session in this batch is actually scheduled at. */
  effectiveDurationMinutes: number;
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

export type DisplayBatch = Batch & {
  teacherName?: string;
  courseName?: string;
  /** The course's own default duration, for the batch edit form to show as a hint/placeholder.
   *  Undefined in demo mode, where the editable duration/date fields aren't shown at all. */
  courseDuration?: number;
  /** This batch's own duration override, or null when it just follows the course default. */
  durationOverride?: number | null;
};

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
    duration: batch.effectiveDurationMinutes,
    courseDuration: batch.courseDurationMinutes,
    durationOverride: batch.durationMinutesOverride,
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

/** Archiving is the closest thing to "delete" the API offers — batches carry enrollment/session history, so they're never hard-deleted. */
export async function setBatchStatus(batchId: string, status: ApiBatch["status"]): Promise<ApiBatch> {
  return apiFetch<ApiBatch>(`/api/batches/${batchId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/** Update a batch's own fields (course stays fixed after creation — only teacher, name, capacity, dates and duration override can change). */
export async function updateBatchFields(
  batch: ApiBatch,
  fields: {
    name?: string;
    teacherProfileId?: string;
    capacity?: number;
    startDate?: string | null;
    endDate?: string | null;
    /** Pass null explicitly to clear the override back to the course's own default. */
    durationMinutesOverride?: number | null;
  }
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
      durationMinutesOverride: fields.durationMinutesOverride !== undefined ? fields.durationMinutesOverride : batch.durationMinutesOverride,
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

/** One weekday this batch meets on, and the UTC time it meets at that day — a batch doesn't
 *  have to run at the same time every day (e.g. Monday/Wednesday at 5 PM but Friday at noon),
 *  so each weekday carries its own time instead of one time applying to all of them. `dayOfWeek`
 *  follows JS's own Date.getDay() convention (0 = Sunday .. 6 = Saturday), which the backend's
 *  DayOfWeek enum shares numerically. */
export interface GenerateScheduleSlot {
  dayOfWeek: number;
  startTimeUtc: string;
}

/**
 * Bulk-creates the batch's session plan on the chosen weekdays from the start date (skipping
 * holidays), each at its own slot's time. Returns the created sessions.
 */
export async function generateSchedule(
  batchId: string,
  input: { startDate: string; slots: GenerateScheduleSlot[]; sessionCount?: number }
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
