import type { Course } from "@/types";

export const COURSES: Course[] = [
  { id: "co-1", name: "Phonics Foundations", category: "Phonics", type: "group", duration: 30, price: 2500, activeBatches: 4, totalEnrolled: 62, revenue: 465000, status: "active" },
  { id: "co-2", name: "Advanced Phonics Mastery", category: "Phonics", type: "1:1", duration: 30, price: 4500, activeBatches: 3, totalEnrolled: 28, revenue: 378000, status: "active" },
  { id: "co-3", name: "Math Explorers Jr", category: "Maths", type: "group", duration: 45, price: 3200, activeBatches: 3, totalEnrolled: 44, revenue: 422000, status: "active" },
  { id: "co-4", name: "Math Champions", category: "Maths", type: "1:1", duration: 45, price: 5200, activeBatches: 2, totalEnrolled: 19, revenue: 296000, status: "active" },
  { id: "co-5", name: "Reading Adventures", category: "Reading", type: "group", duration: 30, price: 2800, activeBatches: 2, totalEnrolled: 33, revenue: 231000, status: "active" },
  { id: "co-6", name: "Creative Writing Workshop", category: "Writing", type: "group", duration: 45, price: 3000, activeBatches: 2, totalEnrolled: 21, revenue: 168000, status: "active" },
  { id: "co-7", name: "Public Speaking Sparks", category: "Speaking", type: "group", duration: 45, price: 3400, activeBatches: 1, totalEnrolled: 12, revenue: 96000, status: "draft" },
  { id: "co-8", name: "One-time Demo Class", category: "Phonics", type: "demo", duration: 30, price: 0, activeBatches: 0, totalEnrolled: 0, revenue: 0, status: "active" },
];

export function getCourseById(id: string) {
  return COURSES.find((c) => c.id === id);
}
