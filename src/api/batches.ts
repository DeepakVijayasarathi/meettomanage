import { apiFetch } from "@/lib/api";
import type { ApiClassSession } from "@/api/sessions";
import type { Batch, BatchPaymentPlanType } from "@/types";

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
  paymentPlanType: BatchPaymentPlanType;
  paymentAfterSessionsCount: number | null;
  paymentDueDate: string | null;
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
    paymentPlanType: batch.paymentPlanType,
    paymentAfterSessionsCount: batch.paymentAfterSessionsCount,
    paymentDueDate: batch.paymentDueDate,
  };
}

export async function listBatches(): Promise<ApiBatch[]> {
  return apiFetch<ApiBatch[]>("/api/batches");
}

export async function listTeacherOptions(): Promise<TeacherOption[]> {
  return apiFetch<TeacherOption[]>("/api/users/teachers");
}

/** Archiving keeps the batch's history fully visible (just under a different status) — for actually removing one from every list, see deleteBatch below. */
export async function setBatchStatus(batchId: string, status: ApiBatch["status"]): Promise<ApiBatch> {
  return apiFetch<ApiBatch>(`/api/batches/${batchId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/** Soft-deletes the batch — excluded from every future list. Rejected (400) while it still has an active student; withdraw them (or move them to another batch) first. */
export async function deleteBatch(batchId: string): Promise<void> {
  await apiFetch<void>(`/api/batches/${batchId}`, { method: "DELETE" });
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
    paymentPlanType?: BatchPaymentPlanType;
    /** Pass null explicitly to clear it (e.g. switching away from the AfterSessions plan). */
    paymentAfterSessionsCount?: number | null;
    /** Pass null explicitly to clear it (e.g. switching away from the DueOnDate plan). */
    paymentDueDate?: string | null;
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
      paymentPlanType: fields.paymentPlanType ?? batch.paymentPlanType,
      paymentAfterSessionsCount: fields.paymentAfterSessionsCount !== undefined ? fields.paymentAfterSessionsCount : batch.paymentAfterSessionsCount,
      paymentDueDate: fields.paymentDueDate !== undefined ? fields.paymentDueDate : batch.paymentDueDate,
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
  paymentPlanType?: BatchPaymentPlanType;
  paymentAfterSessionsCount?: number | null;
  paymentDueDate?: string | null;
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

/** Every session ever generated for this batch, unbounded by the ±60/400-day window
 *  `listSessions`/`listMySessions` use for the calendar screens — a batch's own remaining
 *  schedule can run further out than that window covers. Used by the "Manage" dialog to work
 *  out the batch's current weekly pattern and how many sessions are actually still upcoming. */
export async function listBatchSessions(batchId: string): Promise<ApiClassSession[]> {
  const from = new Date(0).toISOString();
  const to = new Date(Date.UTC(9999, 0, 1)).toISOString();
  return apiFetch<ApiClassSession[]>(
    `/api/sessions?batchId=${batchId}&fromUtc=${encodeURIComponent(from)}&toUtc=${encodeURIComponent(to)}`
  );
}

/**
 * Edits the batch's schedule from now on — new weekday/time pattern and/or remaining session
 * count — without re-entering the whole plan or touching sessions already completed/in
 * progress. `slots` is the full intended weekly pattern going forward, not a diff (same shape
 * `generateSchedule` takes). Omit `remainingSessionCount` to keep however many sessions are
 * currently still upcoming.
 */
export async function updateFutureSchedule(
  batchId: string,
  input: { slots: GenerateScheduleSlot[]; remainingSessionCount?: number }
): Promise<ApiClassSession[]> {
  return apiFetch<ApiClassSession[]>(`/api/batches/${batchId}/schedule`, {
    method: "PUT",
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
  parentEmail: string | null;
  academicLevel: string | null;
  /** Course(s) this child is already actively enrolled in elsewhere, comma-joined; null if none yet. */
  currentCourses: string | null;
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

export interface ApiTeacherStudent {
  childId: string;
  childName: string;
  parentName: string;
  academicLevel: string | null;
  batchId: string;
  batchName: string;
  courseName: string;
  enrolledAtUtc: string;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  sessionsSinceEnrollment: number;
  attendedCount: number;
  lastAttendedAtUtc: string | null;
}

/** The signed-in teacher's own "My Students" roster — one row per active enrollment across
 *  every batch they teach, with per-batch progress and per-child attendance. */
export async function listMyStudents(): Promise<ApiTeacherStudent[]> {
  return apiFetch<ApiTeacherStudent[]>("/api/batches/mine/students");
}

export interface ReconcileStaleSessionTeacherConflict {
  batchId: string;
  batchName: string;
  teacherProfileId: string;
  reason: string;
}

export interface ReconcileStaleSessionTeachersResult {
  batchesFixed: number;
  sessionsMoved: number;
  conflicts: ReconcileStaleSessionTeacherConflict[];
}

/**
 * One-time data repair for batches reassigned before UpdateAsync's teacher-reassignment cascade
 * existed: moves any still-undelivered session that's out of sync with its own batch's current
 * teacher onto that teacher. Safe to call more than once — nothing left to fix is a no-op.
 */
export async function reconcileStaleSessionTeachers(): Promise<ReconcileStaleSessionTeachersResult> {
  return apiFetch<ReconcileStaleSessionTeachersResult>("/api/batches/reconcile-stale-teachers", {
    method: "POST",
  });
}

export interface ReconcileStaleSessionDurationConflict {
  batchId: string;
  batchName: string;
  effectiveDurationMinutes: number;
  reason: string;
}

export interface ReconcileStaleSessionDurationsResult {
  batchesFixed: number;
  sessionsFixed: number;
  conflicts: ReconcileStaleSessionDurationConflict[];
}

/**
 * One-time data repair for batches whose duration was edited before UpdateAsync's duration
 * cascade existed: corrects any still-undelivered session whose real length is out of sync with
 * its own batch's current effective duration. Safe to call more than once — nothing left to fix
 * is a no-op.
 */
export async function reconcileStaleSessionDurations(): Promise<ReconcileStaleSessionDurationsResult> {
  return apiFetch<ReconcileStaleSessionDurationsResult>("/api/batches/reconcile-stale-durations", {
    method: "POST",
  });
}
