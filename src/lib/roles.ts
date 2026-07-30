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
    hex: "#4475BB",
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
    hex: "#2A8479",
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
    hex: "#7049CB",
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
    hex: "#C88945",
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
    hex: "#3C8B5B",
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
    hex: "#477ACC",
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
    hex: "#2A847C",
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
    hex: "#7A4DC6",
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

/** Muted, brand-derived multi-series palette for charts, KPI icon chips and legends. */
export const CHART_PALETTE = [
  "#4475BB", // blue
  "#639C52", // green
  "#3993A7", // cyan
  "#C88945", // orange
  "#7049CB", // violet
  "#CB4894", // pink
  "#BF9D33", // amber
  "#2A847C", // teal
];
