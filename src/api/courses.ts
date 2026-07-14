import { apiFetch } from "@/lib/api";
import type { Course } from "@/types";

export interface ApiCourseCategory {
  id: string;
  name: string;
  description: string | null;
  department: "Phonics" | "Maths";
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
  department: "Phonics" | "Maths";
  isActive: boolean;
}

export function toFrontendCourse(course: ApiCourse): Course {
  return {
    id: course.id,
    name: course.name,
    category: (course.categoryName || course.department) as Course["category"],
    type: course.type === "Individual" ? "1:1" : "group",
    duration: course.durationMinutes as Course["duration"],
    price: course.price,
    // Occupancy/revenue analytics arrive with the Sprint 3 dashboard work
    activeBatches: 0,
    totalEnrolled: 0,
    revenue: 0,
    status: course.isActive ? "active" : "archived",
  };
}

export async function listCourses(): Promise<ApiCourse[]> {
  return apiFetch<ApiCourse[]>("/api/courses?includeInactive=true");
}

export interface ApiCourseOption {
  id: string;
  name: string;
}

/** Active courses as id/name pairs only — for role dropdowns (e.g. a teacher recommending a course), not gated behind course-management permissions. */
export async function listCourseOptions(): Promise<ApiCourseOption[]> {
  return apiFetch<ApiCourseOption[]>("/api/courses/options");
}

export async function listCategories(): Promise<ApiCourseCategory[]> {
  return apiFetch<ApiCourseCategory[]>("/api/courses/categories");
}

async function ensureCategory(name: string): Promise<ApiCourseCategory> {
  const categories = await listCategories();
  const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  return apiFetch<ApiCourseCategory>("/api/courses/categories", {
    method: "POST",
    body: JSON.stringify({ name, department: name === "Maths" ? "Maths" : "Phonics" }),
  });
}

export async function createCourse(input: {
  name: string;
  categoryName: string;
  type: "1:1" | "group" | "demo";
  durationMinutes: number;
  price: number;
  totalSessions?: number;
}): Promise<ApiCourse> {
  const category = await ensureCategory(input.categoryName);
  return apiFetch<ApiCourse>("/api/courses", {
    method: "POST",
    body: JSON.stringify({
      courseCategoryId: category.id,
      name: input.name,
      type: input.type === "group" ? "Group" : "Individual",
      durationMinutes: input.durationMinutes,
      price: input.price,
      totalSessions: input.totalSessions ?? 12,
      department: category.department,
      isActive: true,
    }),
  });
}
