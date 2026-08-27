import { apiFetch, downloadFile } from "@/lib/api";
import type { Course } from "@/types";
import type { BulkImportResult } from "./types";

export interface ApiCourseCategory {
  id: string;
  name: string;
  description: string | null;
  departmentId: string;
  departmentName: string;
}

export interface ApiCourse {
  id: string;
  courseCategoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  type: "Individual" | "Group";
  durationMinutes: number;
  price: number;
  totalSessions: number;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
  activeBatches: number;
  totalEnrolled: number;
  revenue: number;
}

export function toFrontendCourse(course: ApiCourse): Course {
  return {
    id: course.id,
    name: course.name,
    category: (course.categoryName || course.departmentName) as Course["category"],
    type: course.type === "Individual" ? "1:1" : "group",
    duration: course.durationMinutes,
    price: course.price,
    activeBatches: course.activeBatches,
    totalEnrolled: course.totalEnrolled,
    revenue: course.revenue,
    status: course.isActive ? "active" : "archived",
  };
}

export async function listCourses(): Promise<ApiCourse[]> {
  return apiFetch<ApiCourse[]>("/api/courses?includeInactive=true");
}

export interface ApiCourseOption {
  id: string;
  name: string;
  /** Individual (1:1) courses always run a single-seat batch — the backend forces
   *  Capacity to 1 for them regardless of what's requested (BatchService.CreateAsync). */
  type: "Individual" | "Group";
}

/** Active courses as id/name pairs only — for role dropdowns (e.g. a teacher recommending a course), not gated behind course-management permissions. */
export async function listCourseOptions(): Promise<ApiCourseOption[]> {
  return apiFetch<ApiCourseOption[]>("/api/courses/options");
}

export async function listCategories(): Promise<ApiCourseCategory[]> {
  return apiFetch<ApiCourseCategory[]>("/api/courses/categories");
}

/**
 * Reuses an existing category by name if one exists in the SAME department; otherwise
 * creates it under the given department. Matching by name alone (ignoring department)
 * used to let a category name that collides across two different departments (e.g. both
 * a "Beginners" under Phonics and one under Maths) resolve to whichever one happened to
 * be created first — leaving the new course's own departmentId and its category's
 * department silently out of sync.
 */
async function ensureCategory(name: string, departmentId: string): Promise<ApiCourseCategory> {
  const categories = await listCategories();
  const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase() && c.departmentId === departmentId);
  if (existing) return existing;
  return apiFetch<ApiCourseCategory>("/api/courses/categories", {
    method: "POST",
    body: JSON.stringify({ name, departmentId }),
  });
}

export async function createCourse(input: {
  name: string;
  categoryName: string;
  departmentId: string;
  type: "1:1" | "group" | "demo";
  durationMinutes: number;
  price: number;
  totalSessions?: number;
}): Promise<ApiCourse> {
  const category = await ensureCategory(input.categoryName, input.departmentId);
  return apiFetch<ApiCourse>("/api/courses", {
    method: "POST",
    body: JSON.stringify({
      courseCategoryId: category.id,
      name: input.name,
      type: input.type === "group" ? "Group" : "Individual",
      durationMinutes: input.durationMinutes,
      price: input.price,
      totalSessions: input.totalSessions ?? 12,
      departmentId: input.departmentId,
      isActive: true,
    }),
  });
}

/** Bulk-create courses from a .csv/.xlsx. Columns: DepartmentName, CategoryName, Name,
 *  Description, Type (Individual/Group), DurationMinutes, Price, TotalSessions, IsActive. */
export async function bulkImportCourses(file: File): Promise<BulkImportResult> {
  const form = new FormData();
  form.set("file", file);
  return apiFetch<BulkImportResult>("/api/courses/bulk-import", { method: "POST", body: form });
}

export async function exportCourses(): Promise<void> {
  await downloadFile("/api/courses/export?includeInactive=true", "courses.csv");
}
