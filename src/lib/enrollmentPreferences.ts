import type { ApiChildSchedulePreference, ApiEnrollmentForm } from "@/api/parentPortal";
import type { StudentRow } from "@/api/users";

/**
 * Reported live: "the parent filled in the details but we didn't get them in Enrollment Review."
 * The parent's child-details form (ChildDetailsDialog) saves onto the child itself, not onto an
 * enrollment form, and Enrollment Review only read enrollment forms. These helpers merge the
 * child's saved details into Enrollment Review: a form row for that child shows them, and a child
 * the counselor created (no form at all) gets its own row once the parent has filled them in.
 */

/** The Enrollment Review fields the parent's saved details fill in (only those they answered). */
export interface PreferenceFields {
  courseId?: string;
  startDate?: string;
  daysPerWeek?: number | null;
  preferredDays?: string[];
  dayTimes?: Record<string, string>;
  schoolName?: string;
  grade?: string;
  dob?: string;
  gender?: string;
  priorExperience?: string;
  allergies?: string;
  notes?: string;
}

export function preferenceFields(p: ApiChildSchedulePreference): PreferenceFields {
  const fields: PreferenceFields = {
    daysPerWeek: p.daysPerWeek,
    preferredDays: p.preferredDays,
    dayTimes: p.dayTimes,
  };
  if (p.courseId) fields.courseId = p.courseId;
  if (p.preferredStartDate) fields.startDate = p.preferredStartDate;
  if (p.schoolName) fields.schoolName = p.schoolName;
  if (p.grade) fields.grade = p.grade;
  if (p.dateOfBirth) fields.dob = p.dateOfBirth;
  if (p.gender) fields.gender = p.gender;
  if (p.priorExperience) fields.priorExperience = p.priorExperience;
  if (p.allergies) fields.allergies = p.allergies;
  if (p.notes) fields.notes = p.notes;
  return fields;
}

/** A stand-in (already approved) form for a child who has saved details but no enrollment form. */
export function formForStudent(s: StudentRow): ApiEnrollmentForm {
  return {
    id: `child-${s.id}`,
    parentProfileId: s.parentId,
    parentName: s.parentName ?? "",
    parentEmail: "",
    childId: s.id,
    formDataJson: JSON.stringify({ childName: s.name }),
    status: "Approved",
    submittedAtUtc: s.schedulePreference?.submittedAtUtc ?? null,
    reviewedAtUtc: null,
  };
}

/**
 * Overlays each child's saved details onto its form row, and appends a row (built by `toRow`)
 * for every child with saved details but no form. Newest submissions first, like the form list.
 */
export function withSavedPreferences<R extends PreferenceFields & { childId?: string | null }>(
  rows: R[],
  students: StudentRow[],
  toRow: (form: ApiEnrollmentForm) => R
): R[] {
  const saved = new Map(
    students.filter((s) => s.schedulePreference?.hasSubmitted).map((s) => [s.id, s] as const)
  );
  if (saved.size === 0) return rows;

  const merged = rows.map((row) => {
    const student = row.childId ? saved.get(row.childId) : undefined;
    return student?.schedulePreference ? { ...row, ...preferenceFields(student.schedulePreference) } : row;
  });
  const withForm = new Set(rows.map((r) => r.childId).filter(Boolean));
  const extra = [...saved.values()]
    .filter((s) => !withForm.has(s.id))
    .sort((a, b) => (b.schedulePreference?.submittedAtUtc ?? "").localeCompare(a.schedulePreference?.submittedAtUtc ?? ""))
    .map((s) => ({ ...toRow(formForStudent(s)), ...preferenceFields(s.schedulePreference!) }));
  return [...extra, ...merged];
}
