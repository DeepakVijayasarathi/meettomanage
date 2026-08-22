import type { ApiDepartment } from "@/api/departments";

// One shared demo-mode fallback for every screen that lists departments — Courses.tsx,
// Users.tsx, Store.tsx and Departments.tsx itself each used to define this list separately
// (or, in three of those screens, not at all: they defaulted to an empty array, which
// silently broke their own department pickers — and in Courses.tsx's case, blocked course
// creation entirely — whenever the app ran with no backend configured).
export const DEMO_DEPARTMENTS: ApiDepartment[] = [
  { id: "phonics", name: "Phonics", description: "Reading, phonics and language courses.", isActive: true },
  { id: "maths", name: "Maths", description: "Vedic Maths, Abacus and MathsLab courses.", isActive: true },
];
