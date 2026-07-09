/**
 * Local mock data for the Sub Admin Portal.
 *
 * Everything here is fabricated but internally consistent with the shared
 * mock universe in `@/data/*` — it exists only because the shared data files
 * don't model per-sub-admin permission grants or activity history.
 *
 * "Today" in this mock universe is 2026-07-09, and the signed-in persona is
 * Neha Kulkarni (sa-1) — see `@/data/users`.
 */
import {
  Users,
  BookOpen,
  Layers,
  CalendarDays,
  Receipt,
  BarChart3,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import { CHART_PALETTE } from "@/lib/roles";

export const MODULES = ["Users", "Courses", "Batches", "Calendar", "Billing", "Reports", "Resources"] as const;
export const ACTIONS = ["View", "Add", "Edit", "Delete", "Approve"] as const;

export type SubAdminModule = (typeof MODULES)[number];
export type SubAdminAction = (typeof ACTIONS)[number];
export type PermissionMatrix = Record<SubAdminModule, Record<SubAdminAction, boolean>>;

export interface ModuleMeta {
  icon: LucideIcon;
  color: string;
  blurb: string;
}

export const MODULE_META: Record<SubAdminModule, ModuleMeta> = {
  Users: { icon: Users, color: CHART_PALETTE[0], blurb: "Teacher and parent directory" },
  Courses: { icon: BookOpen, color: CHART_PALETTE[1], blurb: "Course catalog and pricing" },
  Batches: { icon: Layers, color: CHART_PALETTE[2], blurb: "Batch rosters, capacity and leave approvals" },
  Calendar: { icon: CalendarDays, color: CHART_PALETTE[3], blurb: "Session scheduling and rescheduling" },
  Billing: { icon: Receipt, color: CHART_PALETTE[4], blurb: "Invoices, payouts and refunds" },
  Reports: { icon: BarChart3, color: CHART_PALETTE[5], blurb: "Attendance, occupancy and utilization reports" },
  Resources: { icon: FolderOpen, color: CHART_PALETTE[6], blurb: "Worksheets, books and session recordings" },
};

/**
 * Neha Kulkarni's permission grants, as configured by her Admin.
 * This is read-only from the Sub Admin Portal — she can view it, not edit it.
 * Billing is intentionally all-false: financial modules are admin-only by policy.
 */
export const PERMISSIONS: PermissionMatrix = {
  Users: { View: true, Add: false, Edit: false, Delete: false, Approve: false },
  Courses: { View: true, Add: false, Edit: false, Delete: false, Approve: false },
  Batches: { View: true, Add: false, Edit: true, Delete: false, Approve: true },
  Calendar: { View: true, Add: true, Edit: true, Delete: false, Approve: false },
  Billing: { View: false, Add: false, Edit: false, Delete: false, Approve: false },
  Reports: { View: true, Add: false, Edit: false, Delete: false, Approve: false },
  Resources: { View: true, Add: true, Edit: true, Delete: false, Approve: false },
};

export type AccessLevel = "full" | "view" | "none";

export function accessLevelFor(mod: SubAdminModule): AccessLevel {
  const row = PERMISSIONS[mod];
  const grantedCount = ACTIONS.filter((a) => row[a]).length;
  if (grantedCount === 0) return "none";
  if (row.Edit || row.Add || row.Delete || row.Approve) return "full";
  return "view";
}

export const ACCESS_SUMMARY = MODULES.map((mod) => ({ module: mod, level: accessLevelFor(mod) }));

export const FULL_ACCESS_MODULES = ACCESS_SUMMARY.filter((m) => m.level === "full").map((m) => m.module);
export const VIEW_ONLY_MODULES = ACCESS_SUMMARY.filter((m) => m.level === "view").map((m) => m.module);
export const NO_ACCESS_MODULES = ACCESS_SUMMARY.filter((m) => m.level === "none").map((m) => m.module);

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO datetime
  action: string;
  module: SubAdminModule;
  detail: string;
}

/** Neha's own action history — ~15 entries, newest first. Never touches Billing. */
export const AUDIT_LOG: AuditEntry[] = [
  { id: "al-1", timestamp: "2026-07-09T09:15:00", action: "Marked attendance", module: "Batches", detail: "Phonics-A1 · Session 19 — 2 of 2 students marked present" },
  { id: "al-2", timestamp: "2026-07-09T08:40:00", action: "Exported weekly report", module: "Reports", detail: "Attendance trend report (CSV) — last 4 weeks" },
  { id: "al-3", timestamp: "2026-07-08T17:05:00", action: "Rescheduled a session", module: "Calendar", detail: "Reading-R1 · Session 7 moved from Jul 3 to Jul 10, 11:00 AM" },
  { id: "al-4", timestamp: "2026-07-08T11:20:00", action: "Approved a leave request", module: "Batches", detail: "Rohan Verma — Reading-R1, Jul 9 · 96 hrs notice" },
  { id: "al-5", timestamp: "2026-07-07T16:50:00", action: "Uploaded a resource", module: "Resources", detail: "Blending Sounds Worksheet — Week 3 (Phonics-A1)" },
  { id: "al-6", timestamp: "2026-07-07T10:05:00", action: "Viewed teacher directory", module: "Users", detail: "Filtered by Phonics department to plan batch coverage" },
  { id: "al-7", timestamp: "2026-07-06T18:30:00", action: "Marked attendance", module: "Batches", detail: "MathJr-B1 · Session 11 — 2 of 2 students marked present" },
  { id: "al-8", timestamp: "2026-07-06T09:12:00", action: "Viewed course catalog", module: "Courses", detail: "Checked seat pricing for Reading Adventures before a parent query" },
  { id: "al-9", timestamp: "2026-07-05T15:45:00", action: "Updated resource visibility", module: "Resources", detail: "Session Recording — Phonics-A1 (Jul 6) set visible to parents" },
  { id: "al-10", timestamp: "2026-07-04T12:00:00", action: "Generated a report", module: "Reports", detail: "Batch occupancy report — Phonics and Reading batches" },
  { id: "al-11", timestamp: "2026-07-03T14:20:00", action: "Added a makeup session", module: "Calendar", detail: "Writing-W1 · Session 6 scheduled for Jul 13, 5:30 PM" },
  { id: "al-12", timestamp: "2026-07-02T11:35:00", action: "Reviewed batch capacity", module: "Batches", detail: "MathJr-B2 (Waitlist) — 3 of 10 seats filled ahead of Aug launch" },
  { id: "al-13", timestamp: "2026-07-01T09:50:00", action: "Uploaded a resource", module: "Resources", detail: "Math Explorers — Activity Book added to MathJr-B1 library" },
  { id: "al-14", timestamp: "2026-06-29T16:10:00", action: "Exported monthly report", module: "Reports", detail: "Attendance trend report (CSV) — June summary" },
  { id: "al-15", timestamp: "2026-06-27T10:30:00", action: "Approved a leave request", module: "Batches", detail: "Meera Iyer — Math Champions, Jun 20 · 30 hrs notice" },
];

export interface AssignedModuleCard {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  stat: string;
  ctaLabel: string;
  to: string;
}
