import { apiFetch } from "@/lib/api";
import type { NavSection } from "@/lib/nav";
import {
  Ban,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  CalendarRange,
  Circle,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FolderOpen,
  Gauge,
  History,
  KanbanSquare,
  Landmark,
  Layers,
  LayoutDashboard,
  Link2,
  Mail,
  Plug,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  UserSearch,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Backend PermissionModule names reused by the menu module gate. */
import type { PermissionModuleName } from "@/api/permissions";

export interface ApiMenuItem {
  id: string;
  portal: string;
  section: string | null;
  sectionOrder: number;
  label: string;
  path: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  requiredModule: PermissionModuleName | null;
}

export interface SaveMenuItemRequest {
  portal: string;
  section: string | null;
  sectionOrder: number;
  label: string;
  path: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  requiredModule?: PermissionModuleName | null;
}

/** Lucide icons the menu manager can reference by name; extend as menus grow. */
export const MENU_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  ShieldCheck,
  BookOpen,
  Layers,
  CalendarDays,
  CalendarClock,
  FolderOpen,
  Receipt,
  Landmark,
  Wallet,
  Ban,
  BarChart3,
  Mail,
  Plug,
  ClipboardCheck,
  Settings,
  Video,
  ClipboardList,
  CalendarOff,
  Banknote,
  Bell,
  UserPlus,
  CreditCard,
  History,
  CalendarRange,
  UserSearch,
  Link2,
  KanbanSquare,
  TrendingUp,
  Gauge,
  FileBarChart,
  Sparkles,
};

export function resolveMenuIcon(name: string): LucideIcon {
  return MENU_ICONS[name] ?? Circle;
}

/**
 * The signed-in user's own sidebar — resolved server-side from their account role's
 * portal and filtered by the module grants their assigned role carries. This is the
 * menu the app shell renders so navigation reflects the role assigned to the user.
 */
export async function getMyMenu(): Promise<ApiMenuItem[]> {
  return apiFetch<ApiMenuItem[]>("/api/menus/mine");
}

/** All configured items including inactive, for the admin menu manager. */
export async function listMenuItems(portal?: string): Promise<ApiMenuItem[]> {
  const query = portal ? `?portal=${encodeURIComponent(portal)}` : "";
  return apiFetch<ApiMenuItem[]>(`/api/menus${query}`);
}

export async function createMenuItem(request: SaveMenuItemRequest): Promise<ApiMenuItem> {
  return apiFetch<ApiMenuItem>("/api/menus", { method: "POST", body: JSON.stringify(request) });
}

export async function updateMenuItem(id: string, request: SaveMenuItemRequest): Promise<ApiMenuItem> {
  return apiFetch<ApiMenuItem>(`/api/menus/${id}`, { method: "PUT", body: JSON.stringify(request) });
}

export async function deleteMenuItem(id: string): Promise<void> {
  await apiFetch<void>(`/api/menus/${id}`, { method: "DELETE" });
}

/** Portal keys shown as human labels on the Roles & Permissions "Menus: …" captions. */
const PORTAL_LABELS: Record<string, string> = {
  admin: "Admin",
  teacher: "Teacher",
  parent: "Parent",
  subadmin: "Sub Admin",
  admission: "Admission",
  coordinator: "Coordinator",
  management: "Management",
  student: "Student",
};

/**
 * Groups every active, module-gated menu item by the module that governs it, e.g.
 * `{ BillingFinance: ["Admin — Billing & Finance", "Admission — Payment Tracking"] }`.
 * Items with no RequiredModule (always visible) are excluded — there's nothing to
 * grant for them. Used by the Roles & Permissions matrix so toggling a module shows
 * concretely which real sidebar menus, across every portal, that grant controls.
 */
export function groupMenusByModule(items: ApiMenuItem[]): Partial<Record<PermissionModuleName, string[]>> {
  const grouped: Partial<Record<PermissionModuleName, string[]>> = {};
  for (const item of items) {
    if (!item.requiredModule || !item.isActive) continue;
    const label = `${PORTAL_LABELS[item.portal] ?? item.portal} — ${item.label}`;
    (grouped[item.requiredModule] ??= []).push(label);
  }
  return grouped;
}

/** Groups the flat DB rows into the NavSection shape the Sidebar renders. */
export function toNavSections(items: ApiMenuItem[]): NavSection[] {
  const sections: NavSection[] = [];
  let current: { key: string; section: NavSection } | null = null;

  for (const item of [...items].sort((a, b) => a.sectionOrder - b.sectionOrder || a.sortOrder - b.sortOrder)) {
    const key = item.section ?? "";
    if (!current || current.key !== key) {
      current = { key, section: { title: item.section ?? undefined, items: [] } };
      sections.push(current.section);
    }
    current.section.items.push({
      label: item.label,
      to: item.path,
      icon: resolveMenuIcon(item.icon),
      // Portal root paths ("/admin") must match exactly or they'd stay highlighted everywhere
      end: !item.section,
    });
  }

  return sections;
}
