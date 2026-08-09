import type { Role } from "@/types";
import {
  ShieldCheck,
  Users,
  UserCog,
  GraduationCap,
  HeartHandshake,
  Sparkles,
  CalendarRange,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export interface RoleMeta {
  role: Role;
  label: string;
  shortLabel: string;
  description: string;
  colorVar: string; // tailwind color token, e.g. role-admin
  hex: string;
  icon: LucideIcon;
  available: boolean;
  homePath: string;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  admin: {
    role: "admin",
    label: "Admin Portal",
    shortLabel: "Admin",
    description: "Central command centre for academic, operational and financial control.",
    colorVar: "role-admin",
    hex: "#1F6FE0",
    icon: ShieldCheck,
    available: true,
    homePath: "/admin",
  },
  subadmin: {
    role: "subadmin",
    label: "Parent Relationship Manager",
    shortLabel: "Relationship Manager",
    description: "Parent relationship management with permission-based operational access.",
    colorVar: "role-subadmin",
    hex: "#0E9C8C",
    icon: UserCog,
    available: true,
    homePath: "/subadmin",
  },
  admission: {
    role: "admission",
    label: "Admission Team Portal",
    shortLabel: "Admission",
    description: "Demo scheduling, parent follow-up and conversion management.",
    colorVar: "role-admission",
    // Nudged from #8B5CF6 (barely perceptible: R 0x8B->0x83, G 0x5C->0x56, B 0xF6->0xE7) —
    // the original only reached 4.23:1 against white button text, and against dark navy
    // text it was worse (4.00:1); neither cleared WCAG AA's 4.5:1 minimum for either choice,
    // so unlike the other 7 role colors (fixed via AppShell picking whichever of white/navy
    // text contrasts best), this one needed the color itself adjusted.
    hex: "#8356E7",
    icon: HeartHandshake,
    available: true,
    homePath: "/admission",
  },
  teacher: {
    role: "teacher",
    label: "Teacher Portal",
    shortLabel: "Teacher",
    description: "Live class delivery, whiteboard activities and student engagement.",
    colorVar: "role-teacher",
    hex: "#F08A1D",
    icon: GraduationCap,
    available: true,
    homePath: "/teacher",
  },
  parent: {
    role: "parent",
    label: "Parent Portal",
    shortLabel: "Parent",
    description: "Single dashboard for child learning, payments and communication.",
    colorVar: "role-parent",
    hex: "#23A455",
    icon: Users,
    available: true,
    homePath: "/parent",
  },
  student: {
    role: "student",
    label: "Student Experience",
    shortLabel: "Student",
    description: "Interactive, measurable and child-friendly digital learning.",
    colorVar: "role-student",
    hex: "#3B82F6",
    icon: Sparkles,
    available: true,
    homePath: "/student",
  },
  coordinator: {
    role: "coordinator",
    label: "Academic Coordinator",
    shortLabel: "Coordinator",
    description: "Calendar-driven coordination of sessions, teachers and batch planning.",
    colorVar: "role-coordinator",
    hex: "#0D9488",
    icon: CalendarRange,
    available: true,
    homePath: "/coordinator",
  },
  management: {
    role: "management",
    label: "Management Dashboard",
    shortLabel: "Management",
    description: "Executive-level insight into enrollments, revenue and performance.",
    colorVar: "role-management",
    hex: "#7C3AED",
    icon: LineChart,
    available: true,
    homePath: "/management",
  },
};

export const ROLE_ORDER: Role[] = [
  "admin",
  "teacher",
  "parent",
  "subadmin",
  "admission",
  "coordinator",
  "management",
  "student",
];

/** Vivid, brand-derived multi-series palette for charts, KPI icon chips and legends. */
export const CHART_PALETTE = [
  "#1F6FE0", // blue
  "#57B33B", // green
  "#17A9C9", // cyan
  "#F08A1D", // orange
  "#8B5CF6", // violet
  "#F53BA6", // pink
  "#EAB308", // amber
  "#0D9488", // teal
];
